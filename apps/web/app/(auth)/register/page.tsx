import type { Metadata } from 'next';

import { RegisterForm } from './register-form';

import { RegisterFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản Cotsy',
};

export default function RegisterPage() {
  return (
    <ClientOnly fallback={<RegisterFormSsrFallback />}>
      <RegisterForm />
    </ClientOnly>
  );
}
