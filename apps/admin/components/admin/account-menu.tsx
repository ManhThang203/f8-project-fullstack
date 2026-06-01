'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Props = {
  role?: string;
  permissions: string[];
  onLogout: () => void;
};

/** Lấy chữ cái đầu viết hoa làm avatar fallback. */
function getInitial(name?: string | null, username?: string | null) {
  const source = name ?? username ?? '?';
  return source.slice(0, 1).toUpperCase();
}

export function AccountMenu({ role, permissions, onLogout }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const username = user?.username ?? 'admin';
  const initial = getInitial(user?.name, user?.username);
  const hasAllPermissions = permissions.includes('*');

  /** Đăng xuất và đóng dropdown. */
  function handleLogout() {
    setOpen(false);
    onLogout();
  }

  /** Đóng dropdown khi click ra ngoài hoặc nhấn Esc. */
  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account.openMenu')}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          <p className="border-b border-border px-3 py-2 text-sm text-muted-foreground">
            @{username}
          </p>

          <div className="space-y-2 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t('account.role')}</span>
              {role ? (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
                  {role}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('account.permissions')}</p>
              {hasAllPermissions ? (
                <p className="text-xs font-medium text-foreground">{t('account.allPermissions')}</p>
              ) : permissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('account.noPermissions')}</p>
              ) : (
                <ul className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                  {permissions.map((permission) => (
                    <li
                      key={permission}
                      className={cn(
                        'rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground',
                      )}
                    >
                      {permission}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            className="mt-1 w-full justify-start gap-2 px-3 font-semibold"
            onClick={handleLogout}
            role="menuitem"
          >
            <LogOut className="size-4" aria-hidden />
            {t('common.logout')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
