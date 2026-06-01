'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

import { ChartState, StatChartCard } from '@/components/admin/stat-chart-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/chart';

type HashtagRow = {
  tag: string;
  count: number;
};

type Props = {
  data: HashtagRow[];
  isLoading?: boolean;
};

export function TopHashtagsBarChart({ data, isLoading }: Props) {
  const { t } = useTranslation();
  const chartConfig = {
    count: {
      label: t('charts.topHashtags.label'),
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const rows = data.map((h) => ({
    tag: `#${h.tag}`,
    count: h.count,
  }));
  const isEmpty = rows.length === 0;

  return (
    <StatChartCard
      title={t('charts.topHashtags.title')}
      description={t('charts.topHashtags.description')}
    >
      <ChartState
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage={t('charts.topHashtags.empty')}
      >
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-border/50" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="tag"
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={24} />
          </BarChart>
        </ChartContainer>
      </ChartState>
    </StatChartCard>
  );
}
