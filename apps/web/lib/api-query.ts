import type { ApiResponse } from '@costy/shared';

import { apiFetch } from '@/lib/api-client';

export class ApiQueryError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiQueryError';
    this.code = code;
    this.details = details;
  }
}

export function isApiQueryError(error: unknown): error is ApiQueryError {
  return error instanceof ApiQueryError;
}

/** Throws {@link ApiQueryError} when the API envelope is not successful. */
export async function apiQuery<TData, TMeta = undefined>(
  path: string,
  init?: RequestInit,
): Promise<Extract<ApiResponse<TData, TMeta>, { success: true }>> {
  const res = await apiFetch<TData, TMeta>(path, init);
  if (!res.success) {
    throw new ApiQueryError(res.error.message, res.error.code, res.error.details);
  }
  return res;
}

/** Returns only `data` from a successful API envelope. */
export async function apiQueryData<TData, TMeta = undefined>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  const res = await apiQuery<TData, TMeta>(path, init);
  return res.data;
}
