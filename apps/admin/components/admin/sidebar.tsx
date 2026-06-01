'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flag,
  Hash,
  LogOut,
  ScrollText,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PermissionGate } from '@/components/admin/permission-gate';
import { Button } from '@/components/shared/button';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  labelKey: 'overview' | 'users' | 'reports' | 'hashtags' | 'moderators' | 'audit';
  icon: typeof BarChart3;
  permission: string;
};

const NAV: NavItem[] = [
  { href: '/', labelKey: 'overview', icon: BarChart3, permission: 'stats:view' },
  { href: '/users', labelKey: 'users', icon: Users, permission: 'user:read' },
  { href: '/reports', labelKey: 'reports', icon: Flag, permission: 'report:read' },
  { href: '/hashtags', labelKey: 'hashtags', icon: Hash, permission: 'hashtag:read' },
  { href: '/moderators', labelKey: 'moderators', icon: Shield, permission: 'moderator:manage' },
  { href: '/audit', labelKey: 'audit', icon: ScrollText, permission: 'audit:read' },
];

type Props = {
  permissions: string[];
  collapsed: boolean;
  mobile?: boolean;
  mobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  onLogout: () => void;
};

function SidebarPanel({
  permissions,
  collapsed,
  mobile,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}: Omit<Props, 'mobileOpen'>) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          'flex h-14 shrink-0 flex-nowrap items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3',
        )}
      >
        {!collapsed ? (
          <p className="min-w-0 truncate px-1 text-lg font-semibold">{t('header.appName')}</p>
        ) : null}
        {mobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('common.closeMenu')}
          >
            <X className="size-5" aria-hidden />
          </button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              collapsed ? 'size-10' : 'min-h-11 min-w-11',
            )}
            aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
          >
            {collapsed ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV.map((item) => (
          <PermissionGate key={item.href} permission={item.permission} permissions={permissions}>
            <Link
              href={item.href}
              onClick={onCloseMobile}
              title={t(`nav.${item.labelKey}`)}
              aria-label={t(`nav.${item.labelKey}`)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm no-underline transition-colors',
                collapsed && 'justify-center px-0',
                pathname === item.href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {!collapsed ? <span className="truncate">{t(`nav.${item.labelKey}`)}</span> : null}
            </Link>
          </PermissionGate>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className={cn('w-full justify-start gap-2', collapsed && 'justify-center px-0')}
          onClick={onLogout}
          aria-label={t('common.logout')}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {!collapsed ? t('common.logout') : null}
        </Button>
      </div>
    </>
  );
}

export function Sidebar(props: Props) {
  const { mobile, mobileOpen, onCloseMobile } = props;

  if (mobile) {
    if (!mobileOpen) return null;

    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-label={props.onCloseMobile ? undefined : 'Close'}
        />
        <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card shadow-lg md:hidden">
          <SidebarPanel {...props} mobile onCloseMobile={onCloseMobile} />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex h-full',
        props.collapsed ? 'w-16' : 'w-60',
      )}
    >
      <SidebarPanel {...props} />
    </aside>
  );
}

export function SidebarMobile(props: Props) {
  return <Sidebar {...props} mobile mobileOpen={props.mobileOpen} />;
}

export type { NavItem };
