import { type NextRequest } from 'next/server';

import { applyUpstreamProxyHeaders } from '@/lib/upstream-client-ip';
import { HOP_BY_HOP_HEADERS, nextResponseFromUpstream } from '@/lib/proxy-to-upstream';

export const runtime = 'nodejs';

/**
 * BFF proxy: forwards `/api/v1/*` from the Next.js app to the upstream Express
 * API. This lets the browser hit a same-origin endpoint while we mask the real
 * service URL, attach the session (Phase 2), and optionally cache on the edge.
 *
 * Streams the upstream response 1:1 — no body transformation here.
 */
const UPSTREAM = process.env.UPSTREAM_API_URL ?? 'http://localhost:4000';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(`/api/v1/${path.join('/')}`, UPSTREAM);
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
    // Body is only present on non-GET/HEAD requests.
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    // @ts-expect-error - undici-specific flag, required when streaming a body
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
