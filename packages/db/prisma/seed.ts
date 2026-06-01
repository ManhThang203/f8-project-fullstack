import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

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

  return { userCount: seeds.length, removedPosts: removedPosts.count, createdPosts: createdPosts.count };
}

async function main() {
  await seedPermissions();

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

  // eslint-disable-next-line no-console
  console.log(
    `[seed] permissions ok | users demo+admin+bulk(${bulkResult.userCount}) | bulk posts removed ${bulkResult.removedPosts} created ${bulkResult.createdPosts} | demo posts removed ${deleted.count} created ${created.count}`,
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
