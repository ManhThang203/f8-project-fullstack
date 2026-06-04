'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeOff } from 'lucide-react';
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

const ACTION_LABELS: Record<ActionType, string> = {
  DISMISS: 'Bỏ qua — không vi phạm',
  HIDE_POST: 'Ẩn bài viết',
  DELETE_POST: 'Xóa bài viết',
  WARN_USER: 'Cảnh báo người dùng',
  BAN_ACCOUNT: 'Ban tài khoản',
};

const ACTION_COLORS: Record<ActionType, string> = {
  DISMISS: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
  HIDE_POST: 'bg-yellow-600 hover:bg-yellow-500 text-white',
  DELETE_POST: 'bg-red-600 hover:bg-red-500 text-white',
  WARN_USER: 'bg-orange-600 hover:bg-orange-500 text-white',
  BAN_ACCOUNT: 'bg-red-900 hover:bg-red-800 text-white',
};

const POST_ACTIONS: ActionType[] = ['DISMISS', 'HIDE_POST', 'DELETE_POST', 'WARN_USER', 'BAN_ACCOUNT'];
const USER_ACTIONS: ActionType[] = ['DISMISS', 'WARN_USER', 'BAN_ACCOUNT'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN');
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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {t(`reportStatus.${status}`, t(`status.${status}`, status))}
    </span>
  );
}

