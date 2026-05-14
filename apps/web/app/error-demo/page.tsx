import { notFound } from 'next/navigation';

/**
 * Chỉ để xem UI `app/error.tsx` trong dev.
 * Mở: http://localhost:<port>/error-demo
 * Xóa folder `app/error-demo` khi không cần nữa.
 */
export default function ErrorDemoPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  throw new Error(
    'Demo: cố ý ném lỗi để xem trang lỗi — xóa app/error-demo khi không cần',
  );
}
