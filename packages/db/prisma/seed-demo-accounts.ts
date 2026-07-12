import { randomBytes } from 'node:crypto';

import { hashPassword } from 'better-auth/crypto';

import type { PrismaClient, Role } from '../generated/prisma/client.js';

type DemoAccountSeed = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  password: string;
};

function buildDemoAccounts(): DemoAccountSeed[] {
  const hrPassword = process.env.SEED_HR_PASSWORD ?? 'HrDemo@2026';
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'DemoUser@2026';

  return [
    // ── 3 tài khoản Admin (HR → admin.costy.io.vn) ──
    {
      id: 'seed_hr_user_001',
      email: 'hr1@costy.io.vn',
      username: 'hr1',
      name: 'HR Demo 1',
      role: 'SUPER_ADMIN',
      password: hrPassword,
    },
    {
      id: 'seed_hr_user_002',
      email: 'hr2@costy.io.vn',
      username: 'hr2',
      name: 'HR Demo 2',
      role: 'ADMIN',
      password: hrPassword,
    },
    {
      id: 'seed_hr_user_003',
      email: 'hr3@costy.io.vn',
      username: 'hr3',
      name: 'HR Demo 3',
      role: 'MODERATOR',
      password: hrPassword,
    },
    // ── 2 tài khoản Web (costy.io.vn) ──
    {
      id: 'seed_web_user_001',
      email: 'demo1@costy.io.vn',
      username: 'demo1',
      name: 'Demo User 1',
      role: 'USER',
      password: demoPassword,
    },
    {
      id: 'seed_web_user_002',
      email: 'demo2@costy.io.vn',
      username: 'demo2',
      name: 'Demo User 2',
      role: 'USER',
      password: demoPassword,
    },
  ];
}

/** Tạo/cập nhật user + credential Better Auth (password đã hash). */
async function upsertDemoAccount(prisma: PrismaClient, account: DemoAccountSeed): Promise<void> {
  const passwordHash = await hashPassword(account.password);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: account.email }, { username: account.username }, { id: account.id }],
    },
    select: { id: true },
  });

  const userId = existingUser?.id ?? account.id;

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: account.email,
        emailVerified: true,
        username: account.username,
        displayUsername: account.username,
        name: account.name,
        role: account.role,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        id: account.id,
        email: account.email,
        emailVerified: true,
        username: account.username,
        displayUsername: account.username,
        name: account.name,
        role: account.role,
        status: 'ACTIVE',
      },
    });
  }

  const existingCredential = await prisma.account.findFirst({
    where: {
      userId,
      providerId: 'credential',
    },
  });

  if (existingCredential) {
    await prisma.account.update({
      where: { id: existingCredential.id },
      data: {
        password: passwordHash,
        accountId: userId,
        updatedAt: new Date(),
      },
    });
    return;
  }

  await prisma.account.create({
    data: {
      id: randomBytes(16).toString('hex'),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
    },
  });
}

/** Seed 3 admin HR + 2 user web (mật khẩu lấy từ env hoặc mặc định). */
export async function seedDemoAccounts(prisma: PrismaClient): Promise<{
  count: number;
  emails: string[];
}> {
  const accounts = buildDemoAccounts();

  for (const account of accounts) {
    await upsertDemoAccount(prisma, account);
  }

  return {
    count: accounts.length,
    emails: accounts.map((a) => a.email),
  };
}
