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
    new Worker(
      QueueName.MediaCleanup,
      async (job) => {
        const { prisma } = await import('@costy/db');
        const fs = await import('fs');
        const path = await import('path');

        logger.info({ jobId: job.id }, 'Bắt đầu dọn dẹp media E2EE hết hạn');
        
        // Lấy tất cả media đã hết hạn (expiresAt < now)
        const expiredMedia = await prisma.media.findMany({
          where: {
            expiresAt: { lt: new Date() },
          },
        });

        if (expiredMedia.length === 0) return;

        let deletedCount = 0;
        for (const media of expiredMedia) {
          if (media.storagePath) {
            const filePath = path.resolve(process.cwd(), 'uploads', media.storagePath);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          await prisma.media.delete({ where: { id: media.id } });
          deletedCount++;
        }

        logger.info({ jobId: job.id, deletedCount }, 'Hoàn thành dọn dẹp media');
      },
      baseOpts,
    ),
    new Worker(
      QueueName.TrendingHashtags,
      async (job) => {
        const { computeTrendingHashtags } = await import(
          '../modules/admin/admin-stats.service.js'
        );
        logger.info({ jobId: job.id }, 'Tính trending hashtag');
        await computeTrendingHashtags();
      },
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
