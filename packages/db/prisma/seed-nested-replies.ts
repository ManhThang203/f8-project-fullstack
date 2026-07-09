import type { PrismaClient } from '../generated/prisma/client.js';

/** Bài post mục tiêu — @thangdmf8 (override qua env nếu cần). */
export const SEED_NESTED_TARGET_POST_ID =
  process.env.SEED_NESTED_TARGET_POST_ID ?? 'cmr2xlmw800050wv1qc4ulfdm';

export const SEED_NESTED_TARGET_USERNAME =
  process.env.SEED_NESTED_TARGET_USERNAME ?? 'thangdmf8';

/** Prefix id nội dung seed — xóa idempotent trước khi tạo lại. */
export const SEED_NESTED_ID_PREFIX = 'seed_nested_';
export const SEED_NESTED_CONTENT_PREFIX = '🧪 Seed nested';

/** Số reply phẳng (>20) để test nút "Xem thêm trả lời...". */
export const SEED_NESTED_WIDE_REPLY_COUNT = 30;

export const SEED_NESTED_DEEP_ROOT_CONTENT =
  `${SEED_NESTED_CONTENT_PREFIX} — thread sâu nhiều cấp (test cuộn & deep-link)`;

export const SEED_NESTED_WIDE_ROOT_CONTENT =
  `${SEED_NESTED_CONTENT_PREFIX} — thread rộng (>20 reply, test "Xem thêm trả lời")`;

type PostSeedRow = {
  id: string;
  authorId: string;
  parentId: string;
  rootPostId: string;
  content: string;
  createdAt: Date;
};

export type NestedReplySeedResult = {
  rootPostId: string;
  deepRootId: string;
  deepLeafId: string;
  wideRootId: string;
  removed: number;
  created: number;
  username: string;
} | null;

/** Xóa toàn bộ comment/reply seed nested cũ theo id hoặc prefix nội dung. */
async function removeOldNestedSeed(prisma: PrismaClient): Promise<number> {
  const byContent = await prisma.post.deleteMany({
    where: { content: { startsWith: SEED_NESTED_CONTENT_PREFIX } },
  });
  const byId = await prisma.post.deleteMany({
    where: { id: { startsWith: SEED_NESTED_ID_PREFIX } },
  });
  return byContent.count + byId.count;
}

