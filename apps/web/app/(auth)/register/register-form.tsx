'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { registerBodySchema } from '@threads/shared';
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

type RegisterFormValues = z.infer<typeof registerBodySchema>;

function RegisterHeroVisual({ className }: { className?: string }) {
  return (
    <figure className={cn('mx-auto w-full max-w-lg', className)}>
      <div>
        <Image
          src="/images/anh_register.png"
          alt="Minh họa 3D: người dùng thư giãn trên ghế, dùng điện thoại và làm dấu chữ V."
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
        Tạo tài khoản của bạn
      </h1>
      <p
        className={cn(
          'text-muted-foreground max-w-md text-pretty',
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
        )}
      >
        Vài thông tin để bắt đầu — kết nối, chia sẻ và cập nhật cùng mọi người.
      </p>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const loginHref =
    nextParam != null && nextParam !== ''
      ? `/login?next=${encodeURIComponent(nextParam)}`
      : '/login';
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
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerBodySchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(data: RegisterFormValues) {
    const name = (data.name?.trim() || data.username).trim() || 'Người dùng';

    const res = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name,
      username: data.username,
    });

    if (!res.error) {
      const to = sanitizeReturnTo(nextParam);
      window.location.assign(to);
      return;
    }

    const err = res.error as { message?: string; status?: number; code?: string };
    const msg = err.message ?? 'Đăng ký thất bại';
    const lower = msg.toLowerCase();
    const status = err.status;

    if (
      status === 422 ||
      lower.includes('already exists') ||
      lower.includes('already been registered') ||
      lower.includes('user already') ||
      lower.includes('another email') ||
      /already.*email|email.*taken|email.*exist/i.test(msg)
    ) {
      setError('email', {
        message: 'Email này có thể đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
      });
      document.getElementById('email')?.focus();
      return;
    }
    if (
      lower.includes('username') &&
      (lower.includes('taken') || lower.includes('exists') || lower.includes('already'))
    ) {
      setError('username', { message: msg });
      document.getElementById('username')?.focus();
      return;
    }
    setError('root', { message: msg });
  }

  const linkFocusClass =
    'rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

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
          <RegisterHeroVisual className="mt-4 sm:mt-6" />
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
              Đăng ký
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
                <label className="text-muted-foreground text-xs font-medium" htmlFor="username">
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  className={cn('mt-2', inputClass)}
                  autoComplete="username"
                  {...register('username')}
                />
                {errors.username ? (
                  <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
                ) : null}
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-medium" htmlFor="name">
                  Tên hiển thị (tuỳ chọn)
                </label>
                <input
                  id="name"
                  className={cn('mt-2', inputClass)}
                  autoComplete="name"
                  {...register('name')}
                />
                {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={cn('mt-2', inputClass)}
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
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
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground mt-1 min-h-11 w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
              >
                {isSubmitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
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
              Đã có tài khoản?{' '}
              <Link href={loginHref} className={cn('text-foreground font-semibold', linkFocusClass)}>
                Đăng nhập
              </Link>
            </p>
            <p className="mt-4 text-center">
              <Link
                href={forgotHref}
                className={cn(
                  'text-foreground inline-flex min-h-11 min-w-[44px] items-center justify-center text-sm font-medium',
                  linkFocusClass,
                )}
              >
                Quên mật khẩu?
              </Link>
            </p>
            <p className="mt-2 text-center sm:mt-4">
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
