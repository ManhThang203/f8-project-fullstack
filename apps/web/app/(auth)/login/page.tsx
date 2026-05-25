import type { Metadata } from 'next';

import { LoginForm } from './login-form';

import { LoginFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào Cotsy',
};

export default function LoginPage() {
  return (
    <ClientOnly fallback={<LoginFormSsrFallback />}>
      <LoginForm />
    </ClientOnly>
  );
}
