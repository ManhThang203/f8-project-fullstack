import type { Server as HttpServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { registerChatNamespace } from './chat.namespace.js';

/**
 * Initialise Socket.io with the configured namespaces.
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });

  for (const ns of ['/notifications', '/feed'] as const) {
    io.of(ns).on('connection', (socket) => {
      logger.debug({ ns, socketId: socket.id }, 'socket connected');
      socket.on('disconnect', () => logger.debug({ ns, socketId: socket.id }, 'socket disconnect'));
    });
  }

  registerChatNamespace(io.of('/chat'));

  return io;
}
