import { Suspense } from 'react';

import { ForgotPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12">
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">Đang tải…</p>
        </main>
      }
    >
      <ClientOnly fallback={<ForgotPasswordSsrFallback />}>
        <ForgotPasswordForm />
      </ClientOnly>
    </Suspense>
  );
}
