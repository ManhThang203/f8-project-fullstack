import { MediaKind, MediaStatus, prisma } from '@costy/db';
import type { CreatePostBody, CursorPageQuery, PostFeedItemDto } from '@costy/shared';

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

import { canViewPost, getTopReactionsMap } from './posts.access.js';
import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import {
  emitCommentCountChanged,
  emitCommentCreated,
  emitCommentDeleted,
  emitPostCreated,
} from './posts.realtime.js';
import {
  decodeCursor,
  encodeCursor,
  isVideoMime,
  parseMentions,
  resolveRootPostId,
  validatePostFiles,
} from './posts.utils.js';

export * from './posts.feed.service.js';

/** Đẩy job AI moderation vào BullMQ (không chặn response). */
async function enqueueModerationJob(postId: string, content: string): Promise<void> {
  if (!MODERATION_CONFIG.enabled || !content.trim()) return;
  try {
    await contentModerationQueue.add('moderate-post', { postId }, { jobId: `moderate-${postId}` });
  } catch (err) {
    logger.error({ err, postId }, 'Failed to enqueue moderation job');
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

  try {
    const postId = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: opts.authorId,
          content: content || '',
          parentId: opts.body.parentId ?? null,
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

    let commentRootPostId: string | null = null;
    if (opts.body.parentId) {
      const parentPost = await prisma.post.findUnique({
        where: { id: opts.body.parentId },
        select: { id: true, authorId: true, parentId: true },
      });

      if (parentPost) {
        commentRootPostId = resolveRootPostId(parentPost);
        if (parentPost.authorId !== opts.authorId) {
          await createNotification({
            recipientId: parentPost.authorId,
            actorId: opts.authorId,
            type: 'POST_REPLIED',
            entityType: 'post',
            entityId: postId,
          });
        }

        const parentLikers = await prisma.postLike.findMany({
          where: { postId: parentPost.id },
          select: { userId: true },
        });
        const parentCommenters = await prisma.post.findMany({
          where: { parentId: parentPost.id, deletedAt: null },
          select: { authorId: true },
        });

        const followers = new Set<string>();
        parentLikers.forEach((l) => followers.add(l.userId));
        parentCommenters.forEach((c) => followers.add(c.authorId));

        followers.delete(opts.authorId);
        followers.delete(parentPost.authorId);

        for (const recipientId of Array.from(followers)) {
          await createNotification({
            recipientId,
            actorId: opts.authorId,
            type: 'POST_COMMENTED_FOLLOWED',
            entityType: 'post',
            entityId: postId,
          });
        }
      }
    }

    await notifyMentions(content, postId, opts.authorId);

    if (!opts.body.parentId && content) {
      await embeddingQueue
        .add('index', { postId, content }, { jobId: postId })
        .catch((err) => logger.error({ err, postId }, 'failed to enqueue embedding job'));
    }

    const dto = mapPostToFeedItemDto(row);
    if (!opts.body.parentId) {
      void emitPostCreated(opts.authorId, dto, row.visibility);
    } else {
      const rootPostId = commentRootPostId ?? opts.body.parentId!;
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

export async function setPostReaction(postId: string, userId: string, reactionType: string | null) {
  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');

  if (reactionType) {
    await prisma.postLike.upsert({
      where: { userId_postId: { userId, postId } },
      update: { type: reactionType },
      create: { userId, postId, type: reactionType },
    });

    if (userId !== post.authorId) {
      await createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: 'POST_LIKED',
        entityType: 'post',
        entityId: postId,
        reactionType,
      });
    }
  } else {
    await prisma.postLike.deleteMany({
      where: { userId, postId },
    });
  }

  // Lấy tổng like sau khi update
  const likeCount = await prisma.postLike.count({ where: { postId } });

  return { postId, reactionType, likeCount };
}

/** Sửa nội dung / chế độ riêng tư bài viết; chỉ chủ bài được sửa. */
export async function editPost(
  postId: string,
  userId: string,
  body: { content?: string; visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' },
): Promise<PostFeedItemDto> {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, content: true, parentId: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (post.authorId !== userId) {
    throw AppError.forbidden('Bạn không có quyền sửa bài viết này');
  }

  const nextContent = body.content?.trim();
  await prisma.post.update({
    where: { id: postId },
    data: {
      ...(nextContent !== undefined ? { content: nextContent } : {}),
      ...(body.visibility ? { visibility: body.visibility } : {}),
    },
  });

  // Cập nhật lại hashtag khi nội dung bài gốc thay đổi.
  if (nextContent !== undefined && !post.parentId) {
    await syncPostHashtags(postId, nextContent);
  }

  const row = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: postFeedInclude,
  });

  let myReaction: string | null = null;
  const like = await prisma.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
    select: { type: true },
  });
  if (like) myReaction = like.type;

  const topReactionsMap = await getTopReactionsMap([postId]);
  return mapPostToFeedItemDto(
    row,
    myReaction,
    false,
    topReactionsMap.get(postId) ?? [],
  );
}

