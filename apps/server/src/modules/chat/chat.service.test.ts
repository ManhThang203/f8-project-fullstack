import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  chatRoomMember: { findUnique: vi.fn() },
  chatRoom: { findUnique: vi.fn() },
  chatMessage: { findMany: vi.fn() },
};

vi.mock('@costy/db', () => ({ prisma: prismaMock, Prisma: { join: vi.fn() } }));
vi.mock('../../lib/blocks/block-utils.js', () => ({
  areUsersBlocked: vi.fn(),
  assertUsersNotBlocked: vi.fn(),
  getBlockedRelatedUserIds: vi.fn(),
}));
vi.mock('./presence.service.js', () => ({ getPresence: vi.fn() }));

const { getBlockedRelatedUserIds } = (await import(
  '../../lib/blocks/block-utils.js'
)) as unknown as { getBlockedRelatedUserIds: ReturnType<typeof vi.fn> };
const { listRoomMessages } = await import('./chat.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.chatRoomMember.findUnique.mockResolvedValue({ roomId: 'group1', userId: 'me' });
  // Phòng GROUP để assertDirectRoomNotBlocked không chặn.
  prismaMock.chatRoom.findUnique.mockResolvedValue({
    type: 'GROUP',
    members: [{ userId: 'me' }, { userId: 'friend' }, { userId: 'blockedUser' }],
  });
});

describe('listRoomMessages (GROUP) ẩn nội dung của user bị block', () => {
  it('loại tin của sender bị block khỏi truy vấn và ẩn reaction/reply liên quan', async () => {
    getBlockedRelatedUserIds.mockResolvedValue(['blockedUser']);
    prismaMock.chatMessage.findMany.mockResolvedValue([
      {
        id: 'm1',
        roomId: 'group1',
        senderId: 'friend',
        reactions: [
          { id: 'r1', emoji: '👍', userId: 'friend' },
          { id: 'r2', emoji: '❤️', userId: 'blockedUser' },
        ],
        replyTo: null,
      },
      {
        id: 'm2',
        roomId: 'group1',
        senderId: 'friend',
        reactions: [],
        replyTo: { id: 'm0', senderId: 'blockedUser', content: 'ẩn' },
      },
    ]);

    const result = await listRoomMessages('me', 'group1');

    // where loại sender bị block ở tầng DB
    const where = prismaMock.chatMessage.findMany.mock.calls[0]![0].where;
    expect(where.senderId).toEqual({ notIn: ['blockedUser'] });

    const m1 = result.find((m) => m.id === 'm1')!;
    expect(m1.reactions).toEqual([{ id: 'r1', emoji: '👍', userId: 'friend' }]);

    const m2 = result.find((m) => m.id === 'm2')!;
    expect(m2.replyToMessage).toBeNull();
  });

  it('không thêm filter senderId khi không có ai bị block', async () => {
    getBlockedRelatedUserIds.mockResolvedValue([]);
    prismaMock.chatMessage.findMany.mockResolvedValue([]);

    await listRoomMessages('me', 'group1');

    const where = prismaMock.chatMessage.findMany.mock.calls[0]![0].where;
    expect(where.senderId).toBeUndefined();
  });
});
