'use client';

import { CotsyLogo } from '@costy/ui';
import { Clapperboard, Home, MessageCircle, Search, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

import { AccountMenu } from './account-menu';
import { NotificationDropdown } from './notification-dropdown';

import { iconButtonClass, NotificationBadge } from '@/components/shared/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { handleHomeNavClick } from '@/lib/events';
import { cn } from '@/lib/utils';

type AccountUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

type Props = {
  className?: string;
  pathname: string;
  me: AccountUser | null;
  accountUser: AccountUser | null;
  loggingOut: boolean;
  chatUnreadTotal: number;
  onLogout: () => void;
};

function NavTab({
  href,
  label,
  isActive,
  onClick,
  requiresAuth,
  onAuthRequired,
  children,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  requiresAuth?: boolean;
  onAuthRequired?: (href: string) => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (requiresAuth && onAuthRequired) {
          e.preventDefault();
          onAuthRequired(href);
          return;
        }
        onClick?.(e);
      }}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      title={label}
      className={cn(
        'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {isActive ? (
        <span
          className="bg-primary absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
          aria-hidden
        />
      ) : null}
      {children}
    </Link>
  );
}

/** Nút/Link tin nhắn — dùng button khi có ChatDock, dùng Link khi không. */
function ChatTrigger({
  unreadCount,
  chatDock,
}: {
  unreadCount: number;
  chatDock: { toggleHub: () => void } | null;
}) {
  const label = unreadCount > 0 ? `Tin nhắn, ${unreadCount} chưa đọc` : 'Tin nhắn';
  const sharedClass = cn('relative', iconButtonClass({ shape: 'circle' }));

  if (chatDock) {
    return (
      <button
        type="button"
        onClick={() => chatDock.toggleHub()}
        aria-label={label}
        title="Tin nhắn"
        className={sharedClass}
      >
        <MessageCircle className="h-6 w-6" strokeWidth={2} aria-hidden />
        <NotificationBadge count={unreadCount} />
      </button>
    );
  }

  return (
    <Link href="/messages" aria-label={label} title="Tin nhắn" className={sharedClass}>
      <MessageCircle className="h-6 w-6" strokeWidth={2} aria-hidden />
      <NotificationBadge count={unreadCount} />
    </Link>
  );
}

/** Header desktop ≥1024px — logo, search, nav giữa, actions phải. */
export function SiteHeaderDesktop({
  className,
  pathname,
  me,
  accountUser,
  loggingOut,
  chatUnreadTotal,
  onLogout,
}: Props) {
  const router = useRouter();
  const { requireAuth } = useRequireAuth();

  /** Chặn điều hướng protected khi khách — hiện toast đăng nhập thay vì redirect middleware. */
  function handleProtectedNav(href: string) {
    requireAuth({ next: href });
  }

  return (
    <div
      className={cn(
        'mx-auto h-14 max-w-(--breakpoint-2xl) items-center gap-4 px-4',
        className,
      )}
    >
      {/* Trái: logo + tìm kiếm */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/"
          onClick={(e) => handleHomeNavClick(pathname, e)}
          aria-label="Cotsy — Trang chủ"
          className="text-foreground hover:text-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-base font-semibold tracking-tight transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <CotsyLogo className="h-10 w-10" priority />
          Cotsy
        </Link>
        <form
          role="search"
          className="relative min-h-10 min-w-0 max-w-xs flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const value = new FormData(form).get('q')?.toString().trim() ?? '';
            if (value.length >= 2) {
              const searchPath = `/search?q=${encodeURIComponent(value)}`;
              if (!requireAuth({ next: searchPath })) return;
              router.push(searchPath);
              form.reset();
            }
          }}
        >
          <label htmlFor="site-header-search-desktop" className="sr-only">
            Tìm kiếm
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            id="site-header-search-desktop"
            name="q"
            type="search"
            placeholder="Tìm kiếm…"
            autoComplete="off"
            className="border-border bg-muted/60 text-foreground placeholder:text-muted-foreground hover:bg-muted focus-visible:bg-background focus-visible:ring-ring h-10 w-full rounded-full border py-2 pl-9 pr-3 text-sm transition-[box-shadow,background-color] focus-visible:outline-hidden focus-visible:ring-2"
          />
        </form>
      </div>

      {/* Giữa: Home / Reels / Friends */}
      <nav aria-label="Trang chính" className="flex shrink-0 items-center justify-center gap-4">
        <NavTab
          href="/"
          label="Trang chủ"
          isActive={pathname === '/'}
          onClick={(e) => handleHomeNavClick(pathname, e)}
        >
          <Home className="h-6 w-6" strokeWidth={pathname === '/' ? 2.25 : 2} aria-hidden />
        </NavTab>
        <NavTab
          href="/reels"
          label="Reels"
          isActive={pathname.startsWith('/reel')}
          requiresAuth={!me}
          onAuthRequired={handleProtectedNav}
        >
          <Clapperboard
            className="h-6 w-6"
            strokeWidth={pathname.startsWith('/reel') ? 2.25 : 2}
            aria-hidden
          />
        </NavTab>
        <NavTab
          href="/friends"
          label="Bạn bè"
          isActive={pathname.startsWith('/friends')}
          requiresAuth={!me}
          onAuthRequired={handleProtectedNav}
        >
          <UsersRound
            className="h-6 w-6"
            strokeWidth={pathname.startsWith('/friends') ? 2.25 : 2}
            aria-hidden
          />
        </NavTab>
      </nav>

      {/* Phải: thông báo / tin nhắn / avatar hoặc đăng nhập */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {me ? (
          <>
            <NotificationDropdown />

            {pathname === '/' ? (
              <ChatTrigger unreadCount={chatUnreadTotal} chatDock={null} />
            ) : null}

            {accountUser ? (
              <AccountMenu
                me={accountUser}
                loggingOut={loggingOut}
                onLogout={onLogout}
              />
            ) : null}
          </>
        ) : (
          <nav aria-label="Tài khoản" className="flex items-center justify-end gap-2">
            <Link
              href="/login"
              className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Đăng nhập
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
