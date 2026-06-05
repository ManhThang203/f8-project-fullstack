'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/shared/button';
import { useMyModerationCase, useSubmitAppeal } from '@/hooks/queries/use-moderation';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ admin xem xét',
  AUTO_HIDDEN: 'Nội dung đã bị ẩn tự động',
  RESOLVED_KEPT: 'Quyết định đã được giữ',
  RESOLVED_REMOVED: 'Nội dung đã bị gỡ bỏ',
  DISMISSED: 'Quyết định đã được gỡ bỏ',
};

const LABEL_LABELS: Record<string, string> = {
  TOXIC: 'Nội dung độc hại',
  SPAM: 'Spam',
  HARASSMENT: 'Quấy rối',
  HATE: 'Thù hận',
  SEXUAL: 'Nội dung nhạy cảm',
  VIOLENCE: 'Bạo lực',
  SELF_HARM: 'Tự hại',
  OTHER: 'Vi phạm khác',
};

export default function ModerationDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { data: caseData, isLoading, error } = useMyModerationCase(caseId);
  const appealMutation = useSubmitAppeal(caseId);
  const [appealMessage, setAppealMessage] = useState('');

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </main>
    );
  }

  if (error || !caseData) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8">
        <p className="text-sm text-muted-foreground">Không tìm thấy thông tin kiểm duyệt.</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted active:scale-[0.97]"
        >
          Về trang chủ
        </Link>
      </main>
    );
  }

  const canAppeal =
    !caseData.appeal &&
    ['PENDING', 'AUTO_HIDDEN', 'RESOLVED_KEPT', 'RESOLVED_REMOVED'].includes(caseData.status);

  const handleSubmitAppeal = () => {
    if (appealMessage.trim().length < 10) return;
    appealMutation.mutate(appealMessage.trim(), {
      onSuccess: () => setAppealMessage(''),
    });
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
          <ShieldAlert className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Thông báo kiểm duyệt</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(caseData.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {LABEL_LABELS[caseData.label] ?? caseData.label}
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              caseData.autoHidden
                ? 'bg-orange-500/10 text-orange-700'
                : 'bg-yellow-500/10 text-yellow-700',
            )}
          >
            {STATUS_LABELS[caseData.status] ?? caseData.status}
          </span>
        </div>

        {caseData.reason ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Lý do: </span>
            {caseData.reason}
          </p>
        ) : null}

        {caseData.resolutionNote ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Ghi chú từ admin: </span>
            {caseData.resolutionNote}
          </p>
        ) : null}

        {caseData.targetContent ? (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Nội dung của bạn</p>
            <p className="text-sm whitespace-pre-wrap text-foreground">{caseData.targetContent}</p>
          </div>
        ) : null}
      </div>

      {caseData.appeal ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-sm font-semibold">Kháng nghị của bạn</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {caseData.appeal.message}
          </p>
          <p className="text-xs text-muted-foreground">
            Trạng thái:{' '}
            {caseData.appeal.status === 'PENDING'
              ? 'Đang chờ admin duyệt'
              : caseData.appeal.status === 'APPROVED'
                ? 'Đã được chấp nhận'
                : 'Đã bị từ chối'}
          </p>
          {caseData.appeal.decisionNote ? (
            <p className="text-xs text-muted-foreground">
              Phản hồi admin: {caseData.appeal.decisionNote}
            </p>
          ) : null}
        </div>
      ) : canAppeal ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Gửi kháng nghị</h2>
          <p className="text-xs text-muted-foreground">
            Nếu bạn cho rằng đây là nhầm lẫn, hãy giải thích lý do (tối thiểu 10 ký tự).
          </p>
          <textarea
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            rows={4}
            value={appealMessage}
            onChange={(e) => setAppealMessage(e.target.value)}
            placeholder="Giải thích lý do kháng nghị..."
          />
          <Button
            className="w-full"
            onClick={handleSubmitAppeal}
            disabled={appealMutation.isPending || appealMessage.trim().length < 10}
          >
            {appealMutation.isPending ? 'Đang gửi...' : 'Gửi kháng nghị'}
          </Button>
        </div>
      ) : null}

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted active:scale-[0.97]"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
