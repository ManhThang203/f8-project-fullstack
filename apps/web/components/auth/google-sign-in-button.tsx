'use client';

import { useState } from 'react';

import { signInWithGoogle } from '@/lib/sign-in-google';
import { cn } from '@/lib/utils';

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden={true} focusable={false}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

type Props = {
  callbackURL: string;
  /** Ví dụ: «Tiếp tục với Google» — mở trang OAuth để xác nhận như GitHub/Facebook. */
  label: string;
  className?: string;
  disabled?: boolean;
  /** Khi Better Auth trả lỗi (không redirect được). */
  onError?: (message: string) => void;
};

/**
 * Chỉ hiện khi có `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Gọi OAuth: trình duyệt chuyển sang Google
 * để chọn tài khoản và xác nhận — không thay thế form đăng nhập mật khẩu.
 */
export function GoogleSignInButton({ callbackURL, label, className, disabled, onError }: Props) {
  const [busy, setBusy] = useState(false);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-label={`${label} — mở trang Google để xác nhận`}
      aria-busy={busy}
      className={cn(
        'flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40',
        className,
      )}
      onClick={() => {
        setBusy(true);
        void signInWithGoogle(callbackURL).then((r) => {
          setBusy(false);
          if (!r.ok) onError?.(r.message);
        });
      }}
    >
      <GoogleLogo className="h-5 w-5 shrink-0" />
      <span>{busy ? 'Đang chuyển tới Google…' : label}</span>
    </button>
  );
}
