import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Edge-safe check: chỉ cookie **session token** (`better-auth.session_token` hoặc
 * `__Secure-better-auth.session_token`), không phải mọi cookie `better-auth.*`
 * (ví dụ `oauth_state`) — tránh redirect khỏi `/login` khi client không có session hợp lệ.
 *
 * Không xác thực chữ ký cookie; API / RSC vẫn phải kiểm tra session thật.
 */
export function hasBetterAuthSessionCookie(request: NextRequest): boolean {
  return Boolean(getSessionCookie(request));
}

/**
 * Paths that do not require a session. Adjust as the app grows.
 *
 * In **development**, `/` is public so local testing with `x-dev-user-id` still works.
 */
export function isPathPublic(pathname: string): boolean {
  if (pathname.startsWith('/api')) return true;
  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.json'
  ) {
    return true;
  }
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return true;
  }
  if (process.env.NODE_ENV === 'development' && pathname === '/') return true;
  return false;
}

export function isAuthPage(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  );
}

/** Only allow same-origin path redirects (open-redirect safe). */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '/';
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return '/';
  }
  if (!s.startsWith('/') || s.startsWith('//')) return '/';
  if (s.includes('\0')) return '/';
  return s;
}
