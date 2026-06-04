import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@/lib/i18n/locales/en';
import { vi } from '@/lib/i18n/locales/vi';

export const LANGUAGE_STORAGE_KEY = 'admin-language';

/** Khởi tạo i18next với resource bundle VI/EN. */
export function initI18n() {
  if (i18n.isInitialized) return i18n;

  void i18n.use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  return i18n;
}

export { i18n };
