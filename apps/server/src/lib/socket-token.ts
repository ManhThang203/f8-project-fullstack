import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

const TTL_MS = 5 * 60 * 1000;

/** Token ngắn hạn cho Socket.io khi cookie không gửi được cross-origin (3000 → 4000). */
export function mintSocketToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = Buffer.from(`${userId}:${exp}`, 'utf8').toString('base64url');
  const sig = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySocketToken(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const colon = decoded.indexOf(':');
  if (colon === -1) return null;
  const userId = decoded.slice(0, colon);
  const exp = Number(decoded.slice(colon + 1));
  if (!Number.isFinite(exp) || exp < Date.now() || !userId) return null;
  return userId;
}
