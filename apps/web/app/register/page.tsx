import { Suspense } from 'react';

import { RegisterFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-12">
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">Đang tải…</p>
        </main>
      }
    >
      <ClientOnly fallback={<RegisterFormSsrFallback />}>
        <RegisterForm />
      </ClientOnly>
    </Suspense>
  );
}
