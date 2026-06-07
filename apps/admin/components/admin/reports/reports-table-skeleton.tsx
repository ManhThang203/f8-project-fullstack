import { Skeleton } from '@/components/shared/skeleton';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  rows?: number;
};

const colTarget = adminCol('grow', 'start');
const colReason = adminCol('grow', 'center');
const colReporter = adminCol('grow', 'center');
const colReportCount = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colTime = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

const headerCols: { key: string; col: typeof colTarget; className?: string; skeleton: string }[] = [
  { key: 'target', col: colTarget, skeleton: 'w-16' },
  { key: 'reason', col: colReason, skeleton: 'w-16' },
  { key: 'reporter', col: colReporter, className: 'hidden xl:table-cell', skeleton: 'w-16' },
  { key: 'reportCount', col: colReportCount, skeleton: 'w-12' },
  { key: 'status', col: colStatus, skeleton: 'w-16' },
  { key: 'time', col: colTime, className: 'hidden xl:table-cell', skeleton: 'w-16' },
  { key: 'actions', col: colActions, skeleton: 'w-14' },
];

function ReportsTableSkeletonRow() {
  return (
    <tr className={adminTable.row}>
      <td className={colTarget.td}>
        <div className={colTarget.cell}>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <Skeleton className="h-5 w-14 shrink-0 rounded" />
            <Skeleton className="h-3 max-w-[180px] flex-1 rounded" />
          </div>
          <Skeleton className="mx-auto mt-1 h-3 w-32 rounded xl:hidden" />
        </div>
      </td>
      <td className={colReason.td}>
        <div className={colReason.cell}>
          <Skeleton className="mx-auto h-5 w-28 shrink-0 rounded-full" />
        </div>
      </td>
      <td className={cn(colReporter.td, 'hidden xl:table-cell')}>
        <div className={colReporter.cell}>
          <Skeleton className="mx-auto h-3 w-20 rounded" />
        </div>
      </td>
      <td className={colReportCount.td}>
        <div className={colReportCount.cell}>
          <Skeleton className="mx-auto h-5 w-6 rounded-full" />
        </div>
      </td>
      <td className={colStatus.td}>
        <div className={colStatus.cell}>
          <Skeleton className="mx-auto h-5 w-20 shrink-0 rounded-full" />
        </div>
      </td>
      <td className={cn(colTime.td, 'hidden xl:table-cell')}>
        <div className={colTime.cell}>
          <Skeleton className="mx-auto h-3 w-16 rounded" />
        </div>
      </td>
      <td className={colActions.td}>
        <div className={colActions.cell}>
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
              {headerCols.map(({ key, col, className, skeleton }) => (
                <th key={key} className={cn(col.th, className)}>
                  <div className={col.cell}>
                    <Skeleton className={cn('mx-auto h-3 rounded', skeleton)} />
                  </div>
                </th>
              ))}
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
