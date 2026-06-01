'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col px-6 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
          <h1 className="max-w-md text-base font-semibold leading-snug">
            Có chuyện gì đó không ổn ở phía chúng tôi
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-sm">
            Đã xảy ra lỗi không mong muốn. Bạn có thể thử lại hoặc quay về trang chủ.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              className="bg-primary text-primary-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 motion-safe:duration-150"
              type="button"
              onClick={() => reset()}
            >
              Thử lại
            </button>
            <Link
              className="bg-muted text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 motion-safe:duration-150"
              href="/"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
      <footer className="text-muted-foreground px-6 pb-8 text-center text-xs">
        © 2026 · Điều khoản của Costy · Chính sách quyền riêng tư · Chính sách cookie
      </footer>
    </div>
  );
}
