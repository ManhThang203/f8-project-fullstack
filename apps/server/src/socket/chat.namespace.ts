/**
 * Namespace `/chat` — xác thực, phòng (rooms) và các event realtime.
 *
 * Phòng dùng trong file này:
 * - `user:{userId}`   → nhận tin nhắn 1-1
 * - `group:{groupId}` → broadcast tin nhóm
 */

import { prisma } from '@costy/db';
import type { Namespace, Socket } from 'socket.io';

import {
  assertUsersNotBlocked,
  getBlockedRelatedUserIds,
} from '../lib/blocks/block-utils.js';
import { logger } from '../lib/logger.js';
import { assertDirectRoomNotBlocked } from '../modules/chat/chat.service.js';
import { setOnline, setOffline, refreshHeartbeat } from '../modules/chat/presence.service.js';

import { authenticateSocket } from './socket-auth.js';

// Tham chiếu namespace `/chat` để refresh block cache cho socket đang online từ REST layer.
let chatNamespace: Namespace | null = null;

function registerChatAuth(chatNs: Namespace) {
  chatNs.use(authenticateSocket);
}

/** Đọc blocked set đã cache trên socket (rỗng nếu chưa tính). */
function getSocketBlockedSet(socket: Socket): Set<string> {
  return (socket.data.blockedSet as Set<string> | undefined) ?? new Set<string>();
}

/**
 * Đồng bộ blocked set vào socket.data và join/leave room DIRECT theo quan hệ block.
 * Gọi khi connect và mỗi khi quan hệ block thay đổi lúc đang online.
 */
