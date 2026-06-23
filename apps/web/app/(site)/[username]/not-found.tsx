import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto max-w-[600px] space-y-4 px-4 py-16 text-center">
        <p className="text-foreground text-lg font-semibold">Không tìm thấy người dùng này</p>
        <Link
          href="/"
          className="text-foreground border-border hover:bg-muted inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium"
        >
          Trang chủ
        </Link>
      </div>
    </main>
  );
}
