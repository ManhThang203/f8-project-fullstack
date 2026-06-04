'use client';

import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n, initI18n, LANGUAGE_STORAGE_KEY } from '@/lib/i18n/config';

initI18n();

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') {
      void i18n.changeLanguage(stored);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
