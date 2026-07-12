'use client';

import { useTranslation } from 'react-i18next';

import { LANGUAGE_STORAGE_KEY, setLanguageCookie, type AppLanguage } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export function LanguageSwitcher({ className }: Props) {
  const { i18n, t } = useTranslation();
  const current: AppLanguage = i18n.language === 'en' ? 'en' : 'vi';
  const next: AppLanguage = current === 'vi' ? 'en' : 'vi';

  /** Chuyển ngôn ngữ: cookie là source of truth, localStorage chỉ mirror. */
  function handleSwitch() {
    void i18n.changeLanguage(next);
    setLanguageCookie(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={cn(
        'text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors',
        className,
      )}
      aria-label={next === 'vi' ? t('language.switchToVi') : t('language.switchToEn')}
    >
      {current === 'vi' ? t('language.en') : t('language.vi')}
    </button>
  );
}
