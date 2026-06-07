'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  confidenceTier,
  CONFIDENCE_COLORS,
  isActionableModerationStatus,
  LABEL_COLORS,
  STATUS_COLORS,
  type ModerationCaseStatus,
  type ModerationLabel,
} from '@/components/admin/moderation/moderation.constants';
import { Button } from '@/components/shared/button';
import {
  useModerationCaseDetail,
  useResolveModerationCase,
  useReviewAppeal,
} from '@/hooks/queries/use-admin-queries';
import { cn } from '@/lib/utils';

type ActionType = 'KEEP' | 'REMOVE' | 'DISMISS';

const ACTION_LABELS: Record<ActionType, string> = {
  KEEP: 'Xác nhận vi phạm — giữ ẩn',
  REMOVE: 'Gỡ bỏ nội dung',
  DISMISS: 'Bỏ qua — không vi phạm, gỡ ẩn',
};

export default function ModerationCaseDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading } = useModerationCaseDetail(id);
  const resolveMutation = useResolveModerationCase();
  const appealMutation = useReviewAppeal();

  const [selectedAction, setSelectedAction] = useState<ActionType>('DISMISS');
  const [resolutionNote, setResolutionNote] = useState('');
  const [appealDecisionNote, setAppealDecisionNote] = useState('');

  const caseData = data?.data;

  const handleAction = () => {
    if (!caseData) return;
    resolveMutation.mutate(
      {
        id: caseData.id,
        action: selectedAction,
        resolutionNote: resolutionNote || ACTION_LABELS[selectedAction],
      },
      { onSuccess: () => router.push('/reports') },
    );
  };

  const handleAppeal = (decision: 'APPROVED' | 'REJECTED') => {
    if (!caseData) return;
    appealMutation.mutate({
      id: caseData.id,
      decision,
      decisionNote:
        appealDecisionNote ||
        (decision === 'APPROVED' ? 'Chấp nhận kháng nghị' : 'Từ chối kháng nghị'),
    });
  };

  if (isLoading || !caseData) {
    return (
      <div className="border-border bg-card rounded-xl border p-10 text-center">
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  const label = caseData.label as ModerationLabel;
  const status = caseData.status as ModerationCaseStatus;
  const tier = confidenceTier(caseData.confidence);
  const actionable = isActionableModerationStatus(status);

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/reports" className="hover:text-foreground">
          {t('nav.reports')}
        </Link>
        <span>/</span>
        <span>{t('moderation.detailTitle')}</span>
      </div>

      <div className="border-border bg-card space-y-4 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              LABEL_COLORS[label],
            )}
          >
            {t(`moderationLabel.${label}`, label)}
          </span>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              CONFIDENCE_COLORS[tier],
            )}
          >
            {Math.round(caseData.confidence * 100)}%
          </span>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              STATUS_COLORS[status],
            )}
          >
            {t(`moderationStatus.${status}`, status)}
          </span>
        </div>

        {caseData.targetContent ? (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="whitespace-pre-wrap text-sm">{caseData.targetContent}</p>
          </div>
        ) : null}

        {caseData.reason ? (
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">{t('moderation.aiReason')}: </span>
            {caseData.reason}
          </p>
        ) : null}

        {caseData.author ? (
          <p className="text-muted-foreground text-sm">
            {t('moderation.author')}: @{caseData.author.username}
          </p>
        ) : null}

        {caseData.resolutionNote ? (
          <p className="text-muted-foreground text-sm">
            {t('moderation.resolutionNote')}: {caseData.resolutionNote}
          </p>
        ) : null}
      </div>

      {caseData.appeal ? (
        <div className="border-border bg-card space-y-4 rounded-xl border p-6">
          <h3 className="font-semibold">{t('moderation.appealSection')}</h3>
          <p className="whitespace-pre-wrap text-sm">{caseData.appeal.message}</p>
          <p className="text-muted-foreground text-xs">
            {t(`appealStatus.${caseData.appeal.status}`, caseData.appeal.status)}
          </p>
          {caseData.appeal.status === 'PENDING' ? (
            <>
              <textarea
                className="border-border bg-background w-full rounded-lg border p-3 text-sm"
                rows={2}
                placeholder={t('moderation.appealDecisionPlaceholder')}
                value={appealDecisionNote}
                onChange={(e) => setAppealDecisionNote(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAppeal('APPROVED')}
                  disabled={appealMutation.isPending}
                >
                  {t('moderation.approveAppeal')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleAppeal('REJECTED')}
                  disabled={appealMutation.isPending}
                >
                  {t('moderation.rejectAppeal')}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {actionable ? (
        <div className="border-border bg-card space-y-4 rounded-xl border p-6">
          <h3 className="font-semibold">{t('moderation.actionSection')}</h3>
          <div className="flex flex-wrap gap-2">
            {(['DISMISS', 'KEEP', 'REMOVE'] as ActionType[]).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setSelectedAction(action)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  selectedAction === action
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
          <textarea
            className="border-border bg-background w-full rounded-lg border p-3 text-sm"
            rows={3}
            placeholder={t('moderation.resolutionPlaceholder')}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <Button onClick={handleAction} disabled={resolveMutation.isPending}>
            {t('moderation.confirmAction')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
