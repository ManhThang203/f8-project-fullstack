'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'admin-sidebar-collapsed';

/** Đọc trạng thái collapse từ localStorage hoặc mặc định theo breakpoint. */
function readInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
}

/** Quản lý trạng thái collapse sidebar trên desktop/tablet. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(readInitialCollapsed());
  }, []);

  /** Cập nhật collapse và lưu preference. */
  function setCollapsed(next: boolean) {
    setCollapsedState(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  return { collapsed, setCollapsed, toggleCollapsed };
}

/** Khóa scroll body khi drawer mobile mở. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