export default function ReportDetailPage() {
  const { t } = useTranslation();
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

  const report = data?.data;

  const availableActions =
    report?.targetType === 'POST' ? POST_ACTIONS : USER_ACTIONS;

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
        resolutionNote: resolutionNote || ACTION_LABELS[selectedAction],
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
        <p className="text-muted-foreground">Không tìm thấy báo cáo</p>
        <Link href="/reports">
          <Button variant="secondary" className="mt-4">
            ← Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const isResolved = report.status === 'RESOLVED' || report.status === 'DISMISSED' || report.status === 'AUTO_HIDDEN';

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground">
          Báo cáo
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{t('reportDetail.title')}</span>
        <StatusBadge status={report.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ── Left column (3/5) ───────────────────────── */}
        <div className="space-y-4 lg:col-span-3">

          {/* Target content */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t(`targetType.${report.targetType}`, report.targetType)}
              </span>
              <h3 className="text-sm font-semibold">Nội dung bị báo cáo</h3>
              {(report.reportCount ?? 0) >= 2 && (
                <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                  {report.reportCount} báo cáo
                </span>
              )}
            </div>

            {report.targetContent ? (
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.targetContent}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không thể tải nội dung</p>
            )}

            {/* Target media with click-to-reveal */}
            {report.targetMedia && report.targetMedia.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.targetMedia.map((m) => {
                  const isRevealed = revealedMediaIds.includes(m.id);
                  const isVideo = m.kind === 'VIDEO';

                  return (
                    <div
                      key={m.id}
                      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/30 flex items-center justify-center cursor-pointer select-none"
                      onClick={() => {
                        if (!isRevealed) {
                          setRevealedMediaIds((prev) => [...prev, m.id]);
                        }
                      }}
                    >
                      {/* Media content */}
                      {isVideo ? (
                        <video
                          src={m.publicUrl ?? undefined}
                          controls={isRevealed}
                          className={`h-full w-full object-cover transition-all duration-300 ${
                            isRevealed ? '' : 'blur-2xl scale-95 opacity-50 pointer-events-none'
                          }`}
                        />
                      ) : (
                        <img
                          src={m.publicUrl ?? undefined}
                          alt="Báo cáo đính kèm"
                          className={`h-full w-full object-cover transition-all duration-300 ${
                            isRevealed ? '' : 'blur-2xl scale-95 opacity-50 pointer-events-none'
                          }`}
                        />
                      )}

                      {/* Cover overlay when blurred */}
                      {!isRevealed && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-3 transition-colors group-hover:bg-black/60">
                          <EyeOff className="h-6 w-6 text-white/90 mb-1" />
                          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                            Nội dung nhạy cảm
                          </span>
                          <span className="text-[10px] text-white/70 mt-0.5">
                            Click để hiển thị
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
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                  {report.targetAuthor.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">@{report.targetAuthor.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{report.targetAuthor.name}</p>
                </div>
                <StatusBadge status={report.targetAuthor.status} />
              </div>
            )}
          </section>

          {/* Reporter info */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Thông tin người báo cáo</h3>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                {(report.reporter?.username ?? 'U')[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  @{report.reporter?.username ?? t('common.unknownUser')}
                </p>
                {report.reporter?.name && (
                  <p className="text-xs text-muted-foreground">{report.reporter.name}</p>
                )}
              </div>
            </div>
            {report.description && (
              <div className="mt-3 rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Mô tả thêm từ reporter:</p>
                <p className="text-sm">{report.description}</p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Lý do: </span>
                {t(`reportReason.${report.reason}`, report.reason)}
              </div>
              <div>
                <span className="font-medium">Báo cáo lúc: </span>
                {formatDate(report.createdAt)}
              </div>
            </div>
          </section>

          {/* Related reports */}
          {report.relatedReports && report.relatedReports.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">
                Báo cáo liên quan ({report.relatedReports.length})
              </h3>
              <div className="space-y-2">
                {report.relatedReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-1.5 rounded-lg bg-muted/20 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-3"
                  >
                    {/* Row 1 (mobile): reporter + reason */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        @{r.reporter?.username ?? t('common.unknownUser')}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {t(`reportReason.${r.reason}`, r.reason)}
                      </span>
                    </div>
                    {/* Row 2 (mobile): status + date */}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <StatusBadge status={r.status} />
                      <span className="text-muted-foreground">
                        {formatDate(r.createdAt)}
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
                  activeTab === tab
                    ? segmentedControl.tabActive
                    : segmentedControl.tabInactive
                }`}
              >
                {tab === 'info' ? 'Xử lý' : 'Audit Log'}
              </button>
            ))}
          </div>

          {activeTab === 'info' ? (
            /* Action form */
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold">Hành động kiểm duyệt</h3>

              {isResolved ? (
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <StatusBadge status={report.status} />
                  <p className="mt-2 text-xs text-muted-foreground">Báo cáo đã được xử lý</p>
                  {report.resolutionNote && (
                    <p className="mt-1 text-xs">{report.resolutionNote}</p>
                  )}
                  {report.reviewedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(report.reviewedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Mark under review */}
                  {report.status === 'PENDING' && (
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
                      Đánh dấu đang xem xét
                    </Button>
                  )}

                  {/* Action select */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Chọn hành động
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
                          {ACTION_LABELS[action]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Ghi chú xử lý
                      <span className="ml-1 text-red-400">*</span>
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder={`Lý do ${ACTION_LABELS[selectedAction].toLowerCase()}…`}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Ban date (optional) */}
                  {selectedAction === 'BAN_ACCOUNT' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Thời hạn ban (để trống = vĩnh viễn)
                      </label>
                      <input
                        type="datetime-local"
                        value={bannedUntil}
                        onChange={(e) => setBannedUntil(e.target.value)}
                        className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}

                  {/* Confirm delete warning */}
                  {confirmDelete && selectedAction === 'DELETE_POST' && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                      ⚠ Hành động này không thể hoàn tác. Bài viết sẽ bị xóa vĩnh viễn.
                      Nhấn nút bên dưới để xác nhận.
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    disabled={actionMutation.isPending || !resolutionNote.trim()}
                    onClick={handleAction}
                    className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${ACTION_COLORS[selectedAction]}`}
                  >
                    {actionMutation.isPending
                      ? 'Đang xử lý…'
                      : confirmDelete
                      ? '⚠ Xác nhận xóa bài'
                      : ACTION_LABELS[selectedAction]}
                  </button>
                </>
              )}
            </section>
          ) : (
            /* Audit log timeline */
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">Lịch sử hành động</h3>
              {!report.auditLogs || report.auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có hành động nào</p>
              ) : (
                <div className="relative space-y-0">
                  {report.auditLogs.map((log, idx) => (
                    <div key={log.id} className="flex gap-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary/60 flex-shrink-0" />
                        {idx < report.auditLogs.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                            {t(AUDIT_ACTION_KEY_MAP[log.action] ?? `auditAction.${log.action}`, log.action)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{log.actor?.username ?? t('common.unknownUser')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </p>
                        {(() => {
                          const metadataItems = renderAuditMetadata(log.metadata, t);
                          return metadataItems.length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground">
                                {t('common.details')}
                              </summary>
                              <div className="mt-1 rounded bg-muted/30 p-2 text-xs space-y-1 max-h-36 overflow-auto">
                                {metadataItems.map((item, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <span className="font-semibold text-muted-foreground">{item.label}:</span>
                                    <span className="text-foreground break-all">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
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
