'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { Skeleton } from '@/components/shared/skeleton';
import {
  useAdminReportDetail,
  useReportAction,
  useReviewReport,
} from '@/hooks/queries/use-admin-queries';
import { AUDIT_ACTION_KEY_MAP, renderAuditMetadata } from '@/lib/display-labels';
import { segmentedControl } from '@/components/admin/reports/segmented-control';

type ActionType = 'DISMISS' | 'HIDE_POST' | 'DELETE_POST' | 'WARN_USER' | 'BAN_ACCOUNT';

const ACTION_COLORS: Record<ActionType, string> = {
  DISMISS: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
  HIDE_POST: 'bg-yellow-600 hover:bg-yellow-500 text-white',
  DELETE_POST: 'bg-red-600 hover:bg-red-500 text-white',
  WARN_USER: 'bg-orange-600 hover:bg-orange-500 text-white',
  BAN_ACCOUNT: 'bg-red-900 hover:bg-red-800 text-white',
};

const POST_ACTIONS: ActionType[] = [
  'DISMISS',
  'HIDE_POST',
  'DELETE_POST',
  'WARN_USER',
  'BAN_ACCOUNT',
];
const USER_ACTIONS: ActionType[] = ['DISMISS', 'WARN_USER', 'BAN_ACCOUNT'];

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    UNDER_REVIEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    RESOLVED: 'bg-green-500/15 text-green-700 dark:text-green-400',
    DISMISSED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
    AUTO_HIDDEN: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-400',
    LOCKED: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    BANNED: 'bg-red-500/15 text-red-700 dark:text-red-400',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {t(`reportStatus.${status}`, t(`status.${status}`, status))}
    </span>
  );
}

