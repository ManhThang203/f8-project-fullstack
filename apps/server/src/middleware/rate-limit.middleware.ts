import type { RequestHandler } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';

/**
 * Redis-backed rate limiter. One limiter instance per `keyPrefix`.
 *
 * Usage: `router.use(rateLimit({ points: 30, duration: 60 }));`
 */
export function rateLimit(opts?: { points?: number; duration?: number; keyPrefix?: string }): RequestHandler {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: opts?.keyPrefix ?? 'rl',
    points: opts?.points ?? env.RATE_LIMIT_POINTS,
    duration: opts?.duration ?? env.RATE_LIMIT_DURATION,
  });

  return async (req, _res, next) => {
    const key = req.ip ?? 'unknown';
    try {
      await limiter.consume(key);
      next();
    } catch {
      next(AppError.rateLimited());
    }
  };
}
