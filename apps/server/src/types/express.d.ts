import type { Role, UserStatus } from '@costy/db';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role?: Role;
        status?: UserStatus;
        bannedUntil?: Date | null;
        permissions?: string[];
      };
    }
  }
}

export {};
