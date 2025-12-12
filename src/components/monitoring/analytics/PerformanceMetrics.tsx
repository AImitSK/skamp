'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import {
  ChartBarIcon,
  NewspaperIcon,
  EyeIcon,
  CurrencyEuroIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';

interface PerformanceMetricsProps {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  openRate: number;
  conversionRate: number;
}

export const PerformanceMetrics = React.memo(function PerformanceMetrics({
  totalClippings,
  totalReach,
  totalAVE,
  openRate,
  conversionRate,
}: PerformanceMetricsProps) {
  const t = useTranslations('monitoring.analytics.performance');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="h-5 w-5 text-[#005fab]" />
        <Subheading>{t('title')}</Subheading>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          icon={NewspaperIcon}
          label={t('publications')}
          value={totalClippings.toString()}
        />

        <MetricCard
          icon={EyeIcon}
          label={t('totalReach')}
          value={totalReach.toLocaleString('de-DE')}
        />

        {totalAVE > 0 && (
          <MetricCard
            icon={CurrencyEuroIcon}
            label={t('totalAve')}
            value={`${totalAVE.toLocaleString('de-DE', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })} €`}
          />
        )}

        <MetricCard
          icon={ChartBarIcon}
          label={t('openRate')}
          value={`${openRate}%`}
        />

        <MetricCard
          icon={FaceSmileIcon}
          label={t('conversion')}
          value={`${conversionRate}%`}
          subtitle={t('conversionSubtitle')}
        />
      </div>
    </div>
  );
});

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
}

const MetricCard = React.memo(function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-gray-600" />
        <Text className="text-sm text-gray-600">{label}</Text>
      </div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {subtitle && <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>}
    </div>
  );
});
