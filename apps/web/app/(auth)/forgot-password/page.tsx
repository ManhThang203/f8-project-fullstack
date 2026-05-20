import { ForgotPasswordForm } from './forgot-password-form';

import { ForgotPasswordSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export default function ForgotPasswordPage() {
  return (
    <ClientOnly fallback={<ForgotPasswordSsrFallback />}>
      <ForgotPasswordForm />
    </ClientOnly>
  );
}
