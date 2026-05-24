/**
 * Token HMAC ngắn hạn cho Socket.IO `/chat`.
 *
 * Vì FE (:3000) và API (:4000) khác origin, cookie session thường không gửi
 * được khi handshake WS → client lấy token qua POST /chat/socket-token (đã auth),
 * rồi gửi trong handshake.auth.token.
 *
 * Format: base64url(userId:expMs).hex(HMAC-SHA256)
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

const TTL_MS = 5 * 60 * 1000; // 5  phút

/** Tạo token sau khi đã xác thực userId qua HTTP session. */
export function mintSocketToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = Buffer.from(`${userId}:${exp}`, 'utf8').toString('base64url');
  const sig = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Xác thực token → trả userId hoặc null.
 * Luôn trả null khi lỗi (không phân biệt sai sig / hết hạn) để tránh probing.
 */
export function verifySocketToken(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;

  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');

  try {
    // timingSafeEqual tránh so sánh chữ ký theo thời gian (timing attack).
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
