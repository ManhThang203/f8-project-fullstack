'use client';

import { X } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { Modal } from '@/components/shared/modal';
import { cn } from '@/lib/utils';

type Variant = 'avatar' | 'cover';

type Props = {
  open: boolean;
  src: string | null;
  alt: string;
  onClose: () => void;
  variant?: Variant;
};

const maxWidthClass: Record<Variant, string> = {
  avatar: 'max-w-[min(100%,32rem)]',
  cover: 'max-w-[min(100%,56rem)]',
};

/** Lightbox fullscreen cho ảnh profile (avatar / ảnh bìa) — backdrop tối, hiển thị toàn bộ ảnh. */
export function ProfileImageLightbox({
  open,
  src,
  alt,
  onClose,
  variant = 'avatar',
}: Props) {
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
          className="pointer-events-auto absolute right-4 top-4 z-20"
        >
          <X className="h-6 w-6" aria-hidden />
        </IconButton>
        <img
          src={src}
          alt={alt}
          className={cn(
            'pointer-events-auto relative z-10 h-auto max-h-[90dvh] w-auto object-contain',
            maxWidthClass[variant],
          )}
        />
      </Modal.Content>
    </Modal>
  );
}

/** @deprecated Dùng ProfileImageLightbox — giữ alias tương thích. */
export function AvatarLightbox({
  open,
  src,
  name,
  onClose,
}: {
  open: boolean;
  src: string | null;
  name: string | null;
  onClose: () => void;
}) {
  return (
    <ProfileImageLightbox
      open={open}
      src={src}
      alt={name ? `Ảnh đại diện của ${name}` : 'Ảnh đại diện'}
      variant="avatar"
      onClose={onClose}
    />
  );
}
