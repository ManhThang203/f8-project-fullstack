import { HomeFeed } from '@/components/home/feed';

export default async function HomePage() {
  await new Promise((r) => setTimeout(r, 2000));
  return (
    <main className="bg-background min-h-screen">
      <HomeFeed />
    </main>
  );
}
