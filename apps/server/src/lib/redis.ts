import { Redis } from 'ioredis';

import { env } from '../config/env.js';

import { logger } from './logger.js';

/**
 * Redis singletons.
 *
 * - `redis`: the default client used for cache / general ops.
 * - `redisSubscriber`: pub/sub subscriber (Socket.io adapter, etc.).
 * - `bullConnection`: passed to BullMQ; must have `maxRetriesPerRequest=null`.
 */
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

export const redis = build('default');
export const redisSubscriber = build('subscriber');
export const bullConnection = build('bullmq', { maxRetriesPerRequest: null });
