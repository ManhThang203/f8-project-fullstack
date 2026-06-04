import { Skeleton } from '@/components/shared/skeleton';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

const colUser = adminCol('grow', 'start');
const colRole = adminCol('grow', 'center');
const colPermissions = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

const headerCols = [
  { col: colUser, skeleton: 'w-16' },
  { col: colRole, skeleton: 'w-16' },
  { col: colPermissions, skeleton: 'w-16' },
  { col: colActions, skeleton: 'w-14' },
] as const;

function ModeratorsTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={colUser.td}>
        <div className={colUser.cell}>
          <Skeleton className="mx-auto h-4 w-32 rounded" />
          <Skeleton className="mx-auto mt-1 h-3 w-24 rounded" />
        </div>
      </td>
      <td className={colRole.td}>
        <div className={colRole.cell}>
          <Skeleton className="mx-auto h-4 w-24 rounded" />
        </div>
      </td>
      <td className={colPermissions.td}>
        <div className={colPermissions.cell}>
          <Skeleton className="mx-auto h-6 w-20 rounded-md" />
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

export function ModeratorsTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={cn(adminTable.table, 'min-w-[480px]')}>
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
              <ModeratorsTableSkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
