'use client';

import { cn } from '@/lib/utils';

export type PostReactionId = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

const REACTION_ICON_SRC: Record<PostReactionId, string> = {
  like: '/icon/like-icon.svg',
  love: '/icon/love-icon.svg',
  care: '/icon/favorite-icon.svg',
  /** SVG filenames are legacy; smiley-icon = laugh, haha-icon = angry */
  haha: '/icon/smiley-icon.svg',
  wow: '/icon/surprise-icon.svg',
  sad: '/icon/sad-icon.svg',
  angry: '/icon/haha-icon.svg',
};

export const REACTION_LABELS: Record<PostReactionId, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  care: 'Thương thương',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

export const REACTION_COLORS: Record<PostReactionId, string> = {
  like: 'text-blue-600 dark:text-blue-500',
  love: 'text-red-500',
  care: 'text-yellow-500',
  haha: 'text-yellow-500',
  wow: 'text-yellow-500',
  sad: 'text-yellow-500',
  angry: 'text-orange-500',
};

const SIZE_CLASS = { xs: 'size-4', sm: 'size-6', md: 'size-11' } as const;

type Props = {
  id: PostReactionId;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

/** Icon cảm xúc dạng vòng tròn — dùng background để căn giữa chính xác, tránh lệch do img. */
export function ReactionFace({ id, size = 'md', className }: Props) {
  return (
    <span
      className={cn(
        'block shrink-0 rounded-full bg-cover bg-center bg-no-repeat',
        SIZE_CLASS[size],
        className,
      )}
      style={{ backgroundImage: `url(${REACTION_ICON_SRC[id]})` }}
      aria-hidden
    />
  );
}
