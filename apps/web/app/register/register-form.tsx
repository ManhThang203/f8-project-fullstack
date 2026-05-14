'use client';

import { registerBodySchema } from '@threads/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { sanitizeReturnTo } from '@/lib/auth-guard';
import { authClient } from '@/lib/auth-client';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

type RegisterFormValues = z.infer<typeof registerBodySchema>;

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

    /** Better Auth: 422 ≈ email đã dùng hoặc không tạo được user (unique / DB). */
    if (
      status === 422 ||
      lower.includes('already exists') ||
      lower.includes('already been registered') ||
      lower.includes('user already') ||
      lower.includes('another email') ||
      /already.*email|email.*taken|email.*exist/i.test(msg)
    ) {
      setError('email', {
        message:
          'Email này có thể đã được đăng ký. Hãy đăng nhập hoặc dùng email khác (kể cả email seed như demo@threads.local).',
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

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Đăng ký</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email &amp; username là duy nhất. Nếu có user seed (<code className="text-xs">demo@threads.local</code>), không
          dùng lại email đó để đăng ký.
        </p>

        {showGoogle ? (
          <>
            <div className="mt-6 flex flex-col gap-2">
              <GoogleSignInButton
                callbackURL={afterAuthUrl}
                label="Đăng ký bằng Google"
                onError={(msg) => setError('root', { message: msg })}
              />
              <p className="text-center text-xs text-muted-foreground">Dùng Google — không cần mật khẩu trên trang này.</p>
            </div>
            <div className="relative my-6" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">hoặc đăng ký bằng email</span>
              </div>
            </div>
          </>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errors.root ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`mt-1 ${inputClass}`}
              autoComplete="email"
              {...register('email')}
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="username">
              Tên đăng nhập
            </label>
            <input
              id="username"
              className={`mt-1 ${inputClass}`}
              autoComplete="username"
              {...register('username')}
            />
            {errors.username ? (
              <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
              Tên hiển thị (tuỳ chọn)
            </label>
            <input id="name" className={`mt-1 ${inputClass}`} autoComplete="name" {...register('name')} />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className={`mt-1 ${inputClass}`}
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
            className="min-h-11 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href={loginHref} className="font-medium text-foreground underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link
            href={forgotHref}
            className="inline-flex min-h-11 items-center justify-center font-medium text-foreground underline underline-offset-4"
          >
            Quên mật khẩu?
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
