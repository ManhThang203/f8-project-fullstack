'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Cùng markup cho SSR và lần hydrate đầu — tránh #418. */
  fallback: ReactNode;
};

/**
 * Chỉ render `children` sau khi đã mount trên client.
 * Dùng cho subtree dùng store/sync bên thứ 3 (vd. better-auth `useSession`) không an toàn khi SSR.
 */
export function ClientOnly({ children, fallback }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
