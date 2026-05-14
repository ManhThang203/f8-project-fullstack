import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col px-6 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
          <h1 className="max-w-md text-base font-semibold leading-snug">
            Không phải cứ biến mất là mất tích, nhưng trang này thì mất tích thật rồi
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-sm">
            Liên kết không hoạt động hoặc trang này không còn nữa. Hãy quay lại để khám phá tiếp.
          </p>
          <Link
            className="bg-primary text-primary-foreground mt-8 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 motion-safe:duration-150"
            href="/"
          >
            Quay lại
          </Link>
        </div>
      </div>
      <footer className="text-muted-foreground px-6 pb-8 text-center text-xs">
        © 2026 · Điều khoản của Threads · Chính sách quyền riêng tư · Chính sách cookie
      </footer>
    </div>
  );
}
