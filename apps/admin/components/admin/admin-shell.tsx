'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { Sidebar, SidebarMobile } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { useBodyScrollLock, useSidebarCollapsed } from '@/hooks/use-sidebar-state';
import { authClient } from '@/lib/auth-client';

type Props = {
  children: ReactNode;
  role?: string;
  permissions: string[];
};

export function AdminShell({ children, role, permissions }: Props) {
  const router = useRouter();
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  useBodyScrollLock(mobileOpen);

  const handleLogout = useCallback(async () => {
    await authClient.signOut();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        permissions={permissions}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onLogout={handleLogout}
      />
      <SidebarMobile
        permissions={permissions}
        collapsed={false}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <Topbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          role={role}
          permissions={permissions}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
