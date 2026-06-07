'use client';

import { Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from './button';
import { Modal } from './modal';

import { apiFetch } from '@/lib/api-client';

type ReportReason =
  | 'SPAM'
  | 'BULLYING'
  | 'MINOR_SAFETY'
  | 'SELF_HARM'
  | 'VIOLENCE'
  | 'RESTRICTED_GOODS'
  | 'ADULT_CONTENT'
  | 'MISINFORMATION'
  | 'IP_VIOLATION'
  | 'NOT_INTERESTED';

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
};

const REASON_OPTIONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'SPAM',
    label: 'Spam',
    description: 'Nội dung rác, quảng cáo, tin nhắn hàng loạt hoặc lừa đảo.',
  },
  {
    value: 'BULLYING',
    label: 'Bắt nạt & Quấy rối',
    description: 'Nội dung công kích cá nhân, đe dọa hoặc làm nhục người khác.',
  },
  {
    value: 'MINOR_SAFETY',
    label: 'An toàn trẻ em',
    description: 'Các nội dung lạm dụng, bóc lột hoặc gây hại cho trẻ vị thành niên.',
  },
  {
    value: 'SELF_HARM',
    label: 'Tự gây hại',
    description: 'Nội dung khuyến khích hoặc mô tả hành vi tự tử, tự làm đau bản thân.',
  },
  {
    value: 'VIOLENCE',
    label: 'Bạo lực & Đe dọa',
    description: 'Đe dọa bạo lực ngoài đời thực hoặc kích động các hành vi bạo lực.',
  },
  {
    value: 'RESTRICTED_GOODS',
    label: 'Hàng hóa hạn chế',
    description: 'Mua bán vũ khí, chất gây nghiện, động vật hoang dã trái quy định.',
  },
  {
    value: 'ADULT_CONTENT',
    label: 'Khỏa thân & Nội dung người lớn',
    description: 'Hình ảnh, video khiêu dâm hoặc các hoạt động tình dục.',
  },
  {
    value: 'MISINFORMATION',
    label: 'Tin giả & Sai sự thật',
    description: 'Thông tin sai lệch gây hoang mang dư luận hoặc ảnh hưởng sức khỏe.',
  },
  {
    value: 'IP_VIOLATION',
    label: 'Vi phạm bản quyền',
    description: 'Nội dung sao chép không xin phép, vi phạm sở hữu trí tuệ.',
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Lý do khác / Không phù hợp',
    description: 'Nội dung không phù hợp với quy tắc chung nhưng không thuộc các mục trên.',
  },
];

export function ReportModal({ open, onClose, targetType, targetId }: Props) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReason) {
      toast.error('Vui lòng chọn một lý do báo cáo');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          reason: selectedReason,
          description: description.trim() || undefined,
        }),
      });

      if (res.success) {
        toast.success('Đã gửi báo cáo của bạn thành công. Cảm ơn bạn đã phản hồi!');
        setSelectedReason(null);
        setDescription('');
        onClose();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissOnEsc={!submitting} dismissOnBackdrop={!submitting}>
      <Modal.Backdrop />
      <Modal.Panel size="md" className="flex max-h-[85vh] flex-col">
        <Modal.Header title="Báo cáo nội dung vi phạm" closeDisabled={submitting} />

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <p className="text-muted-foreground text-sm">
              Nếu bạn thấy bài viết hoặc nội dung này vi phạm Tiêu chuẩn Cộng đồng của chúng tôi,
              hãy chọn lý do phù hợp để báo cáo cho đội ngũ kiểm duyệt xử lý.
            </p>

            <div className="space-y-2">
              <label className="text-foreground text-sm font-semibold">
                Lý do báo cáo <span className="text-destructive">*</span>
              </label>

              <div className="grid gap-2">
                {REASON_OPTIONS.map((opt) => {
                  const isSelected = selectedReason === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedReason(opt.value)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-primary ring-1'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        checked={isSelected}
                        onChange={() => setSelectedReason(opt.value)}
                        className="text-primary accent-primary mt-1 h-4 w-4 shrink-0"
                      />
                      <div className="space-y-0.5">
                        <div className="text-foreground font-medium">{opt.label}</div>
                        <div className="text-muted-foreground text-xs leading-normal">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label htmlFor="report-desc" className="text-foreground text-sm font-semibold">
                Mô tả chi tiết (Tùy chọn)
              </label>
              <textarea
                id="report-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập thêm chi tiết hoặc ngữ cảnh cụ thể..."
                className="border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary w-full rounded-xl border bg-transparent p-3 text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="border-border bg-muted/20 flex shrink-0 items-center justify-end gap-3 border-t p-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedReason}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Gửi báo cáo
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal.Panel>
    </Modal>
  );
}
