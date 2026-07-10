import { type ChatMessage, Prisma, prisma } from '@costy/db';

import {
  areUsersBlocked,
  assertUsersNotBlocked,
  getBlockedRelatedUserIds,
} from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';

import { getPresence } from './presence.service.js';

type ListMsgOpts = { limit?: number; beforeId?: string };
type DirectRoomAccess = { blocked: boolean; peerId: string | null };

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

const mediaSelect = {
  id: true,
  publicUrl: true,
  mimeType: true,
  width: true,
  height: true,
} as const;

/** Kiểm tra phòng direct có bị chặn bởi quan hệ block hai chiều không. */
export async function getDirectRoomBlockState(
  userId: string,
  roomId: string,
): Promise<DirectRoomAccess> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      type: true,
      members: { select: { userId: true } },
    },
  });
  if (!room || room.type !== 'DIRECT') return { blocked: false, peerId: null };

  const peerId = room.members.find((member) => member.userId !== userId)?.userId ?? null;
  if (!peerId) return { blocked: false, peerId: null };

  return { blocked: await areUsersBlocked(userId, peerId), peerId };
}

/** Ném lỗi nếu user đang dùng phòng direct với người đã block hoặc bị block. */
export async function assertDirectRoomNotBlocked(userId: string, roomId: string): Promise<void> {
  const { blocked } = await getDirectRoomBlockState(userId, roomId);
  if (blocked) {
    throw AppError.forbidden('Không thể nhắn tin với người dùng này');
  }
}

/**
 * Lịch sử tin nhắn trong một phòng chat (kèm media, reply, reactions)
 */
export async function listRoomMessages(userId: string, roomId: string, opts: ListMsgOpts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 40, 1), 200);

  // Check quyền
  const mem = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!mem) {
    throw AppError.forbidden('Bạn không thuộc phòng này.');
  }
  await assertDirectRoomNotBlocked(userId, roomId);
  const blockedIds = await getBlockedRelatedUserIds(userId);
  const blockedSet = new Set(blockedIds);

  const rows = await prisma.chatMessage.findMany({
    where: {
      roomId,
      ...(blockedIds.length > 0 ? { senderId: { notIn: blockedIds } } : {}),
      NOT: {
        deletedFor: { has: userId },
      },
      ...(opts.beforeId ? { id: { lt: opts.beforeId } } : {}), // string ID (cuid)
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      reactions: true,
      media: { select: mediaSelect },
      replyTo: { include: { media: { select: mediaSelect } } },
    },
  });

  const mapped = rows.map((r) => ({
    ...r,
    reactions: r.reactions.filter((reaction) => !blockedSet.has(reaction.userId)),
    replyToMessage: r.replyTo && !blockedSet.has(r.replyTo.senderId) ? r.replyTo : null,
    replyTo: undefined, // Clean up Prisma output
  }));

  return mapped.reverse();
}

/**
 * Đánh dấu đã đọc trong phòng
 */
