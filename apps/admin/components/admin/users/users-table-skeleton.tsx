import { Skeleton } from '@/components/shared/skeleton';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

const colUser = adminCol('grow', 'start');
const colEmail = adminCol('grow', 'center');
const colRole = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colPosts = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

const headerCols: { col: typeof colUser; className?: string; skeleton: string }[] = [
  { col: colUser, skeleton: 'w-16' },
  { col: colEmail, className: 'hidden xl:table-cell', skeleton: 'w-16' },
  { col: colRole, skeleton: 'w-16' },
  { col: colStatus, skeleton: 'w-16' },
  { col: colPosts, className: 'hidden xl:table-cell', skeleton: 'w-8' },
  { col: colActions, skeleton: 'w-14' },
];

function UsersTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={colUser.td}>
        <div className={colUser.cell}>
          <Skeleton className="mx-auto h-4 w-32 rounded" />
          <Skeleton className="mx-auto mt-1 h-3 w-24 rounded" />
          <Skeleton className="mx-auto mt-1 h-3 w-40 rounded xl:hidden" />
        </div>
      </td>
      <td className={cn(colEmail.td, 'hidden xl:table-cell')}>
        <div className={colEmail.cell}>
          <Skeleton className="mx-auto h-3 w-36 rounded" />
        </div>
      </td>
      <td className={colRole.td}>
        <div className={colRole.cell}>
          <Skeleton className="mx-auto h-4 w-24 rounded" />
        </div>
      </td>
      <td className={colStatus.td}>
        <div className={colStatus.cell}>
          <Skeleton className="mx-auto h-6 w-20 rounded-md" />
        </div>
      </td>
      <td className={cn(colPosts.td, 'hidden xl:table-cell')}>
        <div className={colPosts.cell}>
          <Skeleton className="mx-auto h-4 w-8 rounded" />
        </div>
      </td>
      <td className={colActions.td}>
        <div className={colActions.cell}>
          <Skeleton className="mx-auto h-9 w-28 rounded-lg" />
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
              {headerCols.map(({ col, className, skeleton }, i) => (
                <th key={i} className={cn(col.th, className)}>
                  <div className={col.cell}>
                    <Skeleton className={cn('mx-auto h-3 rounded', skeleton)} />
                  </div>
                </th>
              ))}
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
