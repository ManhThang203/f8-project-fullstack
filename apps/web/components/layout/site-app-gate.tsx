'use client';

import { CostySplash } from '@costy/ui';
import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const MIN_SPLASH_MS = 1400;
const MOUNT_GRACE_MS = 150;

/** Trang chào mừng toàn màn hình (giống như trang quản trị) cho đến khi các truy vấn ban đầu hoàn tất (tương tự như trang quản trị). */
export function SiteAppGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const isFetching = useIsFetching();
  const mountedAt = useRef(Date.now());
  const hadFetching = useRef(false);
  const mountGraceDone = useRef(false);

  useEffect(() => {
    if (isFetching > 0) hadFetching.current = true;
  }, [isFetching]);

  useEffect(() => {
    const t = setTimeout(() => {
      mountGraceDone.current = true;
    }, MOUNT_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) return;

    const id = setInterval(() => {
      if (!mountGraceDone.current) return;

      const elapsed = Date.now() - mountedAt.current;
      const minDone = elapsed >= MIN_SPLASH_MS;
      const dataReady = hadFetching.current ? isFetching === 0 : true;
      // Nếu đã đạt được thời gian tối thiểu và các truy vấn ban đầu đã hoàn tất, thì đặt ready thành true.
      // Để hiển thị nội dung trang web.
      if (minDone && dataReady) setReady(true);
    }, 50);

    return () => clearInterval(id);
  }, [ready, isFetching]);

  if (!ready) return <CostySplash />;

  return <>{children}</>;
}
