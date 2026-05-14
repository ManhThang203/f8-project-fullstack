import { type NextRequest } from 'next/server';

import { applyUpstreamProxyHeaders } from '@/lib/upstream-client-ip';
import { HOP_BY_HOP_HEADERS, nextResponseFromUpstream } from '@/lib/proxy-to-upstream';

/** Ensure `Response#getSetCookie` exists when proxying session cookies. */
export const runtime = 'nodejs';

/** Không để Next cache GET get-session (header sẽ kẹt trạng thái chưa đăng nhập). */
export const dynamic = 'force-dynamic';

/** Proxy Better Auth to Express on `UPSTREAM_API_URL` (same pattern as `/api/v1`). */
const UPSTREAM = process.env.UPSTREAM_API_URL ?? 'http://localhost:4000';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(`/api/auth/${path.join('/')}`, UPSTREAM);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  applyUpstreamProxyHeaders(req, headers);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    // @ts-expect-error undici duplex for streaming body
    duplex: 'half',
  };

  const upstream = await fetch(url, init);
  return nextResponseFromUpstream(upstream);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
