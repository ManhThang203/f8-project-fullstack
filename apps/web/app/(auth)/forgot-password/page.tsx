import type { Metadata } from 'next';

import { ForgotPasswordForm } from './forgot-password-form';

import { ForgotPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Khôi phục mật khẩu Cotsy',
};

export default function ForgotPasswordPage() {
  return (
    <ClientOnly fallback={<ForgotPasswordSsrFallback />}>
      <ForgotPasswordForm />
    </ClientOnly>
  );
}
