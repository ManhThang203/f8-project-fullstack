import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

/**
 * Token HMAC ngắn hạn dùng **chỉ cho Socket.io** khi browser mở web `WEB` (vd. :3000)
 * nhưng socket nối thẳng tới API server (:4000) — cookie session Better Auth là
 * same-site với web, request WS cross-origin thường **không** kèm cookie đủ tin cậy.
 *
 * Luồng:
 * 1. Client đã đăng nhập (cookie trên :3000) gọi HTTP **đã xác thực** tới
 *    `POST /api/v1/chat/socket-token` (xem `chat.routes.ts`) → server mint token.
 * 2. Client gửi token trong handshake (query / auth payload) → `chat.namespace.ts` gọi
 *    `verifySocketToken` → lấy `userId` an toàn hơn là tin chuỗi plain từ client.
 *
 * Định dạng: `base64url(userId + ":" + expMs) + "." + hex(HMAC-SHA256(payload))`.
 * Dùng `BETTER_AUTH_SECRET` làm key HMAC (tiện vận hành; đổi secret = token cũ hết hiệu lực).
 * **Không** thay JWT session Better Auth — đây là “vé” riêng, TTL rất ngắn.
 */
// TTL 5 phút
const TTL_MS = 5 * 60 * 1000;

/** Sinh token; chỉ gọi sau khi đã biết `userId` từ session/API đã auth. */
export function mintSocketToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = Buffer.from(`${userId}:${exp}`, 'utf8').toString('base64url');
  const sig = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Kiểm tra chữ ký + hết hạn; trả `userId` hoặc `null`. Luôn fail “mềm” (null),
 * không leak lý do (sai sig / hết hạn / format lỗi) để hạn chế probing.
 *
 * `lastIndexOf('.')`: chữ ký hex không chứa `.`; delimiter duy nhất giữa payload và sig.
 * So sánh sig bằng `timingSafeEqual` sau khi kiểm tra cùng độ dài — tránh timing attack
 * khi đoán chữ ký (so `===` string ngắn hơn có thể leak theo thời gian).
 */
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
