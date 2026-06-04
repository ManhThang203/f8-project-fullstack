import { Skeleton } from '@/components/shared/skeleton';
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

function ReportsTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={adminTable.td}>
        <div className={adminTable.cellColStart}>
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-5 w-14 shrink-0 rounded" />
            <Skeleton className="h-3 max-w-[180px] flex-1 rounded" />
          </div>
          <Skeleton className="mt-1 h-3 w-32 rounded xl:hidden" />
        </div>
      </td>
      <td className={adminTable.td}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-5 w-28 shrink-0 rounded-full" />
        </div>
      </td>
      <td className={cn(adminTable.td, 'hidden xl:table-cell')}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </td>
      <td className={adminTable.tdCenter}>
        <div className={adminTable.cellCenter}>
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
      </td>
      <td className={adminTable.td}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>
      </td>
      <td className={cn(adminTable.td, 'hidden xl:table-cell')}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </td>
      <td className={adminTable.tdRight}>
        <div className={adminTable.cellEnd}>
          <Skeleton className="h-9 w-14 shrink-0 rounded-lg" />
          <Skeleton className="h-9 w-[4.5rem] shrink-0 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function ReportsTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={cn(adminTable.table, 'min-w-[800px]')}>
          <thead className={adminTable.thead}>
            <tr>
              {[
                { key: 'target', align: cn(adminTable.thLeft) },
                { key: 'reason', align: cn(adminTable.thLeft) },
                { key: 'reporter', align: cn(adminTable.thLeft, 'hidden xl:table-cell') },
                { key: 'reportCount', align: cn(adminTable.thCenter) },
                { key: 'status', align: cn(adminTable.thLeft) },
                { key: 'time', align: cn(adminTable.thLeft, 'hidden xl:table-cell') },
                { key: 'actions', align: cn(adminTable.thRight) },
              ].map(({ key, align }) => {
                const isCenter = align.includes('text-center');
                const isRight = align.includes('text-right');
                const cell = isCenter
                  ? adminTable.cellCenter
                  : isRight
                    ? adminTable.cellEnd
                    : adminTable.cellStart;
                return (
                  <th key={key} className={cn(adminTable.th, align)}>
                    <div className={cell}>
                      <Skeleton
                        className={cn(
                          'h-3 rounded',
                          isCenter ? 'w-12' : isRight ? 'ml-auto w-14' : 'w-16',
                        )}
                      />
                    </div>
                  </th>
                );
              })}
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
