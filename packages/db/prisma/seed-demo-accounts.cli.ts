/**
 * Production-safe seed: chỉ tạo 5 tài khoản demo (3 HR admin + 2 web user).
 * Không seed posts / friendships / bulk users.
 *
 * Local:  pnpm db:seed:accounts
 * Docker: pnpm docker:seed:accounts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { seedDemoAccounts } from './seed-demo-accounts.js';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(prismaDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const { prisma } = await import('../src/index.js');

async function main() {
  const result = await seedDemoAccounts(prisma);
  // eslint-disable-next-line no-console
  console.log(
    `[seed:accounts] created/updated ${result.count} accounts: ${result.emails.join(', ')}`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
