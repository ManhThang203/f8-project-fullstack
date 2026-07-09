import { prisma } from '@costy/db';
import type {
  ModerationCaseActionBody,
  ModerationCaseDetailDto,
  ModerationCaseDto,
  ModerationCaseListQuery,
  MyModerationCaseDto,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';

import {
  authorSelect,
  getModerationCase,
  notifyAuthor,
  openQueueStatuses,
} from './moderation.helpers.js';
import { mapAppeal, mapCase } from './moderation.mapper.js';

export { getModerationCase } from './moderation.helpers.js';
export { runModerationJob } from './moderation.job.service.js';
export { reviewAppeal, submitAppeal } from './moderation.appeals.service.js';

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

  // Batch: lấy preview content của post target trong 1 query (IN) thay vì mỗi case 1 query
  const postIds = [...new Set(page.map((row) => row.targetId))];
  const posts = postIds.length
    ? await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: { id: true, content: true },
      })
    : [];
  const postContentMap = new Map(posts.map((p) => [p.id, p.content]));

  const enriched = page.map((row) =>
    mapCase({
      ...row,
      targetPreview: postContentMap.get(row.targetId)?.slice(0, 120) ?? null,
    }),
  );

  const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
  return { items: enriched, nextCursor };
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
