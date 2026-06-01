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

const cardClassName = 'rounded-xl border border-border bg-card p-4 shadow-sm';

export function KpiCard({
  title,
  value,
  subtitle,
  href,
  linkLabel,
  icon: Icon,
  className,
}: Props) {
  return (
    <div className={cn(cardClassName, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      {href && linkLabel ? (
        <Link
          href={href}
          className="mt-3 inline-flex w-fit min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
