import { prisma } from '@costy/db';
import type {
  AppealDto,
  AppealReviewBody,
  AppealSubmitBody,
  ModerationCaseActionBody,
  ModerationCaseDetailDto,
  ModerationCaseDto,
  ModerationCaseListQuery,
  MyModerationCaseDto,
} from '@costy/shared';

import { MODERATION_CONFIG } from '../../config/moderation.config.js';
import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { classifyContent } from '../../lib/ai/moderation-ai.service.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { emitPostHidden } from '../posts/posts.realtime.js';
import { createNotification } from '../notifications/notifications.service.js';

const authorSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

const openQueueStatuses = ['PENDING', 'AUTO_HIDDEN'] as const;

function mapCase(row: {
  id: string;
  targetType: string;
  targetId: string;
  authorId: string;
  label: string;
  confidence: number;
  reason: string | null;
  status: string;
  autoHidden: boolean;
  reviewedById: string | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  author?: { id: string; username: string; name: string | null; image: string | null };
  targetPreview?: string | null;
}): ModerationCaseDto {
  return {
    id: row.id,
    targetType: row.targetType as ModerationCaseDto['targetType'],
    targetId: row.targetId,
    authorId: row.authorId,
    label: row.label as ModerationCaseDto['label'],
    confidence: row.confidence,
    reason: row.reason,
    status: row.status as ModerationCaseDto['status'],
    autoHidden: row.autoHidden,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    targetPreview: row.targetPreview,
  };
}

function mapAppeal(row: {
  id: string;
  caseId: string;
  userId: string;
  message: string;
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}): AppealDto {
  return {
    id: row.id,
    caseId: row.caseId,
    userId: row.userId,
    message: row.message,
    status: row.status as AppealDto['status'],
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Xác định targetType từ post (comment = có parentId). */
function resolveTargetType(parentId: string | null): 'POST' | 'COMMENT' {
  return parentId ? 'COMMENT' : 'POST';
}

/** Gửi thông báo kiểm duyệt cho tác giả nội dung. */
async function notifyAuthor(caseId: string, authorId: string): Promise<void> {
  await createNotification({
    recipientId: authorId,
    actorId: null,
    type: 'MODERATION_ACTION',
    entityType: 'MODERATION',
    entityId: caseId,
  });
}

/** Worker job: phân loại nội dung bài/comment và tạo moderation case nếu cần. */
export async function runModerationJob(postId: string): Promise<void> {
  if (!MODERATION_CONFIG.enabled) return;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      content: true,
      authorId: true,
      parentId: true,
      visibility: true,
      deletedAt: true,
      hiddenAt: true,
    },
  });

  if (!post || post.deletedAt) return;

  const existing = await prisma.moderationCase.findFirst({
    where: {
      targetId: postId,
      status: { in: [...openQueueStatuses] },
    },
  });
  if (existing) return;

  const classification = await classifyContent(post.content);
  if (!classification || !classification.flagged) return;

  const { confidence, label, reason } = classification;
  if (confidence < MODERATION_CONFIG.reviewThreshold) return;

  // Mọi nội dung bị AI gắn cờ và vượt ngưỡng review đều tự ẩn ngay
  const autoHide = true;
  const status = 'AUTO_HIDDEN';
  const targetType = resolveTargetType(post.parentId);

  const moderationCase = await prisma.$transaction(async (tx) => {
    if (autoHide && !post.hiddenAt) {
      await tx.post.update({
        where: { id: postId },
        data: { hiddenAt: new Date() },
      });
    }

    return tx.moderationCase.create({
      data: {
        targetType,
        targetId: postId,
        authorId: post.authorId,
        label,
        confidence,
        reason,
        status,
        autoHidden: autoHide,
        scores: { flagged: classification.flagged },
      },
    });
  });

  await notifyAuthor(moderationCase.id, post.authorId);

  if (autoHide) {
    await emitPostHidden(post.authorId, postId, post.visibility, post.parentId);
  }

  logger.info(
    { caseId: moderationCase.id, postId, label, confidence, autoHide },
    'AI moderation case created',
  );
}

/** Danh sách moderation cases cho admin (cursor pagination). */
export async function listModerationCases(
  query: ModerationCaseListQuery,
): Promise<{ items: ModerationCaseDto[]; nextCursor: string | null }> {
  const limit = query.limit ?? 20;
  const statusFilter =
    query.queue === 'open' ? [...openQueueStatuses] : query.status ? [query.status] : undefined;

  const rows = await prisma.moderationCase.findMany({
    where: {
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(query.label ? { label: query.label } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
    },
    orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    include: { author: { select: authorSelect } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const enriched = await Promise.all(
    page.map(async (row) => {
      const post = await prisma.post.findUnique({
        where: { id: row.targetId },
        select: { content: true },
      });
      return mapCase({
        ...row,
        targetPreview: post?.content?.slice(0, 120) ?? null,
      });
    }),
  );

  const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
  return { items: enriched, nextCursor };
}

/** Chi tiết moderation case cho admin. */
export async function getModerationCase(id: string): Promise<ModerationCaseDetailDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      appeal: true,
    },
  });
  if (!row) throw AppError.notFound('Không tìm thấy case kiểm duyệt');

  const post = await prisma.post.findUnique({
    where: { id: row.targetId },
    select: { content: true },
  });

  const base = mapCase({
    ...row,
    targetPreview: post?.content?.slice(0, 120) ?? null,
  });

  return {
    ...base,
    targetContent: post?.content ?? null,
    scores: (row.scores as Record<string, unknown> | null) ?? null,
    appeal: row.appeal ? mapAppeal(row.appeal) : null,
  };
}

