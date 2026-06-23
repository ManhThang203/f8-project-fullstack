'use client';

import type { PostFeedItemDto, PostVisibilityDto } from '@costy/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { VisibilitySelect } from '../compose/visibility-select';

import { Button } from '@/components/shared/button';
import { ComposeEmojiPicker } from '@/components/shared/compose-emoji-picker';
import { Modal } from '@/components/shared/modal';
import { useUpdatePost } from '@/hooks/queries/use-update-post';
import { applyEmojiInsert } from '@/lib/insert-text-at-cursor';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  post: PostFeedItemDto;
};

/** Modal chỉnh sửa nội dung và quyền riêng tư của bài viết hiện có. */
export function EditPostModal({ open, onClose, post }: Props) {
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState<PostVisibilityDto>(post.visibility);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updatePost = useUpdatePost();

  useEffect(() => {
    if (!open) return;
    setContent(post.content);
    setVisibility(post.visibility);
  }, [open, post.content, post.visibility]);

  const trimmedContent = content.trim();
  const changed = useMemo(
    () => trimmedContent !== post.content.trim() || visibility !== post.visibility,
    [post.content, post.visibility, trimmedContent, visibility],
  );
  const saving = updatePost.isPending;
  const canSubmit = changed && trimmedContent.length > 0 && !saving;

  function handleEmojiSelect(emoji: string) {
    applyEmojiInsert(textareaRef.current, content, emoji, setContent);
  }

  /** Lưu thay đổi bài viết và đóng modal khi backend trả về thành công. */
  function handleSubmit() {
    if (!canSubmit) return;

    updatePost.mutate(
      {
        postId: post.id,
        content: trimmedContent,
        visibility: post.parentId ? undefined : visibility,
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật bài viết');
          onClose();
        },
        onError: (error) => {
          toast.error(error.message || 'Không thể cập nhật bài viết');
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} dismissOnEsc={!saving} dismissOnBackdrop={!saving}>
      <Modal.Backdrop />
      <Modal.Panel
        from="bottom"
        size="md"
        className="flex max-h-[100dvh] w-full flex-col rounded-t-2xl sm:rounded-2xl"
      >
        <Modal.Header title="Chỉnh sửa bài viết" closeDisabled={saving} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label className="text-foreground mb-2 block text-sm font-medium" htmlFor="edit-post-text">
            Nội dung
          </label>
          <textarea
            ref={textareaRef}
            id="edit-post-text"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={6}
            disabled={saving}
            aria-invalid={trimmedContent.length === 0}
            className={cn(
              'border-border bg-muted text-foreground w-full resize-none rounded-xl border px-3 py-3 text-sm leading-relaxed',
              'placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          />
          <p className="text-muted-foreground mt-2 text-xs">{content.length}/2000 ký tự</p>

          {!post.parentId ? (
            <div className="mt-5">
              <label className="text-foreground mb-2 block text-sm font-medium">
                Quyền riêng tư
              </label>
              <VisibilitySelect value={visibility} onChange={setVisibility} disabled={saving} />
            </div>
          ) : null}
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3">
          <div className="border-border mb-3 flex items-center justify-end rounded-xl border px-3 py-2.5">
            <ComposeEmojiPicker onSelect={handleEmojiSelect} disabled={saving} />
          </div>
          <Button className="w-full" loading={saving} disabled={!canSubmit} onClick={handleSubmit}>
            Lưu thay đổi
          </Button>
        </div>
      </Modal.Panel>
    </Modal>
  );
}
