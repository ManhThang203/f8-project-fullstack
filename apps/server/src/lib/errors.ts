import type { ErrorCode } from '@threads/shared';

/**
 * Typed application error. Always carries an HTTP status + machine code.
 * Throw these inside services; the global error middleware translates them
 * into the standard error envelope.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode | string;
  public readonly details?: unknown;

  constructor(opts: {
    status: number;
    code: ErrorCode | string;
    message: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = 'AppError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError({ status: 400, code: 'BAD_REQUEST', message, details });
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError({ status: 401, code: 'UNAUTHORIZED', message });
  }
  static forbidden(message = 'Forbidden') {
    return new AppError({ status: 403, code: 'FORBIDDEN', message });
  }
  static notFound(message = 'Not found') {
    return new AppError({ status: 404, code: 'NOT_FOUND', message });
  }
  static conflict(message: string, details?: unknown) {
    return new AppError({ status: 409, code: 'CONFLICT', message, details });
  }
  static rateLimited(message = 'Too many requests') {
    return new AppError({ status: 429, code: 'RATE_LIMITED', message });
  }
}
