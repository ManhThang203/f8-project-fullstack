import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { seedBlockedUsersForUser } from './seed-blocked-users.js';
import { seedDemoAccounts } from './seed-demo-accounts.js';
import { seedNestedRepliesForTesting } from './seed-nested-replies.js';
import { seedSavedPostsForUser } from './seed-saved-posts.js';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(prismaDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const { prisma } = await import('../src/index.js');

/** Stable id referenced by `NEXT_PUBLIC_DEMO_USER_ID` for dev header. */
const DEMO_USER_ID = 'seed_demo_user_001';
const ADMIN_USER_ID = 'seed_admin_user_001';

/** Số bài gốc (parentId = null) để test cuộn feed + cursor pagination (limit mặc định 20 → ~5 trang). */
const SEED_ROOT_POST_COUNT = 100;

/** Số bình luận seed cho mỗi bài gốc (test cuộn danh sách comment). */
const SEED_COMMENTS_PER_POST = 100;

/** Prefix nội dung comment seed — dùng để xóa/idempotent khi chạy lại seed. */
const SEED_COMMENT_PREFIX = 'Bình luận seed';

/** Số bản ghi mỗi tab Bạn bè / Lời mời đến / Đã gửi. */
const SEED_FRIENDSHIPS_PER_TAB = 100;

/** Username nhận seed bạn bè / bài đã lưu (user dev chính). */
const SEED_FRIEND_TARGET_USERNAME = process.env.SEED_FRIEND_TARGET_USERNAME ?? 'dongthang848';

/** Username nhận seed danh sách đã chặn. */
const SEED_BLOCK_TARGET_USERNAME = process.env.SEED_BLOCK_TARGET_USERNAME ?? 'thangdmf8';

/** Tổng user seed riêng cho friendships (100 × 3 tab). */
const SEED_FRIEND_USER_COUNT = SEED_FRIENDSHIPS_PER_TAB * 3;

/** Số user giả để test trang Users trên admin. */
const SEED_BULK_USER_COUNT = 50;

/** Số user đầu được gán thêm post để cột postCount không toàn 0. */
const SEED_BULK_USERS_WITH_POSTS = 10;

const BULK_USER_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Châu',
  'Phạm Hoàng Dũng',
  'Hoàng Thị Em',
  'Vũ Quốc Giang',
  'Đặng Thu Hà',
  'Bùi Văn Khánh',
  'Đỗ Thị Lan',
  'Ngô Minh Phúc',
];

type BulkUserSeed = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED' | 'BANNED';
  statusReason: string | null;
  bannedUntil: Date | null;
  createdAt: Date;
};

/** Tạo danh sách 50 user seed với role/status đa dạng, thứ tự createdAt ổn định. */
function buildBulkUserSeeds(): BulkUserSeed[] {
  const now = Date.now();
  const hourMs = 3 * 60 * 60 * 1000;

  return Array.from({ length: SEED_BULK_USER_COUNT }, (_, index) => {
    const n = index + 1;
    const padded = String(n).padStart(3, '0');

    let role: BulkUserSeed['role'] = 'USER';
    if (n >= 49) role = 'ADMIN';
    else if (n >= 46) role = 'MODERATOR';

    let status: BulkUserSeed['status'] = 'ACTIVE';
    let statusReason: string | null = null;
    let bannedUntil: Date | null = null;

    if (n >= 46) {
      status = 'BANNED';
      statusReason = n % 2 === 0 ? 'Ban vĩnh viễn — spam' : 'Ban tạm thời — nội dung vi phạm';
      bannedUntil = n % 2 === 0 ? null : new Date(now + 7 * 24 * 60 * 60 * 1000);
    } else if (n >= 41) {
      status = 'LOCKED';
      statusReason = 'Tài khoản bị khóa do nhiều report';
    }

    return {
      id: `seed_bulk_user_${padded}`,
      username: `seeduser${padded}`,
      email: `seeduser${padded}@costy.local`,
      name: BULK_USER_NAMES[index % BULK_USER_NAMES.length]!,
      role,
      status,
      statusReason,
      bannedUntil,
      createdAt: new Date(now - (SEED_BULK_USER_COUNT - n) * hourMs),
    };
  });
}

