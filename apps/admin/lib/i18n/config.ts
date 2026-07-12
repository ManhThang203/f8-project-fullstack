import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@/lib/i18n/locales/en';
import { vi } from '@/lib/i18n/locales/vi';
import type { AppLanguage } from '@/lib/i18n/language';

export type { AppLanguage } from '@/lib/i18n/language';
export {
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  setLanguageCookie,
} from '@/lib/i18n/language';

/** Đảm bảo i18n gốc đã load resources; không đổi language theo request. */
function ensureBaseI18n() {
  if (i18n.isInitialized) return;

  void i18n.use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    initImmediate: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    nsSeparator: false,
  });
}

/** Tạo instance riêng theo ngôn ngữ — tránh race singleton khi SSR đồng thời. */
export function createI18nInstance(lng: AppLanguage) {
  ensureBaseI18n();
  return i18n.cloneInstance({
    lng,
    initImmediate: false,
  });
}