export default function ReportDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useAdminReportDetail(id ?? null);
  const reviewMutation = useReviewReport();
  const actionMutation = useReportAction();

  const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
  const [selectedAction, setSelectedAction] = useState<ActionType>('DISMISS');
  const [resolutionNote, setResolutionNote] = useState('');
  const [bannedUntil, setBannedUntil] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revealedMediaIds, setRevealedMediaIds] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const report = data?.data;
  const locale = i18n.language === 'en' ? 'en' : 'vi';

  const actionLabel = (action: ActionType) => t(`reportDetail.actions.${action}`);

  const availableActions = report?.targetType === 'POST' ? POST_ACTIONS : USER_ACTIONS;

  useEffect(() => {
    if (!lightboxUrl) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxUrl(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxUrl]);

  const handleAction = () => {
    if (!report) return;
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
      {
        onSuccess: () => {
          router.push('/reports');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="col-span-2 space-y-3">
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{t('reportDetail.notFound')}</p>
        <Link href="/reports">
          <Button variant="secondary" className="mt-4">
            {t('reportDetail.backToList')}
          </Button>
        </Link>
      </div>
    );
  }

  const isResolved = report.status === 'RESOLVED' || report.status === 'DISMISSED';

  return (
    <>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/reports" className="text-muted-foreground hover:text-foreground">
            {t('reportDetail.breadcrumb')}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{t('reportDetail.title')}</span>
          <StatusBadge status={report.status} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* ── Left column (3/5) ───────────────────────── */}
          <div className="space-y-4 lg:col-span-3">
            {/* Target content */}
            <section className="border-border bg-card rounded-xl border p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-medium">
                  {t(`targetType.${report.targetType}`, report.targetType)}
                </span>
                <h3 className="text-sm font-semibold">{t('reportDetail.targetContent')}</h3>
                {(report.reportCount ?? 0) >= 2 && (
                  <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                    {t('reportDetail.reportCountBadge', { count: report.reportCount })}
                  </span>
                )}
              </div>

              {report.targetContent ? (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {report.targetContent}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t('reportDetail.contentUnavailable')}
                </p>
              )}

              {/* Target media with click-to-reveal */}
              {report.targetMedia && report.targetMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {report.targetMedia.map((m) => {
                    const isRevealed = revealedMediaIds.includes(m.id);
                    const isVideo = m.kind === 'VIDEO';

                    return (
                      <div
                        key={m.id}
                        className={`border-border bg-muted/30 group relative flex aspect-video select-none items-center justify-center overflow-hidden rounded-lg border ${
                          isRevealed && !isVideo ? 'cursor-zoom-in' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isRevealed) {
                            setRevealedMediaIds((prev) => [...prev, m.id]);
                            return;
                          }
                          if (!isVideo && m.publicUrl) {
                            setLightboxUrl(m.publicUrl);
                          }
                        }}
                      >
                        {/* Media content */}
                        {isVideo ? (
                          <video
                            src={m.publicUrl ?? undefined}
                            controls={isRevealed}
                            className={`h-full w-full object-cover transition-all duration-300 ${
                              isRevealed ? '' : 'pointer-events-none scale-95 opacity-50 blur-2xl'
                            }`}
                          />
                        ) : (
                          <img
                            src={m.publicUrl ?? undefined}
                            alt={t('reportDetail.mediaAlt')}
                            className={`h-full w-full object-cover transition-all duration-300 ${
                              isRevealed ? '' : 'pointer-events-none scale-95 opacity-50 blur-2xl'
                            }`}
                          />
                        )}

                        {/* Cover overlay when blurred */}
                        {!isRevealed && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-3 text-center transition-colors group-hover:bg-black/60">
                            <EyeOff className="mb-1 h-6 w-6 text-white/90" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                              {t('reportDetail.sensitiveContent')}
                            </span>
                            <span className="mt-0.5 text-[10px] text-white/70">
                              {t('reportDetail.clickToReveal')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Target author */}
              {report.targetAuthor && (
                <div className="border-border mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
                    {report.targetAuthor.username[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">@{report.targetAuthor.username}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {report.targetAuthor.name}
                    </p>
                  </div>
                  <StatusBadge status={report.targetAuthor.status} />
                </div>
              )}
            </section>

            {/* Reporter info */}
            <section className="border-border bg-card rounded-xl border p-5">
              <h3 className="mb-3 text-sm font-semibold">{t('reportDetail.reporterInfo')}</h3>
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase">
                  {(report.reporter?.username ?? 'U')[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    @{report.reporter?.username ?? t('common.unknownUser')}
                  </p>
                  {report.reporter?.name && (
                    <p className="text-muted-foreground text-xs">{report.reporter.name}</p>
                  )}
                </div>
              </div>
              {report.description && (
                <div className="bg-muted/30 mt-3 rounded-lg p-3">
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    {t('reportDetail.reporterDescription')}
                  </p>
                  <p className="text-sm">{report.description}</p>
                </div>
              )}
              <div className="text-muted-foreground mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="font-medium">{t('reportDetail.reasonLabel')} </span>
                  {t(`reportReason.${report.reason}`, report.reason)}
                </div>
                <div>
                  <span className="font-medium">{t('reportDetail.reportedAt')} </span>
                  {formatDate(report.createdAt, locale)}
                </div>
              </div>
            </section>

            {/* Related reports */}
            {report.relatedReports && report.relatedReports.length > 0 && (
              <section className="border-border bg-card rounded-xl border p-5">
                <h3 className="mb-3 text-sm font-semibold">
                  {t('reportDetail.relatedReports', { count: report.relatedReports.length })}
                </h3>
                <div className="space-y-2">
                  {report.relatedReports.map((r) => (
                    <div
                      key={r.id}
                      className="bg-muted/20 flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-medium">
                          @{r.reporter?.username ?? t('common.unknownUser')}
                        </span>
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                          {t(`reportReason.${r.reason}`, r.reason)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <StatusBadge status={r.status} />
                        <span className="text-muted-foreground">
                          {formatDate(r.createdAt, locale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right column (2/5) ───────────────────────── */}
          <div className="space-y-4 lg:col-span-2">
            {/* Tabs */}
            <div className={segmentedControl.track}>
              {(['info', 'audit'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 justify-center py-1.5 ${segmentedControl.tab} ${
                    activeTab === tab ? segmentedControl.tabActive : segmentedControl.tabInactive
                  }`}
                >
                  {tab === 'info' ? t('reportDetail.tabInfo') : t('reportDetail.tabAudit')}
                </button>
              ))}
            </div>

            {activeTab === 'info' ? (
              /* Action form */
              <section className="border-border bg-card space-y-4 rounded-xl border p-5">
                <h3 className="text-sm font-semibold">{t('reportDetail.moderationActions')}</h3>

                {isResolved ? (
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <StatusBadge status={report.status} />
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t('reportDetail.alreadyResolved')}
                    </p>
                    {report.resolutionNote && (
                      <p className="mt-1 text-xs">{report.resolutionNote}</p>
                    )}
                    {report.reviewedAt && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDate(report.reviewedAt, locale)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mark under review */}
                    {(report.status === 'PENDING' || report.status === 'AUTO_HIDDEN') && (
                      <Button
                        variant="secondary"
                        className="w-full text-xs"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            id: report.id,
                            status: 'UNDER_REVIEW',
                          })
                        }
                      >
                        {t('reportDetail.markUnderReview')}
                      </Button>
                    )}

                    {/* Action select */}
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

                    {/* Resolution note */}
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t('reportDetail.resolutionNote')}
                        <span className="ml-1 text-red-400">
                          {t('reportDetail.resolutionNoteRequired')}
                        </span>
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

                    {/* Ban date (optional) */}
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

                    {/* Confirm delete warning */}
                    {confirmDelete && selectedAction === 'DELETE_POST' && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                        {t('reportDetail.deleteConfirmWarning')}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      disabled={actionMutation.isPending || !resolutionNote.trim()}
                      onClick={handleAction}
                      className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${ACTION_COLORS[selectedAction]}`}
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
            ) : (
              /* Audit log timeline */
              <section className="border-border bg-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-semibold">{t('reportDetail.auditHistory')}</h3>
                {!report.auditLogs || report.auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-xs">{t('reportDetail.noAuditLogs')}</p>
                ) : (
                  <div className="relative space-y-0">
                    {report.auditLogs.map((log, idx) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="bg-primary/60 mt-1 h-2 w-2 flex-shrink-0 rounded-full" />
                          {idx < report.auditLogs.length - 1 && (
                            <div className="bg-border w-px flex-1" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
                              {t(
                                AUDIT_ACTION_KEY_MAP[log.action] ?? `auditAction.${log.action}`,
                                log.action,
                              )}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              @{log.actor?.username ?? t('common.unknownUser')}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {formatDate(log.createdAt, locale)}
                          </p>
                          {(() => {
                            const metadataItems = renderAuditMetadata(log.metadata, t);
                            return (
                              metadataItems.length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-muted-foreground/60 hover:text-muted-foreground cursor-pointer text-xs">
                                    {t('common.details')}
                                  </summary>
                                  <div className="bg-muted/30 mt-1 max-h-36 space-y-1 overflow-auto rounded p-2 text-xs">
                                    {metadataItems.map((item, metaIdx) => (
                                      <div key={metaIdx} className="flex gap-2">
                                        <span className="text-muted-foreground font-semibold">
                                          {item.label}:
                                        </span>
                                        <span className="text-foreground break-all">
                                          {item.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="text-muted-foreground hover:text-foreground absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label={t('common.closeMenu')}
          >
            <X className="size-5" />
          </button>
          <img
            src={lightboxUrl}
            alt={t('reportDetail.mediaAlt')}
            className="max-h-[90vh] max-w-full cursor-zoom-out object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
