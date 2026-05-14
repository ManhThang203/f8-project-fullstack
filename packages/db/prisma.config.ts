import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/** Root of `@threads/db` */
const packageRoot = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (contains workspace `.env`) */
const repoRoot = path.resolve(packageRoot, '../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });
dotenv.config({ path: path.join(packageRoot, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
