import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/components/shared/i18n-provider';
import { QueryProvider } from '@/components/shared/query-provider';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { AppToaster } from '@/components/shared/app-toaster';
import { isAppLanguage, LANGUAGE_COOKIE_KEY, type AppLanguage } from '@/lib/i18n/language';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Costy Admin', template: '%s | Costy Admin' },
  description: 'Admin dashboard for Costy',
  icons: {
    icon: '/icon/Logo-app-2.webp',
  },
};

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.classList.add(theme);
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const initialLanguage: AppLanguage = isAppLanguage(raw) ? raw : 'vi';

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <QueryProvider>
          <I18nProvider initialLanguage={initialLanguage}>
            <ThemeProvider>
              {children}
              <AppToaster />
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
