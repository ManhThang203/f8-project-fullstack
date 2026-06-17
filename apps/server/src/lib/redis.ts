/**
 * Redis clients dùng chung — mỗi instance một vai trò riêng.
 */

import { Redis, type RedisOptions } from 'ioredis';

import { env } from '../config/env.js';

import { logger } from './logger.js';

/** Tránh `localhost` → IPv6 `::1` trên Windows khi Docker Redis chỉ bind IPv4. */
function resolveRedisUrl(): string {
  return env.REDIS_URL.replace('redis://localhost:', 'redis://127.0.0.1:');
}

function sharedRedisOptions(overrides: RedisOptions = {}): RedisOptions {
  return {
    tls: env.REDIS_TLS ? {} : undefined,
    connectTimeout: 10_000,
    retryStrategy(times) {
      return Math.min(times * 200, 3_000);
    },
    reconnectOnError(err) {
      const msg = err.message;
      return msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED');
    },
    ...overrides,
  };
}

/** Tạo client Redis với log connect/error; `overrides` cho tuỳ chọn từng use-case. */
function build(name: string, overrides: RedisOptions = {}): Redis {
  const client = new Redis(resolveRedisUrl(), sharedRedisOptions(overrides));

  client.on('error', (e: Error) => {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ECONNRESET') {
      logger.warn({ err: e, name }, 'redis connection reset (reconnecting)');
      return;
    }
    logger.error({ err: e, name }, 'redis error');
  });

  client.on('connect', () => logger.info({ name }, 'redis connected'));
  client.on('reconnecting', () => logger.info({ name }, 'redis reconnecting'));

  return client;
}

/**
 * Cache / thao tác Redis thông thường.
 * `lazyConnect` — tránh burst 2 kết nối cùng lúc với BullMQ lúc khởi động (ECONNRESET trên Docker/Windows).
 */
export const redis = build('default', { lazyConnect: true });

let redisSubscriberClient: Redis | null = null;

/**
 * Subscriber riêng cho pub/sub (vd. Socket.IO Redis adapter khi scale).
 * Lazy — không mở connection lúc khởi động vì chưa dùng; tránh ECONNRESET do burst connect.
 */
export function getRedisSubscriber(): Redis {
  redisSubscriberClient ??= build('subscriber', { lazyConnect: true });
  return redisSubscriberClient;
}

/** Kết nối BullMQ — bắt buộc `maxRetriesPerRequest: null` theo yêu cầu thư viện. */
export const bullConnection = build('bullmq', { maxRetriesPerRequest: null });
