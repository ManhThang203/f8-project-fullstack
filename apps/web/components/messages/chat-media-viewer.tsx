'use client';

import { Loader2, FileIcon, Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useRef } from 'react';

import { decryptBufferWithAES } from '@/lib/e2ee/crypto-utils';

type Props = {
  mediaUrl: string;
  blurDataUrl?: string;
  width?: number;
  height?: number;
  iv: string;
  roomKey: CryptoKey;
  fileName?: string;
  fileType?: string;
};

export function ChatMediaViewer({
  mediaUrl,
  blurDataUrl,
  width,
  height,
  iv,
  roomKey,
  fileName,
  fileType,
}: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const isImage = !fileType || fileType.startsWith('image/') || fileType.startsWith('video/');
  const uniqueLayoutId = `media-${mediaUrl}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const fetchUrl = mediaUrl.startsWith('/uploads/') ? `/api/v1/media${mediaUrl}` : mediaUrl;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Không thể tải file đính kèm');
        const encryptedBuffer = await res.arrayBuffer();

        const decryptedBuffer = await decryptBufferWithAES(encryptedBuffer, iv, roomKey);

        const blob = new Blob([decryptedBuffer], { type: fileType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        if (!cancelled) {
          setObjectUrl(url);
          objectUrlRef.current = url;
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Lỗi giải mã/tải media:', err);
        if (!cancelled) setError(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [mediaUrl, iv, roomKey, fileType]);

  if (!isImage) {
    return (
      <div className="border-border bg-card mt-2 flex max-w-[280px] items-center gap-3 rounded-lg border p-3 shadow-sm">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <FileIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">
            {fileName || 'Tệp đính kèm'}
          </p>
          <p className="text-muted-foreground text-xs uppercase">
            {fileType?.split('/')[1] || 'FILE'}
          </p>
        </div>

        {error ? (
          <div className="text-destructive text-xs">Lỗi tải</div>
        ) : !objectUrl ? (
          <Loader2 className="text-muted-foreground h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <a
            href={objectUrl}
            download={fileName || 'download'}
            className="hover:bg-muted text-muted-foreground focus-visible:ring-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
            title="Tải xuống"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  // Calculate rendering dimensions to prevent layout shifts
  const displayWidth = width ? Math.min(width, 300) : 300;
  const aspectRatio = width && height ? `${width}/${height}` : '16/9';

  return (
    <>
      <div
        style={{ width: `${displayWidth}px`, maxWidth: '100%', aspectRatio }}
        className="relative mt-2 flex cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
        onClick={() => objectUrl && !error && setIsZoomed(true)}
      >
        {blurDataUrl && !objectUrl && !error && (
          <img
            src={blurDataUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-md"
          />
        )}

        {!objectUrl && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="text-primary/50 h-6 w-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-destructive bg-destructive/10 absolute inset-0 flex items-center justify-center text-xs">
            Lỗi tải tệp đính kèm
          </div>
        )}

        {objectUrl && (
          <motion.img
            layoutId={uniqueLayoutId}
            src={objectUrl}
            alt="Tệp đính kèm"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
      </div>

      <AnimatePresence>
        {isZoomed && objectUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setIsZoomed(false)}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:bg-black/80 hover:text-white focus-visible:outline-none focus-visible:ring-2"
              onClick={() => setIsZoomed(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              layoutId={uniqueLayoutId}
              src={objectUrl}
              alt="Phóng to"
              className="max-h-[90vh] max-w-full cursor-zoom-out rounded-md object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing if we wanted, but clicking image to close is also fine. Let's allow clicking image to close for better UX in chat apps.
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
