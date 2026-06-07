'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    return <div className="flex justify-center p-8">Đang tải bài viết...</div>;
  }

  if (!post && !isComment) {
    return <div className="flex justify-center p-8">Bài viết không tồn tại.</div>;
  }

  if (isComment) return <div className="flex justify-center p-8">Đang chuyển hướng...</div>;

  return (
    <div className="bg-muted/20 flex min-h-[calc(100vh-64px)] justify-center">
      <div className="bg-background border-border flex w-full max-w-[600px] flex-col border-x shadow-sm">
        <div className="bg-background/80 border-border sticky top-0 z-20 flex shrink-0 items-center border-b p-4 backdrop-blur-md">
          <h1 className="text-lg font-bold">
            Bài viết của {post!.author.name || post!.author.username}
          </h1>
        </div>
        <div
          className="relative flex min-h-0 flex-1 flex-col"
          style={{ minHeight: 'calc(100vh - 140px)' }}
        >
          <PostDetailView post={post!} highlightCommentId={highlightCommentId} />
        </div>
      </div>
    </div>
  );
}
