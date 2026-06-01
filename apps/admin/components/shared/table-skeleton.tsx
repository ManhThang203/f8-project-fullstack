import { Skeleton } from './skeleton';

type Props = {
  rows?: number;
  cols?: number;
};

export function TableSkeleton({ rows = 5, cols = 5 }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {/* Header row */}
        <div className="flex items-center gap-4 bg-muted/30 p-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-5 ${
                c === 0 ? 'w-24' : c === 1 ? 'w-36' : c === 2 ? 'w-28' : 'flex-1 max-w-[200px]'
              }`}
            />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 ${
                  c === 0
                    ? 'w-10 h-10 rounded-full' // simulating avatar or small id/icon
                    : c === 1
                      ? 'w-32'
                      : c === 2
                        ? 'w-48'
                        : 'flex-1 max-w-[150px]'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
