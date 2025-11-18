'use client';

import { useMemo } from 'react';
import { MediaClipping } from '@/types/monitoring';
import { EmailCampaignSend } from '@/types/email';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useAVECalculation } from '@/lib/hooks/useAVECalculation';
import { useClippingStats } from '@/lib/hooks/useClippingStats';
import { PerformanceMetrics } from './analytics/PerformanceMetrics';
import { TimelineChart } from './analytics/TimelineChart';
import { MediaDistributionChart } from './analytics/MediaDistributionChart';
import { SentimentChart } from './analytics/SentimentChart';
import { TopOutletsChart } from './analytics/TopOutletsChart';
import { EmptyState } from './analytics/EmptyState';

interface MonitoringDashboardProps {
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}

export function MonitoringDashboard({ clippings, sends }: MonitoringDashboardProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  // React Query Hook für AVE-Berechnung
  const { calculateAVE } = useAVECalculation(
    currentOrganization?.id,
    user?.uid
  );

  // Hook für Stats-Aggregation
  const stats = useClippingStats(clippings, sends);

  // Gesamt-AVE mit Memoization
  const totalAVE = useMemo(
    () => clippings.reduce((sum, c) => sum + calculateAVE(c), 0),
    [clippings, calculateAVE]
  );

  if (clippings.length === 0 && sends.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <PerformanceMetrics
        totalClippings={stats.totalClippings}
        totalReach={stats.totalReach}
        totalAVE={totalAVE}
        openRate={stats.emailStats.openRate}
        conversionRate={stats.emailStats.conversionRate}
      />

      <TimelineChart data={stats.timelineData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MediaDistributionChart data={stats.outletDistribution} />
        <SentimentChart data={stats.sentimentData} />
      </div>

      <TopOutletsChart data={stats.topOutlets} />
    </div>
  );
}
