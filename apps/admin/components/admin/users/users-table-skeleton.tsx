import { Skeleton } from '@/components/shared/skeleton';
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

function UsersTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={adminTable.td}>
        <div className={adminTable.cellColStart}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="mt-1 h-3 w-24 rounded" />
          <Skeleton className="mt-1 h-3 w-40 rounded xl:hidden" />
        </div>
      </td>
      <td className={cn(adminTable.td, 'hidden xl:table-cell')}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-3 w-36 rounded" />
        </div>
      </td>
      <td className={adminTable.td}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </td>
      <td className={adminTable.td}>
        <div className={adminTable.cellStart}>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      </td>
      <td className={cn(adminTable.tdCenter, 'hidden xl:table-cell')}>
        <div className={adminTable.cellCenter}>
          <Skeleton className="h-4 w-8 rounded" />
        </div>
      </td>
      <td className={adminTable.tdRight}>
        <div className={adminTable.cellEnd}>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function UsersTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={cn(adminTable.table, 'min-w-[640px]')}>
          <thead className={adminTable.thead}>
            <tr>
              {[
                adminTable.thLeft,
                cn(adminTable.thLeft, 'hidden xl:table-cell'),
                adminTable.thLeft,
                adminTable.thLeft,
                cn(adminTable.thCenter, 'hidden xl:table-cell'),
                adminTable.thRight,
              ].map((align, i) => {
                const isCenter = align.includes('text-center');
                const isRight = align.includes('text-right');
                const cell = isCenter
                  ? adminTable.cellCenter
                  : isRight
                    ? adminTable.cellEnd
                    : adminTable.cellStart;
                return (
                  <th key={i} className={cn(adminTable.th, align)}>
                    <div className={cell}>
                      <Skeleton
                        className={cn(
                          'h-3 rounded',
                          isCenter ? 'w-8' : isRight ? 'ml-auto w-14' : 'w-16',
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
              <UsersTableSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
