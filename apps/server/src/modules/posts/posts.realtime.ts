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
