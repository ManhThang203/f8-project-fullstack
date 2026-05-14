'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginBodySchema } from '@threads/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { authClient } from '@/lib/auth-client';
import { sanitizeReturnTo } from '@/lib/auth-guard';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

type LoginFormValues = z.infer<typeof loginBodySchema>;

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
      credentials: 'include',
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
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Đăng nhập</h1>

        {showGoogle ? (
          <section aria-labelledby="login-oauth-heading" className="mt-6">
            <h2 id="login-oauth-heading" className="text-sm font-medium text-foreground">
              Đăng nhập bằng Google
            </h2>
           
            <div className="mt-4">
              <GoogleSignInButton
                callbackURL={afterAuthUrl}
                label="Đăng nhập bằng Gmail"
                className="bg-background"
                onError={(msg) => setError('root', { message: msg })}
              />
            </div>
          </section>
        ) : null}

        {showGoogle ? (
          <div className="relative my-8" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">hoặc Đăng nhập bằng tài khoản</span>
            </div>
          </div>
        ) : null}

        <section
          aria-labelledby="login-password-heading"
          className={showGoogle ? undefined : 'mt-6'}
        >
          <h2 id="login-password-heading" className="text-sm font-medium text-foreground">
            {showGoogle ? 'Email / tên đăng nhập và mật khẩu' : 'Đăng nhập bằng tài khoản'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Một trường <span className="font-medium text-foreground">identifier</span> (email hoặc tên đăng nhập) cùng mật khẩu được gửi tới API. Mật khẩu Google không dùng ở đây.
          </p>

          <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errors.root ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="identifier">
              Email hoặc tên đăng nhập
            </label>
            <input
              id="identifier"
              className={`mt-1 ${inputClass}`}
              autoComplete="username"
              {...register('identifier')}
            />
            {errors.identifier ? (
              <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className={`mt-1 ${inputClass}`}
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : null}
            <div className="mt-1 flex justify-end">
              <Link
                href={forgotHref}
                className="min-h-11 py-2 text-xs font-medium text-foreground underline underline-offset-4"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        </section>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href={registerHref} className="font-medium text-foreground underline underline-offset-4">
            Đăng ký
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
