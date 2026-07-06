import { loginBodySchema } from '@costy/shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { RequestHandler } from 'express';

import { authWeb } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';

/**
 * POST /api/auth/sign-in/identifier — body `{ identifier, password }`.
 * Có `@` → signInEmail, không → signInUsername (gọi auth.api trong process).
 */
export const handleSignInIdentifier: RequestHandler = async (req, res) => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ';
    res.status(400).json({ message: msg });
    return;
  }

  const { identifier, password } = parsed.data;
  const raw = identifier.trim();
  const useEmail = raw.includes('@');
  const email = raw.toLowerCase();
  const username = raw.toLowerCase();
  const headers = fromNodeHeaders(req.headers);

  try {
    const upstream = useEmail
      ? await authWeb.api.signInEmail({
          body: { email, password },
          headers,
          asResponse: true,
        })
      : await authWeb.api.signInUsername({
          body: { username, password },
          headers,
          asResponse: true,
        });

    if (!(upstream instanceof Response)) {
      res.status(500).json({ message: 'Đăng nhập thất bại — phản hồi không hợp lệ.' });
      return;
    }

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie') return;
      if (['connection', 'transfer-encoding', 'keep-alive'].includes(k)) return;
      res.setHeader(key, value);
    });
    const cookies =
      typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
    for (const cookie of cookies) {
      res.append('Set-Cookie', cookie);
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (err) {
    logger.error({ err }, 'sign-in/identifier failed');
    res.status(500).json({ message: 'Đăng nhập thất bại — vui lòng thử lại.' });
  }
};
