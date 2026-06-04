import type { ApiError, ApiSuccess } from '@costy/shared';

import { apiFetch } from './api-client';

export class ApiQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiQueryError';
  }
}

export async function apiQuery<TData, TMeta = undefined>(
  path: string,
  init?: RequestInit,
): Promise<ApiSuccess<TData, TMeta>> {
  const res = await apiFetch<TData, TMeta>(path, init);
  if (!res.success) {
    throw new ApiQueryError(res.error.message, res.error.code, res.error.details);
  }
  return res;
}
