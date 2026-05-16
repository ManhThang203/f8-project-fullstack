import { RegisterForm } from './register-form';

import { RegisterFormSsrFallback } from '@/components/auth/auth-form-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';

export default function RegisterPage() {
  return (
    <ClientOnly fallback={<RegisterFormSsrFallback />}>
      <RegisterForm />
    </ClientOnly>
  );
}
