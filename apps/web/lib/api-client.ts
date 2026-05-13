import type { ApiResponse } from '@threads/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/**
 * Client-side fetch wrapper. Always hits the Next.js BFF (`/api/v1/*`),
 * which proxies to Express. Returns the parsed API envelope.
 */
export async function apiFetch<TData>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<TData>> {
  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  return (await res.json()) as ApiResponse<TData>;
}
