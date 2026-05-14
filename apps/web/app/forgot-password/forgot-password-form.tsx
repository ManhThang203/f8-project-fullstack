'use client';

import { forgotPasswordRequestSchema } from '@threads/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { authClient } from '@/lib/auth-client';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

type FormValues = z.infer<typeof forgotPasswordRequestSchema>;

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const loginHref =
    nextParam != null && nextParam !== ''
      ? `/login?next=${encodeURIComponent(nextParam)}`
      : '/login';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset: resetForm,
  } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordRequestSchema),
  });

  const [sent, setSent] = useState(false);

  async function onSubmit(data: FormValues) {
    const nextQ =
      nextParam != null && nextParam !== ''
        ? `?next=${encodeURIComponent(nextParam)}`
        : '';
    const redirectTo = `${window.location.origin}/reset-password${nextQ}`;
    const res = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo,
    });

    if (res.error) {
      setError('root', { message: res.error.message ?? 'Không gửi được email. Thử lại sau.' });
      return;
    }

    resetForm();
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập email đã đăng ký. Nếu tồn tại tài khoản, bạn sẽ nhận liên kết đặt lại mật khẩu.
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-foreground" role="status">
            Nếu email có trong hệ thống, hãy kiểm tra hộp thư (và thư mục spam) để lấy liên kết đặt lại mật khẩu.
          </p>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {errors.root ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.root.message}
              </p>
            ) : null}

            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                className={`mt-1 ${inputClass}`}
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email ? (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {isSubmitting ? 'Đang gửi…' : 'Gửi liên kết'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={loginHref} className="font-medium text-foreground underline underline-offset-4">
            Quay lại đăng nhập
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            ← Về trang chủ
          </Link>
        </p>
      </div>
    </main>
  );
}
