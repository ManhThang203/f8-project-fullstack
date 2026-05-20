import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasBetterAuthSessionCookie, isPathPublic } from './lib/auth-guard';

function withPathname(request: NextRequest, response: NextResponse) {
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasBetterAuthSessionCookie(request);

  // Không redirect khỏi /login|register|… chỉ vì còn cookie: `getSessionCookie` chỉ biết
  // cookie có tồn tại, không biết session DB còn hợp lệ (reset DB, đổi secret, v.v.).
  // Khi đó redirect → user không bao giờ vào được trang đăng nhập. Đã đăng nhập thật
  // thì `LoginForm` / các form auth sẽ `router.replace` theo `useSession` (client).

  if (isPathPublic(pathname)) {
    return withPathname(request, NextResponse.next());
  }

  if (hasSession) {
    return withPathname(request, NextResponse.next());
  }

  const loginUrl = new URL('/login', request.url);
  const returnTo = pathname + request.nextUrl.search;
  loginUrl.searchParams.set('next', returnTo);
  return withPathname(request, NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
