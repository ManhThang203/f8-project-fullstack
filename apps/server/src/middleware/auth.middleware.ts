import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth?.userId) return next(AppError.unauthorized());
  next();
};
