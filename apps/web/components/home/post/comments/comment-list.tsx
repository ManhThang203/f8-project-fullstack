'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { Virtuoso } from 'react-virtuoso';

type Props = {
  comments: PostFeedItemDto[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
  renderComment: (comment: PostFeedItemDto) => React.ReactNode;
  /** Truyền ref container khi dùng trong modal có vùng cuộn riêng */
  customScrollParent?: HTMLElement | null;
};

/**
 * Danh sách bình luận dùng Virtuoso để chỉ render những item trong viewport.
 * Hỗ trợ cả cuộn window (detail page) và custom scroll parent (modal).
 */
export function CommentList({
  comments,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
  renderComment,
  customScrollParent,
}: Props) {
  return (
    <Virtuoso
      useWindowScroll={!customScrollParent}
      customScrollParent={customScrollParent ?? undefined}
      data={comments}
      computeItemKey={(_, c) => c.id}
      endReached={() => {
        if (hasNextPage && !isFetchingNextPage) onEndReached?.();
      }}
      overscan={400}
      defaultItemHeight={88}
      increaseViewportBy={{ top: 200, bottom: 400 }}
      itemContent={(_, comment) => <div className="pb-3">{renderComment(comment)}</div>}
      components={{
        Footer: () =>
          isFetchingNextPage ? (
            <div className="text-muted-foreground flex min-h-10 items-center justify-center py-3 text-sm">
              Đang tải thêm bình luận…
            </div>
          ) : null,
      }}
    />
  );
}
