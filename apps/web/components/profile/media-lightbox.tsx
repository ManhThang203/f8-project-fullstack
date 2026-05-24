'use client';

import type { ProfileGridItemDto } from '@threads/shared';
import { Heart, MessageCircle } from 'lucide-react';

import { Modal } from '@/components/shared/modal';

type Props = {
  item: ProfileGridItemDto | null;
  username: string;
  onClose: () => void;
};

export function MediaLightbox({ item, username, onClose }: Props) {
  return (
    <Modal open={Boolean(item)} onClose={onClose}>
      <Modal.Backdrop className="bg-black/80 backdrop-blur-sm" />
      <Modal.Panel size="md" className="max-h-[90dvh]">
        <Modal.Header title={`@${username}`} />
        {item ? (
          <>
            <div className="bg-muted aspect-square max-h-[70dvh] w-full">
              {item.thumbnailUrl ? (
                item.isVideo ? (
                  <video
                    src={item.thumbnailUrl}
                    controls
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img src={item.thumbnailUrl} alt="" className="h-full w-full object-contain" />
                )
              ) : null}
            </div>
            <div className="text-muted-foreground flex items-center gap-4 px-4 py-3 text-sm">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" aria-hidden />
                {item.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" aria-hidden />
                {item.replyCount}
              </span>
            </div>
          </>
        ) : null}
      </Modal.Panel>
    </Modal>
  );
}
