import { Worker, type WorkerOptions } from 'bullmq';
import { prisma } from '@threads/db';

import { logger } from '../lib/logger.js';
import { bullConnection } from '../lib/redis.js';
import { getPostContentEmbedding, upsertPostEmbedding } from '../lib/search/post-embed.js';
import { QueueName } from '../queues/index.js';

export interface EmbeddingJobData {
  postId: string;
  content: string;
}

const baseOpts: WorkerOptions = { connection: bullConnection, concurrency: 2 };

/** Worker index embedding post gốc sau createPost. */
export function createEmbeddingWorker(): Worker<EmbeddingJobData> {
  const worker = new Worker<EmbeddingJobData>(
    QueueName.Embedding,
    async (job) => {
      const { postId, content } = job.data;

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { deletedAt: true, parentId: true },
      });

      if (!post || post.deletedAt || post.parentId) {
        logger.info({ postId }, 'skip embedding job: deleted or reply');
        return;
      }

      const vector = await getPostContentEmbedding(content);
      await upsertPostEmbedding(postId, vector);
      logger.info({ postId }, 'post embedding indexed');
    },
    baseOpts,
  );

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, postId: job?.data.postId, err }, 'embedding worker failed'),
  );

  return worker;
}
