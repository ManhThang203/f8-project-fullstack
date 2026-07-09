'use client';

import { EmojiStyle, Theme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { addRecentEmoji, THREADS_EMOJI_CATEGORIES } from '@/lib/emoji';
import { cn } from '@/lib/utils';

const EmojiPickerReact = dynamic(() => import('emoji-picker-react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-[320px] items-center justify-center text-sm">
      Đang tải...
    </div>
  ),
});

type Props = {
  onSelect: (emoji: string) => void;
  height?: number;
  className?: string;
};

/** Panel chọn emoji kiểu Threads — search, grid 6 cột, category tabs dưới. */
export function EmojiPickerPanel({ onSelect, height = 380, className }: Props) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleSelect = useCallback(
    (emoji: string) => {
      addRecentEmoji(emoji);
      onSelect(emoji);
    },
    [onSelect],
  );

  return (
    <div className={cn('bg-card flex min-h-0 w-full flex-col overflow-hidden', className)}>
      <div className="EmojiPickerThreads min-h-0 flex-1 overflow-hidden">
        <EmojiPickerReact
          onEmojiClick={(emojiData) => handleSelect(emojiData.emoji)}
          theme={isDark ? Theme.DARK : Theme.LIGHT}
          emojiStyle={EmojiStyle.APPLE}
          width="100%"
          height={height}
          searchDisabled={false}
          searchPlaceholder="Tìm kiếm biểu tượng cảm xúc"
          skinTonesDisabled
          autoFocusSearch={false}
          previewConfig={{ showPreview: false }}
          categories={THREADS_EMOJI_CATEGORIES}
        />
      </div>
    </div>
  );
}
