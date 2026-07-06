import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Khối nội dung cài đặt với tiêu đề và mô tả ngắn. */
export function SettingsSection({ title, description, children, className }: Props) {
  return (
    <section className={cn('border-border bg-card rounded-2xl border p-4 sm:p-6', className)}>
      <div className="mb-5 space-y-1">
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
