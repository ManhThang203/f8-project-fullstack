import type { IncomingHttpHeaders } from 'node:http';

import { fromNodeHeaders } from 'better-auth/node';
import type { Namespace, Socket } from 'socket.io';

import { prisma } from '@threads/db';

import { auth } from '../lib/auth.js';
import { logger } from '../lib/logger.js';
import { verifySocketToken } from '../lib/socket-token.js';
import * as chatService from '../modules/chat/chat.service.js';

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

    void auth.api
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

async function joinGroupRooms(socket: Socket, userId: string) {
  const memberships = await prisma.chatGroupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  for (const m of memberships) {
    socket.join(`group:${m.groupId}`);
  }
}

export function registerChatNamespace(chatNs: Namespace) {
  registerChatAuth(chatNs);

  chatNs.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    void joinGroupRooms(socket, userId).catch((err: unknown) => {
      logger.warn({ err, userId }, 'chat socket: failed to join group rooms');
    });

    socket.on('chat:send', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const p = payload as { peerUserId?: unknown; text?: unknown };
        const peerUserId = String(p?.peerUserId ?? '');
        const text = String(p?.text ?? '');
        if (!peerUserId) {
          ack?.({ ok: false, error: 'peerUserId không hợp lệ' });
          return;
        }

        const saved = await chatService.createChatMessage({
          senderId: userId,
          recipientId: peerUserId,
          body: text,
        });

        const messagePayload = {
          kind: 'direct' as const,
          id: saved.id,
          body: saved.body,
          createdAt: saved.createdAt.toISOString(),
          senderId: userId,
          recipientId: peerUserId,
        };

        chatNs.to(`user:${peerUserId}`).emit('chat:message', messagePayload);

        ack?.({
          ok: true,
          message: {
            id: saved.id,
            senderId: saved.senderId,
            recipientId: saved.recipientId,
            body: saved.body,
            createdAt: saved.createdAt.toISOString(),
          },
        });
      } catch (err) {
        logger.warn({ err, userId }, 'chat:send failed');
        ack?.({
          ok: false,
          error: err instanceof Error ? err.message : 'send failed',
        });
      }
    });

    socket.on('chat:typing', (payload: unknown) => {
      const p = payload as { peerUserId?: unknown };
      const peerUserId = String(p?.peerUserId ?? '');
      if (!peerUserId || peerUserId === userId) return;
      socket.to(`user:${peerUserId}`).emit('chat:typing', { fromUserId: userId });
    });

    socket.on('group:typing', async (payload: unknown) => {
      const p = payload as { groupId?: unknown };
      const groupId = Number(p?.groupId);
      if (!Number.isFinite(groupId) || groupId <= 0) return;
      try {
        const mem = await prisma.chatGroupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
          select: { groupId: true },
        });
        if (!mem) return;
        socket.to(`group:${groupId}`).emit('group:typing', { groupId, fromUserId: userId });
      } catch (err) {
        logger.warn({ err, userId }, 'group:typing failed');
      }
    });

    socket.on('group:subscribe', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const p = payload as { groupId?: unknown };
        const groupId = Number(p?.groupId);
        if (!Number.isFinite(groupId) || groupId <= 0) {
          ack?.({ ok: false, error: 'groupId không hợp lệ' });
          return;
        }
        const mem = await prisma.chatGroupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
          select: { groupId: true },
        });
        if (!mem) {
          ack?.({ ok: false, error: 'Không thuộc nhóm' });
          return;
        }
        socket.join(`group:${groupId}`);
        ack?.({ ok: true });
      } catch (err) {
        logger.warn({ err, userId }, 'group:subscribe failed');
        ack?.({
          ok: false,
          error: err instanceof Error ? err.message : 'subscribe failed',
        });
      }
    });

    socket.on('group:send', async (payload: unknown, ack: (r: unknown) => void) => {
      try {
        const p = payload as { groupId?: unknown; text?: unknown };
        const groupId = Number(p?.groupId);
        const text = String(p?.text ?? '');
        if (!Number.isFinite(groupId) || groupId <= 0) {
          ack?.({ ok: false, error: 'groupId không hợp lệ' });
          return;
        }

        const saved = await chatService.createGroupMessage({
          senderId: userId,
          groupId,
          body: text,
        });

        const out = {
          kind: 'group' as const,
          id: saved.id,
          groupId: saved.groupId,
          senderId: saved.senderId,
          body: saved.body,
          createdAt: saved.createdAt.toISOString(),
        };

        socket.to(`group:${groupId}`).emit('chat:group:message', out);

        ack?.({
          ok: true,
          message: {
            id: saved.id,
            groupId: saved.groupId,
            senderId: saved.senderId,
            body: saved.body,
            createdAt: saved.createdAt.toISOString(),
          },
        });
      } catch (err) {
        logger.warn({ err, userId }, 'group:send failed');
        ack?.({
          ok: false,
          error: err instanceof Error ? err.message : 'send failed',
        });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, reason }, 'chat socket disconnect');
    });
  });
}
