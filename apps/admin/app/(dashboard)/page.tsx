'use client';

import {
  Activity,
  CalendarDays,
  CalendarRange,
  FileText,
  Flag,
  Hash,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ActiveUsersChart } from '@/components/admin/charts/active-users-chart';
import { PostsPerDayChart } from '@/components/admin/charts/posts-per-day-chart';
import { ReportStatusDonutChart } from '@/components/admin/charts/report-status-donut-chart';
import { TopHashtagsBarChart } from '@/components/admin/charts/top-hashtags-bar-chart';
import { KpiCard } from '@/components/admin/kpi-card';
import {
  useActiveUsers,
  usePostsPerDay,
  useStatsOverview,
  useTopHashtags,
} from '@/hooks/queries/use-admin-queries';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: overview, isLoading: overviewLoading } = useStatsOverview('30d');
  const { data: postsPerDay, isLoading: postsLoading } = usePostsPerDay('30d');
  const { data: activeUsers, isLoading: activeLoading } = useActiveUsers('30d');
  const { data: topHashtags, isLoading: hashtagsLoading } = useTopHashtags('7d');

  const stats = overview?.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title={t('dashboard.totalUsers')}
          value={stats?.totalUsers ?? '—'}
          href="/users"
          linkLabel={t('dashboard.linkUsers')}
          icon={Users}
        />
        <KpiCard
          title={t('dashboard.newUsersToday')}
          value={stats?.newUsersToday ?? '—'}
          icon={UserPlus}
        />
        <KpiCard title={t('dashboard.dau')} value={stats?.dau ?? '—'} icon={Activity} />
        <KpiCard title={t('dashboard.wau')} value={stats?.wau ?? '—'} icon={CalendarDays} />
        <KpiCard title={t('dashboard.mau')} value={stats?.mau ?? '—'} icon={CalendarRange} />
        <KpiCard title={t('dashboard.postsToday')} value={stats?.postsToday ?? '—'} icon={FileText} />
        <KpiCard
          title={t('dashboard.pendingReports')}
          value={stats?.pendingReports ?? '—'}
          href="/reports"
          linkLabel={t('dashboard.linkReports')}
          icon={Flag}
        />
        <KpiCard
          title={t('dashboard.activeHashtags')}
          value={stats?.activeHashtags ?? '—'}
          href="/hashtags"
          linkLabel={t('dashboard.linkHashtags')}
          icon={Hash}
        />
        <KpiCard
          title={t('dashboard.reportResolutionRate')}
          value={stats ? `${stats.reportResolutionRate}%` : '—'}
          href="/reports"
          linkLabel={t('dashboard.linkReports')}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PostsPerDayChart data={postsPerDay?.data ?? []} isLoading={postsLoading} />
        <ActiveUsersChart data={activeUsers?.data ?? []} isLoading={activeLoading} />
      </div>

      <TopHashtagsBarChart data={topHashtags?.data ?? []} isLoading={hashtagsLoading} />

      <ReportStatusDonutChart
        breakdown={stats?.reportStatusBreakdown}
        isLoading={overviewLoading}
      />
    </div>
  );
}
