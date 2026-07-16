import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  icon?: LucideIcon;
  className?: string;
};

const cardClassName = 'rounded-xl border border-border bg-card p-4 shadow-xs';

export function KpiCard({ title, value, subtitle, href, linkLabel, icon: Icon, className }: Props) {
  return (
    <div className={cn(cardClassName, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm">{title}</p>
        {Icon ? (
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="text-foreground mt-1 text-2xl font-semibold">{value}</p>
      {subtitle ? <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p> : null}
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground mt-3 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium no-underline transition-colors"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
