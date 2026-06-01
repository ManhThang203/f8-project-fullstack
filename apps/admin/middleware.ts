import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasBetterAuthSessionCookie, isPathPublic } from './lib/auth-guard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPathPublic(pathname)) return NextResponse.next();
  if (hasBetterAuthSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
