'use client';

import type { PostFeedItemDto } from '@threads/shared';
import { X } from 'lucide-react';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { PostDetailModal } from './post-detail-modal';
import { PostMediaCarousel } from '../post-media/post-media-carousel';
import { PostActionBar } from './post-action-bar';
import { PostOptionsMenu } from './post-options-menu';
import { authClient } from '@/lib/auth-client';

import { cn } from '@/lib/utils';

type Props = {
  post: PostFeedItemDto;
  onDismiss: (postId: string) => void;
  disableCommentClick?: boolean;
  onCommentClick?: () => void;
};

export function PostCard({ post, onDismiss, disableCommentClick, onCommentClick }: Props) {
  const displayInitial = post.author.username.slice(0, 1).toUpperCase();
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  
  const me = session?.user;

  function handleReplyPosted(newPost: PostFeedItemDto) {
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
  }

  return (
    <li className="border-border border-b px-1 py-4 first:pt-0 last:border-b-0">
      <article className="flex gap-3">
        <div
          className="bg-muted text-muted-foreground mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
          aria-hidden
        >
          {post.author.image ? (
            <img src={post.author.image} alt="" className="h-full w-full object-cover" />
          ) : (
            displayInitial
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-foreground text-sm font-semibold">
                {post.author.name ?? post.author.username}
              </span>
              <span className="text-muted-foreground text-sm">@{post.author.username}</span>
              <time
                className="text-muted-foreground text-xs"
                dateTime={post.createdAt}
                title={post.createdAt}
              >
                {new Date(post.createdAt).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </time>
            </div>

            <div className="flex shrink-0 items-center">
              <PostOptionsMenu
                postId={post.id}
                hasVideo={post.media.some((m) => m.type === 'video')}
                onHidePost={() => onDismiss(post.id)}
              />
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
            </div>
          </div>

          {post.content.trim() && (
            <p className="text-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {post.content}
            </p>
          )}

          {post.media.length > 0 && (
            <PostMediaCarousel mode="feed" postId={post.id} items={post.media} />
          )}

          <PostActionBar 
            postId={post.id} 
            replyCount={post.replyCount}
            initialLikeCount={post.likeCount}
            initialReaction={post.myReaction as import('./reaction-face').PostReactionId | null}
            onCommentClick={disableCommentClick ? undefined : (onCommentClick || (() => setIsReplyOpen(true)))}
          />
        </div>
      </article>

      {isReplyOpen && (
        <PostDetailModal
          open={isReplyOpen}
          onClose={() => setIsReplyOpen(false)}
          post={post}
          me={me as any}
        />
      )}
    </li>
  );
}
