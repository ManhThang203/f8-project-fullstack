import type { NextRequest } from 'next/server';

/**
 * Headers for same-origin BFF → Express so the API sees the browser-facing host/proto.
 * Undici `fetch('http://api:4000/...')` overwrites `Host` to `api:4000`; Better Auth then
 * mismatches `Origin` (e.g. http://localhost:3000) and returns 401.
 *
 * Also forwards a client IP hint when missing (rate limiting / audits).
 */
export function applyUpstreamProxyHeaders(req: NextRequest, headers: Headers): void {
  if (!headers.get('x-forwarded-for')) {
    const fromReq =
      req.headers.get('cf-connecting-ip')?.trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();

    if (fromReq) {
      headers.set('X-Forwarded-For', fromReq);
    }
  }

  if (!headers.get('x-forwarded-host')) {
    const host = req.headers.get('host') ?? req.nextUrl.host;
    if (host) {
      headers.set('X-Forwarded-Host', host);
    }
  }

  if (!headers.get('x-forwarded-proto')) {
    const proto = req.nextUrl.protocol.replace(/:$/, '') === 'https' ? 'https' : 'http';
    headers.set('X-Forwarded-Proto', proto);
  }
}
