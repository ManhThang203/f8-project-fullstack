'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EditPostModal } from '@/components/home/post/detail/edit-post-modal';
import { ReportModal } from '@/components/shared/report-modal';
import { ConfirmDialog } from '@/components/shared/ui';
import { useBlockMutation } from '@/hooks/queries/social';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getUserFacingErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  postId: string;
  hasVideo?: boolean;
  onHidePost?: () => void;
  isOwnPost?: boolean;
  post?: PostFeedItemDto;
};

type MenuItemId = 'copy' | 'edit' | 'report' | 'hide' | 'block';

type MenuItem = { id: MenuItemId; label: string };

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
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const blockMutation = useBlockMutation();
  const { requireAuth } = useRequireAuth();

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [
      { id: 'copy', label: 'Sao chép liên kết' },
      { id: 'edit', label: 'Chỉnh sửa bài viết' },
      { id: 'report', label: 'Báo cáo bài viết' },
      { id: 'hide', label: 'Ẩn bài viết' },
    ];
    if (!isOwnPost && post?.author) {
      items.push({ id: 'block', label: `Chặn @${post.author.username}` });
    }
    return items;
  }, [isOwnPost, post?.author]);

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

  function handleAction(id: MenuItemId) {
    setOpen(false);
    switch (id) {
      case 'copy': {
        const path = hasVideo
          ? `/reel/${postId}`
          : `/${post?.author.username ?? 'user'}/post/${postId}`;
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
        if (!requireAuth()) return;
        setReportModalOpen(true);
        break;
      case 'hide':
        onHidePost?.();
        toast.message('Đã ẩn bài viết khỏi feed');
        break;
      case 'block':
        if (!requireAuth()) return;
        setBlockConfirmOpen(true);
        break;
    }
  }

  function confirmBlock() {
    if (!post?.author) return;
    blockMutation.mutate(
      { userId: post.author.id, block: true },
      {
        onSuccess: () => {
          setBlockConfirmOpen(false);
          onHidePost?.();
          toast.success(`Đã chặn @${post.author.username}`);
        },
        onError: (err) => toast.error(getUserFacingErrorMessage(err)),
      },
    );
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
          {menuItems
            .filter(
              (item) =>
                !(item.id === 'report' && isOwnPost) &&
                !(item.id === 'edit' && !(isOwnPost && post)),
            )
            .map((item) => (
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

      {post?.author ? (
        <ConfirmDialog
          open={blockConfirmOpen}
          onClose={() => setBlockConfirmOpen(false)}
          onConfirm={confirmBlock}
          title={`Chặn @${post.author.username}?`}
          description="Họ sẽ không thể theo dõi, nhắn tin hoặc tìm kiếm bạn. Bài viết của họ sẽ bị ẩn khỏi feed."
          confirmLabel="Chặn"
          cancelLabel="Huỷ"
          confirming={blockMutation.isPending}
          destructive
        />
      ) : null}
    </div>
  );
}