async function syncChatRooms(socket: Socket, userId: string) {
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId },
    select: {
      roomId: true,
      room: {
        select: {
          type: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  const blockedSet = new Set(await getBlockedRelatedUserIds(userId));
  socket.data.blockedSet = blockedSet;

  for (const m of memberships) {
    const roomKey = `room:${m.roomId}`;
    if (m.room.type === 'DIRECT') {
      const peerId = m.room.members.find((mem) => mem.userId !== userId)?.userId ?? null;
      if (peerId && blockedSet.has(peerId)) {
        socket.leave(roomKey); // rời phòng nếu vừa bị chặn
        continue;
      }
    }
    socket.join(roomKey);
  }
}

/**
 * Phát event tới các session của thành viên được phép thấy actor.
 * Session hiện tại của actor bị loại, nhưng các session khác của họ vẫn nhận để đồng bộ.
 * Dùng blocked set đã cache trên socket (actor luôn là chủ socket) để tránh query lặp.
 */
async function emitToVisibleRoomMembers(
  socket: Socket,
  roomId: string,
  actorId: string,
  event: string,
  payload: unknown | ((recipientId: string) => unknown),
): Promise<void> {
  const members = await prisma.chatRoomMember.findMany({
    where: { roomId },
    select: { userId: true },
  });
  const blockedSet = getSocketBlockedSet(socket);

  for (const member of members) {
    if (member.userId !== actorId && blockedSet.has(member.userId)) continue;
    const recipientPayload =
      typeof payload === 'function' ? payload(member.userId) : payload;
    socket.to(`user:${member.userId}`).emit(event, recipientPayload);
  }
}

/**
 * Cập nhật lại block cache + join/leave room cho các socket đang online của user.
 * Gọi từ REST layer sau khi block/unblock để phản ánh realtime không cần refresh.
 */
export function refreshBlocksForUsers(userIds: string[]): void {
  if (!chatNamespace) return;
  const targets = new Set(userIds);
  for (const socket of chatNamespace.sockets.values()) {
    const socketUserId = socket.data.userId as string | undefined;
    if (!socketUserId || !targets.has(socketUserId)) continue;
    void syncChatRooms(socket, socketUserId).catch((err: unknown) => {
      logger.warn({ err, userId: socketUserId }, 'chat socket: failed to refresh blocks');
    });
  }
}

/** Đăng ký auth + toàn bộ event handler cho namespace `/chat`. */
export function registerChatNamespace(chatNs: Namespace) {
  chatNamespace = chatNs;
  registerChatAuth(chatNs);

  chatNs.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.join(`user:${userId}`); // Phòng riêng của user (để nhận notification hoặc force refresh)
    void setOnline(userId).catch((err: unknown) => {
      logger.warn({ err, userId }, 'presence: failed to set online');
    });

    void syncChatRooms(socket, userId).catch((err: unknown) => {
      logger.warn({ err, userId }, 'chat socket: failed to join rooms');
    });

    /** Subscribe vào 1 phòng cụ thể (khi vừa được add vào nhóm mới) */
    socket.on('room:subscribe', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const { roomId } = payload as { roomId?: string };
        if (!roomId) return ack?.({ ok: false, error: 'roomId missing' });

        const mem = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId } },
        });
        if (!mem) return ack?.({ ok: false, error: 'Not a member' });
        await assertDirectRoomNotBlocked(userId, roomId);

        socket.join(`room:${roomId}`);
        ack?.({ ok: true });
      } catch (err) {
        logger.warn({ err, userId }, 'room:subscribe failed');
        ack?.({ ok: false, error: 'subscribe error' });
      }
    });

    /**
     * Gửi tin nhắn: lưu DB rồi broadcast tới các thành viên trong phòng.
     */
    socket.on('chat:send', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const p = payload as {
          roomId?: string;
          content?: string;
          type?: string;
          mediaId?: string;
          replyToId?: string;
        };
        const { roomId, type = 'text', mediaId, replyToId } = p;
        const content = typeof p.content === 'string' ? p.content.trim() : '';

        if (!roomId || (!content && !mediaId)) {
          ack?.({ ok: false, error: 'Thiếu nội dung tin nhắn' });
          return;
        }

        // Kiểm tra quyền gửi
        const isMember = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId } },
        });
        if (!isMember) {
          ack?.({ ok: false, error: 'Không thuộc phòng chat này' });
          return;
        }
        await assertDirectRoomNotBlocked(userId, roomId);

        let replyTarget: { roomId: string; senderId: string } | null = null;
        if (replyToId) {
          replyTarget = await prisma.chatMessage.findUnique({
            where: { id: replyToId },
            select: { roomId: true, senderId: true },
          });
          if (!replyTarget || replyTarget.roomId !== roomId) {
            ack?.({ ok: false, error: 'Tin nhắn trả lời không hợp lệ' });
            return;
          }
          await assertUsersNotBlocked(userId, replyTarget.senderId);
        }

        const saved = await prisma.chatMessage.create({
          data: {
            roomId,
            senderId: userId,
            content: content || null,
            type,
            mediaId,
            replyToId,
          },
          include: {
            media: {
              select: { id: true, publicUrl: true, mimeType: true, width: true, height: true },
            },
            replyTo: true,
          },
        });

        const messageDto = {
          id: saved.id,
          roomId: saved.roomId,
          senderId: saved.senderId,
          content: saved.content,
          type: saved.type,
          mediaId: saved.mediaId,
          media: saved.media,
          replyToId: saved.replyToId,
          replyToMessage: saved.replyTo,
          isUnsent: saved.isUnsent,
          deletedFor: saved.deletedFor,
          reactions: [],
          createdAt: saved.createdAt.toISOString(),
        };

        const blockedByReplyAuthor = replyTarget
          ? new Set(await getBlockedRelatedUserIds(replyTarget.senderId))
          : null;
        await emitToVisibleRoomMembers(
          socket,
          roomId,
          userId,
          'chat:message',
          (recipientId: string) => ({
            ...messageDto,
            replyToMessage:
              blockedByReplyAuthor?.has(recipientId) ? null : messageDto.replyToMessage,
          }),
        );

        ack?.({ ok: true, message: messageDto });
      } catch (err) {
        logger.warn({ err, userId }, 'chat:send failed');
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'send failed' });
      }
    });

    socket.on('chat:typing', (payload: unknown) => {
      void (async () => {
        const { roomId } = payload as { roomId?: string };
        if (!roomId) return;
        try {
          await assertDirectRoomNotBlocked(userId, roomId);
        } catch {
          return;
        }
        await emitToVisibleRoomMembers(socket, roomId, userId, 'chat:typing', {
          roomId,
          fromUserId: userId,
        });
      })();
    });

    /** Trạng thái đã nhận */
    socket.on('chat:delivered', async (payload: unknown) => {
      const { roomId } = payload as { roomId?: string };
      if (!roomId) return;
      try {
        await assertDirectRoomNotBlocked(userId, roomId);
      } catch {
        return;
      }
      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId },
        data: { lastDeliveredAt: new Date() },
      });
      await emitToVisibleRoomMembers(socket, roomId, userId, 'chat:delivered', {
        roomId,
        userId,
      });
    });

    /** Trạng thái đã xem */
    socket.on('chat:read', async (payload: unknown) => {
      const { roomId } = payload as { roomId?: string };
      if (!roomId) return;
      try {
        await assertDirectRoomNotBlocked(userId, roomId);
      } catch {
        return;
      }
      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId },
        data: { lastReadAt: new Date(), lastDeliveredAt: new Date() },
      });
      await emitToVisibleRoomMembers(socket, roomId, userId, 'chat:read', { roomId, userId });
    });

    /** Cảm xúc (Reaction) */
    socket.on('chat:react', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const { messageId, emoji } = payload as { messageId?: string; emoji?: string };
        if (!messageId || !emoji) return ack?.({ ok: false });

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg) return ack?.({ ok: false });
        await assertDirectRoomNotBlocked(userId, msg.roomId);
        await assertUsersNotBlocked(userId, msg.senderId);

        const reaction = await prisma.messageReaction.upsert({
          where: { messageId_userId_emoji: { messageId, userId, emoji } },
          update: {},
          create: { messageId, userId, emoji },
        });

        await emitToVisibleRoomMembers(socket, msg.roomId, userId, 'chat:reaction', {
          messageId,
          reaction,
        });
        ack?.({ ok: true, reaction });
      } catch (err) {
        logger.warn({ err, userId }, 'chat:react failed');
        ack?.({ ok: false });
      }
    });

    /** Thu hồi tin nhắn */
    socket.on('chat:unsend', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const { messageId } = payload as { messageId?: string };
        if (!messageId) return ack?.({ ok: false });

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg || msg.senderId !== userId) return ack?.({ ok: false });
        await assertDirectRoomNotBlocked(userId, msg.roomId);

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { isUnsent: true },
        });

        await emitToVisibleRoomMembers(socket, msg.roomId, userId, 'chat:unsent', {
          messageId,
          roomId: msg.roomId,
        });
        ack?.({ ok: true });
      } catch (err) {
        logger.warn({ err, userId }, 'chat:unsend failed');
        ack?.({ ok: false });
      }
    });

    /** Xoá tin nhắn (chỉ phía tôi) */
    socket.on('chat:delete', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const { messageId } = payload as { messageId?: string };
        if (!messageId) return ack?.({ ok: false });

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg) return ack?.({ ok: false });

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { deletedFor: { push: userId } },
        });

        // Chỉ emit cho các session khác của cùng user (nếu có)
        socket.to(`user:${userId}`).emit('chat:deleted', { messageId, roomId: msg.roomId });
        ack?.({ ok: true });
      } catch (err) {
        logger.warn({ err, userId }, 'chat:delete failed');
        ack?.({ ok: false });
      }
    });

    socket.on('presence:heartbeat', () => {
      void refreshHeartbeat(userId).catch((err: unknown) => {
        logger.warn({ err, userId }, 'presence: heartbeat refresh failed');
      });
    });

    socket.on('disconnect', (reason) => {
      const userRoom = chatNs.adapter.rooms.get(`user:${userId}`);
      if (!userRoom || userRoom.size === 0) {
        void setOffline(userId).catch((err: unknown) => {
          logger.warn({ err, userId }, 'presence: failed to set offline');
        });
      }
      logger.debug({ userId, reason }, 'chat socket disconnect');
    });
  });
}
