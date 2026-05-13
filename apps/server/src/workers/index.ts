import { Worker, type WorkerOptions } from 'bullmq';

import { logger } from '../lib/logger.js';
import { bullConnection } from '../lib/redis.js';
import { QueueName } from '../queues/index.js';

const baseOpts: WorkerOptions = { connection: bullConnection, concurrency: 2 };

/**
 * Skeleton workers. Each module phase replaces the noop processor with real
 * work (FFmpeg, Nodemailer, Novu, etc.).
 */
export function startWorkers(): Worker[] {
  const workers: Worker[] = [
    new Worker(
      QueueName.Media,
      async (job) => logger.info({ jobId: job.id, name: job.name }, 'media job (noop)'),
      baseOpts,
    ),
    new Worker(
      QueueName.Email,
      async (job) => logger.info({ jobId: job.id, name: job.name }, 'email job (noop)'),
      baseOpts,
    ),
    new Worker(
      QueueName.Notification,
      async (job) => logger.info({ jobId: job.id, name: job.name }, 'notification job (noop)'),
      baseOpts,
    ),
  ];

  for (const w of workers) {
    w.on('failed', (job, e) =>
      logger.error({ jobId: job?.id, queue: w.name, err: e }, 'worker failed'),
    );
  }
  return workers;
}
