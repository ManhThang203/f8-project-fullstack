import { prisma } from '@costy/db';
import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
/**
 * Until BetterAuth lands, development builds accept `x-dev-user-id` to attach
 * `req.auth` when the ID matches an existing user. Ignored in production.
 */
export const attachDevAuthContext: RequestHandler = async (req, _res, next) => {
  if (env.NODE_ENV === 'production') return next();

  const devUserId = req.header('x-dev-user-id')?.trim();
  if (!devUserId) return next();

  const user = await prisma.user.findFirst({
    where: { id: devUserId, deletedAt: null },
    select: { id: true },
  });
  if (user) req.auth = { userId: user.id };

  next();
};
