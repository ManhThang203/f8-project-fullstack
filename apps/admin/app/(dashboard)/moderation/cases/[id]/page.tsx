'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CASE_STATUS_COLORS } from '@/components/admin/moderation/moderation-cases.constants';
import { STATUS_COLORS } from '@/components/admin/reports/reports.constants';
import { segmentedControl } from '@/components/admin/reports/segmented-control';
import { Button } from '@/components/shared/button';
import { Skeleton } from '@/components/shared/skeleton';
import {
  useModerationCaseDetail,
  useResolveModerationCase,
} from '@/hooks/queries/use-admin-queries';
import { AUDIT_ACTION_KEY_MAP, renderAuditMetadata } from '@/lib/display-labels';

type Decision = 'RESTORE' | 'UPHOLD';

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

function CaseStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CASE_STATUS_COLORS[status as keyof typeof CASE_STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}
    >
      {t(`caseStatus.${status}`, status)}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}
    >
      {t(`reportStatus.${status}`, status)}
    </span>
  );
}

function UserStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-400',
    LOCKED: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    BANNED: 'bg-red-500/15 text-red-700 dark:text-red-400',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {t(`status.${status}`, status)}
    </span>
  );
}

export default function ModerationCaseDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useModerationCaseDetail(id ?? null);
  const resolveMutation = useResolveModerationCase();

  const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
  const [selectedDecision, setSelectedDecision] = useState<Decision>('UPHOLD');
  const [resolutionNote, setResolutionNote] = useState('');
  const [revealedMediaIds, setRevealedMediaIds] = useState<string[]>([]);

  const moderationCase = data?.data;

  const isClosed =
    moderationCase?.status === 'UPHELD' ||
    moderationCase?.status === 'RESTORED' ||
    moderationCase?.status === 'EXPIRED';

  const handleResolve = () => {
    if (!moderationCase || !resolutionNote.trim()) return;
    resolveMutation.mutate(
      {
        id: moderationCase.id,
        decision: selectedDecision,
        resolutionNote: resolutionNote.trim(),
      },
      {
        onSuccess: () => {
          router.push('/moderation/cases');
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

  if (!moderationCase) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{t('moderation.notFound')}</p>
        <Link href="/moderation/cases">
          <Button variant="secondary" className="mt-4">
            {t('moderation.backToList')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/moderation/cases" className="text-muted-foreground hover:text-foreground">
          {t('nav.moderation')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{t('moderation.caseDetailTitle')}</span>
        <CaseStatusBadge status={moderationCase.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t(`targetType.${moderationCase.targetType}`, moderationCase.targetType)}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t(`moderationTrigger.${moderationCase.trigger}`, moderationCase.trigger)}
              </span>
              <h3 className="text-sm font-semibold">{t('moderation.targetContent')}</h3>
              {(moderationCase.reportCount ?? 0) >= 2 && (
                <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                  {moderationCase.reportCount} {t('moderation.reportsLinked')}
                </span>
              )}
            </div>

            {moderationCase.targetContent ? (
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {moderationCase.targetContent}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('moderation.contentUnavailable')}</p>
            )}

            {moderationCase.targetMedia && moderationCase.targetMedia.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {moderationCase.targetMedia.map((m) => {
                  const isRevealed = revealedMediaIds.includes(m.id);
                  const isVideo = m.kind === 'VIDEO';

                  return (
                    <div
                      key={m.id}
                      className="group relative flex aspect-video cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30"
                      onClick={() => {
                        if (!isRevealed) {
                          setRevealedMediaIds((prev) => [...prev, m.id]);
                        }
                      }}
                    >
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
                          alt={t('moderation.sensitiveMedia')}
                          className={`h-full w-full object-cover transition-all duration-300 ${
                            isRevealed ? '' : 'pointer-events-none scale-95 opacity-50 blur-2xl'
                          }`}
                        />
                      )}

                      {!isRevealed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-3 text-center transition-colors group-hover:bg-black/60">
                          <EyeOff className="mb-1 h-6 w-6 text-white/90" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                            {t('moderation.sensitiveContent')}
                          </span>
                          <span className="mt-0.5 text-[10px] text-white/70">
                            {t('moderation.clickToReveal')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {moderationCase.targetAuthor && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                  {moderationCase.targetAuthor.username[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    @{moderationCase.targetAuthor.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {moderationCase.targetAuthor.name}
                  </p>
                </div>
                <UserStatusBadge status={moderationCase.targetAuthor.status} />
              </div>
            )}
          </section>

          {moderationCase.author && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">{t('moderation.caseAuthor')}</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                  {moderationCase.author.username[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">@{moderationCase.author.username}</p>
                  {moderationCase.author.name && (
                    <p className="text-xs text-muted-foreground">{moderationCase.author.name}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">{t('moderation.openedAt')}: </span>
                {formatDate(moderationCase.openedAt, i18n.language)}
              </div>
            </section>
          )}

          {moderationCase.relatedReports && moderationCase.relatedReports.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">
                {t('moderation.relatedReports')} ({moderationCase.relatedReports.length})
              </h3>
              <div className="space-y-2">
                {moderationCase.relatedReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-1.5 rounded-lg bg-muted/20 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        @{r.reporter?.username ?? t('common.unknownUser')}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {t(`reportReason.${r.reason}`, r.reason)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <ReportStatusBadge status={r.status} />
                      <span className="text-muted-foreground">
                        {formatDate(r.createdAt, i18n.language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {moderationCase.appeals && moderationCase.appeals.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">
                {t('moderation.appeals')} ({moderationCase.appeals.length})
              </h3>
              <div className="space-y-2">
                {moderationCase.appeals.map((appeal) => (
                  <div key={appeal.id} className="rounded-lg bg-muted/20 px-3 py-2.5 text-xs">
                    <p className="text-sm">{appeal.message}</p>
                    <p className="mt-1 text-muted-foreground">
                      {t(`appealStatus.${appeal.status}`, appeal.status)} ·{' '}
                      {formatDate(appeal.createdAt, i18n.language)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className={segmentedControl.track}>
            {(['info', 'audit'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 justify-center py-1.5 ${segmentedControl.tab} ${
                  activeTab === tab
                    ? segmentedControl.tabActive
                    : segmentedControl.tabInactive
                }`}
              >
                {tab === 'info' ? t('moderation.tabActions') : t('moderation.tabAudit')}
              </button>
            ))}
          </div>

          {activeTab === 'info' ? (
            <section className="space-y-4 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">{t('moderation.actionPanelTitle')}</h3>

              {isClosed ? (
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <CaseStatusBadge status={moderationCase.status} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('moderation.caseClosed')}
                  </p>
                  {moderationCase.resolution && (
                    <p className="mt-1 text-xs">{moderationCase.resolution}</p>
                  )}
                  {moderationCase.closedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(moderationCase.closedAt, i18n.language)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('moderation.selectDecision')}
                    </label>
                    <div className="space-y-1.5">
                      {(['RESTORE', 'UPHOLD'] as const).map((decision) => (
                        <button
                          key={decision}
                          type="button"
                          onClick={() => setSelectedDecision(decision)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                            selectedDecision === decision
                              ? 'border-primary/50 bg-primary/10 text-primary'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          {t(`moderation.decision.${decision}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('moderation.resolutionNote')}
                      <span className="ml-1 text-red-400">*</span>
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder={t('moderation.resolutionNotePlaceholder')}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={resolveMutation.isPending || !resolutionNote.trim()}
                    onClick={handleResolve}
                    className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      selectedDecision === 'RESTORE'
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    {resolveMutation.isPending
                      ? t('moderation.resolving')
                      : t(`moderation.decision.${selectedDecision}`)}
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t('moderation.auditHistory')}</h3>
              {!moderationCase.auditLogs || moderationCase.auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('moderation.noAuditLogs')}</p>
              ) : (
                <div className="relative space-y-0">
                  {moderationCase.auditLogs.map((log, idx) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                        {idx < moderationCase.auditLogs.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                            {t(
                              AUDIT_ACTION_KEY_MAP[log.action] ?? `auditAction.${log.action}`,
                              log.action,
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{log.actor?.username ?? t('common.unknownUser')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(log.createdAt, i18n.language)}
                        </p>
                        {(() => {
                          const metadataItems = renderAuditMetadata(log.metadata, t);
                          return (
                            metadataItems.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground">
                                  {t('common.details')}
                                </summary>
                                <div className="mt-1 max-h-36 space-y-1 overflow-auto rounded bg-muted/30 p-2 text-xs">
                                  {metadataItems.map((item, metaIdx) => (
                                    <div key={metaIdx} className="flex gap-2">
                                      <span className="font-semibold text-muted-foreground">
                                        {item.label}:
                                      </span>
                                      <span className="break-all text-foreground">{item.value}</span>
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
  );
}
