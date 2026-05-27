'use client';

import Image from 'next/image';

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

const SIZE_PX = { sm: 24, md: 44 } as const;

type Props = {
  id: PostReactionId;
  size?: 'sm' | 'md';
  className?: string;
};

export function reactionIconSrc(id: PostReactionId): string {
  return REACTION_ICON_SRC[id];
}

export function ReactionFace({ id, size = 'md', className }: Props) {
  const px = SIZE_PX[size];
  const src = REACTION_ICON_SRC[id];

  if (!src) return null;

  const dim = size === 'sm' ? 'h-6 w-6' : 'h-11 w-11';

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', dim, className)}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        className="h-full w-full object-contain object-center"
        unoptimized
      />
    </span>
  );
}
