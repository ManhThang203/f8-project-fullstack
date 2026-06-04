import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { authAdmin, authWeb, type createAppAuth } from '../lib/auth.js';

type AuthInstance = ReturnType<typeof createAppAuth>;

function attachAuthSession(authInstance: AuthInstance): RequestHandler {
  return async (req, _res, next) => {
    try {
      const session = await authInstance.api.getSession({
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
}

/** Resolves Web Better Auth session from cookies / headers. */
export const attachWebAuthSession = attachAuthSession(authWeb);

/** Resolves Admin Better Auth session (`costy-admin` cookies). */
export const attachAdminAuthSession = attachAuthSession(authAdmin);

/** @deprecated Use `attachWebAuthSession`. */
export const attachBetterAuthSession = attachWebAuthSession;
