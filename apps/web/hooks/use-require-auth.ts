'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useInitialUser } from '@/components/shared/current-user-context';
import { authClient } from '@/lib/auth-client';
import * as authGuard from '@/lib/auth-guard';

const DEFAULT_MESSAGE = 'Vui lòng đăng nhập để sử dụng tính năng này.';

type RequireAuthOptions = {
  message?: string;
  /** Path sau khi đăng nhập; mặc định trang hiện tại. */
  next?: string;
};

/** Hiện toast yêu cầu đăng nhập kèm nút chuyển sang trang login. */
function showLoginPrompt(router: ReturnType<typeof useRouter>, message: string, nextPath: string) {
  const safeNext = authGuard.sanitizeReturnTo(nextPath);
  toast.error(message, {
    action: {
      label: 'Đăng nhập',
      onClick: () => {
        router.push(`/login?next=${encodeURIComponent(safeNext)}`);
      },
    },
  });
}

/** Hook kiểm tra session và hiện toast đăng nhập khi khách dùng tính năng cần auth. */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const initialUser = useInitialUser();
  const isAuthed = Boolean(session?.user ?? initialUser);

  /** Trả true nếu đã đăng nhập; nếu chưa thì toast + false. */
  const requireAuth = useCallback(
    (options?: RequireAuthOptions): boolean => {
      if (isAuthed) return true;
      const next = options?.next ?? pathname;
      showLoginPrompt(router, options?.message ?? DEFAULT_MESSAGE, next);
      return false;
    },
    [isAuthed, pathname, router],
  );

  return { isAuthed, requireAuth };
}
