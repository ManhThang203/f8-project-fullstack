import './env-bootstrap.js';

import { randomBytes } from 'node:crypto';

import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username } from 'better-auth/plugins';

import { prisma } from '@costy/db';

import { env } from '../config/env.js';
import { logger } from './logger.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './mail.js';

function slugFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  const cleaned = local.toLowerCase().replace(/[^a-z0-9._]/g, '');
  return (cleaned || 'user').slice(0, 24);
}

/** Đặt username chưa ai dùng (từ `base`, thêm số ngẫu nhiên nếu trùng). Trả về 1 chuỗi username. */
async function uniqueUsername(base: string): Promise<string> {
  const root = base.slice(0, 24);
  for (let attempt = 0; attempt < 12; attempt++) {
    const suffix = attempt === 0 ? '' : randomBytes(2).toString('hex');
    const candidate = (root + suffix).slice(0, 30);
    if (candidate.length < 3) continue;
    const taken = await prisma.user.findFirst({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `u${randomBytes(12).toString('hex')}`.slice(0, 30);
}

const googleConfigured = env.GOOGLE_CLIENT_ID !== '' && env.GOOGLE_CLIENT_SECRET !== '';

const authRateLimit = env.AUTH_RATE_LIMIT_DISABLED
  ? { enabled: false as const }
  : {
      window: 60,
      max: 2000,
      customRules: {
        '/sign-in/email': { window: 60, max: 200 },
        '/sign-in/username': { window: 60, max: 200 },
        '/sign-in/identifier': { window: 60, max: 200 },
        '/sign-up/email': { window: 60, max: 100 },
        '/request-password-reset': { window: 300, max: 50 },
        '/send-verification-email': { window: 300, max: 50 },
        '/verify-email': { window: 60, max: 100 },
        /** Session checks are high-volume; skip dedicated rule (global bucket applies). */
        '/get-session': false as const,
      },
    };

const trustedOrigins = [env.WEB_URL, env.ADMIN_URL, env.BETTER_AUTH_URL, env.SERVER_URL];

type CreateAppAuthOptions = {
  baseURL: string;
  /** Must match Express mount + client `basePath` (default `/api/auth`). */
  basePath?: string;
  cookiePrefix?: string;
  /** Google OAuth — web only. */
  enableGoogle?: boolean;
};

/**
 * Shared Better Auth factory (Express + Prisma). Web and Admin use separate instances
 * (same DB, different `baseURL` + `cookiePrefix`) so sessions do not collide.
 */
export function createAppAuth({
  baseURL,
  basePath = '/api/auth',
  cookiePrefix,
  enableGoogle = false,
}: CreateAppAuthOptions) {
  return betterAuth({
    appName: 'costy',
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'],
      },
      ...(cookiePrefix ? { cookiePrefix } : {}),
    },
    rateLimit: authRateLimit,
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
        requireLocalEmailVerified: false,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const u = user as Record<string, unknown>;
            const existing = u.username;
            if (typeof existing === 'string' && existing.length >= 3) {
              return { data: user };
            }
            const email = u.email;
            if (typeof email !== 'string' || !email.includes('@')) {
              throw new APIError('BAD_REQUEST', {
                message: 'Không thể tạo tài khoản: thiếu email.',
              });
            }
            const base = slugFromEmail(email);
            const usernameValue = await uniqueUsername(base);
            const displayUsername =
              typeof u.displayUsername === 'string' && u.displayUsername.length > 0
                ? u.displayUsername
                : base.replace(/\./g, ' ').slice(0, 30);
            return {
              data: {
                ...user,
                username: usernameValue,
                displayUsername,
              },
            };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        if (!user.email) return;
        void sendPasswordResetEmail(user.email, url).catch((err: unknown) => {
          logger.error({ err }, 'sendResetPassword mail failed');
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        if (!user.email) return;
        void sendVerificationEmail(user.email, url).catch((err: unknown) => {
          logger.error({ err }, 'sendVerificationEmail mail failed');
        });
      },
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 })],
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    basePath,
    trustedOrigins,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: 'jwt',
      },
    },
    ...(enableGoogle && googleConfigured
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: 'select_account',
              mapProfileToUser: (profile) => ({
                name: profile.name,
                image: profile.picture,
              }),
            },
          },
        }
      : {}),
  });
}

/** Web app session (default cookie prefix, Google OAuth). */
export const authWeb = createAppAuth({
  baseURL: env.WEB_URL ?? env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  cookiePrefix: 'better-auth',
  enableGoogle: true,
});

/** Admin app session — isolated cookies via `costy-admin` prefix. */
export const authAdmin = createAppAuth({
  baseURL: env.ADMIN_URL,
  basePath: '/api/admin/auth',
  cookiePrefix: env.AUTH_ADMIN_COOKIE_PREFIX,
  enableGoogle: false,
});

/** Alias for socket, identifier login, and CLI until callers migrate to `authWeb`. */
export const auth = authWeb;
