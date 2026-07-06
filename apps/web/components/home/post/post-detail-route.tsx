'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { PostDetailShell } from './post-detail-shell';
import { PostDetailSkeleton } from './post-detail-skeleton';
import { PostDetailView } from './post-detail-view';

import { apiQuery } from '@/lib/api-query';

type Props = {
  username: string;
  postId: string;
  highlightCommentId?: string;
};

export function PostDetailRoute({ username, postId, highlightCommentId }: Props) {
  const router = useRouter();

  const { data: rootData, isLoading: rootLoading } = useQuery({
    queryKey: ['posts', postId, 'root'],
    queryFn: async () => {
      const res = await apiQuery<{ rootPostId: string }>(`/posts/${postId}/root`);
      return res.data;
    },
  });

  useEffect(() => {
    if (rootData?.rootPostId && rootData.rootPostId !== postId) {
      router.replace(`/${username}/post/${rootData.rootPostId}?commentId=${postId}`);
    }
  }, [rootData, postId, username, router]);

  const isComment = rootData?.rootPostId && rootData.rootPostId !== postId;

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['posts', postId],
    queryFn: async () => {
      const res = await apiQuery<PostFeedItemDto>(`/posts/${postId}`);
      return res.data;
    },
    enabled: !isComment && !!rootData,
  });

  if (rootLoading || (postLoading && !isComment)) {
    return <PostDetailSkeleton />;
  }

  if (!post && !isComment) {
    return <div className="flex justify-center p-8">Bài viết không tồn tại.</div>;
  }

  if (isComment) {
    return <PostDetailSkeleton statusMessage="Đang chuyển hướng…" />;
  }

  return (
    <PostDetailShell
      header={
        <h1 className="text-lg font-bold">
          Bài viết của {post!.author.name || post!.author.username}
        </h1>
      }
    >
      <PostDetailView post={post!} highlightCommentId={highlightCommentId} />
    </PostDetailShell>
  );
}
