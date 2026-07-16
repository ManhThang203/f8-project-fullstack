'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Lightbox xem ảnh báo cáo — khoá scroll body và đóng bằng Esc / click nền. */
export function ReportMediaLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg bg-black/40 text-white transition-colors hover:bg-black/60"
        aria-label={t('common.closeMenu')}
      >
        <X className="size-5" />
      </button>
      <img
        src={url}
        alt={t('reportDetail.mediaAlt')}
        className="max-h-[90vh] max-w-full cursor-zoom-out object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
