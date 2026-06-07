import { Skeleton } from '@/components/shared/skeleton';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = { rows?: number };

const colContent = adminCol('grow', 'start');
const colLabel = adminCol('grow', 'center');
const colConfidence = adminCol('grow', 'center');
const colAuthor = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colTime = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

export function ModerationTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className={cn(adminTable.wrap, 'hidden lg:block')}>
      <table className={adminTable.table}>
        <thead className={adminTable.thead}>
          <tr>
            {[colContent, colLabel, colConfidence, colAuthor, colStatus, colTime, colActions].map(
              (col, i) => (
                <th key={i} className={col.th}>
                  <div className={col.cell}>
                    <Skeleton className="mx-auto h-3 w-16 rounded" />
                  </div>
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={adminTable.row}>
              {[colContent, colLabel, colConfidence, colAuthor, colStatus, colTime, colActions].map(
                (col, j) => (
                  <td key={j} className={col.td}>
                    <div className={col.cell}>
                      <Skeleton className="mx-auto h-5 w-20 rounded" />
                    </div>
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
