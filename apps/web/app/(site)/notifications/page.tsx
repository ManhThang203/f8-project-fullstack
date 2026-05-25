import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông báo',
  description: 'Thông báo của bạn',
  icons: {
    icon: '/icon/Logo-app-2.webp',
    apple: '/icon/Logo-app-2.webp',
  },
};

export default function NotificationsPage() {
  return (
    <main className="bg-background min-h-screen px-4 py-8">
      <h1 className="text-foreground text-lg font-semibold">Thông báo</h1>
      <p className="text-muted-foreground mt-2 text-sm">Trang đang được xây dựng.</p>
    </main>
  );
}
