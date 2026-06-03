import { Skeleton } from '@/components/shared/skeleton';

type Props = {
  rows?: number;
};

function ReportsCardSkeletonItem() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-16 shrink-0 rounded" />
        <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-5 w-28 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-20 shrink-0 rounded" />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Skeleton className="h-3 w-24 shrink-0 rounded" />
        <Skeleton className="h-3 w-16 shrink-0 rounded" />
      </div>

      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg" />
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function ReportsCardSkeleton({ rows = 5 }: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <ReportsCardSkeletonItem key={i} />
      ))}
    </div>
  );
}
