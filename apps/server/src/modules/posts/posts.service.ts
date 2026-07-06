import { prisma } from '@costy/db';
import type { PostFeedItemDto } from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { syncPostHashtags } from '../../lib/hashtag/hashtag.service.js';

import { getCommentCountForRoot } from './posts-count.js';
import { getTopReactionsMap } from './posts.access.js';
import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import { emitCommentCountChanged, emitCommentDeleted } from './posts.realtime.js';
import { resolveRootPostId } from './posts.utils.js';

export * from './posts.feed.service.js';
export { createPost } from './posts.create.service.js';
export {
  listSavedPosts,
  savePost,
  setPostReaction,
  sharePost,
  unsavePost,
} from './posts.interactions.service.js';

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
  let cCount: number | undefined;
  if (!row.parentId && row.rootPostId === null) {
    cCount = await getCommentCountForRoot(postId);
  }
  return mapPostToFeedItemDto(
    row,
    myReaction,
    false,
    topReactionsMap.get(postId) ?? [],
    cCount,
  );
}

// Xóa bài viết / bình luận
export async function deletePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: {
      id: true,
      authorId: true,
      parentId: true,
      rootPostId: true,
      parent: { select: { authorId: true, id: true, parentId: true, rootPostId: true } },
    },
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
    // Ưu tiên dùng rootPostId đã lưu trên chính comment hoặc trên parent
    const rootPostId =
      post.rootPostId ?? (post.parent ? (post.parent.rootPostId ?? resolveRootPostId(post.parent)) : post.parentId);
    emitCommentDeleted(rootPostId, postId, userId);
    emitCommentCountChanged(rootPostId, -1, userId);
  }

  return { success: true, postId };
}