const PERMISSION_CATALOG = [
  { key: 'post:create', domain: 'post', label: 'Tạo bài viết' },
  { key: 'post:delete:own', domain: 'post', label: 'Xóa bài của mình' },
  { key: 'post:react', domain: 'post', label: 'React bài viết' },
  { key: 'comment:create', domain: 'post', label: 'Bình luận' },
  { key: 'follow', domain: 'user', label: 'Follow user' },
  { key: 'chat', domain: 'chat', label: 'Chat' },
  { key: 'profile:edit:own', domain: 'user', label: 'Sửa profile của mình' },
  { key: 'report:create', domain: 'report', label: 'Gửi báo cáo' },
  { key: 'stats:view', domain: 'stats', label: 'Xem thống kê admin' },
  { key: 'report:read', domain: 'report', label: 'Xem báo cáo' },
  { key: 'report:review', domain: 'report', label: 'Duyệt báo cáo' },
  { key: 'post:hide', domain: 'post', label: 'Ẩn bài vi phạm' },
  { key: 'post:delete:any', domain: 'post', label: 'Xóa bất kỳ bài nào' },
  { key: 'user:read', domain: 'user', label: 'Xem danh sách user' },
  { key: 'user:lock', domain: 'user', label: 'Khóa/mở khóa user' },
  { key: 'user:ban:temp', domain: 'user', label: 'Ban tạm thời' },
  { key: 'user:ban', domain: 'user', label: 'Ban vĩnh viễn' },
  { key: 'user:unlock', domain: 'user', label: 'Bỏ ban user' },
  { key: 'hashtag:read', domain: 'hashtag', label: 'Xem hashtag trending' },
  { key: 'hashtag:manage', domain: 'hashtag', label: 'Quản lý hashtag' },
  { key: 'moderator:manage', domain: 'admin', label: 'Quản lý moderator' },
  { key: 'permission:grant', domain: 'admin', label: 'Cấp/thu quyền' },
  { key: 'audit:read', domain: 'admin', label: 'Xem audit log' },
];

const MODERATOR_DEFAULTS = [
  'post:create',
  'post:delete:own',
  'post:react',
  'comment:create',
  'follow',
  'chat',
  'profile:edit:own',
  'report:create',
  'stats:view',
  'report:read',
  'report:review',
  'post:hide',
];

async function seedPermissions() {
  for (const def of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: def,
      update: { domain: def.domain, label: def.label },
    });
  }

  for (const key of MODERATOR_DEFAULTS) {
    const perm = await prisma.permission.findUnique({ where: { key } });
    if (!perm) continue;
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'MODERATOR', permissionId: perm.id } },
      create: { role: 'MODERATOR', permissionId: perm.id },
      update: {},
    });
  }
}

/** Upsert ~50 user giả để test danh sách Users trên admin. */
async function seedBulkUsers() {
  const seeds = buildBulkUserSeeds();

  for (const user of seeds) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        statusReason: user.statusReason,
        bannedUntil: user.bannedUntil,
        createdAt: user.createdAt,
      },
      update: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        statusReason: user.statusReason,
        bannedUntil: user.bannedUntil,
      },
    });
  }

  const postAuthorIds = seeds.slice(0, SEED_BULK_USERS_WITH_POSTS).map((u) => u.id);
  const removedPosts = await prisma.post.deleteMany({
    where: {
      authorId: { in: postAuthorIds },
      parentId: null,
      content: { startsWith: 'Bài seed bulk' },
    },
  });

  const postNow = Date.now();
  const bulkPosts = postAuthorIds.flatMap((authorId, authorIndex) => {
    const postCount = (authorIndex % 2) + 1;
    return Array.from({ length: postCount }, (_, postIndex) => ({
      authorId,
      content: `Bài seed bulk ${authorIndex + 1}.${postIndex + 1} — test postCount admin #costy.`,
      createdAt: new Date(postNow - (authorIndex * 2 + postIndex) * 60_000),
    }));
  });

  const createdPosts =
    bulkPosts.length > 0 ? await prisma.post.createMany({ data: bulkPosts }) : { count: 0 };

  return {
    userCount: seeds.length,
    removedPosts: removedPosts.count,
    createdPosts: createdPosts.count,
  };
}

