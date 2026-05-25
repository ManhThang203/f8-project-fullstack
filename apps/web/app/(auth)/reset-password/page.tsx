import type { Metadata } from 'next';

import { ResetPasswordForm } from './reset-password-form';

import { ResetPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  description: 'Đặt lại mật khẩu Cotsy',
};

export default function ResetPasswordPage() {
  return (
    <ClientOnly fallback={<ResetPasswordSsrFallback />}>
      <ResetPasswordForm />
    </ClientOnly>
  );
}
