'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { AccountMenu } from '@/components/admin/account-menu';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';

type Props = {
  onOpenMobileMenu: () => void;
  role?: string;
  permissions: string[];
  onLogout: () => void;
};

const PAGE_KEYS: Record<string, string> = {
  '/': 'nav.overview',
  '/users': 'nav.users',
  '/reports': 'nav.reports',
  '/hashtags': 'nav.hashtags',
  '/moderators': 'nav.moderators',
  '/audit': 'nav.audit',
};

export function Topbar({ onOpenMobileMenu, role, permissions, onLogout }: Props) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const pageKey = PAGE_KEYS[pathname] ?? 'header.title';

  return (
    <header className="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors md:hidden"
          aria-label={t('common.openMenu')}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <h1 className="text-muted-foreground truncate text-sm font-medium">{t(pageKey)}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <AccountMenu role={role} permissions={permissions} onLogout={onLogout} />
      </div>
    </header>
  );
}
