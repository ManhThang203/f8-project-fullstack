import { LoginForm } from './login-form';

import { LoginFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export default function LoginPage() {
  return (
    <ClientOnly fallback={<LoginFormSsrFallback />}>
      <LoginForm />
    </ClientOnly>
  );
}
