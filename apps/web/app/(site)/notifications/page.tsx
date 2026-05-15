import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông báo | Threads Clone',
  description: 'Thông báo',
};

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <h1 className="text-lg font-semibold text-foreground">Thông báo</h1>
      <p className="mt-2 text-sm text-muted-foreground">Trang đang được xây dựng.</p>
    </main>
  );
}
