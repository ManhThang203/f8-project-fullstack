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
  APP_NAME: z.string().default('costy'),

  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_URL: z.string().url().default('http://localhost:4000'),

  WEB_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** `z.coerce.boolean()` treats the string `"false"` as true — parse env explicitly. */
  REDIS_TLS: z
    .preprocess((val) => {
      if (val === undefined || val === '') return false;
      const s = String(val).toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }, z.boolean())
    .default(false),

  BETTER_AUTH_SECRET: z.string().min(1).default('change_me_in_production'),
  /** Public URL of the Web app (Better Auth `baseURL` for web sessions). Falls back to BETTER_AUTH_URL in `auth.ts`. */
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  /** Cookie prefix for Admin Better Auth (no trailing dot). Must match admin `getSessionCookie`. */
  AUTH_ADMIN_COOKIE_PREFIX: z.string().min(1).default('costy-admin'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('no-reply@costy.local'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(500),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60),

  CLOUDINARY_CLOUD_NAME: z
    .preprocess((val) => (val == null || val === '' ? '' : String(val).trim()), z.string())
    .default(''),
  CLOUDINARY_API_KEY: z
    .preprocess((val) => (val == null || val === '' ? '' : String(val).trim()), z.string())
    .default(''),
  CLOUDINARY_API_SECRET: z
    .preprocess((val) => (val == null || val === '' ? '' : String(val).trim()), z.string())
    .default(''),

  /** Vercel AI Gateway API key — embedding search (openai/text-embedding-3-small). */
  AI_GATEWAY_API_KEY: z
    .preprocess((val) => (val == null || val === '' ? '' : String(val).trim()), z.string())
    .default(''),

  /** When `true`, disables Better Auth built-in rate limiting (local Docker / debugging only). */
  AUTH_RATE_LIMIT_DISABLED: z
    .preprocess((val) => {
      if (val === undefined || val === '') return false;
      const s = String(val).toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }, z.boolean())
    .default(false),

  /** Bật AI moderation khi có API key (có thể override bằng MODERATION_ENABLED). */
  MODERATION_ENABLED: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    const s = String(val).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }, z.boolean().optional()),

  MODERATION_AI_MODEL: z.string().default('openai/gpt-4o-mini'),
  MODERATION_AUTO_HIDE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9),
  MODERATION_REVIEW_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),

  /**
   * Backup DB → Google Drive My Drive (BullMQ 03:00 Asia/Ho_Chi_Minh).
   * Auth: OAuth Desktop client + refresh_token (không dùng Service Account).
   * Khi `false`, các biến Drive OAuth bên dưới không bắt buộc — local không bị chặn boot.
   */
  BACKUP_ENABLED: z
    .preprocess((val) => {
      if (val === undefined || val === '') return false;
      const s = String(val).toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }, z.boolean())
    .default(false),
  BACKUP_NOTIFY_EMAIL: z.string().optional().default(''),
  /** Số file backup `.sql.gz` giữ lại trên Drive (mới nhất); mặc định 30. */
  BACKUP_RETAIN_COUNT: z.coerce.number().int().positive().default(30),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional().default(''),
  /** OAuth Desktop client riêng (tách khỏi GOOGLE_CLIENT_ID login). */
  GOOGLE_DRIVE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional().default(''),
  /** Lấy một lần qua `pnpm --filter @costy/server backup:auth`. */
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

/** Chặn boot production nếu BETTER_AUTH_SECRET rỗng, mặc định hoặc quá ngắn. */
function assertProductionAuthSecret(data: z.infer<typeof envSchema>): void {
  if (data.NODE_ENV !== 'production') return;

  const secret = data.BETTER_AUTH_SECRET.trim();
  if (!secret || secret === 'change_me_in_production' || secret.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
      'BETTER_AUTH_SECRET không hợp lệ cho production: cần chuỗi ngẫu nhiên >= 32 ký tự, không dùng giá trị mặc định.',
    );
    process.exit(1);
  }
}

assertProductionAuthSecret(parsed.data);

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
