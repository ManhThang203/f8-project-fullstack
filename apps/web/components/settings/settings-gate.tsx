'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useInitialUser } from '@/components/shared/providers/current-user-context';
import { authClient } from '@/lib/auth';

type Props = {
  children: ReactNode;
};

/**
 * Chỉ cho phép user đã đăng nhập vào trang cài đặt.
 * Dùng chung tín hiệu auth với useRequireAuth (session client + initialUser từ SSR)
 * để tránh redirect nhầm khi session chưa hydrate xong.
 */
export function SettingsGate({ children }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const initialUser = useInitialUser();
  const isAuthed = Boolean(session?.user ?? initialUser);

  useEffect(() => {
    if (isPending) return;
    if (!isAuthed) {
      router.replace(`/login?next=${encodeURIComponent('/settings/account')}`);
    }
  }, [isPending, isAuthed, router]);

  if (isAuthed) return <>{children}</>;

  if (isPending) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm" role="status">
        Đang tải…
      </p>
    );
  }

  return null;
}
