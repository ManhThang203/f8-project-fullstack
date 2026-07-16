'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { segmentedControl } from '@/components/admin/reports/segmented-control';
import { formatReportDate } from '@/components/admin/reports/report-detail.utils';
import { ReportMediaLightbox } from '@/components/admin/reports/report-media-lightbox';
import { ReportModerationPanel } from '@/components/admin/reports/report-moderation-panel';
import { StatusBadge } from '@/components/admin/reports/report-status-badge';
import { ReportTargetMedia } from '@/components/admin/reports/report-target-media';
import { Button } from '@/components/shared/button';
import { Skeleton } from '@/components/shared/skeleton';
import { useAdminReportDetail } from '@/hooks/queries/use-admin-queries';
import { AUDIT_ACTION_KEY_MAP, renderAuditMetadata } from '@/lib/display-labels';

export default function ReportDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useAdminReportDetail(id ?? null);

  const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const report = data?.data;
  const locale = i18n.language === 'en' ? 'en' : 'vi';

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

              {report.targetMedia && (
                <ReportTargetMedia media={report.targetMedia} onOpenLightbox={setLightboxUrl} />
              )}

              {/* Target author */}
              {report.targetAuthor && (
                <div className="border-border mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
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
                  {formatReportDate(report.createdAt, locale)}
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
                          {formatReportDate(r.createdAt, locale)}
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
              <ReportModerationPanel
                report={report}
                locale={locale}
                onResolved={() => router.push('/reports')}
              />
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
                          <div className="bg-primary/60 mt-1 h-2 w-2 shrink-0 rounded-full" />
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
                            {formatReportDate(log.createdAt, locale)}
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
        <ReportMediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}
    </>
  );
}
