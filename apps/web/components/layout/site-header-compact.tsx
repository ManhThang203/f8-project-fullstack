'use client';

import { CotsyLogo } from '@costy/ui';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AccountMenu } from './account-menu';
import { NotificationDropdown } from './notification-dropdown';

import { iconButtonClass } from '@/components/shared/ui';
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
  onLogout: () => void;
};

/** Header compact <1024px — logo giữa, search overlay, notif + avatar. */
export function SiteHeaderCompact({
  className,
  pathname,
  me,
  accountUser,
  loggingOut,
  onLogout,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMessagesRoute = pathname.startsWith('/messages');
  const roomId = searchParams.get('roomId');

  /** Trên /messages: quay lại danh sách hoặc về trang chủ. */
  function handleMessagesBack() {
    if (roomId) {
      router.push('/messages');
    } else {
      router.push('/');
    }
  }

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  /** Gửi từ khóa tìm kiếm sang trang /search nếu đủ 2 ký tự. */
  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
  }

  return (
    <div className={cn('relative mx-auto h-14 w-full max-w-screen-2xl px-3', className)}>
      {/* Hàng header mặc định — tìm kiếm trái, logo giữa, chuông + avatar phải */}
      <div
        className={cn(
          'grid h-full w-full grid-cols-3 items-center',
          searchOpen ? 'pointer-events-none invisible' : 'visible',
        )}
        aria-hidden={searchOpen}
      >
        {/* Trái: tìm kiếm hoặc quay lại (trên /messages) */}
        <div className="flex items-center justify-start">
          {me && isMessagesRoute ? (
            <button
              type="button"
              aria-label={roomId ? 'Quay lại danh sách hội thoại' : 'Quay lại trang chủ'}
              title={roomId ? 'Quay lại danh sách' : 'Trang chủ'}
              onClick={handleMessagesBack}
              className={iconButtonClass({ shape: 'circle' })}
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
            </button>
          ) : me ? (
            <button
              type="button"
              aria-label="Tìm kiếm"
              title="Tìm kiếm"
              onClick={() => setSearchOpen(true)}
              className={iconButtonClass({ shape: 'circle' })}
            >
              <Search className="h-6 w-6" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Giữa: logo căn giữa cột */}
        <div className="flex items-center justify-center">
          <Link
            href="/"
            onClick={(e) => handleHomeNavClick(pathname, e)}
            aria-label="Cotsy — Trang chủ"
            className="text-foreground hover:text-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center gap-2 rounded-lg px-1 text-base font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <CotsyLogo className="h-10 w-10" priority />
            <span className="hidden md:inline">Cotsy</span>
          </Link>
        </div>

        {/* Phải: thông báo + avatar hoặc đăng nhập */}
        <div className="flex items-center justify-end gap-0.5">
          {me ? (
            <>
              {!isMessagesRoute ? <NotificationDropdown /> : null}
              {accountUser ? (
                <AccountMenu
                  me={accountUser}
                  loggingOut={loggingOut}
                  onLogout={onLogout}
                />
              ) : null}
            </>
          ) : (
            <nav aria-label="Tài khoản" className="flex items-center justify-end gap-1.5">
              <Link
                href="/login"
                className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Đăng nhập
              </Link>
            </nav>
          )}
        </div>
      </div>

      {/* Overlay tìm kiếm full-width — không dùng trên /messages */}
      {!isMessagesRoute && searchOpen ? (
        <form
          role="search"
          className="bg-background/95 absolute inset-0 flex items-center gap-2 px-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const value = new FormData(form).get('q')?.toString() ?? '';
            form.reset();
            submitSearch(value);
          }}
        >
          <button
            type="button"
            aria-label="Đóng tìm kiếm"
            onClick={() => setSearchOpen(false)}
            className={iconButtonClass({ shape: 'circle' })}
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
          <label htmlFor="site-header-search-compact" className="sr-only">
            Tìm kiếm
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              ref={inputRef}
              id="site-header-search-compact"
              name="q"
              type="search"
              placeholder="Tìm kiếm…"
              autoComplete="off"
              className="border-border bg-muted/60 text-foreground placeholder:text-muted-foreground hover:bg-muted focus-visible:bg-background focus-visible:ring-ring h-10 w-full rounded-full border py-2 pl-9 pr-3 text-sm transition-[box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2"
            />
          </div>
        </form>
      ) : null}
    </div>
  );
}
