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
    <div className="border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3">
      {/* Avatar */}
      <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-full" aria-hidden>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-muted-foreground flex h-full w-full items-center justify-center text-sm font-semibold">
            {username ? username[0]?.toUpperCase() : '?'}
          </span>
        )}
      </div>

      {/* Placeholder input */}
      <button
        type="button"
        onClick={() => onOpen(false)}
        className="text-muted-foreground hover:text-foreground/70 focus-visible:ring-ring focus-visible:ring-offset-background flex-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
            'hover:bg-muted flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Video className="h-5 w-5 text-[hsl(0,80%,60%)]" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => onOpen(true)}
          aria-label="Thêm ảnh/video"
          className={cn(
            'hover:bg-muted flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Image className="h-5 w-5 text-[hsl(145,60%,50%)]" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => onOpen(false)}
          aria-label="Cảm xúc/hoạt động"
          className={cn(
            'hover:bg-muted flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Smile className="h-5 w-5 text-[hsl(40,90%,60%)]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
