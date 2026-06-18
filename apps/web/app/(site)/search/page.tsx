import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchView } from '@/components/search/search-view';

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  description: 'Tìm bài viết, người dùng và hashtag',
};

function SearchFallback() {
  return (
    <div className="text-muted-foreground mx-auto max-w-2xl px-4 py-12 text-center text-sm">
      Đang tải…
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="bg-background min-h-screen">
      <Suspense fallback={<SearchFallback />}>
        <SearchView />
      </Suspense>
    </main>
  );
}
