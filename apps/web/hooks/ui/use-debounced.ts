import { useEffect, useState } from 'react';

/** Trả giá trị debounced — chỉ cập nhật sau khi `value` ngừng thay đổi ít nhất `ms` milliseconds. */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
