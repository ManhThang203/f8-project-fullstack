'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useReducedMotion } from 'motion/react';

import { PostDetailShell } from './post-detail-shell';

import { PostCard } from '@/components/home/post/card/post-card';
import { cn } from '@/lib/utils';
import '@aejkatappaja/phantom-ui';

const FAKE_POST: PostFeedItemDto = {
  id: 'fake-detail-post',
  author: { id: 'u1', username: 'username', name: 'Tên người dùng', image: null },
  content:
    'Đây là một đoạn nội dung bài đăng mẫu dùng để tạo bộ khung loading. Nó chiếm khoảng hai đến ba dòng để giao diện trông tự nhiên hơn.',
  createdAt: new Date().toISOString(),
  visibility: 'PUBLIC',
  replyCount: 0,
  commentCount: 0,
  likeCount: 0,
  shareCount: 0,
  myReaction: null,
  savedByMe: false,
  topReactions: [],
  media: [],
  parentId: null,
};

type Props = {
  /** Thông báo cho screen reader (mặc định: đang tải bài viết). */
  statusMessage?: string;
};

function PulseBlock({
  className,
  reduceMotion,
}: {
  className?: string;
  reduceMotion: boolean | null;
}) {
  return <div className={cn(className, !reduceMotion && 'animate-pulse')} />;
}

function CommentRowSkeleton({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="flex gap-2 px-4 py-2">
      <PulseBlock
        className="bg-muted mt-1 h-8 w-8 shrink-0 rounded-full"
        reduceMotion={reduceMotion}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <PulseBlock className="bg-muted h-16 w-full max-w-[280px] rounded-2xl" reduceMotion={reduceMotion} />
        <div className="flex gap-4 px-2">
          <PulseBlock className="bg-muted h-3 w-24 rounded" reduceMotion={reduceMotion} />
          <PulseBlock className="bg-muted h-3 w-10 rounded" reduceMotion={reduceMotion} />
          <PulseBlock className="bg-muted h-3 w-12 rounded" reduceMotion={reduceMotion} />
        </div>
      </div>
    </div>
  );
}

/** Skeleton trang chi tiết post — khớp layout thật (header + scroll + composer cố định). */
export function PostDetailSkeleton({ statusMessage = 'Đang tải bài viết…' }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <PostDetailShell
      ariaBusy
      statusMessage={statusMessage}
      header={<PulseBlock className="bg-muted h-6 w-48 rounded" reduceMotion={reduceMotion} />}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <phantom-ui loading>
          <PostCard post={FAKE_POST} onDismiss={() => {}} hideDismiss variant="embedded" />
        </phantom-ui>

        <div className="border-border mt-2 border-t" />

        <div className="pb-4 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <CommentRowSkeleton key={i} reduceMotion={reduceMotion} />
          ))}
        </div>
      </div>

      <div className="border-border bg-card relative z-30 shrink-0 border-t p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex gap-3">
          <PulseBlock
            className="bg-muted mt-1 h-8 w-8 shrink-0 rounded-full"
            reduceMotion={reduceMotion}
          />
          <PulseBlock
            className="bg-muted/50 h-20 min-w-0 flex-1 rounded-2xl"
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </PostDetailShell>
  );
}