/** Xóa comment seed cũ và tạo ~100 bình luận cho mỗi bài gốc. */
async function seedPostComments(
  rootPosts: { id: string }[],
  authorIds: string[],
): Promise<{ removed: number; created: number }> {
  if (rootPosts.length === 0 || authorIds.length === 0) {
    return { removed: 0, created: 0 };
  }

  const removed = await prisma.post.deleteMany({
    where: { content: { startsWith: SEED_COMMENT_PREFIX } },
  });

  const commentNow = Date.now();
  const comments = rootPosts.flatMap((post, postIndex) =>
    Array.from({ length: SEED_COMMENTS_PER_POST }, (_, commentIndex) => ({
      authorId: authorIds[(postIndex + commentIndex) % authorIds.length]!,
      parentId: post.id,
      content: `${SEED_COMMENT_PREFIX} ${commentIndex + 1}/${SEED_COMMENTS_PER_POST} — bài #${postIndex + 1}`,
      createdAt: new Date(
        commentNow - (postIndex * SEED_COMMENTS_PER_POST + commentIndex) * 1_000,
      ),
    })),
  );

  const batchSize = 1_000;
  let created = 0;
  for (let offset = 0; offset < comments.length; offset += batchSize) {
    const batch = comments.slice(offset, offset + batchSize);
    const result = await prisma.post.createMany({ data: batch });
    created += result.count;
  }

  return { removed: removed.count, created };
}

type FriendUserSeed = {
  id: string;
  username: string;
  email: string;
  name: string;
};

/** Tạo 300 user seed riêng cho tab Bạn bè (100 bạn + 100 incoming + 100 outgoing). */
function buildFriendUserSeeds(): FriendUserSeed[] {
  return Array.from({ length: SEED_FRIEND_USER_COUNT }, (_, index) => {
    const n = index + 1;
    const padded = String(n).padStart(3, '0');

    return {
      id: `seed_friend_user_${padded}`,
      username: `seedfriend${padded}`,
      email: `seedfriend${padded}@costy.local`,
      name: `Bạn bè seed ${n}`,
    };
  });
}

/** Seed 100 bạn bè, 100 lời mời đến và 100 lời mời đã gửi cho một user. */
async function seedFriendshipsForUser(targetUserId: string): Promise<{
  users: number;
  removed: number;
  created: number;
  accepted: number;
  incoming: number;
  outgoing: number;
}> {
  const users = buildFriendUserSeeds();

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: 'USER',
      },
      update: {
        name: user.name,
        email: user.email,
      },
    });
  }

  const friendUserIds = users.map((user) => user.id);
  const removed = await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: targetUserId, addresseeId: { in: friendUserIds } },
        { addresseeId: targetUserId, requesterId: { in: friendUserIds } },
      ],
    },
  });

  const now = Date.now();
  const minuteMs = 60_000;

  const acceptedFriends = users
    .slice(0, SEED_FRIENDSHIPS_PER_TAB)
    .map((user, index) => ({
      requesterId: targetUserId,
      addresseeId: user.id,
      status: 'ACCEPTED' as const,
      createdAt: new Date(now - index * minuteMs),
    }));

  const incomingRequests = users
    .slice(SEED_FRIENDSHIPS_PER_TAB, SEED_FRIENDSHIPS_PER_TAB * 2)
    .map((user, index) => ({
      requesterId: user.id,
      addresseeId: targetUserId,
      status: 'PENDING' as const,
      createdAt: new Date(now - index * minuteMs),
    }));

  const outgoingRequests = users
    .slice(SEED_FRIENDSHIPS_PER_TAB * 2, SEED_FRIEND_USER_COUNT)
    .map((user, index) => ({
      requesterId: targetUserId,
      addresseeId: user.id,
      status: 'PENDING' as const,
      createdAt: new Date(now - index * minuteMs),
    }));

  const created = await prisma.friendship.createMany({
    data: [...acceptedFriends, ...incomingRequests, ...outgoingRequests],
  });

  return {
    users: users.length,
    removed: removed.count,
    created: created.count,
    accepted: acceptedFriends.length,
    incoming: incomingRequests.length,
    outgoing: outgoingRequests.length,
  };
}

