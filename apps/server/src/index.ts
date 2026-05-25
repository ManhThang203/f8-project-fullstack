/**
 * Entry point — khởi động HTTP server, Socket.IO và BullMQ workers trên cùng process.
 */

import { createServer } from 'node:http';

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initSocket } from './socket/socket.js';
import { startWorkers } from './workers/index.js';

async function main(): Promise<void> {
  const app = buildApp();

  // Socket.IO gắn vào cùng httpServer để REST và WS dùng chung port.
  const httpServer = createServer(app);
  initSocket(httpServer);

  const workers = startWorkers();

  httpServer.listen(env.SERVER_PORT, env.SERVER_HOST, () => {
    logger.info(
      { port: env.SERVER_PORT, host: env.SERVER_HOST, url: env.SERVER_URL },
      'server listening',
    );
  });

  /** Đóng workers trước, rồi ngừng nhận kết nối mới; force exit nếu treo quá 10s. */
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await Promise.allSettled(workers.map((w) => w.close()));
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((e) => {
  logger.fatal({ err: e }, 'failed to start');
  process.exit(1);
});
