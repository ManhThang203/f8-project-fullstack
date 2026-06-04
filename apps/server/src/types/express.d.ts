declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role?: import('@costy/db').Role;
        status?: import('@costy/db').UserStatus;
        bannedUntil?: Date | null;
        permissions?: string[];
      };
    }
  }
}

export {};
