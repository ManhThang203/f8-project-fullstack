import { Skeleton } from './skeleton';

type Props = {
  rows?: number;
  cols?: number;
};

export function TableSkeleton({ rows = 5, cols = 5 }: Props) {
  return (
    <div className="border-border bg-card w-full overflow-hidden rounded-xl border">
      <div className="divide-border divide-y">
        {/* Header row */}
        <div className="bg-muted/30 flex items-center gap-4 p-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-5 ${
                c === 0 ? 'w-24' : c === 1 ? 'w-36' : c === 2 ? 'w-28' : 'max-w-[200px] flex-1'
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
                    ? 'h-10 w-10 rounded-full' // simulating avatar or small id/icon
                    : c === 1
                      ? 'w-32'
                      : c === 2
                        ? 'w-48'
                        : 'max-w-[150px] flex-1'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
