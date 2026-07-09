'use client';

import { Bell, Lock, Moon, Shield, User, UserX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/settings/account', label: 'Tài khoản', icon: User },
  { href: '/settings/security', label: 'Bảo mật', icon: Lock },
  { href: '/settings/privacy', label: 'Quyền riêng tư', icon: Shield },
  { href: '/settings/appearance', label: 'Giao diện', icon: Moon },
  { href: '/settings/notifications', label: 'Thông báo', icon: Bell },
  { href: '/settings/blocked', label: 'Đã chặn', icon: UserX },
] as const;

/** Sidebar điều hướng các mục cài đặt. */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Cài đặt" className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
