/**
 * Organization Stats Component
 * Zeigt Übersichts-Statistiken für alle Organizations
 */

'use client';

import { useTranslations } from 'next-intl';
import { Organization } from '@/types/organization';

interface Props {
  organizations: Organization[];
}

export default function OrganizationStats({ organizations }: Props) {
  const t = useTranslations('superadmin.stats');

  const stats = {
    total: organizations.length,
    starter: organizations.filter((o) => o.tier === 'STARTER').length,
    business: organizations.filter((o) => o.tier === 'BUSINESS').length,
    agentur: organizations.filter((o) => o.tier === 'AGENTUR').length,
    promo: organizations.filter((o) => o.accountType === 'promo').length,
    beta: organizations.filter((o) => o.accountType === 'beta').length,
    internal: organizations.filter((o) => o.accountType === 'internal').length,
  };

  const calculatePercentage = (value: number) => {
    if (stats.total === 0) return 0;
    return Math.round((value / stats.total) * 100);
  };

  interface StatCardProps {
    label: string;
    value: number;
    percentage?: number;
    color: string;
  }

  const StatCard = ({ label, value, percentage, color }: StatCardProps) => (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {percentage !== undefined && percentage > 0 && (
          <p className="text-sm text-zinc-500">({percentage}%)</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <StatCard
        label={t('totalOrganizations')}
        value={stats.total}
        color="text-zinc-900"
      />
      <StatCard
        label={t('starter')}
        value={stats.starter}
        percentage={calculatePercentage(stats.starter)}
        color="text-[#005fab]"
      />
      <StatCard
        label={t('business')}
        value={stats.business}
        percentage={calculatePercentage(stats.business)}
        color="text-[#005fab]"
      />
      <StatCard
        label={t('agentur')}
        value={stats.agentur}
        percentage={calculatePercentage(stats.agentur)}
        color="text-purple-600"
      />
      <StatCard
        label={t('promo')}
        value={stats.promo}
        percentage={calculatePercentage(stats.promo)}
        color="text-yellow-600"
      />
      <StatCard
        label={t('beta')}
        value={stats.beta}
        percentage={calculatePercentage(stats.beta)}
        color="text-green-600"
      />
      <StatCard
        label={t('internal')}
        value={stats.internal}
        percentage={calculatePercentage(stats.internal)}
        color="text-zinc-600"
      />
    </div>
  );
}
