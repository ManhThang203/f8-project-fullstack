'use client';

import { useEffect, useState, useRef } from 'react';
import { decryptBufferWithAES } from '@/lib/e2ee/crypto-utils';
import { Loader2, FileIcon, Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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

export function ChatMediaViewer({ mediaUrl, blurDataUrl, width, height, iv, roomKey, fileName, fileType }: Props) {
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
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm max-w-[280px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{fileName || 'Tệp đính kèm'}</p>
          <p className="text-xs text-muted-foreground uppercase">{fileType?.split('/')[1] || 'FILE'}</p>
        </div>
        
        {error ? (
          <div className="text-xs text-destructive">Lỗi tải</div>
        ) : !objectUrl ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <a
            href={objectUrl}
            download={fileName || 'download'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        className="relative mt-2 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center cursor-zoom-in"
        onClick={() => objectUrl && !error && setIsZoomed(true)}
      >
        {blurDataUrl && !objectUrl && !error && (
          <img 
            src={blurDataUrl} 
            alt="" 
            className="absolute inset-0 h-full w-full object-cover blur-md scale-110 opacity-70" 
          />
        )}

        {!objectUrl && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-destructive bg-destructive/10">
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
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setIsZoomed(false)}
          >
            <button 
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              layoutId={uniqueLayoutId}
              src={objectUrl}
              alt="Phóng to"
              className="max-w-full max-h-[90vh] object-contain cursor-zoom-out rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing if we wanted, but clicking image to close is also fine. Let's allow clicking image to close for better UX in chat apps.
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
