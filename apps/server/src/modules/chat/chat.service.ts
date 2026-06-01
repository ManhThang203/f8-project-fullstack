import { prisma, Prisma } from '@costy/db';
import { AppError } from '../../lib/errors.js';

type ListMsgOpts = { limit?: number; beforeId?: string };

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

/**
 * Lịch sử tin nhắn trong một phòng E2EE
 */
export async function listRoomMessages(
  userId: string,
  roomId: string,
  opts: ListMsgOpts = {},
) {
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
      replyTo: true,
    }
  });

  // Map to exclude database specifics if needed, but for now just return
  const mapped = rows.map(r => ({
    ...r,
    replyToMessage: r.replyTo,
    replyTo: undefined // Clean up Prisma output
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
 * Tạo phòng chat E2EE (1-1 hoặc Group)
 */
export async function createChatRoom(input: {
  creatorId: string;
  isGroup?: boolean;
  name?: string;
  memberUserIds: string[];
  // Map userId -> encryptedRoomKey (AES key mã hóa bằng Public Key của user đó)
  encryptedRoomKeys: Record<string, string>;
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
    select: { id: true },
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

  // Tạo mới
  return prisma.chatRoom.create({
    data: {
      type: isGroup ? 'GROUP' : 'DIRECT',
      name,
      createdById: creatorId,
      members: {
        create: allIds.map((userId) => ({
          userId,
          encryptedRoomKey: input.encryptedRoomKeys[userId] || null,
        })),
      },
    },
    include: {
      members: true,
    },
  });
}

/**
 * Lấy danh sách hội thoại của user
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
        
        // Trả về cả roomKey mã hóa cho user hiện tại
        encryptedRoomKey: m.encryptedRoomKey,
      };
    })
  );

  return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** Lấy public key của một danh sách users */
export async function getPublicKeys(userIds: string[]) {
  const keys = await prisma.userPublicKey.findMany({
    where: { userId: { in: userIds } },
  });
  return keys;
}
