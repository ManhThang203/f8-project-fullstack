import type { Server as HttpServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

import { registerChatNamespace } from './chat.namespace.js';

/**
 * Gắn Socket.IO vào HTTP server và đăng ký các namespace.
 * Mỗi namespace là một "kênh" riêng — client connect tới `/chat`, `/feed`, v.v.
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    // Cho phép FE (vd. :3000) handshake cross-origin kèm cookie khi cần.
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });

  // Skeleton: chưa có logic realtime — chỉ log connect/disconnect, dùng sau.
  for (const ns of ['/notifications', '/feed'] as const) {
    io.of(ns).on('connection', (socket) => {
      logger.debug({ ns, socketId: socket.id }, 'socket connected');
      socket.on('disconnect', () => logger.debug({ ns, socketId: socket.id }, 'socket disconnect'));
    });
  }

  // Namespace chat đầy đủ: auth, gửi tin, typing, nhóm.
  registerChatNamespace(io.of('/chat'));

  return io;
}
