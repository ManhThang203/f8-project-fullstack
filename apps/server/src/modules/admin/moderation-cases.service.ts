import { prisma } from '@costy/db';
import type {
  AdminReportDto,
  AppealDto,
  ModerationCaseDetailDto,
  ModerationCaseDto,
  ModerationCaseListQuery,
  ModerationCaseResolve,
  RestrictedPostDto,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';
import { invalidateStatsCache } from './admin-stats.service.js';

const SLA_MS = 24 * 60 * 60 * 1000; // 24 hours
const APPEAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Check if the SLA has been breached
function isSlaBreached(openedAt: Date): boolean {
  return Date.now() - openedAt.getTime() > SLA_MS;
}
/** Map the moderation case to the DTO */
function mapCase(
  row: {
    id: string;
    targetType: string;
    targetId: string;
    authorId: string;
    trigger: string;
    status: string;
    reportCount: number;
    openedAt: Date;
    closedAt: Date | null;
    resolution: string | null;
    author?: { id: string; username: string; name: string | null; image: string | null };
    appeals?: { status: string }[];
  },
  extras?: { targetPreview?: string | null },
): ModerationCaseDto {
  const hasPendingAppeal = row.appeals?.some((a) => a.status === 'PENDING') ?? false;
  return {
    id: row.id,
    targetType: row.targetType as ModerationCaseDto['targetType'],
    targetId: row.targetId,
    authorId: row.authorId,
    trigger: row.trigger as ModerationCaseDto['trigger'],
    status: row.status as ModerationCaseDto['status'],
    reportCount: row.reportCount,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    resolution: row.resolution,
    slaBreached: isSlaBreached(row.openedAt),
    hasPendingAppeal,
    author: row.author,
    targetPreview: extras?.targetPreview,
  };
}

// Map the report to the DTO
function mapReport(r: {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  reporter?: { id: string; username: string; name: string | null; image: string | null };
}): AdminReportDto {
  return {
    id: r.id,
    reporterId: r.reporterId,
    targetType: r.targetType as AdminReportDto['targetType'],
    targetId: r.targetId,
    reason: r.reason as AdminReportDto['reason'],
    description: r.description,
    status: r.status as AdminReportDto['status'],
    reviewedById: r.reviewedById,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    resolutionNote: r.resolutionNote,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter,
  };
}

// Map the appeal to the DTO
function mapAppeal(a: {
  id: string;
  caseId: string;
  authorId: string;
  message: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
}): AppealDto {
  return {
    id: a.id,
    caseId: a.caseId,
    authorId: a.authorId,
    message: a.message,
    status: a.status as AppealDto['status'],
    createdAt: a.createdAt.toISOString(),
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
  };
}

/** Tạo hoặc tái sử dụng case OPEN sau auto-hide; thông báo author. */
export async function openCaseFromAutoHide(
  targetId: string,
  authorId: string,
  reportCount: number,
): Promise<void> {
  const existing = await prisma.moderationCase.findFirst({
    where: {
      targetType: 'POST',
      targetId,
      status: { in: ['OPEN', 'UNDER_REVIEW'] },
    },
  });

  const moderationCase =
    existing ??
    (await prisma.moderationCase.create({
      data: {
        targetType: 'POST',
        targetId,
        authorId,
        trigger: 'AUTO_HIDE_MINOR_SAFETY',
        status: 'OPEN',
        reportCount,
      },
    }));

  if (!existing) {
    await createNotification({
      recipientId: authorId,
      type: 'SYSTEM',
      entityType: 'CASE',
      entityId: moderationCase.id,
    });
  }
}
// List moderation cases
export async function listModerationCases(
  query: ModerationCaseListQuery,
): Promise<{ items: ModerationCaseDto[]; nextCursor: string | null }> {
  const take = query.limit + 1;
  const hasAppealFilter =
    query.hasAppeal === 'true' ? true : query.hasAppeal === 'false' ? false : undefined;
  const slaFilter =
    query.slaBreached === 'true' ? true : query.slaBreached === 'false' ? false : undefined;

  const rows = await prisma.moderationCase.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      ...(hasAppealFilter === true
        ? { appeals: { some: { status: 'PENDING' } } }
        : hasAppealFilter === false
          ? { appeals: { none: { status: 'PENDING' } } }
          : {}),
    },
    orderBy: { openedAt: 'desc' },
    take,
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      appeals: { select: { status: true } },
    },
  });

  let filtered = rows;
  if (slaFilter !== undefined) {
    filtered = rows.filter((r) => isSlaBreached(r.openedAt) === slaFilter);
  }

  const enriched = await Promise.all(
    filtered.map(async (r) => {
      let targetPreview: string | null = null;
      if (r.targetType === 'POST') {
        const post = await prisma.post.findUnique({
          where: { id: r.targetId },
          select: { content: true },
        });
        targetPreview = post?.content?.slice(0, 120) ?? null;
      }
      return mapCase(r, { targetPreview });
    }),
  );

  const hasMore = enriched.length > query.limit;
  const page = hasMore ? enriched.slice(0, query.limit) : enriched;
  const nextCursor = hasMore && page.length ? page[page.length - 1]!.id : null;
  return { items: page, nextCursor };
}

