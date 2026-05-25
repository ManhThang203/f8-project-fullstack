'use client';

import { X } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { Modal } from '@/components/shared/modal';

type Props = {
  open: boolean;
  src: string | null;
  name: string | null;
  onClose: () => void;
};

/** Lightbox fullscreen cho ảnh đại diện — không có panel khung, chỉ ảnh + backdrop tối. */
export function AvatarLightbox({ open, src, name, onClose }: Props) {
  if (!src) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Backdrop className="bg-black/90" />
      <Modal.Content>
        <IconButton
          shape="circle"
          tone="inverted"
          aria-label="Đóng"
          onClick={onClose}
          className="pointer-events-auto absolute right-4 top-4"
        >
          <X className="h-6 w-6" aria-hidden />
        </IconButton>
        <img
          src={src}
          alt={name ? `Ảnh đại diện của ${name}` : 'Ảnh đại diện'}
          className="pointer-events-auto relative z-10 max-h-[80dvh] max-w-full rounded-full object-cover"
        />
      </Modal.Content>
    </Modal>
  );
}
