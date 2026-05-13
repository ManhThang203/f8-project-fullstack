import pino from 'pino';

import { env } from '../config/env.js';

/**
 * Pino logger. Pretty in dev, JSON in prod.
 * Sensitive fields are redacted globally.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.phone',
      '*.otp',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});

export type Logger = typeof logger;
