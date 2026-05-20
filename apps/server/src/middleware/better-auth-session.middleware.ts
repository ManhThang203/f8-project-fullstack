import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../lib/auth.js';

/**
 * Resolves Better Auth session from cookies / headers and attaches `req.auth.userId`.
 */
export const attachBetterAuthSession: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user?.id) {
      req.auth = { userId: session.user.id };
    }
  } catch {
    /* invalid session */
  }
  next();
};
