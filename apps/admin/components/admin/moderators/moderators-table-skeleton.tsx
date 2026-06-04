import { Skeleton } from '@/components/shared/skeleton';
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

function ModeratorsTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={adminTable.td}>
        <div className={adminTable.cellColStart}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="mt-1 h-3 w-24 rounded" />
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
      <td className={adminTable.tdRight}>
        <div className={adminTable.cellEnd}>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function ModeratorsTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={cn(adminTable.table, 'min-w-[480px]')}>
          <thead className={adminTable.thead}>
            <tr>
              {[adminTable.thLeft, adminTable.thLeft, adminTable.thLeft, adminTable.thRight].map(
                (align, i) => {
                  const isRight = i === 3;
                  const cell = isRight ? adminTable.cellEnd : adminTable.cellStart;
                  return (
                    <th key={i} className={cn(adminTable.th, align)}>
                      <div className={cell}>
                        <Skeleton
                          className={cn('h-3 rounded', isRight ? 'ml-auto w-14' : 'w-16')}
                        />
                      </div>
                    </th>
                  );
                },
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <ModeratorsTableSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
