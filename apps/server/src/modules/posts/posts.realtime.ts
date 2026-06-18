import { prisma } from '@costy/db';
import type { PostFeedItemDto } from '@costy/shared';

import { logger } from '../../lib/logger.js';
import { getRealtimeIo } from '../../lib/realtime.js';
import { getFriendIds } from '../friends/friends.service.js';

type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

/** Lấy danh sách room `user:{id}` cần nhận sự kiện bài mới theo visibility. */
async function resolvePostCreatedRooms(
  authorId: string,
  visibility: PostVisibility,
): Promise<string[]> {
  const ids = new Set<string>([authorId]);

  if (visibility === 'PRIVATE') {
    return [...ids].map((id) => `user:${id}`);
  }

  const friendIds = await getFriendIds(authorId);
  for (const id of friendIds) ids.add(id);

  if (visibility === 'PUBLIC') {
    const followers = await prisma.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
    });
    for (const f of followers) ids.add(f.followerId);
  }

  return [...ids].map((id) => `user:${id}`);
}

/** Push sự kiện post:created tới tác giả và người được phép xem (followers/bạn bè). */
export async function emitPostCreated(
  authorId: string,
  dto: PostFeedItemDto,
  visibility: PostVisibility,
): Promise<void> {
  const io = getRealtimeIo();
  if (!io) return;

  try {
    const rooms = await resolvePostCreatedRooms(authorId, visibility);
    io.of('/feed').to(rooms).emit('post:created', dto);
  } catch (err) {
    logger.warn({ err, authorId, postId: dto.id }, 'emitPostCreated failed');
  }
}

/** Push sự kiện post:hidden tới người đang xem feed (ẩn bài/comment sau kiểm duyệt). */
export async function emitPostHidden(
  authorId: string,
  postId: string,
  visibility: PostVisibility,
  parentId: string | null,
): Promise<void> {
  const io = getRealtimeIo();
  if (!io) return;

  try {
    const rooms = await resolvePostCreatedRooms(authorId, visibility);
    io.of('/feed').to(rooms).emit('post:hidden', { postId, parentId });
  } catch (err) {
    logger.warn({ err, authorId, postId }, 'emitPostHidden failed');
  }
}

/** Bắn comment mới tới room của bài viết cha (người đang mở chi tiết bài). */
export function emitCommentCreated(
  parentId: string,
  comment: PostFeedItemDto,
  actorId: string,
): void {
  const io = getRealtimeIo();
  if (!io) return;
  io.of('/feed').to(`post:${parentId}`).emit('comment:created', { comment, actorId });
}

/** Bắn comment bị xóa tới room của bài viết cha. */
export function emitCommentDeleted(
  parentId: string,
  commentId: string,
  actorId: string,
): void {
  const io = getRealtimeIo();
  if (!io) return;
  io.of('/feed').to(`post:${parentId}`).emit('comment:deleted', { commentId, parentId, actorId });
}

/** Bắn thay đổi số comment của một bài (toàn namespace /feed, payload nhẹ). */
export function emitCommentCountChanged(
  postId: string,
  delta: number,
  actorId: string,
): void {
  const io = getRealtimeIo();
  if (!io) return;
  io.of('/feed').emit('comment:countChanged', { postId, delta, actorId });
}
