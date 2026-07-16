import type { ReactNode } from 'react';

type Props = {
  /** Nội dung phần header cố định (tiêu đề thật hoặc skeleton). */
  header: ReactNode;
  children: ReactNode;
  /** Bật aria-busy + câu thông báo screen reader khi đang tải. */
  ariaBusy?: boolean;
  statusMessage?: string;
};

/** Khung layout chung cho trang chi tiết bài viết (dùng cho cả skeleton và nội dung thật). */
export function PostDetailShell({ header, children, ariaBusy, statusMessage }: Props) {
  return (
    <div
      className="bg-muted/20 flex h-[calc(100dvh-4rem)] max-lg:h-[calc(100dvh-4rem-4rem)] justify-center overflow-hidden"
      aria-busy={ariaBusy || undefined}
    >
      {statusMessage ? <span className="sr-only">{statusMessage}</span> : null}
      <div className="bg-background border-border flex h-full w-full max-w-[600px] flex-col overflow-hidden border-x shadow-xs">
        <div className="bg-background/80 border-border z-20 flex shrink-0 items-center border-b p-4 backdrop-blur-md">
          {header}
        </div>
        <div className="bg-background relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
