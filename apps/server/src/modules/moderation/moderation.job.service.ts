import { prisma } from '@costy/db';

import { MODERATION_CONFIG } from '../../config/moderation.config.js';
import { classifyContent } from '../../lib/ai/moderation-ai.service.js';
import { logger } from '../../lib/logger.js';
import { emitPostHidden } from '../posts/posts.realtime.js';
import { resolveRootPostId } from '../posts/posts.utils.js';

import { notifyAuthor, openQueueStatuses, resolveTargetType } from './moderation.helpers.js';

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
      rootPostId: true,
      visibility: true,
      deletedAt: true,
      hiddenAt: true,
      parent: { select: { id: true, parentId: true, rootPostId: true } },
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
    const rootPostId = post.parentId
      ? (post.rootPostId ??
        (post.parent ? (post.parent.rootPostId ?? resolveRootPostId(post.parent)) : post.parentId))
      : null;
    await emitPostHidden(post.authorId, postId, post.visibility, post.parentId, rootPostId);
  }

  logger.info(
    { caseId: moderationCase.id, postId, label, confidence, autoHide },
    'AI moderation case created',
  );
}
