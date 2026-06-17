import type { Namespace } from 'socket.io';

import { logger } from '../lib/logger.js';

import { authenticateSocket } from './socket-auth.js';

/** Đăng ký namespace `/notifications`: auth + join room riêng theo userId. */
export function registerNotificationsNamespace(ns: Namespace): void {
  ns.use(authenticateSocket);

  ns.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, reason }, 'notifications socket disconnect');
    });
  });
}
