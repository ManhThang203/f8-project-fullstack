'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { sanitizeReturnTo } from '@/lib/auth-guard';

function VerifyEmailStatusInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpError = searchParams.get('error');
  const isVerifiedCallback = searchParams.get('verified') === '1';
  const nextParam = searchParams.get('next');
  const returnTo = sanitizeReturnTo(nextParam);

  const loginHref =
    nextParam != null && nextParam !== ''
      ? `/login?next=${encodeURIComponent(nextParam)}`
      : '/login';

  const registerHref =
    nextParam != null && nextParam !== ''
      ? `/register?next=${encodeURIComponent(nextParam)}`
      : '/register';

  /** Sau xác thực thành công, chuyển về trang đích (hoặc trang chủ) sau khi user đọc thông báo. */
  useEffect(() => {
    if (qpError || !isVerifiedCallback) return;
    const timer = window.setTimeout(() => {
      router.replace(returnTo);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isVerifiedCallback, qpError, returnTo, router]);

  if (qpError || !isVerifiedCallback) {
    const title = qpError ? 'Liên kết không hợp lệ' : 'Không thể xác nhận email';
    const message = qpError
      ? 'Liên kết xác thực email đã hết hạn hoặc không đúng. Hãy đăng ký lại hoặc yêu cầu gửi email mới.'
      : 'Trang này chỉ hiển thị kết quả sau khi bạn bấm liên kết xác thực trong email.';

    return (
      <main className="bg-background min-h-dvh px-4 py-12">
        <div className="border-border bg-card mx-auto w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm" role="alert">
            {message}
          </p>
          <p className="mt-6 text-center text-sm">
            <Link
              href={registerHref}
              className="text-foreground font-medium underline underline-offset-4"
            >
              Đăng ký lại
            </Link>
          </p>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            <Link
              href={loginHref}
              className="text-foreground font-medium underline underline-offset-4"
            >
              Đăng nhập
            </Link>
          </p>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            <Link href="/" className="underline underline-offset-4">
              ← Về trang chủ
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-dvh px-4 py-12">
      <div className="border-border bg-card mx-auto w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Xác thực email thành công</h1>
        <p className="text-muted-foreground mt-2 text-sm" role="status">
          Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng…
        </p>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Link href={returnTo} className="underline underline-offset-4">
            Về trang chủ
          </Link>
        </p>
      </div>
    </main>
  );
}

export function VerifyEmailStatus() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatusInner />
    </Suspense>
  );
}
