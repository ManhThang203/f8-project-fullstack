'use client';

import { useEffect, useState } from 'react';

import { subscribeAvatarUpdated } from '@/lib/events';

/**
 * Giữ URL avatar vừa upload cho đến khi session bắt kịp (cookieCache).
 * Trả override hiện tại; null khi session.image đã khớp hoặc chưa có event.
 */
export function useAvatarOverride(sessionImage: string | null | undefined): string | null {
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => subscribeAvatarUpdated(setOverride), []);

  useEffect(() => {
    if (!override) return;
    if (sessionImage === override) setOverride(null);
  }, [sessionImage, override]);

  return override;
}
