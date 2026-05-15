import { Suspense } from 'react';

import { ForgotPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-muted/40 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-md sm:p-8">
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          </div>
        </main>
      }
    >
      <ClientOnly fallback={<ForgotPasswordSsrFallback />}>
        <ForgotPasswordForm />
      </ClientOnly>
    </Suspense>
  );
}
