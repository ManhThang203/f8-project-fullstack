'use client';

import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { LoadingState } from '@/components/shared/loading-state';
import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type MeResponse = {
  permissions: string[];
  role: string;
};

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.me,
    queryFn: () => apiQuery<MeResponse>('/admin/me/permissions'),
    retry: false,
  });

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

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
