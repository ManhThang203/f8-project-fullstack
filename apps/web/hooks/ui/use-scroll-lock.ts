'use client';

import { useEffect } from 'react';

type ScrollLockOptions = {
  /** Class thêm vào <html> khi khoá (vd 'reels-scroll-lock'), gỡ khi mở. */
  htmlClass?: string;
};

/** Khóa cuộn trang (html + body) khi `locked`, tự khôi phục giá trị cũ khi mở. */
export function useScrollLock(locked: boolean, options?: ScrollLockOptions) {
  const htmlClass = options?.htmlClass;

  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (htmlClass) html.classList.add(htmlClass);
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      if (htmlClass) html.classList.remove(htmlClass);
    };
  }, [locked, htmlClass]);
}
