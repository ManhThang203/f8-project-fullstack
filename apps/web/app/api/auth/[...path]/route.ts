/**
 * BFF reverse-proxy: `/api/auth/*` (Next) → `/api/auth/*` (Express + Better Auth).
 *
 * Mục đích: trình duyệt luôn gọi same-origin với Next nên cookie session
 * (HttpOnly, SameSite=Lax) gắn đúng domain hiển thị, tránh CORS preflight và
 * tránh lệch `Origin` mà Better Auth kiểm tra.
 *
 * Mọi thay đổi ở đây nên đồng bộ với proxy `/api/v1/[...path]` để hành vi
 * forward header / cookie / redirect nhất quán giữa auth và API thường.
 */
import { type NextRequest } from 'next/server';

import { applyUpstreamProxyHeaders } from '@/lib/upstream-client-ip';
import { HOP_BY_HOP_HEADERS, nextResponseFromUpstream } from '@/lib/proxy-to-upstream';

/**
 * Bắt buộc runtime Node: Edge runtime chưa có `Response#getSetCookie()`, mà
 * Better Auth có thể trả nhiều `Set-Cookie` cùng lúc (session + cache). Nếu
 * dùng Edge, các cookie này sẽ bị gộp thành 1 dòng → trình duyệt bỏ qua.
 */
export const runtime = 'nodejs';

/**
 * Tắt static optimization. Endpoint hay gặp nhất là `GET /get-session`:
 * nếu Next cache, mọi user mới đều nhận lại response "chưa đăng nhập"
 * dù cookie đã có → trang client kẹt ở trạng thái logged-out.
 */
export const dynamic = 'force-dynamic';

/** Upstream Express. Đặt qua env để staging/prod trỏ tới host nội bộ khác. */
const UPSTREAM = process.env.UPSTREAM_API_URL ?? 'http://localhost:4000';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // App Router (Next 15): `params` là Promise, phải await trước khi dùng.
  const { path } = await params;
  const url = new URL(`/api/auth/${path.join('/')}`, UPSTREAM);
  url.search = req.nextUrl.search;

  // Forward header từ browser sang Express, loại bỏ các header hop-by-hop
  // (Connection, Transfer-Encoding, Host, Content-Length…). Giữ lại các header
  // này sẽ làm hỏng phiên kết nối hoặc khiến undici tính sai độ dài body.
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  // Bổ sung X-Forwarded-Host/Proto/For để Better Auth kiểm tra Origin và rate
  // limit dựa trên IP thật của browser, không phải IP container Next.
  applyUpstreamProxyHeaders(req, headers);

  const init: RequestInit = {
    method: req.method,
    headers,
    // Không tự follow redirect: một số flow (OAuth callback, email verify)
    // dựa vào việc browser nhận trực tiếp 302 + Set-Cookie từ Better Auth.
    redirect: 'manual',
    // Cẩn thận lần nữa với cache của fetch (ngoài cache của Next route).
    cache: 'no-store',
    // GET/HEAD không có body — gửi body sẽ bị undici từ chối.
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    // `duplex: 'half'` là yêu cầu của undici khi `body` là một ReadableStream
    // (streaming request). Type của lib.dom chưa có field này nên cần ts-expect-error.
    // @ts-expect-error undici duplex for streaming body
    duplex: 'half',
  };
  // Next ghép URL upstream
  const upstream = await fetch(url, init);
  // Helper tách `Set-Cookie` thành nhiều dòng + lọc `content-encoding` để
  // tránh `ERR_CONTENT_DECODING_FAILED` (xem `lib/proxy-to-upstream.ts`).
  return nextResponseFromUpstream(upstream);
}

// Phải export riêng từng method: Next App Router không có "catch-all method".
// Better Auth dùng GET (get-session, callback), POST (sign-in/up, sign-out),
// và một số provider có thể dùng PUT/PATCH/DELETE/HEAD.
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
