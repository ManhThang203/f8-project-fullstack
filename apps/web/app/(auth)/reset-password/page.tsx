import { ResetPasswordForm } from './reset-password-form';

import { ResetPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export default function ResetPasswordPage() {
  return (
    <ClientOnly fallback={<ResetPasswordSsrFallback />}>
      <ResetPasswordForm />
    </ClientOnly>
  );
}
