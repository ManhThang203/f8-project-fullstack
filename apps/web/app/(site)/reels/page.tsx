import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reels | Threads Clone',
  description: 'Reels',
};

export default function ReelsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <h1 className="text-lg font-semibold text-foreground">Reels</h1>
      <p className="mt-2 text-sm text-muted-foreground">Trang đang được xây dựng.</p>
    </main>
  );
}
