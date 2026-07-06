import type { Metadata } from 'next';

import { VerifyEmailStatus } from './verify-email-status';

import { ResetPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Xác thực email',
  description: 'Xác thực email tài khoản Cotsy',
};

export default function VerifyEmailPage() {
  return (
    <ClientOnly fallback={<ResetPasswordSsrFallback />}>
      <VerifyEmailStatus />
    </ClientOnly>
  );
}
