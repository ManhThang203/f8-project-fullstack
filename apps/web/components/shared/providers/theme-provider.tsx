'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Bọc next-themes: dark-first, lưu preference localStorage. */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
