'use client';

import { Cell, Pie, PieChart } from 'recharts';
import { useTranslation } from 'react-i18next';

import { ChartState, StatChartCard } from '@/components/admin/stat-chart-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/chart';

type Breakdown = {
  pending: number;
  autoHidden: number;
  resolvedKept: number;
  resolvedRemoved: number;
  dismissed: number;
};

type Props = {
  breakdown?: Breakdown;
  isLoading?: boolean;
};

export function ModerationStatusDonutChart({ breakdown, isLoading }: Props) {
  const { t } = useTranslation();

  const chartConfig = {
    pending: { label: t('charts.moderationStatus.pending'), color: 'hsl(var(--chart-3))' },
    autoHidden: { label: t('charts.moderationStatus.autoHidden'), color: 'hsl(var(--chart-1))' },
    resolvedKept: {
      label: t('charts.moderationStatus.resolvedKept'),
      color: 'hsl(var(--chart-2))',
    },
    resolvedRemoved: {
      label: t('charts.moderationStatus.resolvedRemoved'),
      color: 'hsl(var(--chart-5))',
    },
    dismissed: { label: t('charts.moderationStatus.dismissed'), color: 'hsl(var(--chart-4))' },
  } satisfies ChartConfig;

  const rows = breakdown
    ? [
        { status: 'pending' as const, value: breakdown.pending, fill: 'var(--color-pending)' },
        {
          status: 'autoHidden' as const,
          value: breakdown.autoHidden,
          fill: 'var(--color-autoHidden)',
        },
        {
          status: 'resolvedKept' as const,
          value: breakdown.resolvedKept,
          fill: 'var(--color-resolvedKept)',
        },
        {
          status: 'resolvedRemoved' as const,
          value: breakdown.resolvedRemoved,
          fill: 'var(--color-resolvedRemoved)',
        },
        {
          status: 'dismissed' as const,
          value: breakdown.dismissed,
          fill: 'var(--color-dismissed)',
        },
      ].filter((r) => r.value > 0)
    : [];

  const isEmpty = rows.length === 0;

  return (
    <StatChartCard
      title={t('charts.moderationStatus.title')}
      description={t('charts.moderationStatus.description')}
    >
      <ChartState
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage={t('charts.moderationStatus.empty')}
      >
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-56 w-full max-w-56 shrink-0"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
              <Pie
                data={rows}
                dataKey="value"
                nameKey="status"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {rows.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex flex-col gap-3 text-sm">
            {rows.map((row) => (
              <li key={row.status} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: chartConfig[row.status].color }}
                  aria-hidden
                />
                <span className="text-muted-foreground">
                  {chartConfig[row.status].label}{' '}
                  <span className="text-foreground font-medium">({row.value})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartState>
    </StatChartCard>
  );
}
