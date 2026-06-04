import { Skeleton } from '@/components/shared/skeleton';

type Props = {
  rows?: number;
};

function UsersCardSkeletonItem() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function UsersCardSkeleton({ rows = 5 }: Props) {
  return (
    <div className="space-y-3 lg:hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <UsersCardSkeletonItem key={i} />
      ))}
    </div>
  );
}
