import type { Metadata } from 'next';

import { RestrictedPostsView } from '@/components/restricted-posts/restricted-posts-view';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Bài viết bị hạn chế',
  description: 'Xem và kháng nghị các bài viết bị ẩn do kiểm duyệt',
};

function RestrictedPostsFallback() {
  return (
    <div className="flex justify-center py-16 text-sm text-muted-foreground">Đang tải…</div>
  );
}

export default function RestrictedPostsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto mb-6 max-w-2xl">
        <h1 className="text-lg font-semibold text-foreground">Bài viết bị hạn chế</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Các bài viết tạm thời không hiển thị do báo cáo an toàn trẻ em. Bạn có thể gửi kháng nghị để đội
          ngũ xem xét lại.
        </p>
      </div>
      <ClientOnly fallback={<RestrictedPostsFallback />}>
        <RestrictedPostsView />
      </ClientOnly>
    </main>
  );
}
