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

/** Stack hiển thị: số icon tối đa = min(3, likeCount); 1 lượt chỉ hiện 1 cảm xúc. */
export function displayTopReactions(
  topReactions: string[] | undefined,
  likeCount: number,
  myReaction?: PostReactionId | null,
): PostReactionId[] {
  if (likeCount <= 0) return [];

  const maxIcons = Math.min(3, likeCount);

  if (likeCount === 1) {
    if (myReaction) return [myReaction];
    const normalized = normalizeTopReactions(topReactions);
    if (normalized.length > 0) return [normalized[0]!];
    return ['like'];
  }

  const normalized = normalizeTopReactions(topReactions);
  if (normalized.length > 0) return normalized.slice(0, maxIcons);
  return [myReaction ?? 'like'];
}

/** Cập nhật topReactions optimistic khi user thả/bỏ/đổi cảm xúc. */
export function patchTopReactionsOptimistic(
  prev: string[],
  newReaction: string | null,
  prevReaction: string | null = null,
  newLikeCount?: number,
): string[] {
  if (newLikeCount !== undefined && newLikeCount <= 0) return [];
  if (newLikeCount === 1 && newReaction) {
    return [newReaction];
  }

  let stack = normalizeTopReactions(prev);

  if (!newReaction) {
    if (prevReaction) {
      stack = stack.filter((reaction) => reaction !== prevReaction);
    }
    return stack.slice(0, 3);
  }

  if (prevReaction && prevReaction !== newReaction) {
    stack = stack.filter((reaction) => reaction !== prevReaction);
  }

  const maxIcons =
    newLikeCount !== undefined ? Math.min(3, newLikeCount) : 3;

  return [newReaction, ...stack.filter((reaction) => reaction !== newReaction)].slice(
    0,
    maxIcons,
  );
}
