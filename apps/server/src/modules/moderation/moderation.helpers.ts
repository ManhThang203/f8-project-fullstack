import { prisma } from '@costy/db';
import type { ModerationCaseDetailDto } from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';

import { mapAppeal, mapCase } from './moderation.mapper.js';

export const authorSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

export const openQueueStatuses = ['PENDING', 'AUTO_HIDDEN'] as const;

/** Xác định targetType từ post (comment = có parentId). */
export function resolveTargetType(parentId: string | null): 'POST' | 'COMMENT' {
  return parentId ? 'COMMENT' : 'POST';
}

/** Gửi thông báo kiểm duyệt cho tác giả nội dung. */
export async function notifyAuthor(caseId: string, authorId: string): Promise<void> {
  await createNotification({
    recipientId: authorId,
    actorId: null,
    type: 'MODERATION_ACTION',
    entityType: 'MODERATION',
    entityId: caseId,
  });
}

/** Chi tiết moderation case cho admin (kèm target content, scores, appeal). */
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
