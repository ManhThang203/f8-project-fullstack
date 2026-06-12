'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EditPostModal } from './edit-post-modal';

import { ReportModal } from '@/components/shared/report-modal';
import { cn } from '@/lib/utils';

type Props = {
  postId: string;
  hasVideo?: boolean;
  onHidePost?: () => void;
  isOwnPost?: boolean;
  post?: PostFeedItemDto;
};

const MENU_ITEMS = [
  { id: 'copy', label: 'Sao chép liên kết' },
  { id: 'edit', label: 'Chỉnh sửa bài viết' },
  { id: 'report', label: 'Báo cáo bài viết' },
  { id: 'hide', label: 'Ẩn bài viết' },
] as const;

export function PostOptionsMenu({
  postId,
  hasVideo = false,
  onHidePost,
  isOwnPost = false,
  post,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleAction(id: (typeof MENU_ITEMS)[number]['id']) {
    setOpen(false);
    switch (id) {
      case 'copy': {
        const path = hasVideo ? `/reel/${postId}` : `/?post=${postId}`;
        const url = `${window.location.origin}${path}`;
        void navigator.clipboard.writeText(url).then(
          () => toast.success('Đã sao chép liên kết'),
          () => toast.error('Không thể sao chép liên kết'),
        );
        break;
      }
      case 'edit':
        setEditModalOpen(true);
        break;
      case 'report':
        setReportModalOpen(true);
        break;
      case 'hide':
        onHidePost?.();
        toast.message('Đã ẩn bài viết khỏi feed');
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Tùy chọn bài viết"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'text-muted-foreground flex h-11 w-11 items-center justify-center rounded-full',
          'hover:bg-muted transition-colors duration-150',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        )}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'border-border bg-card absolute right-0 top-full z-20 mt-1 min-w-[12rem]',
            'rounded-xl border py-1 shadow-lg',
          )}
        >
          {MENU_ITEMS.filter(
            (item) =>
              !(item.id === 'report' && isOwnPost) &&
              !(item.id === 'edit' && !(isOwnPost && post)),
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => handleAction(item.id)}
              className={cn(
                'text-foreground w-full px-4 py-3 text-left text-sm',
                'hover:bg-muted transition-colors duration-150',
                'focus-visible:bg-muted focus-visible:outline-none',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="POST"
        targetId={postId}
      />

      {post && (
        <EditPostModal open={editModalOpen} onClose={() => setEditModalOpen(false)} post={post} />
      )}
    </div>
  );
}
