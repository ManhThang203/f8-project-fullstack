'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

import { ChartState, StatChartCard } from '@/components/admin/stat-chart-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/chart';
import {
  fillDateSeries,
  formatChartDate,
  formatChartTooltipDate,
  type DateSeriesPoint,
} from '@/lib/chart-utils';

type Props = {
  data: DateSeriesPoint[];
  isLoading?: boolean;
};

export function PostsPerDayChart({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const chartConfig = {
    count: {
      label: t('charts.postsPerDay.label'),
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const series = fillDateSeries(data, 30);
  const isEmpty = series.every((p) => p.count === 0);

  return (
    <StatChartCard
      title={t('charts.postsPerDay.title')}
      description={t('charts.postsPerDay.description')}
    >
      <ChartState
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage={t('charts.postsPerDay.empty')}
      >
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatChartDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date as string | undefined;
                    return date ? formatChartTooltipDate(date) : '';
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </ChartState>
    </StatChartCard>
  );
}
