/**
 * Uniform API response envelope shared between server and client.
 * Mirrors the spec's `{ success, data, meta }` / `{ success, error }` contract.
 */
export interface ApiSuccess<TData = unknown, TMeta = unknown> {
  success: true;
  data: TData;
  meta?: TMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<TData = unknown, TMeta = unknown> = ApiSuccess<TData, TMeta> | ApiError;

/** Common error codes returned by the API. Extend per module as needed. */
export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
