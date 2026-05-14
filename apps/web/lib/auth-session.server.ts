import { cookies, headers } from 'next/headers';

import type { ServerAuthUser } from '@/lib/auth-user.types';

/**
 * Đọc session trên server bằng cookie trình duyệt → gọi trực tiếp Express
 * (không qua client `useSession`, tránh cookie/hydration không khớp).
 */
export async function getServerSession(): Promise<{ user: ServerAuthUser } | null> {
  const jar = await cookies();
  const all = jar.getAll();
  if (all.length === 0) return null;

  const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join('; ');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';

  const upstream = (process.env.UPSTREAM_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const res = await fetch(`${upstream}/api/auth/get-session`, {
    headers: {
      cookie: cookieHeader,
      'x-forwarded-host': host,
      'x-forwarded-proto': proto,
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }

  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  let userRaw: unknown = o.user;
  if (
    userRaw == null &&
    o.data != null &&
    typeof o.data === 'object' &&
    !Array.isArray(o.data)
  ) {
    userRaw = (o.data as Record<string, unknown>).user;
  }
  if (userRaw == null || typeof userRaw !== 'object' || Array.isArray(userRaw)) return null;
  const user = userRaw as Record<string, unknown>;
  const id = user.id;
  if (typeof id !== 'string' || id.length === 0) return null;

  return {
    user: {
      id,
      email: typeof user.email === 'string' ? user.email : user.email == null ? null : String(user.email),
      name:
        user.name === null || user.name === undefined
          ? null
          : typeof user.name === 'string'
            ? user.name
            : String(user.name),
      username:
        typeof user.username === 'string'
          ? user.username
          : user.username === null || user.username === undefined
            ? null
            : String(user.username),
    },
  };
}
