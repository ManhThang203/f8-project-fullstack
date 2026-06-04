import { Skeleton } from '@/components/shared/skeleton';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

const colTag = adminCol('grow', 'start');
const colPosts = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

const headerCols = [
  { col: colTag, skeleton: 'w-16' },
  { col: colPosts, skeleton: 'w-12' },
  { col: colStatus, skeleton: 'w-16' },
  { col: colActions, skeleton: 'w-20' },
] as const;

function HashtagsTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={colTag.td}>
        <div className={colTag.cell}>
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      </td>
      <td className={colPosts.td}>
        <div className={colPosts.cell}>
          <Skeleton className="mx-auto h-4 w-8 rounded" />
        </div>
      </td>
      <td className={colStatus.td}>
        <div className={colStatus.cell}>
          <Skeleton className="mx-auto h-6 w-20 rounded-full" />
        </div>
      </td>
      <td className={colActions.td}>
        <div className={colActions.cell}>
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-14 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function HashtagsTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'block overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={cn(adminTable.table, 'min-w-[520px]')}>
          <thead className={adminTable.thead}>
            <tr>
              {headerCols.map(({ col, skeleton }, i) => (
                <th key={i} className={col.th}>
                  <div className={col.cell}>
                    <Skeleton className={cn('mx-auto h-3 rounded', skeleton)} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <HashtagsTableSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
