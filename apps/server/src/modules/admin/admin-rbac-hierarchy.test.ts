import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../lib/errors.js';

vi.mock('@costy/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
    },
    userPermission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        userPermission: { upsert: vi.fn() },
      }),
    ),
  },
}));

vi.mock('../../lib/admin/audit.service.js', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('../../lib/rbac/permissions.service.js', () => ({
  invalidateUserPermissionCache: vi.fn(),
  resolveEffectivePermissions: vi.fn(),
  resolveEffectivePermissionsBatch: vi.fn(),
  getAuthContext: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock('./admin-stats.service.js', () => ({
  invalidateStatsCache: vi.fn(),
}));

const { prisma } = (await import('@costy/db')) as unknown as {
  prisma: {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    permission: { findMany: ReturnType<typeof vi.fn> };
    userPermission: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
};

const { setUserPermissions } = await import('./admin-moderators.service.js');
const { patchAdminUserStatus } = await import('./admin-users.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setUserPermissions hierarchy', () => {
  it('từ chối target USER (không cho pre-plant grant trước promote)', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: 'USER',
      deletedAt: null,
    });

    await expect(setUserPermissions('actor', 'u1', ['user:lock'], [])).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('moderator'),
    } satisfies Partial<AppError>);
  });

  it('từ chối target ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'a1',
      role: 'ADMIN',
      deletedAt: null,
    });

    await expect(setUserPermissions('actor', 'a1', ['user:lock'], [])).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('từ chối key ngoài ASSIGNABLE whitelist', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'm1',
      role: 'MODERATOR',
      deletedAt: null,
    });

    await expect(setUserPermissions('actor', 'm1', ['post:hide'], [])).rejects.toMatchObject({
      status: 400,
    });
  });

  it('cho phép MODERATOR với key assignable', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'm1',
      role: 'MODERATOR',
      deletedAt: null,
    });
    prisma.permission.findMany.mockResolvedValue([
      {
        id: 'p1',
        key: 'user:lock',
        domain: 'user',
        label: 'Khóa/mở khóa user',
      },
    ]);
    prisma.userPermission.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ userPermission: { upsert: vi.fn() } }),
    );

    const result = await setUserPermissions('actor', 'm1', ['user:lock'], []);
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((p) => p.key === 'user:lock')).toBe(true);
  });
});

describe('patchAdminUserStatus hierarchy', () => {
  const baseUser = {
    id: 'target',
    username: 'target',
    name: null,
    email: null,
    image: null,
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    bannedUntil: null,
    statusReason: null,
    createdAt: new Date(),
    deletedAt: null,
    _count: { posts: 0 },
  };

  it('chặn tự đổi status chính mình', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...baseUser, id: 'self', role: 'USER' });

    await expect(
      patchAdminUserStatus('self', 'self', { action: 'lock', reason: 'x' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('chặn đổi status SUPER_ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...baseUser, role: 'SUPER_ADMIN' });

    await expect(
      patchAdminUserStatus('actor', 'target', { action: 'lock', reason: 'x' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('Admin thường không được đổi status ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...baseUser, role: 'ADMIN' });
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

    await expect(
      patchAdminUserStatus('actor', 'target', { action: 'lock', reason: 'x' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('SUPER_ADMIN được đổi status ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...baseUser, role: 'ADMIN' });
    prisma.user.findUnique.mockResolvedValue({ role: 'SUPER_ADMIN' });
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      role: 'ADMIN',
      status: 'LOCKED',
      _count: { posts: 0 },
    });

    const result = await patchAdminUserStatus('super', 'target', {
      action: 'lock',
      reason: 'vi phạm',
    });
    expect(result.status).toBe('LOCKED');
  });
});
