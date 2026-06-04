import { cn } from '@/lib/utils';

/** Shared admin data-table layout tokens (th/td alignment). */
export const adminTable = {
  wrap: 'hidden w-full overflow-x-auto rounded-xl border border-border bg-card lg:block',
  wrapRelative: 'relative hidden overflow-x-auto rounded-xl border border-border lg:block',
  table: 'w-full text-sm',
  thead: 'border-b border-border bg-muted/30',
  theadAlt: 'border-b border-border bg-muted/50 text-muted-foreground',
  th: 'px-4 py-3 align-middle text-center text-xs font-medium text-muted-foreground',
  thStart: 'text-center',
  thCenter: 'text-center',
  thEnd: 'text-center',
  thLeft: 'text-center',
  thRight: 'text-center',
  td: 'px-4 py-3 align-middle text-center',
  tdStart: 'px-4 py-3 align-middle text-center',
  tdCenter: 'px-4 py-3 align-middle text-center',
  tdEnd: 'px-4 py-3 align-middle text-center',
  tdRight: 'px-4 py-3 align-middle text-center',
  stackCenter: 'flex w-full min-w-0 flex-col items-center justify-center text-center',
  cellStart: 'flex w-full min-w-0 items-center justify-center',
  cellColStart: 'flex w-full min-w-0 flex-col items-center justify-center text-center',
  cellCenter: 'flex w-full min-w-0 items-center justify-center',
  cellEnd: 'flex w-full min-w-0 items-center justify-center gap-2',
  actionsGroup: 'flex w-full min-w-0 items-center justify-center gap-2',
  actionBtn: 'min-h-9 px-3 text-xs',
  tbodyDivide: 'divide-y divide-border',
  row: 'border-b border-border last:border-0 transition-colors hover:bg-muted/20',
} as const;

export type AdminColWidth = 'grow' | 'actions';
export type AdminColAlign = 'start' | 'center' | 'end';

/** Column class bundle — all th/td are center-aligned regardless of align. */
export function adminCol(width: AdminColWidth = 'grow', align: AdminColAlign = 'center') {
  const th = cn(adminTable.th, adminTable.thCenter);
  const td = width === 'actions' ? adminTable.tdEnd : adminTable.tdCenter;
  const cell =
    width === 'actions' || align === 'end'
      ? adminTable.actionsGroup
      : align === 'start'
        ? adminTable.stackCenter
        : adminTable.cellCenter;
  return { th, td, cell };
}
