'use client';

import type { NotificationDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Info,
  ShieldAlert,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

import {
  ReactionFace,
  type PostReactionId,
} from '@/components/home/post/reaction-face';
import { Avatar } from '@/components/shared/avatar';
import { iconButtonClass } from '@/components/shared/icon-button';
import { NotificationBadge } from '@/components/shared/notification-badge';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationReadMutation,
} from '@/hooks/queries/use-notifications';
import { getChatSocket } from '@/lib/chat-socket';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

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

function getSystemNotificationText(notif: NotificationDto): string | null {
  if (notif.type !== 'SYSTEM') return null;
  return null;
}

const REACTION_NOTIFICATION_TEXT: Record<PostReactionId, string> = {
  like: 'đã thích bài viết của bạn',
  love: 'đã yêu thích bài viết của bạn',
  care: 'đã thương thương bài viết của bạn',
  haha: 'đã haha bài viết của bạn',
  wow: 'đã wow bài viết của bạn',
  sad: 'đã buồn về bài viết của bạn',
  angry: 'đã phẫn nộ bài viết của bạn',
};

function isPostReactionId(value: string | null | undefined): value is PostReactionId {
  return (
    value === 'like' ||
    value === 'love' ||
    value === 'care' ||
    value === 'haha' ||
    value === 'wow' ||
    value === 'sad' ||
    value === 'angry'
  );
}

