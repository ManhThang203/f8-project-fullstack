import { prisma } from '@costy/db';

import { AppError } from '../../lib/errors.js';

import { getPresence } from './presence.service.js';

type ListMsgOpts = { limit?: number; beforeId?: string };

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

  const rows = await prisma.chatMessage.findMany({
    where: {
      roomId,
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
    replyToMessage: r.replyTo,
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

/**
 * Lấy danh sách hội thoại của user (kèm tin nhắn cuối + số chưa đọc)
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

  const items = await Promise.all(
    memberships.map(async (m) => {
      const room = m.room;

      const lastMsg = await prisma.chatMessage.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await prisma.chatMessage.count({
        where: {
          roomId: room.id,
          senderId: { not: userId },
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        },
      });

      // Lấy danh sách thành viên khác để lấy tên/avatar
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
        unreadCount,
        updatedAt: lastMsg?.createdAt || room.createdAt,
      };
    }),
  );

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
