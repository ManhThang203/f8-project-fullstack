'use client';

import { authClient } from '@/lib/auth-client';

export type GoogleSignInResult = { ok: true } | { ok: false; message: string };

function messageFromUnknownError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return 'Đăng nhập Google thất bại. Thử lại.';
}

/** Lấy URL OAuth từ response Better Auth (hỗ trợ cả envelope client lẫn body thô). */
function extractOAuthUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.url === 'string' && obj.url.length > 0) return obj.url;
  const data = obj.data;
  if (data && typeof data === 'object') {
    const url = (data as Record<string, unknown>).url;
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return null;
}

/**
 * Đăng nhập Google (Better Auth): gọi OAuth → redirect trình duyệt sang Google
 * → callback `/api/auth/callback/google` → set cookie session → `callbackURL`.
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

    const oauthUrl = extractOAuthUrl(raw);
    if (oauthUrl) {
      window.location.assign(oauthUrl);
      return { ok: true };
    }

    return { ok: false, message: 'Không nhận được liên kết Google OAuth.' };
  } catch (e) {
    return { ok: false, message: messageFromUnknownError(e) };
  }
}
