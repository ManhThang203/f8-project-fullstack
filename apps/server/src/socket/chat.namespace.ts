/**
 * Namespace `/chat` — xác thực, phòng (rooms) và các event realtime.
 *
 * Phòng dùng trong file này:
 * - `user:{userId}`   → nhận tin nhắn 1-1
 * - `group:{groupId}` → broadcast tin nhóm
 */

import type { IncomingHttpHeaders } from 'node:http';

import { prisma } from '@costy/db';
import { fromNodeHeaders } from 'better-auth/node';
import type { Namespace, Socket } from 'socket.io';

import { authWeb } from '../lib/auth.js';
import { logger } from '../lib/logger.js';
import { verifySocketToken } from '../lib/socket-token.js';
import { createNotification } from '../modules/notifications/notifications.service.js';

/** Tạo notification "tin nhắn mới" cho các thành viên khác trong phòng (fire-and-forget). */
async function notifyRoomMessage(roomId: string, senderId: string): Promise<void> {
  const members = await prisma.chatRoomMember.findMany({
    where: { roomId, userId: { not: senderId } },
    select: { userId: true },
  });
  for (const m of members) {
    await createNotification({
      recipientId: m.userId,
      actorId: senderId,
      type: 'MESSAGE_RECEIVED',
      entityType: 'room',
      entityId: roomId,
    });
  }
}
/**
 * Middleware xác thực namespace `/chat`.
 * Ưu tiên token HMAC (handshake.auth.token), fallback về cookie session Better Auth.
 */
function registerChatAuth(chatNs: Namespace) {
  chatNs.use((socket, next) => {
    const raw =
      typeof socket.handshake.auth === 'object' && socket.handshake.auth !== null
        ? (socket.handshake.auth as { token?: unknown }).token
        : undefined;
    if (typeof raw === 'string') {
      const userId = verifySocketToken(raw);
      if (userId) {
        socket.data.userId = userId;
        next();
        return;
      }
    }
    void authWeb.api
      .getSession({
        headers: fromNodeHeaders(socket.handshake.headers as IncomingHttpHeaders),
      })
      .then((session) => {
        if (!session?.user?.id) {
          next(new Error('unauthorized'));
          return;
        }
        socket.data.userId = session.user.id;
        next();
      })
      .catch(() => next(new Error('unauthorized')));
  });
}

/** Join tất cả các phòng ChatRoom (cả 1-1 và Group) mà user đang là thành viên */
async function joinChatRooms(socket: Socket, userId: string) {
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId },
    select: { roomId: true },
  });
  for (const m of memberships) {
    socket.join(`room:${m.roomId}`);
  }
}

/** Đăng ký auth + toàn bộ event handler cho namespace `/chat`. */
export function registerChatNamespace(chatNs: Namespace) {
  registerChatAuth(chatNs);

  chatNs.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.join(`user:${userId}`); // Phòng riêng của user (để nhận notification hoặc force refresh)
    void joinChatRooms(socket, userId).catch((err: unknown) => {
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

        // Phát tới tất cả mọi người trong phòng (trừ sender, trừ khi client muốn tự nhận)
        socket.to(`room:${roomId}`).emit('chat:message', messageDto);

        ack?.({ ok: true, message: messageDto });

        void notifyRoomMessage(roomId, userId).catch((err: unknown) =>
          logger.warn({ err, roomId }, 'notifyRoomMessage failed'),
        );
      } catch (err) {
        logger.warn({ err, userId }, 'chat:send failed');
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'send failed' });
      }
    });

    socket.on('chat:typing', (payload: unknown) => {
      const { roomId } = payload as { roomId?: string };
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('chat:typing', { roomId, fromUserId: userId });
    });

    /** Trạng thái đã nhận */
    socket.on('chat:delivered', async (payload: unknown) => {
      const { roomId } = payload as { roomId?: string };
      if (!roomId) return;
      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId },
        data: { lastDeliveredAt: new Date() },
      });
      socket.to(`room:${roomId}`).emit('chat:delivered', { roomId, userId });
    });

    /** Trạng thái đã xem */
    socket.on('chat:read', async (payload: unknown) => {
      const { roomId } = payload as { roomId?: string };
      if (!roomId) return;
      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId },
        data: { lastReadAt: new Date(), lastDeliveredAt: new Date() },
      });
      socket.to(`room:${roomId}`).emit('chat:read', { roomId, userId });
    });

    /** Cảm xúc (Reaction) */
    socket.on('chat:react', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const { messageId, emoji } = payload as { messageId?: string; emoji?: string };
        if (!messageId || !emoji) return ack?.({ ok: false });

        const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
        if (!msg) return ack?.({ ok: false });

        const reaction = await prisma.messageReaction.upsert({
          where: { messageId_userId_emoji: { messageId, userId, emoji } },
          update: {},
          create: { messageId, userId, emoji },
        });

        socket.to(`room:${msg.roomId}`).emit('chat:reaction', { messageId, reaction });
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

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { isUnsent: true },
        });

        socket.to(`room:${msg.roomId}`).emit('chat:unsent', { messageId, roomId: msg.roomId });
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

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, reason }, 'chat socket disconnect');
    });
  });
}
