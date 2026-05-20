import { NextResponse } from 'next/server';

/** Hop-by-hop headers must not be forwarded from upstream to the browser. */
export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

/**
 * Undici/`fetch` thường giải nén body theo `Content-Encoding` nhưng header upstream
 * vẫn có thể còn (vd. Express `compression()`). Gửi header gzip + body đã giải nén
 * → trình duyệt `ERR_CONTENT_DECODING_FAILED`, hỏng get-session và hydration.
 */
const DO_NOT_FORWARD_FROM_UPSTREAM = new Set(['content-encoding']);

/**
 * Build a Next.js response from an upstream `fetch` Response.
 *
 * **Set-Cookie:** `new Headers(upstream.headers)` collapses multiple `Set-Cookie`
 * values (Better Auth sets session + cache cookies). Use `getSetCookie()` and append
 * each cookie so the browser stores the session after BFF proxy sign-in.
 */
export function nextResponseFromUpstream(upstream: Response): NextResponse {
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(k) || DO_NOT_FORWARD_FROM_UPSTREAM.has(k) || k === 'set-cookie')
      return;
    out.set(key, value);
  });

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });

  const cookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  for (const cookie of cookies) {
    res.headers.append('Set-Cookie', cookie);
  }

  return res;
}