/** Seed thread sâu 6 cấp + thread rộng 30 reply trên bài @thangdmf8. */
export async function seedNestedRepliesForTesting(
  prisma: PrismaClient,
  authorIds: string[],
): Promise<NestedReplySeedResult> {
  if (authorIds.length === 0) return null;

  const targetUser = await prisma.user.findUnique({
    where: { username: SEED_NESTED_TARGET_USERNAME },
    select: { id: true, username: true },
  });

  const rootPost = await prisma.post.findFirst({
    where: {
      id: SEED_NESTED_TARGET_POST_ID,
      parentId: null,
      ...(targetUser ? { authorId: targetUser.id } : {}),
    },
    select: { id: true, authorId: true },
  });

  if (!rootPost) return null;

  const removed = await removeOldNestedSeed(prisma);

  const primaryAuthorId = targetUser?.id ?? rootPost.authorId;
  const pickAuthor = (index: number) =>
    index === 0 ? primaryAuthorId : authorIds[index % authorIds.length]!;

  const now = Date.now();
  const rootPostId = rootPost.id;
  const rows: PostSeedRow[] = [];

  const deepRootId = `${SEED_NESTED_ID_PREFIX}deep_root`;
  rows.push({
    id: deepRootId,
    authorId: pickAuthor(0),
    parentId: rootPostId,
    rootPostId,
    content: SEED_NESTED_DEEP_ROOT_CONTENT,
    createdAt: new Date(now),
  });

  const deepChain: { id: string; content: string }[] = [
    {
      id: `${SEED_NESTED_ID_PREFIX}deep_l2`,
      content: `@${SEED_NESTED_TARGET_USERNAME} reply cấp 2 — nhánh sâu`,
    },
    {
      id: `${SEED_NESTED_ID_PREFIX}deep_l3`,
      content: `@${SEED_NESTED_TARGET_USERNAME} reply cấp 3`,
    },
    {
      id: `${SEED_NESTED_ID_PREFIX}deep_l4`,
      content: 'Reply cấp 4 — tiếp tục thread',
    },
    {
      id: `${SEED_NESTED_ID_PREFIX}deep_l5`,
      content: 'Reply cấp 5 — target deep-link gợi ý',
    },
    {
      id: `${SEED_NESTED_ID_PREFIX}deep_l6`,
      content: 'Reply cấp 6 — lá sâu nhất của nhánh',
    },
  ];

  let deepParentId = deepRootId;
  for (let i = 0; i < deepChain.length; i++) {
    const node = deepChain[i]!;
    rows.push({
      id: node.id,
      authorId: pickAuthor(i + 1),
      parentId: deepParentId,
      rootPostId,
      content: `${SEED_NESTED_CONTENT_PREFIX} ${node.content}`,
      createdAt: new Date(now - (deepChain.length - i) * 2_000),
    });
    deepParentId = node.id;
  }

  const deepLeafId = deepChain[deepChain.length - 1]!.id;

  const wideRootId = `${SEED_NESTED_ID_PREFIX}wide_root`;
  rows.push({
    id: wideRootId,
    authorId: pickAuthor(2),
    parentId: rootPostId,
    rootPostId,
    content: SEED_NESTED_WIDE_ROOT_CONTENT,
    createdAt: new Date(now - 60_000),
  });

  for (let n = 1; n <= SEED_NESTED_WIDE_REPLY_COUNT; n++) {
    const padded = String(n).padStart(3, '0');
    rows.push({
      id: `${SEED_NESTED_ID_PREFIX}wide_r${padded}`,
      authorId: pickAuthor(n + 2),
      parentId: wideRootId,
      rootPostId,
      content: `${SEED_NESTED_CONTENT_PREFIX} reply rộng ${n}/${SEED_NESTED_WIDE_REPLY_COUNT}`,
      createdAt: new Date(now - 60_000 - (SEED_NESTED_WIDE_REPLY_COUNT - n) * 1_000),
    });
  }

  const branchRootId = `${SEED_NESTED_ID_PREFIX}branch_root`;
  rows.push({
    id: branchRootId,
    authorId: pickAuthor(3),
    parentId: rootPostId,
    rootPostId,
    content: `${SEED_NESTED_CONTENT_PREFIX} — nhánh phụ nhiều reply lồng nhau`,
    createdAt: new Date(now - 120_000),
  });

  const branchMidId = `${SEED_NESTED_ID_PREFIX}branch_mid`;
  rows.push({
    id: branchMidId,
    authorId: pickAuthor(4),
    parentId: branchRootId,
    rootPostId,
    content: `${SEED_NESTED_CONTENT_PREFIX} @${SEED_NESTED_TARGET_USERNAME} reply cấp 2 nhánh phụ`,
    createdAt: new Date(now - 121_000),
  });

  for (let n = 1; n <= 5; n++) {
    const padded = String(n).padStart(2, '0');
    rows.push({
      id: `${SEED_NESTED_ID_PREFIX}branch_r${padded}`,
      authorId: pickAuthor(n + 4),
      parentId: branchMidId,
      rootPostId,
      content: `${SEED_NESTED_CONTENT_PREFIX} reply cấp 3 nhánh phụ ${n}/5`,
      createdAt: new Date(now - 122_000 - (5 - n) * 1_000),
    });
  }

  const branchDeepId = `${SEED_NESTED_ID_PREFIX}branch_deep`;
  rows.push({
    id: branchDeepId,
    authorId: pickAuthor(5),
    parentId: `${SEED_NESTED_ID_PREFIX}branch_r03`,
    rootPostId,
    content: `${SEED_NESTED_CONTENT_PREFIX} reply cấp 4 — con của reply 3/5`,
    createdAt: new Date(now - 128_000),
  });

  rows.push({
    id: `${SEED_NESTED_ID_PREFIX}branch_leaf`,
    authorId: pickAuthor(6),
    parentId: branchDeepId,
    rootPostId,
    content: `${SEED_NESTED_CONTENT_PREFIX} reply cấp 5 — lá nhánh phụ`,
    createdAt: new Date(now - 129_000),
  });

  const batchSize = 100;
  let created = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const result = await prisma.post.createMany({ data: batch });
    created += result.count;
  }

  return {
    rootPostId,
    deepRootId,
    deepLeafId,
    wideRootId,
    removed,
    created,
    username: targetUser?.username ?? SEED_NESTED_TARGET_USERNAME,
  };
}
