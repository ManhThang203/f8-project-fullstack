'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PostMediaCarousel } from '../post-media/post-media-carousel';

import { PostActionBar } from './post-action-bar';
import { PostDetailModal } from './post-detail-modal';
import { PostOptionsMenu } from './post-options-menu';
import type { PostReactionId } from './reaction-face';

import { Avatar } from '@/components/shared/avatar';
import { RichText } from '@/components/shared/rich-text';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Props = {
  post: PostFeedItemDto;
  onDismiss: (postId: string) => void;
  disableCommentClick?: boolean;
  onCommentClick?: () => void;
  hideDismiss?: boolean;
  replyCountOverride?: number;
  /** Cho phép override tổng commentCount từ parent (detail) */
  commentCount?: number;
};

export function PostCard({
  post,
  onDismiss,
  disableCommentClick,
  onCommentClick,
  hideDismiss,
  replyCountOverride,
  commentCount,
}: Props) {
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const me = session?.user;

  return (
    <div className="border-border border-b px-1 py-4 first:pt-0 last:border-b-0">
      <article className="flex gap-3">
        <Link
          href={`/${encodeURIComponent(post.author.username)}`}
          aria-label={`Xem trang cá nhân của ${post.author.name ?? post.author.username}`}
          className="mt-0.5 shrink-0 rounded-full transition-opacity duration-150 hover:opacity-90 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2"
        >
          <Avatar
            as="span"
            src={post.author.image}
            name={post.author.name}
            username={post.author.username}
            size="md"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/${encodeURIComponent(post.author.username)}`}
                className="text-foreground text-sm font-semibold hover:underline"
              >
                {post.author.name ?? post.author.username}
              </Link>
              <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1 text-xs">
                <Link
                  href={`/${encodeURIComponent(post.author.username)}`}
                  className="hover:underline"
                >
                  @{post.author.username}
                </Link>
                <span aria-hidden>·</span>
                <time dateTime={post.createdAt} title={post.createdAt}>
                  {new Date(post.createdAt).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              <PostOptionsMenu
                postId={post.id}
                hasVideo={post.media.some((m) => m.type === 'video')}
                onHidePost={() => onDismiss(post.id)}
                isOwnPost={me?.id === post.author.id}
                post={post}
              />
              {!hideDismiss ? (
                <button
                  type="button"
                  aria-label="Đóng / ẩn bài viết"
                  onClick={() => onDismiss(post.id)}
                  className={cn(
                    'text-muted-foreground flex h-11 w-11 items-center justify-center rounded-full',
                    'hover:bg-muted transition-colors duration-150',
                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                  )}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {post.content.trim() && (
            <RichText
              text={post.content}
              className="text-foreground mt-1 block whitespace-pre-wrap text-sm leading-relaxed"
            />
          )}

          {post.media.length > 0 && (
            <PostMediaCarousel mode="feed" postId={post.id} items={post.media} />
          )}

          <PostActionBar
            postId={post.id}
            authorUsername={post.author.username}
            hasVideo={post.media.some((m) => m.type === 'video')}
            replyCount={replyCountOverride ?? post.replyCount}
            commentCount={commentCount ?? post.commentCount ?? post.replyCount}
            initialLikeCount={post.likeCount}
            initialReaction={post.myReaction as PostReactionId | null}
            topReactions={post.topReactions}
            initialShareCount={post.shareCount}
            initialSavedByMe={post.savedByMe}
            onCommentClick={
              disableCommentClick ? undefined : onCommentClick || (() => setIsReplyOpen(true))
            }
          />
        </div>
      </article>

      {isReplyOpen && (
        <PostDetailModal
          open={isReplyOpen}
          onClose={() => setIsReplyOpen(false)}
          post={post}
          me={me}
        />
      )}
    </div>
  );
}
