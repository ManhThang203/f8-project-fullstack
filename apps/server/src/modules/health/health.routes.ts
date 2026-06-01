import { Router } from 'express';
import { ok } from '@costy/shared';

import { prisma } from '@costy/db';

import { redis } from '../../lib/redis.js';

const router = Router();

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
      redis.ping().then((r: string) => r === 'PONG').catch(() => false),
    ]);
    const data = { status: 'ok', uptimeSec: Math.round(process.uptime()), db: dbOk, redis: redisOk };
    res.status(dbOk && redisOk ? 200 : 503).json(ok(data));
  } catch (e) {
    next(e);
  }
});

export { router as healthRouter };
