import { type NextRequest, NextResponse } from 'next/server';

/**
 * BFF proxy: forwards `/api/v1/*` from the Next.js app to the upstream Express
 * API. This lets the browser hit a same-origin endpoint while we mask the real
 * service URL, attach the session (Phase 2), and optionally cache on the edge.
 *
 * Streams the upstream response 1:1 — no body transformation here.
 */
const UPSTREAM = process.env.UPSTREAM_API_URL ?? 'http://localhost:4000';

const HOP_BY_HOP = new Set([
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

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(`/api/v1/${path.join('/')}`, UPSTREAM);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

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
  const respHeaders = new Headers(upstream.headers);
  HOP_BY_HOP.forEach((h) => respHeaders.delete(h));

  return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
