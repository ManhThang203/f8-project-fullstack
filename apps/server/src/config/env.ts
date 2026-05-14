import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/** Monorepo root (contains workspace `.env`). Turbo runs dev with `cwd` in `apps/server`, so default dotenv misses root env. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
loadDotenv({ path: path.join(repoRoot, '.env') });
loadDotenv({ path: path.join(repoRoot, '.env.local') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('threads-clone'),

  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_URL: z.string().url().default('http://localhost:4000'),

  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_TLS: z.coerce.boolean().default(false),

  BETTER_AUTH_SECRET: z.string().min(1).default('change_me_in_production'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
