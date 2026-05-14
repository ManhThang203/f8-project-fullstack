import { Suspense } from 'react';

import { LoginFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12">
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">Đang tải…</p>
        </main>
      }
    >
      <ClientOnly fallback={<LoginFormSsrFallback />}>
        <LoginForm />
      </ClientOnly>
    </Suspense>
  );
}
