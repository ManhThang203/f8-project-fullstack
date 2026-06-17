'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type SavePostVars = {
  postId: string;
  save: boolean;
};

type SavePostResult = {
  savedByMe: boolean;
};

type SharePostResult = {
  shareCount: number;
};

/** Toggle trạng thái lưu bài viết và refresh các cache chứa post. */
export function useToggleSavePost() {
  const queryClient = useQueryClient();

  return useMutation<SavePostResult, Error, SavePostVars>({
    mutationFn: ({ postId, save }) =>
      apiQueryData<SavePostResult>(`/posts/${encodeURIComponent(postId)}/save`, {
        method: save ? 'POST' : 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'reels'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'saved'] });
    },
  });
}

/** Ghi nhận lượt chia sẻ bài viết và trả về tổng shareCount mới nhất. */
export function useSharePost() {
  const queryClient = useQueryClient();

  return useMutation<SharePostResult, Error, string>({
    mutationFn: (postId) =>
      apiQueryData<SharePostResult>(`/posts/${encodeURIComponent(postId)}/share`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'reels'] });
    },
  });
}
