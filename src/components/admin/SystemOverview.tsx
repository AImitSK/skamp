'use client';

import { ChartBarIcon, NewspaperIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Text, Strong } from '@/components/ui/text';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toDate } from '@/lib/utils/timestamp-utils';
import { useTranslations } from 'next-intl';

interface SystemOverviewProps {
  stats: {
    totalActiveTrackers: number;
    totalArticlesFoundToday: number;
    totalArticlesFoundTotal: number;
    totalAutoConfirmed: number;
    totalPending: number;
    lastCrawlRun?: {
      timestamp: any;
      duration: number;
      trackersProcessed: number;
      articlesFound: number;
      status: 'success' | 'failed';
      errorMessage?: string;
    };
  };
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

function StatCard({ title, value, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Text className="text-sm text-gray-500">{title}</Text>
          <Strong className="text-2xl mt-1">{value.toLocaleString('de-DE')}</Strong>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function SystemOverview({ stats }: SystemOverviewProps) {
  const t = useTranslations('superadmin.monitoring.systemOverview');

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('stats.activeTrackers')}
          value={stats.totalActiveTrackers}
          icon={ChartBarIcon}
          color="blue"
        />

        <StatCard
          title={t('stats.articlesToday')}
          value={stats.totalArticlesFoundToday}
          icon={NewspaperIcon}
          color="blue"
        />

        <StatCard
          title={t('stats.autoConfirmed')}
          value={stats.totalAutoConfirmed}
          icon={CheckCircleIcon}
          color="green"
        />

        <StatCard
          title={t('stats.pendingReview')}
          value={stats.totalPending}
          icon={ClockIcon}
          color="yellow"
        />
      </div>

      {/* Last Crawl Run Info */}
      {stats.lastCrawlRun && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Text className="text-sm font-medium text-gray-700 mb-3">{t('lastCrawl.title')}</Text>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Text className="text-xs text-gray-500">{t('lastCrawl.timestamp')}</Text>
              <Text className="text-sm font-medium">
                {(() => {
                  const date = toDate(stats.lastCrawlRun.timestamp);
                  return date ? formatDistanceToNow(date, { addSuffix: true, locale: de }) : '-';
                })()}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-gray-500">{t('lastCrawl.trackersProcessed')}</Text>
              <Text className="text-sm font-medium">{stats.lastCrawlRun.trackersProcessed}</Text>
            </div>
            <div>
              <Text className="text-xs text-gray-500">{t('lastCrawl.articlesFound')}</Text>
              <Text className="text-sm font-medium">{stats.lastCrawlRun.articlesFound}</Text>
            </div>
            <div>
              <Text className="text-xs text-gray-500">{t('lastCrawl.status')}</Text>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  stats.lastCrawlRun.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {stats.lastCrawlRun.status === 'success' ? t('lastCrawl.statusSuccess') : t('lastCrawl.statusError')}
              </span>
            </div>
          </div>
          {stats.lastCrawlRun.errorMessage && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <Text className="text-sm text-red-700">{stats.lastCrawlRun.errorMessage}</Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