/** Tạo notification MENTION cho những user được nhắc trong bài (bỏ qua chính tác giả). */
async function notifyMentions(content: string, postId: string, authorId: string): Promise<void> {
  const usernames = parseMentions(content);
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, deletedAt: null },
    select: { id: true },
  });

  for (const user of users) {
    if (user.id === authorId) continue;
    await createNotification({
      recipientId: user.id,
      actorId: authorId,
      type: 'MENTION',
      entityType: 'post',
      entityId: postId,
    });
  }
}

/** Lưu (bookmark) bài viết; idempotent. */
export async function savePost(postId: string, userId: string): Promise<{ savedByMe: boolean }> {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (!(await canViewPost(userId, post))) {
    throw AppError.forbidden('Bạn không có quyền lưu bài viết này');
  }

  await prisma.postSave.upsert({
    where: { userId_postId: { userId, postId } },
    update: {},
    create: { userId, postId },
  });
  return { savedByMe: true };
}

/** Bỏ lưu bài viết; idempotent. */
export async function unsavePost(
  postId: string,
  userId: string,
): Promise<{ savedByMe: boolean }> {
  await prisma.postSave.deleteMany({ where: { userId, postId } });
  return { savedByMe: false };
}

/** Ghi nhận một lượt chia sẻ và trả về tổng số lượt chia sẻ. */
export async function sharePost(
  postId: string,
  userId: string,
): Promise<{ shareCount: number }> {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (!(await canViewPost(userId, post))) {
    throw AppError.forbidden('Bạn không có quyền chia sẻ bài viết này');
  }

  await prisma.postShare.create({ data: { userId, postId } });
  const shareCount = await prisma.postShare.count({ where: { postId } });
  return { shareCount };
}

/** Danh sách bài viết mình đã lưu, phân trang cursor. */
export async function listSavedPosts(
  userId: string,
  query: CursorPageQuery,
): Promise<{ items: PostFeedItemDto[]; nextCursor: string | null }> {
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const where = cursorData
    ? {
        userId,
        post: { deletedAt: null },
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { postId: { lt: cursorData.id } }],
          },
        ],
      }
    : { userId, post: { deletedAt: null } };

  const rows = await prisma.postSave.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
    take: query.limit + 1,
    include: { post: { include: postFeedInclude } },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  let reactionMap = new Map<string, string>();
  if (page.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: { userId, postId: { in: page.map((r) => r.postId) } },
      select: { postId: true, type: true },
    });
    reactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }

  const topReactionsMap = await getTopReactionsMap(page.map((r) => r.postId));

  const items = page.map((r) =>
    mapPostToFeedItemDto(
      r.post,
      reactionMap.get(r.postId) ?? null,
      true,
      topReactionsMap.get(r.postId) ?? [],
    ),
  );

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.postId) : null;

  return { items, nextCursor };
}

// Xóa bài viết / bình luận
export async function deletePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    include: { parent: { select: { authorId: true, id: true, parentId: true } } },
  });

  if (!post) {
    throw AppError.notFound('Bài viết không tồn tại');
  }

  const isOwner = post.authorId === userId;
  const isParentOwner = post.parent?.authorId === userId;

  if (!isOwner && !isParentOwner) {
    throw AppError.forbidden('Bạn không có quyền xóa nội dung này');
  }

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });

  if (post.parentId) {
    const rootPostId = post.parent ? resolveRootPostId(post.parent) : post.parentId;
    emitCommentDeleted(rootPostId, postId, userId);
    emitCommentCountChanged(rootPostId, -1, userId);
  }

  return { success: true, postId };
}
