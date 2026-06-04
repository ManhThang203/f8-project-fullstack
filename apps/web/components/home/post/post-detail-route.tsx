'use client';

import { useQuery } from '@tanstack/react-query';
import { apiQuery } from '@/lib/api-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { PostFeedItemDto } from '@costy/shared';
import { PostDetailView } from './post-detail-view';

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
    }
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
    <div className="flex justify-center min-h-[calc(100vh-64px)] bg-muted/20">
      <div className="w-full max-w-[600px] bg-background border-x border-border shadow-sm flex flex-col">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center shrink-0">
          <h1 className="font-bold text-lg">Bài viết của {post!.author.name || post!.author.username}</h1>
        </div>
        <div className="flex-1 relative min-h-0 flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <PostDetailView 
            post={post!} 
            highlightCommentId={highlightCommentId}
          />
        </div>
      </div>
    </div>
  );
}
