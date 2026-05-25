/**
 * Redis clients dùng chung — mỗi instance một vai trò riêng.
 */

import { Redis } from 'ioredis';

import { env } from '../config/env.js';

import { logger } from './logger.js';

/** Tạo client Redis với log connect/error; `overrides` cho tuỳ chọn từng use-case. */
function build(name: string, overrides: Record<string, unknown> = {}): Redis {
  const client = new Redis(env.REDIS_URL, {
    tls: env.REDIS_TLS ? {} : undefined,
    lazyConnect: false,
    ...overrides,
  });
  client.on('error', (e: Error) => logger.error({ err: e, name }, 'redis error'));
  client.on('connect', () => logger.info({ name }, 'redis connected'));
  return client;
}

/** Cache / thao tác Redis thông thường. */
export const redis = build('default');

/** Subscriber riêng cho pub/sub (vd. Socket.IO adapter khi scale nhiều instance). */
export const redisSubscriber = build('subscriber');

/** Kết nối BullMQ — bắt buộc `maxRetriesPerRequest: null` theo yêu cầu thư viện. */
export const bullConnection = build('bullmq', { maxRetriesPerRequest: null });
