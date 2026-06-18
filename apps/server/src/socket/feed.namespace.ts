import type { Namespace } from 'socket.io';

import { logger } from '../lib/logger.js';

import { authenticateSocket } from './socket-auth.js';

/** Đăng ký namespace `/feed`: auth + join room riêng theo userId. */
export function registerFeedNamespace(ns: Namespace): void {
  ns.use(authenticateSocket);

  ns.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    // Người dùng đang mở chi tiết một bài → join room `post:{id}` để nhận comment realtime.
    socket.on('post:join', (postId: unknown) => {
      if (typeof postId === 'string' && postId) socket.join(`post:${postId}`);
    });
    socket.on('post:leave', (postId: unknown) => {
      if (typeof postId === 'string' && postId) socket.leave(`post:${postId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, reason }, 'feed socket disconnect');
    });
  });
}
