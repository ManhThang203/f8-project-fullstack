'use client';

import type { AdminReportDetailDto } from '@costy/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from './report-status-badge';
import {
  formatReportDate,
  REPORT_ACTION_COLORS,
  REPORT_POST_ACTIONS,
  REPORT_USER_ACTIONS,
  type ReportActionType,
} from './report-detail.utils';

import { Button } from '@/components/shared/button';
import { useReportAction, useReviewReport } from '@/hooks/queries/use-admin-queries';

/** Panel hành động kiểm duyệt: mark review, chọn action, ghi chú, ban date, submit. */
export function ReportModerationPanel({
  report,
  locale,
  onResolved,
}: {
  report: AdminReportDetailDto;
  locale: string;
  onResolved: () => void;
}) {
  const { t } = useTranslation();
  const reviewMutation = useReviewReport();
  const actionMutation = useReportAction();

  const [selectedAction, setSelectedAction] = useState<ReportActionType>('DISMISS');
  const [resolutionNote, setResolutionNote] = useState('');
  const [bannedUntil, setBannedUntil] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actionLabel = (action: ReportActionType) => t(`reportDetail.actions.${action}`);
  const availableActions =
    report.targetType === 'POST' ? REPORT_POST_ACTIONS : REPORT_USER_ACTIONS;
  const isResolved = report.status === 'RESOLVED' || report.status === 'DISMISSED';

  const handleAction = () => {
    if (selectedAction === 'DELETE_POST' && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    actionMutation.mutate(
      {
        id: report.id,
        action: selectedAction,
        resolutionNote: resolutionNote || actionLabel(selectedAction),
        bannedUntil: bannedUntil || undefined,
      },
      { onSuccess: onResolved },
    );
  };

  return (
    <section className="border-border bg-card space-y-4 rounded-xl border p-5">
      <h3 className="text-sm font-semibold">{t('reportDetail.moderationActions')}</h3>

      {isResolved ? (
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <StatusBadge status={report.status} />
          <p className="text-muted-foreground mt-2 text-xs">{t('reportDetail.alreadyResolved')}</p>
          {report.resolutionNote && <p className="mt-1 text-xs">{report.resolutionNote}</p>}
          {report.reviewedAt && (
            <p className="text-muted-foreground mt-1 text-xs">
              {formatReportDate(report.reviewedAt, locale)}
            </p>
          )}
        </div>
      ) : (
        <>
          {(report.status === 'PENDING' || report.status === 'AUTO_HIDDEN') && (
            <Button
              variant="secondary"
              className="w-full text-xs"
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: report.id, status: 'UNDER_REVIEW' })}
            >
              {t('reportDetail.markUnderReview')}
            </Button>
          )}

          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              {t('reportDetail.selectAction')}
            </label>
            <div className="space-y-1.5">
              {availableActions.map((action) => (
                <button
                  key={action}
                  onClick={() => {
                    setSelectedAction(action);
                    setConfirmDelete(false);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                    selectedAction === action
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              {t('reportDetail.resolutionNote')}
              <span className="ml-1 text-red-400">{t('reportDetail.resolutionNoteRequired')}</span>
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder={t('reportDetail.resolutionPlaceholder', {
                action: actionLabel(selectedAction).toLowerCase(),
              })}
              rows={3}
              className="border-border bg-muted/20 text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1"
            />
          </div>

          {selectedAction === 'BAN_ACCOUNT' && (
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                {t('reportDetail.banDurationLabel')}
              </label>
              <input
                type="datetime-local"
                value={bannedUntil}
                onChange={(e) => setBannedUntil(e.target.value)}
                className="border-border bg-muted/20 text-foreground focus:border-ring focus:ring-ring w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1"
              />
            </div>
          )}

          {confirmDelete && selectedAction === 'DELETE_POST' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {t('reportDetail.deleteConfirmWarning')}
            </div>
          )}

          <button
            disabled={actionMutation.isPending || !resolutionNote.trim()}
            onClick={handleAction}
            className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${REPORT_ACTION_COLORS[selectedAction]}`}
          >
            {actionMutation.isPending
              ? t('reportDetail.processing')
              : confirmDelete
                ? t('reportDetail.confirmDelete')
                : actionLabel(selectedAction)}
          </button>
        </>
      )}
    </section>
  );
}
