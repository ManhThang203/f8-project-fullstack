import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    createMany: vi.fn(),
  },
  user: { findMany: vi.fn() },
};

vi.mock('@costy/db', () => ({ prisma: prismaMock }));
vi.mock('../../lib/blocks/block-utils.js', () => ({
  areUsersBlocked: vi.fn(),
  getBlockedRelatedUserIds: vi.fn(),
}));
vi.mock('../../lib/realtime.js', () => ({ getRealtimeIo: vi.fn(() => null) }));
vi.mock('../me/me.settings.service.js', () => ({
  getUserNotificationPreferences: vi.fn(),
  isNotificationTypeEnabled: vi.fn(() => true),
  normalizeNotificationPreferences: vi.fn((p: unknown) => p),
}));

const { areUsersBlocked, getBlockedRelatedUserIds } = (await import(
  '../../lib/blocks/block-utils.js'
)) as unknown as {
  areUsersBlocked: ReturnType<typeof vi.fn>;
  getBlockedRelatedUserIds: ReturnType<typeof vi.fn>;
};
const { createNotification, listNotifications } = await import('./notifications.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  areUsersBlocked.mockResolvedValue(false);
  getBlockedRelatedUserIds.mockResolvedValue([]);
});

describe('createNotification', () => {
  it('trả null và không ghi DB khi actor - recipient đang block nhau', async () => {
    areUsersBlocked.mockResolvedValue(true);

    const result = await createNotification({
      recipientId: 'recipient',
      actorId: 'actor',
      type: 'POST_LIKED',
      entityType: 'post',
      entityId: 'post1',
    });

    expect(result).toBeNull();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});

describe('listNotifications', () => {
  it('lọc actor bị block ra khỏi danh sách (actorId null vẫn qua)', async () => {
    getBlockedRelatedUserIds.mockResolvedValue(['blocked1', 'blocked2']);
    prismaMock.notification.findMany.mockResolvedValue([]);

    await listNotifications('me');

    const arg = prismaMock.notification.findMany.mock.calls[0]![0];
    expect(arg.where.recipientId).toBe('me');
    expect(arg.where.OR).toEqual([
      { actorId: null },
      { actorId: { notIn: ['blocked1', 'blocked2'] } },
    ]);
  });

  it('không thêm filter OR khi không có ai bị block', async () => {
    getBlockedRelatedUserIds.mockResolvedValue([]);
    prismaMock.notification.findMany.mockResolvedValue([]);

    await listNotifications('me');

    const arg = prismaMock.notification.findMany.mock.calls[0]![0];
    expect(arg.where.OR).toBeUndefined();
  });
});
