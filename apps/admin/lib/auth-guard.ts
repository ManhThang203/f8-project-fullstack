import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';

export function hasBetterAuthSessionCookie(request: NextRequest): boolean {
  return Boolean(getSessionCookie(request));
}

export function isPathPublic(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico'
  );
}
