import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
  basePath: '/api/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [usernameClient()],
});
