import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiQueryData, apiQuery } from '@/lib/api-query';
import { NotificationDto } from '@costy/shared';
import { queryKeys } from '@/lib/query-keys';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '20' });
      if (pageParam) qs.set('cursor', pageParam);
      const data = await apiQueryData<NotificationDto[]>(`/notifications?${qs.toString()}`);
      return {
        items: data,
        nextCursor: data.length === 20 ? data[19]?.id : undefined,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const data = await apiQueryData<{ count: number }>('/notifications/unread-count');
      return data;
    },
    refetchInterval: 1000 * 60, // Refetch every 1 min as a fallback
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId?: string) => {
      await apiQuery('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notificationId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
