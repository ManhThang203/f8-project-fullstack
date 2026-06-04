import type { ReactNode } from 'react';

import { AdminLayoutClient } from '@/components/admin/admin-layout-client';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
