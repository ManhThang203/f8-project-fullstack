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
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Liên kết không hợp lệ</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Hãy yêu cầu gửi lại email.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              Gửi lại liên kết
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

  if (!token) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            Thiếu mã xác thực. Mở liên kết đầy đủ từ email hoặc yêu cầu gửi lại.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              Quên mật khẩu
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errors.root ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="new-password">
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
            <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm-password">
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
            className="min-h-11 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={loginHref} className="font-medium text-foreground underline underline-offset-4">
            Đăng nhập
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
