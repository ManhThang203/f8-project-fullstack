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
  resolved: number;
  rejected: number;
  actionTaken: number;
};

type Props = {
  breakdown?: Breakdown;
  isLoading?: boolean;
};

export function ReportStatusDonutChart({ breakdown, isLoading }: Props) {
  const { t } = useTranslation();

  const chartConfig = {
    pending: { label: t('charts.reportStatus.pending'), color: 'hsl(var(--chart-3))' },
    resolved: { label: t('charts.reportStatus.resolved'), color: 'hsl(var(--chart-2))' },
    rejected: { label: t('charts.reportStatus.rejected'), color: 'hsl(var(--chart-5))' },
    actionTaken: { label: t('charts.reportStatus.actionTaken'), color: 'hsl(var(--chart-1))' },
  } satisfies ChartConfig;

  const rows = breakdown
    ? [
        { status: 'pending' as const, value: breakdown.pending, fill: 'var(--color-pending)' },
        { status: 'resolved' as const, value: breakdown.resolved, fill: 'var(--color-resolved)' },
        { status: 'rejected' as const, value: breakdown.rejected, fill: 'var(--color-rejected)' },
        {
          status: 'actionTaken' as const,
          value: breakdown.actionTaken,
          fill: 'var(--color-actionTaken)',
        },
      ].filter((r) => r.value > 0)
    : [];

  const isEmpty = rows.length === 0;

  return (
    <StatChartCard
      title={t('charts.reportStatus.title')}
      description={t('charts.reportStatus.description')}
    >
      <ChartState
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage={t('charts.reportStatus.empty')}
      >
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-56 w-full max-w-[14rem] shrink-0"
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
                  <span className="font-medium text-foreground">({row.value})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartState>
    </StatChartCard>
  );
}
