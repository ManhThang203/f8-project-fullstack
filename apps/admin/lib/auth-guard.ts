import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE_PREFIX = 'costy-admin';

// Kiểm tra xem có session cookie nào không
export function hasBetterAuthSessionCookie(request: NextRequest): boolean {
  return Boolean(getSessionCookie(request, { cookiePrefix: ADMIN_SESSION_COOKIE_PREFIX }));
}

// Kiểm tra xem path có phải là public không
export function isPathPublic(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico'
  );
}
