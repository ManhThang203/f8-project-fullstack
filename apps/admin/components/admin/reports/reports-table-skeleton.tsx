import { Skeleton } from '@/components/shared/skeleton';

type Props = {
  rows?: number;
};

function ReportsTableSkeletonRow() {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-5 w-14 shrink-0 rounded" />
          <Skeleton className="h-3 max-w-[180px] flex-1 rounded" />
        </div>
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-28 shrink-0 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-3 w-20 rounded" />
      </td>
      <td className="px-4 py-3 text-center">
        <Skeleton className="mx-auto h-5 w-6 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-3 w-16 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="flex shrink-0 justify-end gap-2">
          <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-[4.5rem] shrink-0 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function ReportsTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className="hidden w-full overflow-hidden rounded-xl border border-border bg-card md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              {['Target', 'Lý do', 'Reporter', 'Số report', 'Trạng thái', 'Thời gian', 'Thao tác'].map(
                (label) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-medium text-muted-foreground ${
                      label === 'Số report' ? 'text-center' : label === 'Thao tác' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <ReportsTableSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
