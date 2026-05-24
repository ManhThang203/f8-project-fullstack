'use client';

import type { PostAuthorDto } from '@threads/shared';
import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/shared/avatar';
import { cn } from '@/lib/utils';

type Props = {
  author: PostAuthorDto;
  caption: string;
  isFollowing?: boolean;
  onFollowClick?: () => void;
  followLoading?: boolean;
  onAvatarClick: (e: React.MouseEvent) => void;
};

const CAPTION_LENGTH_THRESHOLD = 80;

export function ReelsBottomMeta({
  author,
  caption,
  isFollowing = false,
  onFollowClick,
  followLoading = false,
  onAvatarClick,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showExpand, setShowExpand] = useState(false);
  const captionRef = useRef<HTMLParagraphElement>(null);

  const trimmedCaption = caption.trim();
  const displayName = author.name ?? author.username;

  useEffect(() => {
    setExpanded(false);
  }, [caption]);

  useEffect(() => {
    const el = captionRef.current;
    if (!el || !trimmedCaption) {
      setShowExpand(false);
      return;
    }

    if (trimmedCaption.length > CAPTION_LENGTH_THRESHOLD) {
      setShowExpand(true);
      return;
    }

    setShowExpand(el.scrollHeight > el.clientHeight);
  }, [trimmedCaption, expanded]);

  function handleFollowClick(e: React.MouseEvent) {
    e.stopPropagation();
    onFollowClick?.();
  }

  function handleToggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  return (
    <div className="absolute bottom-10 left-3 right-14 z-20 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Avatar
          as="button"
          src={author.image}
          name={author.name}
          username={author.username}
          size="xs"
          label={`Trang của ${displayName}`}
          onClick={onAvatarClick}
        />

        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="truncate text-sm font-semibold text-white">{displayName}</span>
          <Globe className="h-3.5 w-3.5 shrink-0 text-white/80" aria-hidden />
          {onFollowClick ? (
            <>
              <span className="text-sm text-white/70" aria-hidden>
                ·
              </span>
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-white transition-opacity duration-150 hover:underline disabled:opacity-60"
                onClick={handleFollowClick}
                disabled={followLoading}
              >
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {trimmedCaption ? (
        <div className="min-w-0">
          <p
            ref={captionRef}
            className={cn(
              'text-sm leading-relaxed text-white/90',
              !expanded && 'line-clamp-2',
            )}
          >
            {trimmedCaption}
          </p>
          {showExpand ? (
            <button
              type="button"
              className="mt-0.5 text-sm font-semibold text-white/80 transition-opacity duration-150 hover:text-white"
              onClick={handleToggleExpand}
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
