'use client';

import { Image, Smile, Video } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  username?: string | null;
  avatarUrl?: string | null;
  onOpen: (openFilePicker?: boolean) => void;
};

export function CreatePostTrigger({ username, avatarUrl, onOpen }: Props) {
  const placeholder = username ? `${username} ơi, bạn đang nghĩ gì thế?` : 'Bạn đang nghĩ gì thế?';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      {/* Avatar */}
      <div
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {username ? username[0]?.toUpperCase() : '?'}
          </span>
        )}
      </div>

      {/* Placeholder input */}
      <button
        type="button"
        onClick={() => onOpen(false)}
        className="flex-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Tạo bài viết mới"
      >
        {placeholder}
      </button>

      {/* Quick action icons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onOpen(false)}
          aria-label="Video trực tiếp"
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Video className="h-5 w-5 text-[hsl(0,80%,60%)]" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => onOpen(true)}
          aria-label="Thêm ảnh/video"
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Image className="h-5 w-5 text-[hsl(145,60%,50%)]" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => onOpen(false)}
          aria-label="Cảm xúc/hoạt động"
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Smile className="h-5 w-5 text-[hsl(40,90%,60%)]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
