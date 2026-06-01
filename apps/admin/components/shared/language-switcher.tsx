'use client';

import { useTranslation } from 'react-i18next';

import { LANGUAGE_STORAGE_KEY } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export function LanguageSwitcher({ className }: Props) {
  const { i18n, t } = useTranslation();
  const current = i18n.language === 'en' ? 'en' : 'vi';
  const next = current === 'vi' ? 'en' : 'vi';

  /** Chuyển ngôn ngữ và lưu preference vào localStorage. */
  function handleSwitch() {
    void i18n.changeLanguage(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={next === 'vi' ? t('language.switchToVi') : t('language.switchToEn')}
    >
      {current === 'vi' ? t('language.en') : t('language.vi')}
    </button>
  );
}
