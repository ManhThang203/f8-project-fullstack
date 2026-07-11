'use client';

import { ErrorCode } from '@costy/shared';

import { authClient } from './auth-client';

let inFlight: Promise<void> | null = null;

/** Kiểm tra lỗi API là tài khoản bị khóa/cấm. */
export function isAccountBlockedError(error: { code?: string; message?: string }): boolean {
  if (error.code !== ErrorCode.FORBIDDEN) return false;
  const msg = error.message ?? '';
  return msg.includes('khóa hoặc cấm') || /banned|locked/i.test(msg);
}

/**
 * Đăng xuất một lần rồi đưa về /login khi bị ban/khóa giữa phiên.
 * Dùng dynamic import socket để tránh circular dependency.
 */
export function forceLogoutIfAccountBlocked(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { resetAuthedSockets, resetChatSocket } = await import('@/lib/socket');
      resetAuthedSockets();
      resetChatSocket();
      await authClient.signOut();
    } catch {
      /* vẫn redirect dù signOut lỗi */
    }
    const url = new URL('/login', window.location.origin);
    url.searchParams.set('reason', 'blocked');
    window.location.assign(url.toString());
  })();

  return inFlight;
}
