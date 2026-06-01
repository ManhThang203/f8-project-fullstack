import { loginBodySchema } from '@costy/shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { RequestHandler } from 'express';

import { auth } from '../../lib/auth.js';

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
  const key = raw.toLowerCase();
  const useEmail = key.includes('@');
  // địa chỉ email hoặc tên đăng nhập
  const headers = fromNodeHeaders(req.headers);

  try {
    const upstream = useEmail
      ? await auth.api.signInEmail({
          body: { email: key, password },
          headers,
          asResponse: true,
        })
      : await auth.api.signInUsername({
          body: { username: key, password },
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
  } catch {
    res.status(500).json({ message: 'Đăng nhập thất bại — vui lòng thử lại.' });
  }
};
