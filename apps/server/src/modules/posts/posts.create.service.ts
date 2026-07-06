import { MediaKind, MediaStatus, prisma } from '@costy/db';
import type { CreatePostBody, PostFeedItemDto } from '@costy/shared';

import { MODERATION_CONFIG } from '../../config/moderation.config.js';
import {
  destroyMany,
  getCloudinaryCloudName,
  isCloudinaryConfigured,
  uploadBuffer,
  type CloudinaryUploadResult,
} from '../../lib/cloudinary.js';
import { AppError } from '../../lib/errors.js';
import { syncPostHashtags } from '../../lib/hashtag/hashtag.service.js';
import { logger } from '../../lib/logger.js';
import { contentModerationQueue, embeddingQueue } from '../../queues/index.js';
import { createNotification } from '../notifications/notifications.service.js';

import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import {
  emitCommentCountChanged,
  emitCommentCreated,
  emitPostCreated,
} from './posts.realtime.js';
import { isVideoMime, parseMentions, resolveRootPostId, validatePostFiles } from './posts.utils.js';

/** Đẩy job AI moderation vào BullMQ (không chặn response). */
async function enqueueModerationJob(postId: string, content: string): Promise<void> {
  if (!MODERATION_CONFIG.enabled || !content.trim()) return;
  try {
    await contentModerationQueue.add('moderate-post', { postId }, { jobId: `moderate-${postId}` });
  } catch (err) {
    logger.error({ err, postId }, 'Failed to enqueue moderation job');
  }
}

/** Tạo notification MENTION cho những user được nhắc trong bài (bỏ qua tác giả và người đã nhận POST_REPLIED). */
async function notifyMentions(
  content: string,
  postId: string,
  authorId: string,
  excludeIds: Set<string> = new Set(),
): Promise<void> {
  const usernames = parseMentions(content);
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, deletedAt: null },
    select: { id: true },
  });

  for (const user of users) {
    if (user.id === authorId) continue;
    if (excludeIds.has(user.id)) continue;
    await createNotification({
      recipientId: user.id,
      actorId: authorId,
      type: 'MENTION',
      entityType: 'post',
      entityId: postId,
    });
  }
}

