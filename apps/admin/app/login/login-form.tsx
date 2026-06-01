'use client';

import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/shared/button';
import { authClient } from '@/lib/auth-client';
import { apiQuery } from '@/lib/api-query';
import { cn } from '@/lib/utils';

type LoginErrorCode =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordMin';

type FieldErrors = {
  email?: LoginErrorCode;
  password?: LoginErrorCode;
};

const loginSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired').min(6, 'passwordMin'),
});

const inputClass = cn(
  'min-h-11 w-full rounded-xl border border-auth-form-input-border bg-auth-form-input px-4 py-2.5 text-base text-auth-form-title sm:text-sm',
  'placeholder:text-muted-foreground',
  'outline-none transition-[border-color,box-shadow] duration-150',
  'focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-auth-hero-illustration',
  '[&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--auth-form-title))]',
  '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_hsl(var(--auth-form-input-bg))]',
);

const passwordToggleClass = cn(
  'absolute right-0 top-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg',
  'text-auth-form-input-icon transition-colors duration-150',
  'hover:text-auth-form-title active:text-auth-form-title',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-auth-hero-illustration',
);

function LoginHero({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-2 sm:space-y-3', compact && 'text-center md:text-left')}>
      <h1
        className={cn(
          'text-balance font-semibold tracking-tight text-foreground',
          compact
            ? 'text-xl leading-snug sm:text-2xl md:text-3xl'
            : 'text-2xl leading-tight sm:text-3xl sm:leading-tight md:text-4xl lg:text-[2.5rem] lg:leading-tight',
        )}
      >
        {t('login.heroTitle')}
      </h1>
      <p
        className={cn(
          'max-w-md text-pretty text-muted-foreground',
          compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
        )}
      >
        {t('login.heroSubtitle')}
      </p>
    </div>
  );
}

function LoginHeroVisual({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <figure
      className={cn(
        'mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-auth-hero-illustration p-4 sm:p-6',
        className,
      )}
    >
      <Image
        src="/images/login-admin.png"
        alt={t('login.heroImageAlt')}
        width={1536}
        height={1024}
        className={cn(
          'h-auto w-full object-contain object-center',
          'max-h-[min(20rem,44svh)] sm:max-h-[min(24rem,48svh)]',
          'md:max-h-[min(28rem,52svh)] lg:max-h-[min(32rem,56svh)]',
        )}
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 480px"
        priority
      />
    </figure>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = loginSchema.safeParse({ email: identifier, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        const code = issue.message as LoginErrorCode;
        if (field === 'email' && !fieldErrors.email) fieldErrors.email = code;
        if (field === 'password' && !fieldErrors.password) fieldErrors.password = code;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (res.error) {
        toast.error(res.error.message ?? t('login.failed'));
        return;
      }

      const me = await apiQuery<{ permissions: string[]; role: string }>('/admin/me/permissions');
      const role = me.data.role;
      if (!['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        await authClient.signOut();
        toast.error(t('login.noAccess'));
        return;
      }

      const next = searchParams.get('next') ?? '/';
      router.replace(next);
    } catch {
      toast.error(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-muted/40">
      <div
        className={cn(
          'mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center gap-6',
          'px-4 py-6 sm:gap-8 sm:px-6 sm:py-8',
          'md:flex-row md:items-center md:gap-10 md:py-12',
          'lg:gap-12 lg:px-8 lg:py-16',
        )}
      >
        <section className="hidden min-w-0 flex-1 flex-col justify-center md:flex md:pr-2 lg:pr-6">
          <LoginHero />
          <LoginHeroVisual className="mt-4 sm:mt-6" />
        </section>

        <section className="flex min-w-0 shrink-0 flex-col md:hidden">
          <LoginHero compact />
        </section>

        <section className="flex w-full min-w-0 flex-none flex-col items-center justify-center md:flex-1 md:flex-row md:items-center md:justify-end">
          <div
            className={cn(
              'w-full max-w-md rounded-2xl border border-border/60 bg-auth-hero-illustration shadow-md',
              'p-6 sm:p-8',
            )}
          >
            <h2 className="text-center text-lg font-semibold tracking-tight text-auth-form-title sm:text-xl lg:text-2xl">
              {t('login.formTitle')}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="mt-6 flex flex-col gap-4 sm:mt-8"
              noValidate
            >
              <div>
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="login-email"
                >
                  {t('login.email')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={cn('mt-2', inputClass, errors.email && 'border-red-500 focus-visible:ring-red-500')}
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                />
                {errors.email ? (
                  <p id="login-email-error" className="mt-1 text-xs text-red-500">
                    {t(`login.${errors.email}`)}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="login-password"
                >
                  {t('login.password')}
                </label>
                <div className="relative mt-2">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={cn(
                      inputClass,
                      'pr-11',
                      errors.password && 'border-red-500 focus-visible:ring-red-500',
                    )}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={passwordToggleClass}
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" aria-hidden />
                    ) : (
                      <Eye className="size-5" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p id="login-password-error" className="mt-1 text-xs text-red-500">
                    {t(`login.${errors.password}`)}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="mt-1 w-full rounded-xl bg-auth-form-button text-auth-form-button-fg hover:bg-auth-form-button/90"
                disabled={loading}
              >
                {loading ? t('login.submitting') : t('login.submit')}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
