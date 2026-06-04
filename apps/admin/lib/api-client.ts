import type { ApiError, ApiSuccess } from '@costy/shared';

const BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? '/api';

/** Gọi API admin qua BFF cùng origin để giữ cookie session và tránh CORS. */
export async function apiFetch<TData, TMeta = undefined>(
  path: string,
  init?: RequestInit,
): Promise<ApiSuccess<TData, TMeta> | ApiError> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  return res.json() as Promise<ApiSuccess<TData, TMeta> | ApiError>;
}
