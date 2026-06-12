import { FriendStatus as DbFriendStatus, prisma } from '@costy/db';
import type {
  FriendListQuery,
  FriendRequestsQuery,
  FriendStateDto,
  FriendStatus,
  FriendUserDto,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';

type FriendUserRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

const userSelect = { id: true, username: true, name: true, image: true } as const;

/** Mã hoá cursor (createdAt + id) thành base64url an toàn cho URL. */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

/** Giải mã cursor; ném 400 nếu chuỗi không hợp lệ. */
function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      t?: string;
      id?: string;
    };
    if (!raw.t || !raw.id) throw new Error('invalid cursor shape');
    return { createdAt: new Date(raw.t), id: raw.id };
  } catch {
    throw AppError.badRequest('Invalid cursor');
  }
}

/** Tìm quan hệ bạn bè giữa 2 user theo cả hai chiều (nếu có). */
async function findFriendshipBetween(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

/** Tính trạng thái quan hệ bạn bè của viewer với một user khác. */
export async function getFriendStatus(
  viewerId: string | null,
  otherId: string,
): Promise<FriendStatus> {
  if (!viewerId) return 'none';
  if (viewerId === otherId) return 'self';

  const row = await findFriendshipBetween(viewerId, otherId);
  if (!row) return 'none';
  if (row.status === DbFriendStatus.ACCEPTED) return 'friends';
  if (row.status === DbFriendStatus.PENDING) {
    return row.requesterId === viewerId ? 'request_sent' : 'request_received';
  }
  return 'none';
}

/** Lấy danh sách id bạn bè (đã chấp nhận) của một user. */
export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: DbFriendStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

/** Kiểm tra 2 user có phải bạn bè (đã chấp nhận) hay không. */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const row = await findFriendshipBetween(a, b);
  return row?.status === DbFriendStatus.ACCEPTED;
}

/** Đếm số bạn bè (quan hệ đã chấp nhận) của một user. */
export async function countFriends(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      status: DbFriendStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/** Gửi lời mời kết bạn; tự động chấp nhận nếu đối phương đã mời mình trước đó. */
export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<FriendStateDto> {
  if (requesterId === addresseeId) {
    throw AppError.badRequest('Không thể kết bạn với chính mình');
  }

  const target = await prisma.user.findUnique({
    where: { id: addresseeId },
    select: { id: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    throw AppError.notFound('Không tìm thấy người dùng này');
  }

  const existing = await findFriendshipBetween(requesterId, addresseeId);

  if (existing) {
    if (existing.status === DbFriendStatus.ACCEPTED) {
      return { status: 'friends' };
    }
    if (existing.status === DbFriendStatus.PENDING) {
      if (existing.requesterId === requesterId) {
        return { status: 'request_sent' };
      }
      // Đối phương đã mời mình trước → chấp nhận luôn.
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: DbFriendStatus.ACCEPTED },
      });
      await createNotification({
        recipientId: existing.requesterId,
        actorId: requesterId,
        type: 'FRIEND_ACCEPTED',
        entityType: 'user',
        entityId: requesterId,
      });
      return { status: 'friends' };
    }
    // Quan hệ trước bị từ chối → tạo lại lời mời mới theo chiều hiện tại.
    await prisma.friendship.delete({ where: { id: existing.id } });
  }

  await prisma.friendship.create({
    data: { requesterId, addresseeId, status: DbFriendStatus.PENDING },
  });
  await createNotification({
    recipientId: addresseeId,
    actorId: requesterId,
    type: 'FRIEND_REQUEST',
    entityType: 'user',
    entityId: requesterId,
  });

  return { status: 'request_sent' };
}

/** Hủy lời mời mình đã gửi (đang chờ). Idempotent. */
export async function cancelFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<FriendStateDto> {
  await prisma.friendship.deleteMany({
    where: { requesterId, addresseeId, status: DbFriendStatus.PENDING },
  });
  return { status: 'none' };
}

