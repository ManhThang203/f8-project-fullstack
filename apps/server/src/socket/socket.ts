import type { Server as HttpServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Initialise Socket.io with the configured namespaces.
 * Auth handshake is finalised in Phase 2 (BetterAuth session validation).
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });

  const namespaces = ['/notifications', '/feed', '/chat'] as const;
  for (const ns of namespaces) {
    io.of(ns).on('connection', (socket) => {
      logger.debug({ ns, socketId: socket.id }, 'socket connected');
      socket.on('disconnect', () => logger.debug({ ns, socketId: socket.id }, 'socket disconnect'));
    });
  }

  return io;
}