// Get moderation case
export async function getModerationCase(caseId: string): Promise<ModerationCaseDetailDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      appeals: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!row) throw AppError.notFound('Không tìm thấy vụ kiểm duyệt');

  let targetContent: string | null = null;
  let targetAuthor: ModerationCaseDetailDto['targetAuthor'] = null;
  let targetMedia: ModerationCaseDetailDto['targetMedia'] = null;

  if (row.targetType === 'POST') {
    const post = await prisma.post.findUnique({
      where: { id: row.targetId },
      select: {
        content: true,
        hiddenAt: true,
        author: { select: { id: true, username: true, name: true, image: true, status: true } },
        media: { select: { id: true, kind: true, publicUrl: true } },
      },
    });
    targetContent = post?.content ?? null;
    targetAuthor = post?.author ? { ...post.author, status: post.author.status as string } : null;
    targetMedia = post?.media ?? null;
  }

  const relatedRows = await prisma.report.findMany({
    where: { targetType: row.targetType, targetId: row.targetId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const auditRows = await prisma.adminAuditLog.findMany({
    where: {
      OR: [
        { targetType: 'POST', targetId: row.targetId },
        { targetType: 'REPORT', targetId: { in: relatedRows.map((r) => r.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { actor: { select: { id: true, username: true, name: true } } },
  });

  return {
    ...mapCase(row),
    targetContent,
    targetAuthor,
    targetMedia,
    relatedReports: relatedRows.map((r) => mapReport(r)),
    auditLogs: auditRows.map((a) => ({
      id: a.id,
      actorId: a.actorId,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
    })),
    appeals: row.appeals.map(mapAppeal),
  };
}

// Resolve moderation case
export async function resolveModerationCase(
  actorId: string,
  caseId: string,
  body: ModerationCaseResolve,
): Promise<ModerationCaseDto> {
  const moderationCase = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: { appeals: { where: { status: 'PENDING' } } },
  });
  if (!moderationCase) throw AppError.notFound('Không tìm thấy vụ kiểm duyệt');
  if (moderationCase.status === 'RESTORED' || moderationCase.status === 'UPHELD') {
    throw AppError.badRequest('Vụ kiểm duyệt đã được đóng');
  }
  if (moderationCase.targetType !== 'POST') {
    throw AppError.badRequest('Chỉ hỗ trợ kiểm duyệt bài viết');
  }

  const post = await prisma.post.findUnique({
    where: { id: moderationCase.targetId },
    select: { id: true, authorId: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');

  const now = new Date();
  const isRestore = body.decision === 'RESTORE';

  await prisma.$transaction(async (tx) => {
    if (isRestore) {
      await tx.post.update({
        where: { id: post.id },
        data: { hiddenAt: null, moderationReviewedAt: now },
      });
      await tx.report.updateMany({
        where: {
          targetType: 'POST',
          targetId: post.id,
          reason: 'MINOR_SAFETY',
        },
        data: {
          status: 'DISMISSED',
          reviewedById: actorId,
          reviewedAt: now,
          resolutionNote: `[Case restored] ${body.resolutionNote}`,
        },
      });
    } else {
      await tx.report.updateMany({
        where: {
          targetType: 'POST',
          targetId: post.id,
          status: { in: ['AUTO_HIDDEN', 'PENDING', 'UNDER_REVIEW'] },
        },
        data: {
          status: 'RESOLVED',
          reviewedById: actorId,
          reviewedAt: now,
          resolutionNote: `[Case upheld] ${body.resolutionNote}`,
        },
      });
    }

    await tx.moderationCase.update({
      where: { id: caseId },
      data: {
        status: isRestore ? 'RESTORED' : 'UPHELD',
        closedAt: now,
        closedById: actorId,
        resolution: body.resolutionNote,
      },
    });

    if (moderationCase.appeals.length > 0) {
      await tx.appeal.updateMany({
        where: { caseId, status: 'PENDING' },
        data: {
          status: isRestore ? 'ACCEPTED' : 'REJECTED',
          reviewedAt: now,
        },
      });
    }
  });

  await writeAuditLog({
    actorId,
    action: isRestore ? 'CASE_RESTORED' : 'CASE_UPHELD',
    targetType: 'POST',
    targetId: post.id,
    metadata: {
      caseId,
      decision: body.decision,
      resolutionNote: body.resolutionNote,
    },
  });

  await createNotification({
    recipientId: post.authorId,
    actorId,
    type: 'SYSTEM',
    entityType: isRestore ? 'POST' : 'POST_UPHELD',
    entityId: post.id,
  });

  await invalidateStatsCache();

  const updated = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      appeals: { select: { status: true } },
    },
  });
  return mapCase(updated!);
}

/** Bài bị ẩn của user đang đăng nhập (cho trang kháng nghị). */
export async function listRestrictedPostsForUser(userId: string): Promise<RestrictedPostDto[]> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId, hiddenAt: { not: null }, deletedAt: null },
    orderBy: { hiddenAt: 'desc' },
    take: 50,
    select: { id: true, content: true, hiddenAt: true },
  });

  const result: RestrictedPostDto[] = [];
  for (const post of posts) {
    const moderationCase = await prisma.moderationCase.findFirst({
      where: { targetType: 'POST', targetId: post.id },
      orderBy: { openedAt: 'desc' },
      include: {
        appeals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    result.push({
      id: post.id,
      content: post.content.slice(0, 200),
      hiddenAt: post.hiddenAt!.toISOString(),
      caseId: moderationCase?.id ?? null,
      caseStatus: (moderationCase?.status as RestrictedPostDto['caseStatus']) ?? null,
      appealStatus: moderationCase?.appeals[0]
        ? (moderationCase.appeals[0].status as AppealDto['status'])
        : null,
    });
  }
  return result;
}

/** User gửi kháng nghị cho bài bị ẩn. */
export async function createAppealForPost(
  userId: string,
  postId: string,
  message: string,
): Promise<AppealDto> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, hiddenAt: true, deletedAt: true },
  });
  if (!post || post.deletedAt) throw AppError.notFound('Bài viết không tồn tại');
  if (post.authorId !== userId) throw AppError.forbidden('Bạn không có quyền kháng nghị bài này');
  if (!post.hiddenAt) throw AppError.badRequest('Bài viết không bị hạn chế hiển thị');

  const moderationCase = await prisma.moderationCase.findFirst({
    where: {
      targetType: 'POST',
      targetId: postId,
      status: { in: ['OPEN', 'UNDER_REVIEW', 'UPHELD'] },
    },
    orderBy: { openedAt: 'desc' },
  });
  if (!moderationCase) {
    throw AppError.badRequest('Không tìm thấy vụ kiểm duyệt cho bài viết này');
  }

  const recentAppeal = await prisma.appeal.findFirst({
    where: {
      caseId: moderationCase.id,
      authorId: userId,
      createdAt: { gte: new Date(Date.now() - APPEAL_COOLDOWN_MS) },
    },
  });
  if (recentAppeal) {
    throw AppError.badRequest('Bạn đã gửi kháng nghị cho vụ này trong 7 ngày qua');
  }

  const pending = await prisma.appeal.findFirst({
    where: { caseId: moderationCase.id, status: 'PENDING' },
  });
  if (pending) throw AppError.conflict('Đã có kháng nghị đang chờ xử lý');

  const appeal = await prisma.$transaction(async (tx) => {
    const created = await tx.appeal.create({
      data: {
        caseId: moderationCase.id,
        authorId: userId,
        message,
      },
    });
    await tx.moderationCase.update({
      where: { id: moderationCase.id },
      data: { status: 'UNDER_REVIEW' },
    });
    return created;
  });

  return mapAppeal(appeal);
}