// Tạo bài viết
export async function createPost(opts: {
  authorId: string;
  body: CreatePostBody;
  files: Express.Multer.File[];
}): Promise<PostFeedItemDto> {
  const content = opts.body.content?.trim() ?? '';
  validatePostFiles(opts.files, content);

  if (opts.files.length > 0 && !isCloudinaryConfigured()) {
    throw AppError.badRequest('Cloudinary chưa được cấu hình trên server');
  }

  const uploaded: CloudinaryUploadResult[] = [];

  if (opts.files.length > 0) {
    const settled = await Promise.allSettled(
      opts.files.map((file) => uploadBuffer(file.buffer, file.mimetype)),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value);
        continue;
      }

      await destroyMany(
        uploaded.map((u) => ({ publicId: u.publicId, resourceType: u.resourceType })),
      );
      const message = result.reason instanceof Error ? result.reason.message : 'Upload thất bại';
      logger.error({ err: result.reason }, 'Cloudinary upload failed during createPost');
      const isAuthError = message.includes('Invalid cloud_name') || message.includes('(HTTP 401)');
      const isPermissionError = message.includes('(HTTP 403)');
      if (isAuthError) {
        throw AppError.badRequest(
          `Cấu hình Cloudinary không hợp lệ. Cloud name "${getCloudinaryCloudName()}" bị Cloudinary từ chối (401). Lấy đúng Cloud name, API Key, API Secret từ Dashboard → Product environment credentials.`,
        );
      }
      if (isPermissionError) {
        throw AppError.badRequest(
          `API Key Cloudinary không có quyền upload (Cloudinary trả 403 "missing permissions: create"). Dùng API Key + API Secret mặc định (full access) trong Dashboard → Settings → API Keys, thay vì access key giới hạn quyền.`,
        );
      }
      throw AppError.badRequest(`Không tải được media: ${message}`);
    }
  }

  // Tính rootPostId trước transaction (nếu là comment/reply).
  // rootPostId = root của cha nếu cha đã có, ngược lại = id của cha (cha là gốc của thread).
  let rootPostIdForCreate: string | null = null;
  if (opts.body.parentId) {
    const parentForRoot = await prisma.post.findUnique({
      where: { id: opts.body.parentId },
      select: { id: true, parentId: true, rootPostId: true },
    });
    if (parentForRoot) {
      rootPostIdForCreate = parentForRoot.rootPostId ?? parentForRoot.id;
    }
  }

  try {
    const postId = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: opts.authorId,
          content: content || '',
          parentId: opts.body.parentId ?? null,
          rootPostId: rootPostIdForCreate,
          visibility: opts.body.visibility ?? 'PUBLIC',
        },
      });

      if (uploaded.length > 0) {
        await tx.media.createMany({
          data: uploaded.map((result, index) => {
            const file = opts.files[index]!;
            const isVideo = isVideoMime(file.mimetype);
            return {
              ownerId: opts.authorId,
              postId: post.id,
              kind: isVideo ? MediaKind.VIDEO : MediaKind.IMAGE,
              status: MediaStatus.READY,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              storagePath: result.publicId,
              publicUrl: result.secureUrl,
              width: result.width || null,
              height: result.height || null,
              durationMs: isVideo ? result.durationMs : null,
            };
          }),
        });
      }

      return post.id;
    });

    const row = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: postFeedInclude,
    });

    if (!opts.body.parentId) {
      await syncPostHashtags(postId, content);
    }

    void enqueueModerationJob(postId, content);

    let commentRootPostId: string | null = rootPostIdForCreate;
    // Chỉ thông báo cho chủ bài gốc (mọi comment/reply trong thread) và chủ comment cha (khi bị reply trực tiếp).
    const notifiedRecipients = new Set<string>();
    if (opts.body.parentId) {
      const parentPost = await prisma.post.findUnique({
        where: { id: opts.body.parentId },
        select: { id: true, authorId: true, parentId: true, rootPostId: true },
      });

      if (parentPost) {
        // Ưu tiên dùng rootPostId đã tính trước (denormalized). Fallback resolve 1 cấp nếu chưa có.
        commentRootPostId = commentRootPostId ?? resolveRootPostId(parentPost);

        const rootOwnerId = parentPost.parentId === null
          ? parentPost.authorId
          : (
              await prisma.post.findUnique({
                where: { id: commentRootPostId! },
                select: { authorId: true },
              })
            )?.authorId ?? null;

        if (rootOwnerId && rootOwnerId !== opts.authorId) {
          await createNotification({
            recipientId: rootOwnerId,
            actorId: opts.authorId,
            type: 'POST_REPLIED',
            entityType: 'post',
            entityId: postId,
          });
          notifiedRecipients.add(rootOwnerId);
        }

        // Chủ comment cha chỉ nhận thêm thông báo khi khác chủ bài gốc (tránh trùng lặp).
        if (parentPost.authorId !== opts.authorId && !notifiedRecipients.has(parentPost.authorId)) {
          await createNotification({
            recipientId: parentPost.authorId,
            actorId: opts.authorId,
            type: 'POST_REPLIED',
            entityType: 'post',
            entityId: postId,
          });
          notifiedRecipients.add(parentPost.authorId);
        }
      }
    }

    await notifyMentions(content, postId, opts.authorId, notifiedRecipients);

    if (!opts.body.parentId && content) {
      await embeddingQueue
        .add('index', { postId, content }, { jobId: postId })
        .catch((err) => logger.error({ err, postId }, 'failed to enqueue embedding job'));
    }

    const dto = mapPostToFeedItemDto(row);
    if (!opts.body.parentId) {
      void emitPostCreated(opts.authorId, dto, row.visibility);
    } else {
      // Sử dụng rootPostId đã tính (ưu tiên denormalized rootPostId)
      const rootPostId = commentRootPostId ?? rootPostIdForCreate ?? opts.body.parentId!;
      emitCommentCreated(rootPostId, dto, opts.authorId);
      emitCommentCountChanged(rootPostId, 1, opts.authorId);
    }

    return dto;
  } catch (error) {
    if (uploaded.length > 0) {
      await destroyMany(
        uploaded.map((u) => ({ publicId: u.publicId, resourceType: u.resourceType })),
      );
    }
    throw error;
  }
}
