'use client';

import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type MediaItem = { id: string; kind: string; publicUrl: string | null };

/** Lưới media của nội dung bị báo cáo — làm mờ, click để xem, ảnh mở lightbox. */
export function ReportTargetMedia({
  media,
  onOpenLightbox,
}: {
  media: MediaItem[];
  onOpenLightbox: (url: string) => void;
}) {
  const { t } = useTranslation();
  const [revealedMediaIds, setRevealedMediaIds] = useState<string[]>([]);

  if (media.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {media.map((m) => {
        const isRevealed = revealedMediaIds.includes(m.id);
        const isVideo = m.kind === 'VIDEO';

        return (
          <div
            key={m.id}
            className={`border-border bg-muted/30 group relative flex aspect-video select-none items-center justify-center overflow-hidden rounded-lg border ${
              isRevealed && !isVideo ? 'cursor-zoom-in' : 'cursor-pointer'
            }`}
            onClick={() => {
              if (!isRevealed) {
                setRevealedMediaIds((prev) => [...prev, m.id]);
                return;
              }
              if (!isVideo && m.publicUrl) {
                onOpenLightbox(m.publicUrl);
              }
            }}
          >
            {isVideo ? (
              <video
                src={m.publicUrl ?? undefined}
                controls={isRevealed}
                className={`h-full w-full object-cover transition-all duration-300 ${
                  isRevealed ? '' : 'pointer-events-none scale-95 opacity-50 blur-2xl'
                }`}
              />
            ) : (
              <img
                src={m.publicUrl ?? undefined}
                alt={t('reportDetail.mediaAlt')}
                className={`h-full w-full object-cover transition-all duration-300 ${
                  isRevealed ? '' : 'pointer-events-none scale-95 opacity-50 blur-2xl'
                }`}
              />
            )}

            {!isRevealed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-3 text-center transition-colors group-hover:bg-black/60">
                <EyeOff className="mb-1 h-6 w-6 text-white/90" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                  {t('reportDetail.sensitiveContent')}
                </span>
                <span className="mt-0.5 text-[10px] text-white/70">
                  {t('reportDetail.clickToReveal')}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
