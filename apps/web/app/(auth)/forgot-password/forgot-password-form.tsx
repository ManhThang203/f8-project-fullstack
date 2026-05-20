'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordRequestSchema } from '@threads/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const inputClass = cn(
  'min-h-11 w-full rounded-xl border-0 bg-muted px-4 py-2.5 text-base text-foreground sm:text-sm',
  'placeholder:text-muted-foreground',
  'outline-none transition-[box-shadow] duration-150',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

type FormValues = z.infer<typeof forgotPasswordRequestSchema>;

const linkFocusClass =
  'rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

function ForgotHeroVisual({ className }: { className?: string }) {
  return (
    <figure className={cn('mx-auto w-full max-w-lg', className)}>
      <div>
        <Image
          src="/images/forgot-password-form.png"
          alt="Minh họa 3D: người dùng ngồi thư giãn trên ghế dài, dùng laptop."
          width={1024}
          height={1024}
          className={cn(
            'h-auto w-full object-contain object-center',
            'max-h-[min(20rem,44svh)] sm:max-h-[min(24rem,48svh)]',
            'md:max-h-[min(28rem,52svh)] lg:max-h-[min(32rem,56svh)]',
          )}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 480px"
          priority
        />
      </div>
    </figure>
  );
}

function BrandingBlock({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('space-y-2 sm:space-y-3', compact && 'text-center md:text-left')}>
      <h1
        className={cn(
          'text-foreground text-balance font-semibold tracking-tight',
          compact
            ? 'text-xl leading-snug sm:text-2xl md:text-3xl'
            : 'text-2xl leading-tight sm:text-3xl sm:leading-tight md:text-4xl lg:text-[2.5rem] lg:leading-tight',
        )}
      >
        Khôi phục quyền truy cập
      </h1>
      <p
        className={cn(
          'text-muted-foreground max-w-md text-pretty',
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
        )}
      >
        Bạn quên mật khẩu? Làm theo các bước bên phải — chúng tôi gửi liên kết an toàn qua email.
      </p>
    </div>
  );
}

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
      nextParam != null && nextParam !== '' ? `?next=${encodeURIComponent(nextParam)}` : '';
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
    <main className="bg-muted/40 min-h-[100dvh] overflow-x-hidden">
      <div
        className={cn(
          'mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-8',
          'px-4 py-8 sm:gap-10 sm:px-6 sm:py-10',
          'md:flex-row md:items-center md:gap-10 md:py-12',
          'lg:gap-12 lg:px-8 lg:py-16',
        )}
      >
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <BrandingBlock />
          <ForgotHeroVisual className="mt-4 sm:mt-6" />
        </section>

        <section className="flex min-w-0 shrink-0 flex-col md:hidden">
          <BrandingBlock compact />
        </section>

        <section className="flex w-full min-w-0 flex-1 justify-center md:justify-end">
          <div
            className={cn(
              'border-border/60 bg-card w-full max-w-md rounded-2xl border shadow-md',
              'p-6 sm:p-8',
            )}
          >
            <h2 className="text-foreground text-center text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
              Quên mật khẩu
            </h2>
            <p className="text-muted-foreground mt-3 text-center text-sm text-pretty">
              Nhập email đã đăng ký. Nếu tồn tại tài khoản, bạn sẽ nhận liên kết đặt lại mật khẩu.
            </p>

            {sent ? (
              <p className="text-foreground mt-6 text-sm leading-relaxed sm:mt-8" role="status">
                Nếu email có trong hệ thống, hãy kiểm tra hộp thư (và thư mục spam) để lấy liên kết
                đặt lại mật khẩu.
              </p>
            ) : (
              <form className="mt-6 flex flex-col gap-4 sm:mt-8" onSubmit={handleSubmit(onSubmit)} noValidate>
                {errors.root ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.root.message}
                  </p>
                ) : null}

                <div>
                  <label className="text-muted-foreground text-xs font-medium" htmlFor="forgot-email">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className={cn('mt-2', inputClass)}
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
                  className="bg-primary text-primary-foreground mt-1 min-h-11 w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
                >
                  {isSubmitting ? 'Đang gửi…' : 'Gửi liên kết'}
                </button>
              </form>
            )}

            <p className="text-muted-foreground mt-6 text-center text-sm sm:mt-8">
              <Link href={loginHref} className={cn('text-foreground font-semibold', linkFocusClass)}>
                Quay lại đăng nhập
              </Link>
            </p>
            <p className="mt-4 text-center sm:mt-6">
              <Link
                href="/"
                className={cn(
                  'text-muted-foreground inline-flex min-h-11 min-w-[44px] items-center justify-center text-sm',
                  linkFocusClass,
                )}
              >
                ← Về trang chủ
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
