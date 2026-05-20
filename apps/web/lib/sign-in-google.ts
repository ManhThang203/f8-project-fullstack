'use client';

import { authClient } from '@/lib/auth-client';

export type GoogleSignInResult =
  | { ok: true }
  | { ok: false; message: string };

function messageFromUnknownError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Đăng nhập Google thất bại. Thử lại.';
}

/**
 * Đăng nhập Google (Better Auth): redirect OAuth → Google chọn tài khoản → callback
 * `{origin}/api/auth/callback/google` → set cookie session → `callbackURL` (path same-origin).
 *
 * Khi cấu hình đúng, trình duyệt thường chuyển trang ngay; promise có thể không resolve.
 * Khi lỗi (thiếu provider, mạng): nhận `{ ok: false, message }`.
 */
export async function signInWithGoogle(callbackURL: string): Promise<GoogleSignInResult> {
  try {
    const raw = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
    });
    const res = raw as { error?: { message?: string } | null } | undefined;
    if (res && typeof res === 'object' && res.error) {
      const m = res.error.message;
      return { ok: false, message: typeof m === 'string' && m ? m : 'Đăng nhập Google thất bại.' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: messageFromUnknownError(e) };
  }
}
