import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

/**
 * i18next bootstrap. Translation files live in `public/locales/<lng>/<ns>.json`
 * and are lazy-loaded on demand. Default language: vi, fallback: en.
 */
if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (lng: string, ns: string) => import(`../public/locales/${lng}/${ns}.json`),
      ),
    )
    .init({
      lng: 'vi',
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
    });
}

export default i18n;
