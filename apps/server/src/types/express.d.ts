/**
 * Ambient augmentation: extend `Express.Request` with our auth context.
 * The actual `auth` value is attached by the auth middleware (Phase 2).
 *
 * Uses the documented `Express` global namespace from @types/express.
 */

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

export {};
