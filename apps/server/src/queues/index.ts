import { Queue, type QueueOptions } from 'bullmq';

import { bullConnection } from '../lib/redis.js';

const defaults: QueueOptions = {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
};

export const QueueName = {
  Media: 'media-processing',
  Email: 'email-sending',
  Notification: 'push-notification',
  MediaCleanup: 'media-cleanup',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const mediaQueue = new Queue(QueueName.Media, defaults);
export const emailQueue = new Queue(QueueName.Email, defaults);
export const notificationQueue = new Queue(QueueName.Notification, defaults);
export const mediaCleanupQueue = new Queue(QueueName.MediaCleanup, defaults);
