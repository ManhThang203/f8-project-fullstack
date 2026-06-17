import { Router } from 'express';
import { ok } from '@costy/shared';

import { prisma } from '@costy/db';

import { redis } from '../../lib/redis.js';

const router = Router();

const REDIS_PING_TIMEOUT_MS = 2_000;

async function checkRedis(): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('redis ping timeout')), REDIS_PING_TIMEOUT_MS);
      }),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness + dependency health probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All checks passed
 */
router.get('/', async (_req, res, next) => {
  try {
    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      checkRedis(),
    ]);
    const data = {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      db: dbOk,
      redis: redisOk,
    };
    res.status(dbOk && redisOk ? 200 : 503).json(ok(data));
  } catch (e) {
    next(e);
  }
});

export { router as healthRouter };
