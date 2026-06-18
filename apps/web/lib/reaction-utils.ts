import type { PostReactionId } from '@/components/home/post/reaction-face';

const VALID_REACTIONS = new Set<PostReactionId>([
  'like',
  'love',
  'care',
  'haha',
  'wow',
  'sad',
  'angry',
]);

/** Lọc và chuẩn hóa mảng loại cảm xúc từ API. */
export function normalizeTopReactions(types: string[] | undefined): PostReactionId[] {
  if (!types?.length) return [];
  return types.filter((t): t is PostReactionId => VALID_REACTIONS.has(t as PostReactionId));
}

/** Stack hiển thị: ưu tiên topReactions từ server, fallback myReaction khi có likeCount. */
export function displayTopReactions(
  topReactions: string[] | undefined,
  likeCount: number,
  myReaction?: PostReactionId | null,
): PostReactionId[] {
  const normalized = normalizeTopReactions(topReactions);
  if (normalized.length > 0) return normalized;
  if (likeCount <= 0) return [];
  return [myReaction ?? 'like'];
}

/** Cập nhật topReactions optimistic khi user thả/bỏ cảm xúc. */
export function patchTopReactionsOptimistic(prev: string[], newReaction: string | null): string[] {
  if (!newReaction) return prev;
  return [newReaction, ...prev.filter((r) => r !== newReaction)].slice(0, 3);
}
