'use client';

import { resetPasswordFormSchema } from '@costy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { authClient } from '@/lib/auth-client';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

type FormValues = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const token = searchParams.get('token');
  const qpError = searchParams.get('error');

  const loginHref =
    nextParam != null && nextParam !== ''
      ? `/login?next=${encodeURIComponent(nextParam)}`
      : '/login';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  async function onSubmit(data: FormValues) {
    if (!token) {
      setError('root', { message: 'Không có mã xác thực. Hãy dùng liên kết trong email.' });
      return;
    }

    const res = await authClient.resetPassword({
      newPassword: data.password,
      token,
    });

    if (res.error) {
      setError('root', { message: res.error.message ?? 'Đặt lại mật khẩu thất bại' });
      return;
    }

    window.location.assign(loginHref);
  }

  const tokenInvalid = qpError === 'INVALID_TOKEN' || qpError === 'invalid_token';

  if (tokenInvalid) {
    return (
      <main className="bg-background min-h-screen px-4 py-12">
        <div className="border-border bg-card mx-auto w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Liên kết không hợp lệ</h1>
          <p className="text-muted-foreground mt-2 text-sm" role="alert">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Hãy yêu cầu gửi lại email.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Gửi lại liên kết
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

  if (!token) {
    return (
      <main className="bg-background min-h-screen px-4 py-12">
        <div className="border-border bg-card mx-auto w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Đặt lại mật khẩu</h1>
          <p className="text-muted-foreground mt-2 text-sm" role="alert">
            Thiếu mã xác thực. Mở liên kết đầy đủ từ email hoặc yêu cầu gửi lại.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Quên mật khẩu
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen px-4 py-12">
      <div className="border-border bg-card mx-auto w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Đặt lại mật khẩu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errors.root ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div>
            <label className="text-muted-foreground text-xs font-medium" htmlFor="new-password">
              Mật khẩu mới
            </label>
            <input
              id="new-password"
              type="password"
              className={`mt-1 ${inputClass}`}
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-muted-foreground text-xs font-medium" htmlFor="confirm-password">
              Nhập lại mật khẩu
            </label>
            <input
              id="confirm-password"
              type="password"
              className={`mt-1 ${inputClass}`}
              autoComplete="new-password"
              aria-invalid={errors.confirmPassword ? true : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground min-h-11 rounded-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
          </button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
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
