import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@costy/db', () => ({ prisma: {}, Prisma: {} }));
vi.mock('../../lib/blocks/block-utils.js', () => ({ areUsersBlocked: vi.fn() }));
vi.mock('../friends/friends.service.js', () => ({
  areFriends: vi.fn(),
  getFriendIds: vi.fn(),
}));

const { areUsersBlocked } = (await import(
  '../../lib/blocks/block-utils.js'
)) as unknown as { areUsersBlocked: ReturnType<typeof vi.fn> };
const { areFriends } = (await import('../friends/friends.service.js')) as unknown as {
  areFriends: ReturnType<typeof vi.fn>;
};
const { canViewPost } = await import('./posts.access.js');

const publicPost = { authorId: 'author', visibility: 'PUBLIC' as const };
const friendsPost = { authorId: 'author', visibility: 'FRIENDS' as const };

beforeEach(() => {
  vi.clearAllMocks();
  areUsersBlocked.mockResolvedValue(false);
  areFriends.mockResolvedValue(false);
});

describe('canViewPost', () => {
  it('khách (viewerId null) chỉ xem được bài PUBLIC', async () => {
    await expect(canViewPost(null, publicPost)).resolves.toBe(true);
    await expect(canViewPost(null, friendsPost)).resolves.toBe(false);
  });

  it('tác giả luôn xem được bài của chính mình, không cần check block', async () => {
    await expect(canViewPost('author', friendsPost)).resolves.toBe(true);
    expect(areUsersBlocked).not.toHaveBeenCalled();
  });

  it('bị block thì không xem được kể cả bài PUBLIC', async () => {
    areUsersBlocked.mockResolvedValue(true);
    await expect(canViewPost('viewer', publicPost)).resolves.toBe(false);
  });

  it('không block + PUBLIC thì xem được', async () => {
    await expect(canViewPost('viewer', publicPost)).resolves.toBe(true);
  });

  it('bài FRIENDS chỉ xem được khi là bạn bè', async () => {
    areFriends.mockResolvedValue(false);
    await expect(canViewPost('viewer', friendsPost)).resolves.toBe(false);
    areFriends.mockResolvedValue(true);
    await expect(canViewPost('viewer', friendsPost)).resolves.toBe(true);
  });
});
