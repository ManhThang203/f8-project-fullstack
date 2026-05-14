import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasBetterAuthSessionCookie, isAuthPage, isPathPublic, sanitizeReturnTo } from './lib/auth-guard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasBetterAuthSessionCookie(request);

  if (hasSession && isAuthPage(pathname)) {
    const rawNext = request.nextUrl.searchParams.get('next');
    const to = sanitizeReturnTo(rawNext);
    return NextResponse.redirect(new URL(to, request.url));
  }

  if (isPathPublic(pathname)) {
    return NextResponse.next();
  }

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  const returnTo = pathname + request.nextUrl.search;
  loginUrl.searchParams.set('next', returnTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