function NotificationItem({ notif, onClose }: { notif: NotificationDto; onClose: () => void }) {
  const { mutate: markRead } = useMarkNotificationReadMutation();
  const systemText = getSystemNotificationText(notif);

  const iconMap: Record<string, ReactNode> = {
    POST_LIKED: <Heart className="h-4 w-4 fill-current text-red-500" />,
    POST_REPLIED: <MessageCircle className="h-4 w-4 text-blue-500" />,
    POST_COMMENTED_FOLLOWED: <MessageCircle className="h-4 w-4 text-blue-400" />,
    USER_FOLLOWED: <UserPlus className="h-4 w-4 text-green-500" />,
    FRIEND_REQUEST: <UserPlus className="h-4 w-4 text-blue-500" />,
    FRIEND_ACCEPTED: <CheckCircle className="h-4 w-4 text-green-500" />,
    MESSAGE_RECEIVED: <MessageCircle className="h-4 w-4 text-blue-500" />,
    MENTION: <Info className="h-4 w-4 text-yellow-500" />,
    SYSTEM: <Info className="h-4 w-4 text-gray-500" />,
    MODERATION_ACTION: <ShieldAlert className="h-4 w-4 text-orange-500" />,
    APPEAL_APPROVED: <CheckCircle className="h-4 w-4 text-green-500" />,
    APPEAL_REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
    REPORT_RESOLVED: <Info className="h-4 w-4 text-blue-500" />,
  };

  const textMap: Record<string, string> = {
    POST_LIKED: 'đã thích bài viết của bạn',
    POST_REPLIED: 'đã trả lời bài viết của bạn',
    POST_COMMENTED_FOLLOWED: 'đã bình luận một bài viết mà bạn đang theo dõi',
    USER_FOLLOWED: 'đã bắt đầu theo dõi bạn',
    FRIEND_REQUEST: 'đã gửi cho bạn lời mời kết bạn',
    FRIEND_ACCEPTED: 'đã chấp nhận lời mời kết bạn',
    MESSAGE_RECEIVED: 'đã gửi cho bạn một tin nhắn',
    MENTION: 'đã nhắc đến bạn',
    SYSTEM: 'thông báo hệ thống',
    MODERATION_ACTION: 'đã xử lý nội dung của bạn',
    APPEAL_APPROVED: 'kháng nghị của bạn đã được chấp nhận',
    APPEAL_REJECTED: 'kháng nghị của bạn đã bị từ chối',
    REPORT_RESOLVED: 'báo cáo của bạn đã được xử lý',
  };

  function getNotificationBodyText(): string {
    if (notif.type === 'POST_LIKED' && isPostReactionId(notif.reactionType)) {
      return REACTION_NOTIFICATION_TEXT[notif.reactionType];
    }
    return textMap[notif.type] ?? textMap['SYSTEM'] ?? 'thông báo hệ thống';
  }

  function getTypeBadgeIcon(): ReactNode {
    if (notif.type === 'POST_LIKED' && isPostReactionId(notif.reactionType)) {
      return <ReactionFace id={notif.reactionType} size="sm" className="h-4 w-4 min-h-4 min-w-4" />;
    }
    return iconMap[notif.type];
  }

  const isSystemNotification =
    notif.type === 'MODERATION_ACTION' ||
    notif.type === 'APPEAL_APPROVED' ||
    notif.type === 'APPEAL_REJECTED';

  const getHref = () => {
    if (
      (notif.type === 'MODERATION_ACTION' ||
        notif.type === 'APPEAL_APPROVED' ||
        notif.type === 'APPEAL_REJECTED') &&
      notif.entityId
    ) {
      return `/moderation/${notif.entityId}`;
    }
    if (notif.type === 'USER_FOLLOWED' && notif.actor) return `/${notif.actor.username}`;
    if (notif.type === 'FRIEND_REQUEST') return '/friends';
    if (notif.type === 'FRIEND_ACCEPTED' && notif.actor) return `/${notif.actor.username}`;
    if (notif.type === 'MESSAGE_RECEIVED') return '/messages';
    if (
      (notif.type === 'POST_LIKED' ||
        notif.type === 'POST_REPLIED' ||
        notif.type === 'POST_COMMENTED_FOLLOWED' ||
        notif.type === 'MENTION') &&
      notif.entityId
    ) {
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
        'hover:bg-muted flex items-start gap-3 p-3 transition-colors',
        !notif.readAt ? 'bg-primary/5' : '',
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          as="span"
          src={notif.actor?.image}
          name={notif.actor?.name || null}
          username={notif.actor?.username || ''}
          size="md"
        />
        <div className="bg-background absolute -bottom-1 -right-1 rounded-full p-0.5">
          {getTypeBadgeIcon()}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {systemText || isSystemNotification ? (
            <>
              <span className="text-foreground font-semibold">Hệ thống</span>{' '}
              <span className="text-muted-foreground">
                {systemText ?? textMap[notif.type] ?? textMap['SYSTEM']}
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground font-semibold">
                {notif.actor?.name || notif.actor?.username || 'Hệ thống'}
              </span>{' '}
              <span className="text-muted-foreground">{getNotificationBodyText()}</span>
            </>
          )}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{getRelativeTime(notif.createdAt)}</p>
      </div>
      {!notif.readAt && <div className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />}
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

    getChatSocket()
      .then((s) => {
        activeSocket = s;
        const onNew = () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
        };
        s.on('notification:new', onNew);
      })
      .catch((err) => console.error('Failed to connect socket for notifications', err));

    return () => {
      if (activeSocket) {
        activeSocket.off('notification:new');
      }
    };
  }, [queryClient]);

  const notifications = data?.pages.flatMap((p) => p.items) || [];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn('relative', iconButtonClass({ shape: 'circle' }))}
        aria-label="Thông báo"
      >
        <Bell className="h-6 w-6" strokeWidth={2} />
        <NotificationBadge count={unreadCount} />
      </button>

      {open && (
        <div className="border-border bg-card absolute right-0 top-full z-50 mt-2 flex max-h-[80vh] w-[360px] flex-col overflow-hidden rounded-xl border shadow-lg">
          <div className="border-border bg-card flex items-center justify-between border-b p-4">
            <h3 className="text-lg font-semibold">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markRead(undefined);
                  setOpen(false);
                }}
                className="text-primary text-sm hover:underline"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            {notifications.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center">
                <p>Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} notif={n} onClose={() => setOpen(false)} />
                ))}
                {hasNextPage && (
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-primary p-3 text-center text-sm hover:underline"
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
