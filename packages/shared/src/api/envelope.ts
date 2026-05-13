import type { ApiError, ApiSuccess, ErrorCode } from '../types/api.js';

/** Build a successful API envelope. */
export function ok<TData, TMeta = undefined>(data: TData, meta?: TMeta): ApiSuccess<TData, TMeta> {
  return meta === undefined ? { success: true, data } : { success: true, data, meta };
}

/** Build an error API envelope. */
export function err(code: ErrorCode | string, message: string, details?: unknown): ApiError {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}