/** Admin xử lý moderation case: giữ / gỡ bỏ / bỏ qua. */
export async function resolveModerationCase(
  adminId: string,
  id: string,
  body: ModerationCaseActionBody,
): Promise<ModerationCaseDetailDto> {
  const row = await prisma.moderationCase.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Không tìm thấy case kiểm duyệt');

  if (!openQueueStatuses.includes(row.status as (typeof openQueueStatuses)[number])) {
    throw AppError.badRequest('Case đã được xử lý');
  }

  const now = new Date();
  let newStatus: 'RESOLVED_KEPT' | 'RESOLVED_REMOVED' | 'DISMISSED';

  await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: row.targetId },
      select: { id: true, hiddenAt: true, deletedAt: true },
    });

    if (body.action === 'KEEP') {
      newStatus = 'RESOLVED_KEPT';
      if (post && !post.hiddenAt && !post.deletedAt) {
        await tx.post.update({ where: { id: row.targetId }, data: { hiddenAt: now } });
      }
    } else if (body.action === 'REMOVE') {
      newStatus = 'RESOLVED_REMOVED';
      if (post && !post.deletedAt) {
        await tx.post.update({ where: { id: row.targetId }, data: { deletedAt: now } });
      }
    } else {
      newStatus = 'DISMISSED';
      if (post?.hiddenAt) {
        await tx.post.update({ where: { id: row.targetId }, data: { hiddenAt: null } });
      }
    }

    await tx.moderationCase.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: adminId,
        reviewedAt: now,
        resolutionNote: body.resolutionNote,
      },
    });
  });

  await writeAuditLog({
    actorId: adminId,
    action: `MODERATION_${body.action}`,
    targetType: 'MODERATION_CASE',
    targetId: id,
    metadata: { action: body.action, resolutionNote: body.resolutionNote },
  });

  await notifyAuthor(id, row.authorId);
  return getModerationCase(id);
}

/** User xem case kiểm duyệt của chính mình. */
export async function getMyModerationCase(
  userId: string,
  id: string,
): Promise<MyModerationCaseDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id },
    include: { appeal: true },
  });
  if (!row || row.authorId !== userId) {
    throw AppError.notFound('Không tìm thấy thông tin kiểm duyệt');
  }

  const post = await prisma.post.findUnique({
    where: { id: row.targetId },
    select: { content: true },
  });

  return {
    id: row.id,
    targetType: row.targetType as MyModerationCaseDto['targetType'],
    targetId: row.targetId,
    label: row.label as MyModerationCaseDto['label'],
    confidence: row.confidence,
    reason: row.reason,
    status: row.status as MyModerationCaseDto['status'],
    autoHidden: row.autoHidden,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    targetContent: post?.content ?? null,
    appeal: row.appeal ? mapAppeal(row.appeal) : null,
  };
}

/** User gửi kháng nghị cho case kiểm duyệt. */
export async function submitAppeal(
  userId: string,
  caseId: string,
  body: AppealSubmitBody,
): Promise<AppealDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: { appeal: true },
  });
  if (!row || row.authorId !== userId) {
    throw AppError.notFound('Không tìm thấy thông tin kiểm duyệt');
  }
  if (row.appeal) {
    throw AppError.conflict('Bạn đã gửi kháng nghị cho case này');
  }
  if (!['PENDING', 'AUTO_HIDDEN', 'RESOLVED_KEPT', 'RESOLVED_REMOVED'].includes(row.status)) {
    throw AppError.badRequest('Case này chưa thể kháng nghị');
  }

  const appeal = await prisma.appeal.create({
    data: {
      caseId,
      userId,
      message: body.message,
    },
  });

  return mapAppeal(appeal);
}

/** Admin duyệt hoặc từ chối kháng nghị. */
export async function reviewAppeal(
  adminId: string,
  caseId: string,
  body: AppealReviewBody,
): Promise<ModerationCaseDetailDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: { appeal: true },
  });
  if (!row) throw AppError.notFound('Không tìm thấy case kiểm duyệt');
  if (!row.appeal || row.appeal.status !== 'PENDING') {
    throw AppError.badRequest('Không có kháng nghị đang chờ duyệt');
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.appeal.update({
      where: { id: row.appeal!.id },
      data: {
        status: body.decision,
        reviewedById: adminId,
        reviewedAt: now,
        decisionNote: body.decisionNote,
      },
    });

    if (body.decision === 'APPROVED') {
      await tx.post.update({
        where: { id: row.targetId },
        data: { hiddenAt: null, deletedAt: null },
      });
      await tx.moderationCase.update({
        where: { id: caseId },
        data: {
          status: 'DISMISSED',
          reviewedById: adminId,
          reviewedAt: now,
          resolutionNote: body.decisionNote,
        },
      });
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: `APPEAL_${body.decision}`,
    targetType: 'MODERATION_CASE',
    targetId: caseId,
    metadata: { decisionNote: body.decisionNote },
  });

  await createNotification({
    recipientId: row.authorId,
    actorId: null,
    type: body.decision === 'APPROVED' ? 'APPEAL_APPROVED' : 'APPEAL_REJECTED',
    entityType: 'MODERATION',
    entityId: caseId,
  });

  return getModerationCase(caseId);
}
