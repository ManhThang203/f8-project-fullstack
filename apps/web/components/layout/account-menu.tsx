'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Avatar, iconButtonClass } from '@/components/shared/ui';
import { cn } from '@/lib/utils';

type Me = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

type Props = {
  me: Me;
  loggingOut: boolean;
  onLogout: () => void;
};

/** Menu tài khoản header — đóng khi bấm ra ngoài hoặc chọn mục. */
export function AccountMenu({ me, loggingOut, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarLabel = me.username || me.name || me.id.slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={`Tài khoản: ${avatarLabel}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(iconButtonClass({ shape: 'circle' }))}
      >
        <Avatar as="span" src={me.image} size="md" name={me.name} username={me.username} />
      </button>

      {open ? (
        <div
          className="border-border bg-card absolute right-0 top-full z-60 mt-2 w-56 rounded-xl border py-2 text-sm shadow-md"
          role="menu"
        >
          <p className="border-border text-muted-foreground border-b px-4 py-3 text-xs">
            @{me.username || me.name || me.id.slice(0, 8)}
          </p>
          {me.username ? (
            <Link
              href={`/${me.username}`}
              onClick={close}
              className="text-card-foreground hover:bg-muted focus-visible:bg-muted block px-4 py-3 transition-colors focus-visible:outline-hidden"
              role="menuitem"
            >
              Trang cá nhân
            </Link>
          ) : null}
          <Link
            href="/saved"
            onClick={close}
            className="text-card-foreground hover:bg-muted focus-visible:bg-muted block px-4 py-3 transition-colors focus-visible:outline-hidden"
            role="menuitem"
          >
            Bài viết đã lưu
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              onLogout();
            }}
            disabled={loggingOut}
            className="text-foreground hover:bg-muted focus-visible:bg-muted w-full px-4 py-3 text-left font-medium transition-colors focus-visible:outline-hidden disabled:opacity-40"
            role="menuitem"
          >
            {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
