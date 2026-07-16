'use client';

import { FileIcon, Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

type Props = {
  mediaUrl: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export function ChatMediaViewer({ mediaUrl, width, height, mimeType }: Props) {
  const [isZoomed, setIsZoomed] = useState(false);

  const isImage = Boolean(mimeType?.startsWith('image/'));
  const isVideo = Boolean(mimeType?.startsWith('video/'));
  const uniqueLayoutId = `media-${mediaUrl}`;

  if (!isImage && !isVideo) {
    return (
      <div className="border-border bg-card mt-2 flex max-w-[280px] items-center gap-3 rounded-lg border p-3 shadow-xs">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <FileIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">Tệp đính kèm</p>
          <p className="text-muted-foreground text-xs uppercase">
            {mimeType?.split('/')[1] || 'FILE'}
          </p>
        </div>
        <a
          href={mediaUrl}
          download
          className="hover:bg-muted text-muted-foreground focus-visible:ring-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2"
          title="Tải xuống"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const displayWidth = width ? Math.min(width, 300) : 300;
  const aspectRatio = width && height ? `${width}/${height}` : undefined;

  if (isVideo) {
    return (
      <div
        style={{ width: `${displayWidth}px`, maxWidth: '100%' }}
        className="relative mt-2 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
      >
        <video src={mediaUrl} controls className="h-auto w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div
        style={{ width: `${displayWidth}px`, maxWidth: '100%', aspectRatio }}
        className="relative mt-2 flex cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
        onClick={() => setIsZoomed(true)}
      >
        <motion.img
          layoutId={uniqueLayoutId}
          src={mediaUrl}
          alt="Tệp đính kèm"
          className="h-auto w-full rounded-lg object-contain"
        />
      </div>

      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-300 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
            onClick={() => setIsZoomed(false)}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:bg-black/80 hover:text-white focus-visible:outline-hidden focus-visible:ring-2"
              onClick={() => setIsZoomed(false)}
              aria-label="Đóng"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              layoutId={uniqueLayoutId}
              src={mediaUrl}
              alt="Phóng to"
              className="max-h-[90vh] max-w-full cursor-zoom-out rounded-md object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
