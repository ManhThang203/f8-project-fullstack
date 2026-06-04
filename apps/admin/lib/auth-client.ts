import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

/*
  Browser client — calls same-origin `/api/admin/auth` (proxied to Express).
  Mọi method Better Auth (đăng nhập, đăng ký, get-session, OAuth, v.v.) đều thành request tới /api/admin/auth
*/
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
  basePath: '/api/admin/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [usernameClient()],
});
