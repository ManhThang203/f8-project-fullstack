'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,          // Tăng thời gian dữ liệu được coi là fresh lên 5 phút
            refetchOnWindowFocus: false,       // Tắt tính năng tự động gọi lại API khi chuyển/focus tab
            retry: 1
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
