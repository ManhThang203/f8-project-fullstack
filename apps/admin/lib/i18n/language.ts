export type AppLanguage = 'vi' | 'en';

export const LANGUAGE_STORAGE_KEY = 'admin-language';
export const LANGUAGE_COOKIE_KEY = 'admin-language';

/** Kiểm tra giá trị có phải ngôn ngữ app hỗ trợ. */
export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

/** Cookie ngôn ngữ đã có trên document chưa (client only). */
export function hasLanguageCookie(): boolean {
  return document.cookie.split('; ').some((part) => part.startsWith(`${LANGUAGE_COOKIE_KEY}=`));
}

/** Ghi preference ngôn ngữ vào cookie để SSR và client khớp nhau. */
export function setLanguageCookie(lng: AppLanguage) {
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${lng};path=/;max-age=31536000;SameSite=Lax`;
}
