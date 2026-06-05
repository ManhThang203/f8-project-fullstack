import { Skeleton } from '@/components/shared/skeleton';

type Props = { rows?: number };

export function ModerationCardSkeleton({ rows = 5 }: Props) {
  return (
    <div className="space-y-3 lg:hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="mx-auto h-5 w-32 rounded-full" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
