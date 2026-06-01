'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Info } from 'lucide-react';
import Link from 'next/link';

import { useNotifications, useUnreadNotificationCount, useMarkNotificationReadMutation } from '@/hooks/queries/use-notifications';
import { getChatSocket } from '@/lib/chat-socket';
import { Socket } from 'socket.io-client';
import { Avatar } from '@/components/shared/avatar';
import { NotificationBadge } from '@/components/shared/notification-badge';
import { iconButtonClass } from '@/components/shared/icon-button';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { NotificationDto } from '@costy/shared';

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
}

function NotificationItem({ notif, onClose }: { notif: NotificationDto; onClose: () => void }) {
  const { mutate: markRead } = useMarkNotificationReadMutation();
  
  const iconMap: Record<string, any> = {
    POST_LIKED: <Heart className="h-4 w-4 text-red-500 fill-current" />,
    POST_REPLIED: <MessageCircle className="h-4 w-4 text-blue-500" />,
    POST_COMMENTED_FOLLOWED: <MessageCircle className="h-4 w-4 text-blue-400" />,
    USER_FOLLOWED: <UserPlus className="h-4 w-4 text-green-500" />,
    MENTION: <Info className="h-4 w-4 text-yellow-500" />,
    SYSTEM: <Info className="h-4 w-4 text-gray-500" />
  };

  const textMap: Record<string, string> = {
    POST_LIKED: 'đã thích bài viết của bạn',
    POST_REPLIED: 'đã trả lời bài viết của bạn',
    POST_COMMENTED_FOLLOWED: 'đã bình luận một bài viết mà bạn đang theo dõi',
    USER_FOLLOWED: 'đã bắt đầu theo dõi bạn',
    MENTION: 'đã nhắc đến bạn',
    SYSTEM: 'thông báo hệ thống'
  };

  const getHref = () => {
    if (notif.type === 'USER_FOLLOWED' && notif.actor) return `/${notif.actor.username}`;
    // Fallback to / post route for likes and replies
    if ((notif.type === 'POST_LIKED' || notif.type === 'POST_REPLIED' || notif.type === 'POST_COMMENTED_FOLLOWED') && notif.entityId) {
      return `/${notif.actor?.username || 'post'}/post/${notif.entityId}`;
    }
    return '#';
  };

  return (
    <Link 
      href={getHref()}
      onClick={() => {
        if (!notif.readAt) markRead(notif.id);
        onClose();
      }}
      className={cn(
        "flex items-start gap-3 p-3 transition-colors hover:bg-muted",
        !notif.readAt ? "bg-primary/5" : ""
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={notif.actor?.name || null} username={notif.actor?.username || ''} size="md" />
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
          {iconMap[notif.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-foreground">{notif.actor?.name || notif.actor?.username || 'Hệ thống'}</span>
          {' '}
          <span className="text-muted-foreground">{textMap[notif.type] || textMap['SYSTEM']}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {getRelativeTime(notif.createdAt)}
        </p>
      </div>
      {!notif.readAt && <div className="h-2 w-2 shrink-0 rounded-full bg-primary mt-2" />}
    </Link>
  );
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadNotificationCount();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const { mutate: markRead } = useMarkNotificationReadMutation();
  const queryClient = useQueryClient();
  const unreadCount = countData?.count || 0;
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Realtime updates
  useEffect(() => {
    let activeSocket: Socket | null = null;
    
    getChatSocket().then((s) => {
      activeSocket = s;
      const onNew = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      };
      s.on('notification:new', onNew);
    }).catch(err => console.error("Failed to connect socket for notifications", err));
    
    return () => {
      if (activeSocket) {
        activeSocket.off('notification:new');
      }
    };
  }, [queryClient]);

  const notifications = data?.pages.flatMap(p => p.items) || [];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn("relative", iconButtonClass({ shape: 'circle' }))}
        aria-label="Thông báo"
      >
        <Bell className="h-6 w-6" strokeWidth={2} />
        <NotificationBadge count={unreadCount} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <h3 className="font-semibold text-lg">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                type="button"
                onClick={() => { markRead(); setOpen(false); }}
                className="text-sm text-primary hover:underline"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-0">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(n => (
                  <NotificationItem key={n.id} notif={n} onClose={() => setOpen(false)} />
                ))}
                {hasNextPage && (
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="p-3 text-sm text-primary hover:underline text-center"
                  >
                    {isFetchingNextPage ? 'Đang tải...' : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
