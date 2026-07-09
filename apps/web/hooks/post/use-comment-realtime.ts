'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

import { insertCommentInCache, removeCommentFromCache } from '@/lib/query';
import { getAuthedSocket } from '@/lib/socket';

type CommentCreatedPayload = { comment: PostFeedItemDto; actorId: string };
type CommentDeletedPayload = { commentId: string; parentId: string; actorId: string };
type CommentCountPayload = { postId: string; delta: number; actorId: string };

/**
 * Lắng nghe realtime comment cho một bài đang mở chi tiết.
 * Join room `post:{id}`, cập nhật cache danh sách comment và replyCount.
 * Bỏ qua event do chính mình tạo (đã optimistic) để tránh đếm/đúp.
 */
export function useCommentRealtime(opts: {
  postId: string;
  meId: string | undefined;
  enabled?: boolean;
  onCountDelta: (delta: number) => void;
}): void {
  const { postId, meId, enabled = true, onCountDelta } = opts;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !postId || !meId) return;

    let cancelled = false;
    let activeSocket: Socket | null = null;

    function isSelf(actorId: string): boolean {
      return Boolean(meId) && actorId === meId;
    }

    function onCommentCreated(payload: CommentCreatedPayload) {
      if (isSelf(payload.actorId)) return;
      // Insert vào đúng list của parent (có thể là root hoặc 1 comment)
      // Nếu parent list chưa load trong cache, item sẽ xuất hiện khi user mở replies.
      const targetParent = payload.comment.parentId ?? postId;
      insertCommentInCache(queryClient, targetParent, payload.comment);
    }

    function onCommentDeleted(payload: CommentDeletedPayload) {
      // Xóa khỏi cache list của đúng parent
      const targetParent = payload.parentId ?? postId;
      removeCommentFromCache(queryClient, targetParent, payload.commentId);
    }

    function onCountChanged(payload: CommentCountPayload) {
      if (payload.postId !== postId || isSelf(payload.actorId)) return;
      onCountDelta(payload.delta);
    }

    void getAuthedSocket('/feed')
      .then((socket) => {
        if (cancelled) return;
        activeSocket = socket;
        socket.emit('post:join', postId);
        socket.on('comment:created', onCommentCreated);
        socket.on('comment:deleted', onCommentDeleted);
        socket.on('comment:countChanged', onCountChanged);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.emit('post:leave', postId);
        activeSocket.off('comment:created', onCommentCreated);
        activeSocket.off('comment:deleted', onCommentDeleted);
        activeSocket.off('comment:countChanged', onCountChanged);
      }
    };
  }, [postId, meId, enabled, onCountDelta, queryClient]);
}
