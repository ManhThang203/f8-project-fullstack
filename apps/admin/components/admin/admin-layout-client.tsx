'use client';

import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { AdminShell } from '@/components/admin/admin-shell';
import { LoadingState } from '@/components/shared/loading-state';
import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type MeResponse = {
  permissions: string[];
  role: string;
};

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'nav.overview',
  '/users': 'nav.users',
  '/reports': 'nav.reports',
  '/hashtags': 'nav.hashtags',
  '/moderators': 'nav.moderators',
  '/audit': 'nav.audit',
};

function getPageTitleKey(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLE_MAP[pathname]) return ROUTE_TITLE_MAP[pathname]!;
  // Prefix match (e.g. /users/123)
  for (const [route, key] of Object.entries(ROUTE_TITLE_MAP)) {
    if (route !== '/' && pathname.startsWith(route)) return key;
  }
  return 'header.title';
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.me,
    queryFn: () => apiQuery<MeResponse>('/admin/me/permissions'),
    retry: false,
  });

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  // Update browser tab title on every route or language change
  useEffect(() => {
    const titleKey = getPageTitleKey(pathname);
    document.title = `${t(titleKey)} | Costy Admin`;
  }, [pathname, t]);

  if (isLoading) {
    return <LoadingState variant="page" />;
  }

  if (isError || !data) return null;

  return (
    <AdminShell role={data.data.role} permissions={data.data.permissions}>
      {children}
    </AdminShell>
  );
}

