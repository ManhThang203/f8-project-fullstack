import { prisma } from '@costy/db';

const HASHTAG_REGEX = /#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]{2,50})/g;

/** Trích xuất hashtag từ nội dung bài, chuẩn hóa lowercase. */
export function extractHashtags(content: string): string[] {
  const tags = new Set<string>();
  for (const match of content.matchAll(HASHTAG_REGEX)) {
    const tag = match[1]?.toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

/** Gắn hashtag vào bài viết (upsert Hashtag + PostHashtag). */
export async function syncPostHashtags(postId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  await prisma.postHashtag.deleteMany({ where: { postId } });
  if (tags.length === 0) return;

  for (const tag of tags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    });
    // nếu hashtag bị khóa thì không thêm vào bài viết
    if (hashtag.status === 'BLOCKED') continue;
    await prisma.postHashtag.upsert({
      where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      create: { postId, hashtagId: hashtag.id },
      update: {},
    });
  }
}
