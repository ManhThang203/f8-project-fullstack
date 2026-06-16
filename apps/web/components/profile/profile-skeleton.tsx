import { FeedSkeletonList } from '@/components/home/feed/feed-skeleton-list';

export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-6 md:px-0 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="bg-muted mx-auto h-14 w-14 shrink-0 animate-pulse rounded-full sm:mx-0" />

        <div className="flex-1 space-y-3">
          <div className="mx-auto space-y-2 sm:mx-0">
            <div className="bg-muted mx-auto h-6 w-40 animate-pulse rounded sm:mx-0" />
            <div className="bg-muted mx-auto h-4 w-28 animate-pulse rounded sm:mx-0" />
          </div>

          <div className="flex justify-center gap-4 sm:justify-start">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-10 w-14 animate-pulse rounded" />
            ))}
          </div>

          <div className="bg-muted mx-auto h-9 w-48 animate-pulse rounded sm:mx-0" />
        </div>
      </div>

      <div className="border-border mt-6 border-b">
        <div className="flex">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted m-2 h-9 flex-1 animate-pulse rounded" />
          ))}
        </div>
      </div>

      <div className="px-0 py-4">
        <FeedSkeletonList />
      </div>
    </div>
  );
}
