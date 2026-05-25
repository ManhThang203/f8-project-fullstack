import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[600px] space-y-4 px-4 py-16 text-center">
        <p className="text-foreground text-lg font-semibold">Không tìm thấy người dùng này</p>
        <Link
          href="/"
          className="text-foreground inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          Trang chủ
        </Link>
      </div>
    </main>
  );
}
