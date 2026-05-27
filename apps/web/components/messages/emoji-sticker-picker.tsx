'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy load emoji-picker to avoid SSR issues and reduce initial bundle size
const EmojiPickerReact = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">Đang tải...</div> }
);

export const MOCK_STICKERS = [
  { id: 'st_joy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp' },
  { id: 'st_rofl', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp' },
  { id: 'st_heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764/512.webp' },
  { id: 'st_thumbs', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp' },
  { id: 'st_cry', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp' },
  { id: 'st_fire', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp' },
  { id: 'st_clap', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp' },
  { id: 'st_hearteyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp' },
  { id: 'st_party', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp' },
  { id: 'st_100', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp' },
  { id: 'st_cool', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp' },
  { id: 'st_think', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp' },
  { id: 'st_poop', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a9/512.webp' },
  { id: 'st_scream', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.webp' },
  { id: 'st_muscle', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.webp' },
  { id: 'st_pray', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.webp' },
  { id: 'st_starstruck', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp' },
];

interface EmojiStickerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (stickerId: string) => void;
}

export function EmojiStickerPicker({ open, onOpenChange, trigger, onEmojiSelect, onStickerSelect }: EmojiStickerPickerProps) {
  const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div onClick={() => onOpenChange(!open)}>
        {trigger}
      </div>
      
      {open && (
        <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[350px] rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex w-full border-b border-border">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'emoji' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setTab('emoji')}
            >
              Emoji
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'sticker' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => setTab('sticker')}
            >
              Nhãn dán
            </button>
          </div>
          
          <div className="w-full">
            {tab === 'emoji' && (
              <EmojiPickerReact 
                onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
                width="100%"
                height={350}
                searchDisabled={false}
                skinTonesDisabled={true}
              />
            )}
            
            {tab === 'sticker' && (
              <div className="h-[350px] overflow-y-auto p-4 bg-card">
                <div className="grid grid-cols-3 gap-4">
                  {MOCK_STICKERS.map((sticker) => (
                    <button
                      key={sticker.id}
                      className="hover:bg-muted p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center aspect-square"
                      onClick={() => {
                        onStickerSelect(sticker.id);
                        onOpenChange(false);
                      }}
                    >
                      <img src={sticker.url} alt="Sticker" className="w-16 h-16 object-contain hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