async function main() {
  await seedPermissions();

  const demoAccounts = await seedDemoAccounts(prisma);
  // eslint-disable-next-line no-console
  console.log(
    `[seed] demo accounts ${demoAccounts.count}: ${demoAccounts.emails.join(', ')}`,
  );

  await prisma.user.upsert({
    where: { username: 'demo' },
    create: {
      id: DEMO_USER_ID,
      username: 'demo',
      name: 'Người dùng demo',
      email: 'demo@costy.local',
      role: 'USER',
    },
    update: { name: 'Người dùng demo' },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      id: ADMIN_USER_ID,
      username: 'admin',
      name: 'Admin Costy',
      email: 'admin@costy.local',
      role: 'SUPER_ADMIN',
    },
    update: { role: 'SUPER_ADMIN', name: 'Admin Costy' },
  });

  const bulkResult = await seedBulkUsers();

  const deleted = await prisma.post.deleteMany({
    where: { authorId: DEMO_USER_ID, parentId: null },
  });

  const now = Date.now();
  const posts = Array.from({ length: SEED_ROOT_POST_COUNT }, (_, i) => ({
    authorId: DEMO_USER_ID,
    content: `Bài seed ${i + 1}/${SEED_ROOT_POST_COUNT} — test cuộn feed #costy #seed${(i % 5) + 1}.`,
    createdAt: new Date(now - i * 60_000),
  }));

  const created = await prisma.post.createMany({ data: posts });

  const seededPosts = await prisma.post.findMany({
    where: { authorId: DEMO_USER_ID, parentId: null },
    select: { id: true, content: true },
  });
  for (const post of seededPosts) {
    const tags = [...post.content.matchAll(/#([a-zA-Z0-9_]{2,50})/g)].map((m) =>
      m[1]!.toLowerCase(),
    );
    for (const tag of [...new Set(tags)]) {
      const hashtag = await prisma.hashtag.upsert({
        where: { tag },
        create: { tag },
        update: {},
      });
      await prisma.postHashtag.upsert({
        where: { postId_hashtagId: { postId: post.id, hashtagId: hashtag.id } },
        create: { postId: post.id, hashtagId: hashtag.id },
        update: {},
      });
    }
  }

  const rootPostsForComments = await prisma.post.findMany({
    where: {
      parentId: null,
      OR: [
        { content: { startsWith: 'Bài seed ' } },
        { content: { startsWith: 'Bài seed bulk' } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  const commentAuthorIds = [
    DEMO_USER_ID,
    ADMIN_USER_ID,
    ...buildBulkUserSeeds()
      .slice(0, 20)
      .map((user) => user.id),
  ];

  const commentResult = await seedPostComments(rootPostsForComments, commentAuthorIds);

  const nestedReplyResult = await seedNestedRepliesForTesting(prisma, commentAuthorIds);

  const friendTarget = await prisma.user.findUnique({
    where: { username: SEED_FRIEND_TARGET_USERNAME },
    select: { id: true, username: true },
  });

  let friendLog = `friends skipped (@${SEED_FRIEND_TARGET_USERNAME} not found)`;
  let savedLog = `saved skipped (@${SEED_FRIEND_TARGET_USERNAME} not found)`;
  if (friendTarget) {
    const friendResult = await seedFriendshipsForUser(friendTarget.id);
    const savedResult = await seedSavedPostsForUser(prisma, friendTarget.id);
    friendLog = `friends @${friendTarget.username} users ${friendResult.users} removed ${friendResult.removed} created ${friendResult.created} (accepted ${friendResult.accepted}, incoming ${friendResult.incoming}, outgoing ${friendResult.outgoing})`;
    savedLog = `saved @${friendTarget.username} removed ${savedResult.removed} created ${savedResult.created}`;
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[seed] skip friends/saved: user @${SEED_FRIEND_TARGET_USERNAME} not found`);
  }

  const blockTarget = await prisma.user.findUnique({
    where: { username: SEED_BLOCK_TARGET_USERNAME },
    select: { id: true, username: true },
  });

  let blockLog = `blocks skipped (@${SEED_BLOCK_TARGET_USERNAME} not found)`;
  if (blockTarget) {
    const blockResult = await seedBlockedUsersForUser(prisma, blockTarget.id);
    blockLog = `blocks @${blockTarget.username} users ${blockResult.users} removed ${blockResult.removed} created ${blockResult.created}`;
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[seed] skip blocks: user @${SEED_BLOCK_TARGET_USERNAME} not found`);
  }

  const nestedLog = nestedReplyResult
    ? `nested @${nestedReplyResult.username} post=${nestedReplyResult.rootPostId} deep=${nestedReplyResult.deepRootId}→${nestedReplyResult.deepLeafId} wide=${nestedReplyResult.wideRootId} removed ${nestedReplyResult.removed} created ${nestedReplyResult.created}`
    : 'nested replies skipped (target post not found)';

  // eslint-disable-next-line no-console
  console.log(
    `[seed] permissions ok | users demo+admin+bulk(${bulkResult.userCount}) | bulk posts removed ${bulkResult.removedPosts} created ${bulkResult.createdPosts} | demo posts removed ${deleted.count} created ${created.count} | comments removed ${commentResult.removed} created ${commentResult.created} (${SEED_COMMENTS_PER_POST}/post × ${rootPostsForComments.length} posts) | ${nestedLog} | ${friendLog} | ${savedLog} | ${blockLog}`,
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
