import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { err } from '@threads/shared';

import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Global error handler. Translates known errors into the standard envelope.
 * Express 4 requires a 4-arg signature even if `next` is unused.
 */
export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json(err(error.code, error.message, error.details));
  }

  if (error instanceof ZodError) {
    return res
      .status(400)
      .json(err('VALIDATION_ERROR', 'Invalid request payload', error.flatten()));
  }

  logger.error({ err: error }, 'unhandled error');
  return res.status(500).json(err('INTERNAL_ERROR', 'Internal server error'));
};
