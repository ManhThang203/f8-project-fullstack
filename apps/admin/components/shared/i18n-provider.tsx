'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import {
  createI18nInstance,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  setLanguageCookie,
  type AppLanguage,
} from '@/lib/i18n/config';
import { hasLanguageCookie } from '@/lib/i18n/language';

type Props = {
  children: ReactNode;
  initialLanguage: AppLanguage;
};

export function I18nProvider({ children, initialLanguage }: Props) {
  // Instance riêng theo cookie SSR — không mutate singleton chung giữa các request.
  const [instance] = useState(() => createI18nInstance(initialLanguage));

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    // Migrate 1 lần: chưa có cookie nhưng localStorage đã có preference.
    if (!hasLanguageCookie() && isAppLanguage(stored) && stored !== initialLanguage) {
      setLanguageCookie(stored);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, stored);
      void instance.changeLanguage(stored);
      document.documentElement.lang = stored;
      return;
    }

    // Cookie là source of truth; localStorage chỉ mirror.
    localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
  }, [initialLanguage, instance]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
