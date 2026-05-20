/**
 * Load monorepo `.env` before Prisma client initializes (used by `auth.ts` and CLI).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(repoRoot, '.env.local') });