/** Chấp nhận lời mời từ một user (mình là người nhận). */
export async function acceptFriendRequest(
  meId: string,
  otherId: string,
): Promise<FriendStateDto> {
  const row = await prisma.friendship.findFirst({
    where: { requesterId: otherId, addresseeId: meId, status: DbFriendStatus.PENDING },
  });
  if (!row) throw AppError.notFound('Không tìm thấy lời mời kết bạn');

  await prisma.friendship.update({
    where: { id: row.id },
    data: { status: DbFriendStatus.ACCEPTED },
  });
  await createNotification({
    recipientId: otherId,
    actorId: meId,
    type: 'FRIEND_ACCEPTED',
    entityType: 'user',
    entityId: meId,
  });

  return { status: 'friends' };
}

/** Từ chối lời mời từ một user (mình là người nhận). */
export async function rejectFriendRequest(
  meId: string,
  otherId: string,
): Promise<FriendStateDto> {
  await prisma.friendship.deleteMany({
    where: { requesterId: otherId, addresseeId: meId, status: DbFriendStatus.PENDING },
  });
  return { status: 'none' };
}

/** Hủy kết bạn (xóa quan hệ đã chấp nhận theo cả hai chiều). */
export async function unfriend(meId: string, otherId: string): Promise<FriendStateDto> {
  await prisma.friendship.deleteMany({
    where: {
      status: DbFriendStatus.ACCEPTED,
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  return { status: 'none' };
}

function toFriendUserDto(user: FriendUserRow, createdAt: Date, status: FriendStatus): FriendUserDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    createdAt: createdAt.toISOString(),
    friendStatus: status,
  };
}

/** Danh sách bạn bè của mình (quan hệ đã chấp nhận), phân trang cursor + tìm kiếm. */
export async function listFriends(
  meId: string,
  query: FriendListQuery,
): Promise<{ items: FriendUserDto[]; nextCursor: string | null }> {
  const needle = query.q?.trim();
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const userFilter = needle
    ? {
        OR: [
          { username: { contains: needle, mode: 'insensitive' as const } },
          { name: { contains: needle, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const baseWhere = {
    status: DbFriendStatus.ACCEPTED,
    OR: [
      { requesterId: meId, addressee: { deletedAt: null, ...userFilter } },
      { addresseeId: meId, requester: { deletedAt: null, ...userFilter } },
    ],
  };

  const where = cursorData
    ? {
        AND: [
          baseWhere,
          {
            OR: [
              { createdAt: { lt: cursorData.createdAt } },
              {
                AND: [
                  { createdAt: { equals: cursorData.createdAt } },
                  { id: { lt: cursorData.id } },
                ],
              },
            ],
          },
        ],
      }
    : baseWhere;

  const rows = await prisma.friendship.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    include: { requester: { select: userSelect }, addressee: { select: userSelect } },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  const items = page.map((r) => {
    const other = r.requesterId === meId ? r.addressee : r.requester;
    return toFriendUserDto(other, r.createdAt, 'friends');
  });

  return { items, nextCursor };
}

/** Danh sách lời mời kết bạn đến (incoming) hoặc đã gửi (outgoing). */
export async function listFriendRequests(
  meId: string,
  query: FriendRequestsQuery,
): Promise<{ items: FriendUserDto[]; nextCursor: string | null }> {
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const isIncoming = query.type === 'incoming';

  const baseWhere = isIncoming
    ? { addresseeId: meId, status: DbFriendStatus.PENDING, requester: { deletedAt: null } }
    : { requesterId: meId, status: DbFriendStatus.PENDING, addressee: { deletedAt: null } };

  const where = cursorData
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }],
          },
        ],
      }
    : baseWhere;

  const rows = await prisma.friendship.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    include: { requester: { select: userSelect }, addressee: { select: userSelect } },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  const status: FriendStatus = isIncoming ? 'request_received' : 'request_sent';
  const items = page.map((r) =>
    toFriendUserDto(isIncoming ? r.requester : r.addressee, r.createdAt, status),
  );

  return { items, nextCursor };
}
