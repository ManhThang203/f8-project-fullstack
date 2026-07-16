'use client';

import { Clapperboard, Home, MessageCircle, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { useCurrentUser } from '@/components/shared/providers/current-user-context';
import { NotificationBadge } from '@/components/shared/ui';
import { useChatUnreadTotal } from '@/hooks/queries/chat';
import { handleHomeNavClick } from '@/lib/events';
import { cn } from '@/lib/utils';

function BottomNavItem({
  href,
  label,
  isActive,
  onClick,
  children,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {children}
      <span className="leading-none">{label}</span>
    </Link>
  );
}

/** Thanh điều hướng cố định dưới màn hình cho mobile/tablet (<1024px). */
export function BottomNav() {
  const pathname = usePathname();
  const { user: me } = useCurrentUser();
  const chatUnreadTotal = useChatUnreadTotal(Boolean(me));

  if (!me) return null;
  if (pathname.startsWith('/messages')) return null;

  return (
    <nav
      aria-label="Điều hướng chính"
      className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xs lg:hidden"
    >
      <div className="mx-auto flex h-14 max-w-(--breakpoint-2xl) items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        <BottomNavItem
          href="/"
          label="Trang chủ"
          isActive={pathname === '/'}
          onClick={(e) => handleHomeNavClick(pathname, e)}
        >
          <Home className="h-6 w-6" strokeWidth={pathname === '/' ? 2.25 : 2} aria-hidden />
        </BottomNavItem>
        <BottomNavItem href="/reels" label="Reels" isActive={pathname.startsWith('/reel')}>
          <Clapperboard
            className="h-6 w-6"
            strokeWidth={pathname.startsWith('/reel') ? 2.25 : 2}
            aria-hidden
          />
        </BottomNavItem>
        <BottomNavItem href="/messages" label="Tin nhắn" isActive={pathname.startsWith('/messages')}>
          <span className="relative">
            <MessageCircle
              className="h-6 w-6"
              strokeWidth={pathname.startsWith('/messages') ? 2.25 : 2}
              aria-hidden
            />
            <NotificationBadge count={chatUnreadTotal} />
          </span>
        </BottomNavItem>
        <BottomNavItem href="/friends" label="Bạn bè" isActive={pathname.startsWith('/friends')}>
          <UsersRound
            className="h-6 w-6"
            strokeWidth={pathname.startsWith('/friends') ? 2.25 : 2}
            aria-hidden
          />
        </BottomNavItem>
      </div>
    </nav>
  );
}
