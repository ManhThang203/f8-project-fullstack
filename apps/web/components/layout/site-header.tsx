'use client';

import { Bell, Clapperboard, Home, Menu, MessageCircle, Search, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

import { Avatar } from '@/components/shared/avatar';
import { CotsyLogo } from '@costy/ui';
import { iconButtonClass } from '@/components/shared/icon-button';
import { NotificationBadge } from '@/components/shared/notification-badge';
import { NotificationDropdown } from './notification-dropdown';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';
import { resetChatSocket } from '@/lib/chat-socket';
import { cn } from '@/lib/utils';

const showGoogleAuth = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

type Props = {
  /** Session đọc trên server từ cookie + Express (đồng bộ với middleware). */
  initialUser: ServerAuthUser | null;
};

function normalizeUser(
  u: { id: string; username?: string | null; name?: string | null } | null | undefined,
) {
  if (!u) return null;
  return {
    id: u.id,
    username: (u as { username?: string | null }).username ?? '',
    name: u.name ?? null,
  };
}

function NavTab({
  href,
  label,
  isActive,
  children,
}: {
  href: string;
  label: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      title={label}
      className={cn(
        'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {isActive ? (
        <span
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
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
  const sharedClass = cn(
    'relative',
    iconButtonClass({ shape: 'circle' }),
  );

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

export function SiteHeader({ initialUser }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, refetch } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  /** Ngay sau signOut: hiện nav khách, không chờ RSC / nano store bắt kịp. */
  const [forceGuestNav, setForceGuestNav] = useState(false);
  const chatUnreadTotal = 0; // TODO: fetch unread from query

  useEffect(() => {
    void refetch();
  }, [pathname, refetch]);

  useEffect(() => {
    if (!forceGuestNav) return;
    if (!session?.user && initialUser === null) {
      setForceGuestNav(false);
    }
  }, [forceGuestNav, session?.user, initialUser]);

  const me = useMemo(() => {
    if (forceGuestNav) return null;
    const fromClient = normalizeUser(session?.user);
    const fromServer = normalizeUser(initialUser);
    return fromClient ?? fromServer ?? null;
  }, [forceGuestNav, session?.user, initialUser]);

  const avatarLabel = me?.username || me?.name || (me ? me.id.slice(0, 8) : '');

  async function onLogout() {
    setLogoutError(null);
    setLoggingOut(true);
    setForceGuestNav(true);
    try {
      const result = (await authClient.signOut()) as
        | { error?: { message?: string } | null }
        | undefined;
      const err = result && typeof result === 'object' && 'error' in result ? result.error : null;
      if (err) {
        setForceGuestNav(false);
        setLogoutError(
          typeof err === 'object' && err !== null && typeof err.message === 'string'
            ? err.message
            : 'Đăng xuất thất bại. Thử lại.',
        );
        return;
      }
      resetChatSocket();
      await refetch();
      router.refresh();
    } catch {
      setForceGuestNav(false);
      setLogoutError('Đăng xuất thất bại. Thử lại.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        {/* Trái: logo + tìm kiếm */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            aria-label="Cotsy — Trang chủ"
            className="flex shrink-0 min-h-11 items-center gap-2 rounded-lg px-1 text-base font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CotsyLogo className="h-8 w-8" priority />
            Cotsy
          </Link>
          <div className="relative min-h-10 min-w-0 flex-1 max-w-xs">
            <label htmlFor="site-header-search" className="sr-only">
              Tìm kiếm
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="site-header-search"
              type="search"
              placeholder="Tìm kiếm…"
              autoComplete="off"
              className="h-10 w-full rounded-full border border-border bg-muted/60 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-[box-shadow,background-color] hover:bg-muted focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Giữa: Home / Reels / Friends */}
        <nav
          aria-label="Trang chính"
          className="flex shrink-0 items-center justify-center gap-1 sm:gap-2"
        >
          <NavTab href="/" label="Trang chủ" isActive={pathname === '/'}>
            <Home className="h-6 w-6" strokeWidth={pathname === '/' ? 2.25 : 2} aria-hidden />
          </NavTab>
          <NavTab href="/reels" label="Reels" isActive={pathname.startsWith('/reel')}>
            <Clapperboard
              className="h-6 w-6"
              strokeWidth={pathname.startsWith('/reel') ? 2.25 : 2}
              aria-hidden
            />
          </NavTab>
          <NavTab href="/friends" label="Bạn bè" isActive={pathname.startsWith('/friends')}>
            <UsersRound
              className="h-6 w-6"
              strokeWidth={pathname.startsWith('/friends') ? 2.25 : 2}
              aria-hidden
            />
          </NavTab>
        </nav>

        {/* Phải: menu / thông báo / tin nhắn / avatar hoặc đăng nhập */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          {me ? (
            <>
              <details className="relative">
                <summary
                  className={cn(
                    'cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden',
                    iconButtonClass({ shape: 'circle' }),
                  )}
                  aria-label="Menu lối tắt"
                >
                  <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
                </summary>
                <div
                  className="absolute right-0 top-full z-[60] mt-2 w-52 rounded-xl border border-border bg-card py-2 text-sm shadow-md"
                  role="menu"
                >
                  <Link
                    href="/"
                    className="block px-4 py-3 text-card-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    role="menuitem"
                  >
                    Trang chủ
                  </Link>
                  <p className="px-4 py-2 text-xs text-muted-foreground" role="presentation">
                    Cài đặt — sắp có
                  </p>
                </div>
              </details>

              <NotificationDropdown />

              {pathname === '/' ? (
                <ChatTrigger unreadCount={chatUnreadTotal} chatDock={null} />
              ) : null}

              <details className="relative">
                <summary
                  className={cn(
                    'cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden',
                    iconButtonClass({ shape: 'circle' }),
                  )}
                  aria-label={`Tài khoản: ${avatarLabel}`}
                >
                  <Avatar as="span" size="md" name={me.name} username={me.username} />
                </summary>
                <div
                  className="absolute right-0 top-full z-[60] mt-2 w-56 rounded-xl border border-border bg-card py-2 text-sm shadow-md"
                  role="menu"
                >
                  <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                    @{me.username || me.name || me.id.slice(0, 8)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    disabled={loggingOut}
                    className="w-full px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-40"
                    role="menuitem"
                  >
                    {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
                  </button>
                </div>
              </details>
            </>
          ) : (
            <nav aria-label="Tài khoản" className="flex flex-wrap items-center justify-end gap-2">
              {showGoogleAuth ? (
                <GoogleSignInButton
                  callbackURL="/"
                  label="Đăng nhập Google"
                  className="min-h-11 w-auto shrink-0 px-3 sm:px-4"
                  onError={(msg) => setLogoutError(msg)}
                />
              ) : null}
              <Link
                href="/login"
                className="flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Đăng ký
              </Link>
            </nav>
          )}
        </div>
      </div>
      {logoutError ? (
        <p
          className="border-t border-border bg-background px-4 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {logoutError}
        </p>
      ) : null}
    </header>
  );
}
