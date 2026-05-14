'use client';

import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { signInWithGoogle } from '@/lib/sign-in-google';
import { cn } from '@/lib/utils';

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
        'flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40',
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
      <ExternalLink className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
      <span>{busy ? 'Đang chuyển tới Google…' : label}</span>
    </button>
  );
}
