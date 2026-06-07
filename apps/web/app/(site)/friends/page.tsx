import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bạn bè',
  description: 'Bạn bè',
};

export default function FriendsPage() {
  return (
    <main className="bg-background min-h-screen px-4 py-8">
      <h1 className="text-foreground text-lg font-semibold">Bạn bè</h1>
      <p className="text-muted-foreground mt-2 text-sm">Trang đang được xây dựng.</p>
    </main>
  );
}