export async function markRoomRead(userId: string, roomId: string) {
  const mem = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!mem) return;

  await prisma.chatRoomMember.update({
    where: { roomId_userId: { roomId, userId } },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Tạo phòng chat 1-1 hoặc nhóm; phòng 1-1 đã tồn tại thì trả về phòng cũ.
 */
export async function createChatRoom(input: {
  creatorId: string;
  isGroup?: boolean;
  name?: string;
  memberUserIds: string[];
}) {
  const isGroup = Boolean(input.isGroup);
  const name = input.name?.trim() || null;
  const creatorId = input.creatorId;

  const memberSet = new Set([creatorId, ...(input.memberUserIds || [])]);
  const allIds = Array.from(memberSet);

  if (allIds.length < 2) {
    throw AppError.badRequest('Phòng chat cần ít nhất 2 người.');
  }
  if (!isGroup && allIds.length > 2) {
    throw AppError.badRequest('Chat 1-1 chỉ được có 2 người.');
  }

  if (!isGroup) {
    const peerId = allIds.find((id) => id !== creatorId)!;
    await assertUsersNotBlocked(creatorId, peerId);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: allIds }, deletedAt: null },
    select: { id: true, name: true, username: true },
  });
  if (users.length !== allIds.length) {
    throw AppError.badRequest('Thành viên không hợp lệ.');
  }

  // Nếu là 1-1, kiểm tra xem đã có phòng giữa 2 người này chưa
  if (!isGroup) {
    const peerId = allIds.find((id) => id !== creatorId)!;
    // Tìm phòng 1-1 hiện có
    const existingRooms = await prisma.chatRoom.findMany({
      where: {
        type: 'DIRECT',
        members: {
          every: { userId: { in: [creatorId, peerId] } },
        },
      },
      include: { members: true },
    });

    // Đảm bảo chính xác 2 thành viên này
    const exactRoom = existingRooms.find((r) => r.members.length === 2);
    if (exactRoom) {
      return exactRoom; // Trả về luôn nếu đã tồn tại
    }
  }

  // Nhóm không nhập tên → tự sinh từ tên các thành viên
  const groupName =
    isGroup && !name
      ? users
          .map((u) => u.name?.trim() || u.username)
          .slice(0, 3)
          .join(', ')
      : name;

  return prisma.chatRoom.create({
    data: {
      type: isGroup ? 'GROUP' : 'DIRECT',
      name: isGroup ? groupName : null,
      createdById: creatorId,
      members: {
        create: allIds.map((userId) => ({
          userId,
          role: isGroup && userId === creatorId ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
    include: {
      members: true,
    },
  });
}

/** Lấy tin nhắn cuối có thể xem của mỗi phòng, bỏ qua sender đang block với viewer. */
async function getLastMessagesByRoom(roomIds: string[], blockedIds: string[]) {
  if (roomIds.length === 0) return new Map<string, ChatMessage>();

  const latest =
    blockedIds.length > 0
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT DISTINCT ON ("roomId") "id"
          FROM chat_messages
          WHERE "roomId" IN (${Prisma.join(roomIds)})
            AND "senderId" NOT IN (${Prisma.join(blockedIds)})
          ORDER BY "roomId", "createdAt" DESC
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT DISTINCT ON ("roomId") "id"
          FROM chat_messages
          WHERE "roomId" IN (${Prisma.join(roomIds)})
          ORDER BY "roomId", "createdAt" DESC
        `;
  const ids = latest.map((r) => r.id);
  if (ids.length === 0) return new Map<string, ChatMessage>();

  const messages = await prisma.chatMessage.findMany({ where: { id: { in: ids } } });
  return new Map(messages.map((msg) => [msg.roomId, msg]));
}

/** Đếm tin chưa đọc có thể xem, không tính tin từ sender đang block với viewer. */
async function getUnreadCountByRoom(userId: string, roomIds: string[], blockedIds: string[]) {
  if (roomIds.length === 0) return new Map<string, number>();

  const rows =
    blockedIds.length > 0
      ? await prisma.$queryRaw<{ roomId: string; unread: number }[]>`
          SELECT m."roomId" AS "roomId", COUNT(*)::int AS "unread"
          FROM chat_messages msg
          JOIN chat_room_members m ON m."roomId" = msg."roomId" AND m."userId" = ${userId}
          WHERE msg."roomId" IN (${Prisma.join(roomIds)})
            AND msg."senderId" <> ${userId}
            AND msg."senderId" NOT IN (${Prisma.join(blockedIds)})
            AND (m."lastReadAt" IS NULL OR msg."createdAt" > m."lastReadAt")
          GROUP BY m."roomId"
        `
      : await prisma.$queryRaw<{ roomId: string; unread: number }[]>`
          SELECT m."roomId" AS "roomId", COUNT(*)::int AS "unread"
          FROM chat_messages msg
          JOIN chat_room_members m ON m."roomId" = msg."roomId" AND m."userId" = ${userId}
          WHERE msg."roomId" IN (${Prisma.join(roomIds)})
            AND msg."senderId" <> ${userId}
            AND (m."lastReadAt" IS NULL OR msg."createdAt" > m."lastReadAt")
          GROUP BY m."roomId"
        `;
  return new Map(rows.map((r) => [r.roomId, r.unread]));
}

/**
 * Lấy danh sách hội thoại của user (kèm tin nhắn cuối + số chưa đọc).
 * Dùng truy vấn batch (block set + last message + unread) để tránh N+1 theo số phòng.
 */
export async function listConversationsForUser(userId: string) {
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: {
            include: { user: { select: userSelect } },
          },
        },
      },
    },
  });

  const blockedSet = new Set(await getBlockedRelatedUserIds(userId));

  // Bỏ các phòng direct với người đã chặn / bị chặn (group không bị ảnh hưởng)
  const visibleMemberships = memberships.filter((m) => {
    if (m.room.type !== 'DIRECT') return true;
    const peerId = m.room.members.find((mem) => mem.userId !== userId)?.userId ?? null;
    return !(peerId && blockedSet.has(peerId));
  });

  const roomIds = visibleMemberships.map((m) => m.room.id);
  const [lastMsgByRoom, unreadByRoom] = await Promise.all([
    getLastMessagesByRoom(roomIds, [...blockedSet]),
    getUnreadCountByRoom(userId, roomIds, [...blockedSet]),
  ]);

  const items = visibleMemberships.map((m) => {
    const room = m.room;
    const lastMsg = lastMsgByRoom.get(room.id) ?? null;
    const otherMembers = room.members.filter((mem) => mem.userId !== userId);

    return {
      id: room.id,
      isGroup: room.type === 'GROUP',
      name: room.name,
      // Thông tin members (để FE tự render tên/avatar)
      peers: otherMembers.map((om) => ({
        ...om.user,
        lastReadAt: om.lastReadAt?.toISOString(),
        lastDeliveredAt: om.lastDeliveredAt?.toISOString(),
      })),

      lastMessage: lastMsg,
      unreadCount: unreadByRoom.get(room.id) ?? 0,
      updatedAt: lastMsg?.createdAt || room.createdAt,
    };
  });

  const directPeerIds = items
    .filter((item) => !item.isGroup)
    .flatMap((item) => item.peers.map((p) => p.id));
  const uniquePeerIds = [...new Set(directPeerIds)];

  const presenceMap =
    uniquePeerIds.length > 0 ? await getPresence(uniquePeerIds) : new Map<string, { isOnline: boolean; lastSeenAt: string | null }>();

  const privacySettings =
    uniquePeerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uniquePeerIds } },
          select: { id: true, showActivityStatus: true },
        })
      : [];
  const privacyMap = new Map(privacySettings.map((u) => [u.id, u.showActivityStatus]));

  for (const item of items) {
    for (const peer of item.peers) {
      if (!item.isGroup && privacyMap.get(peer.id) !== false) {
        const p = presenceMap.get(peer.id);
        Object.assign(peer, {
          isOnline: p?.isOnline ?? false,
          lastSeenAt: p?.lastSeenAt ?? null,
        });
      }
    }
  }

  return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
