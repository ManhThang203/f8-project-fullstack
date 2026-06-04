'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginBodySchema } from '@costy/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { authClient } from '@/lib/auth-client';
import { sanitizeReturnTo } from '@/lib/auth-guard';
import { cn } from '@/lib/utils';

const inputClass = cn(
  'min-h-11 w-full rounded-xl border-0 bg-muted px-4 py-2.5 text-base text-foreground sm:text-sm',
  'placeholder:text-muted-foreground',
  'outline-none transition-[box-shadow] duration-150',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

type LoginFormValues = z.infer<typeof loginBodySchema>;

function LoginHeroVisual({ className }: { className?: string }) {
  return (
    <figure className={cn('mx-auto w-full max-w-lg', className)}>
      <div>
        <Image
          src="/images/anh_login.png"
          alt="Minh họa 3D: người dùng đeo tai nghe, thư giãn và dùng điện thoại."
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
        Kết nối mọi người, chia sẻ khoảnh khắc.
      </h1>
      <p
        className={cn(
          'text-muted-foreground max-w-md text-pretty',
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
        )}
      >
        Tham gia cộng đồng để kết nối, chia sẻ và cập nhật những điều thú vị mỗi ngày.
      </p>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const registerHref =
    nextParam != null && nextParam !== ''
      ? `/register?next=${encodeURIComponent(nextParam)}`
      : '/register';
  const forgotHref =
    nextParam != null && nextParam !== ''
      ? `/forgot-password?next=${encodeURIComponent(nextParam)}`
      : '/forgot-password';
  const afterAuthUrl = sanitizeReturnTo(nextParam);
  const showGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const { data: session, isPending: sessionPending } = authClient.useSession();

  useEffect(() => {
    if (sessionPending || !session?.user) return;
    router.replace(sanitizeReturnTo(nextParam));
  }, [session, sessionPending, router, nextParam]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginBodySchema),
  });

  async function onSubmit(data: LoginFormValues) {
    const res = await fetch('/api/auth/sign-in/identifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // gửi kèm cookie session
      body: JSON.stringify({
        identifier: data.identifier.trim(),
        password: data.password,
      }),
    });

    if (!res.ok) {
      let message = 'Đăng nhập thất bại';
      try {
        const j = (await res.json()) as { message?: string; error?: { message?: string } };
        message =
          (typeof j.message === 'string' && j.message) ||
          (typeof j.error?.message === 'string' && j.error.message) ||
          message;
      } catch {
        /* body không phải JSON */
      }
      setError('root', { message });
      return;
    }

    const to = sanitizeReturnTo(nextParam);
    window.location.assign(to);
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
        {/* Cột trái: chỉ hiện branding + ảnh từ tablet trở lên (tránh cuộn quá dài trên điện thoại) */}
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <BrandingBlock />
          <LoginHeroVisual className="mt-4 sm:mt-6" />
        </section>

        {/* Mobile: branding gọn + form */}
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
              Đăng nhập
            </h2>

            <form
              className="mt-6 flex flex-col gap-4 sm:mt-8"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {errors.root ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.root.message}
                </p>
              ) : null}

              <div>
                <label className="text-muted-foreground text-xs font-medium" htmlFor="identifier">
                  Email hoặc tên đăng nhập
                </label>
                <input
                  id="identifier"
                  className={cn('mt-2', inputClass)}
                  autoComplete="username"
                  {...register('identifier')}
                />
                {errors.identifier ? (
                  <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
                ) : null}
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-medium" htmlFor="password">
                  Mật khẩu
                </label>
                <input
                  id="password"
                  type="password"
                  className={cn('mt-2', inputClass)}
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                ) : null}
                <div className="mt-2 flex justify-end">
                  <Link
                    href={forgotHref}
                    className="text-foreground focus-visible:ring-ring focus-visible:ring-offset-card inline-flex min-h-11 min-w-[44px] items-center rounded-sm text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground mt-1 min-h-11 w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
              >
                {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </form>

            {showGoogle ? (
              <>
                <div className="relative my-6 sm:my-8" aria-hidden="true">
                  <div className="absolute inset-0 flex items-center">
                    <span className="border-border w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card text-muted-foreground px-3">hoặc tiếp tục với</span>
                  </div>
                </div>
                <GoogleSignInButton
                  callbackURL={afterAuthUrl}
                  label="Tiếp tục với Google"
                  className="border-border bg-card rounded-xl"
                  onError={(msg) => setError('root', { message: msg })}
                />
              </>
            ) : null}

            <p className="text-muted-foreground mt-6 text-center text-sm sm:mt-8">
              Chưa có tài khoản?{' '}
              <Link
                href={registerHref}
                className="text-foreground focus-visible:ring-ring focus-visible:ring-offset-card rounded-sm font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Đăng ký
              </Link>
            </p>
            <p className="mt-4 text-center sm:mt-6">
              <Link
                href="/"
                className="text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-card inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-sm text-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
