import { useMemo } from 'react';
import { MediaClipping } from '@/types/monitoring';
import { EmailCampaignSend } from '@/types/email';

interface TimelineDataPoint {
  date: string;
  clippings: number;
  reach: number;
}

interface OutletDistribution {
  name: string;
  count: number;
  reach: number;
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface TopOutlet {
  name: string;
  reach: number;
  count: number;
}

interface EmailStats {
  total: number;
  opened: number;
  clicked: number;
  withClippings: number;
  openRate: number;
  conversionRate: number;
}

export interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  timelineData: TimelineDataPoint[];
  outletDistribution: OutletDistribution[];
  sentimentData: SentimentData[];
  topOutlets: TopOutlet[];
  emailStats: EmailStats;
}

const BRAND_COLORS = {
  success: '#10b981',
  gray: '#6b7280',
  danger: '#ef4444',
};

/**
 * Hook für Clipping-Statistiken mit Memoization
 *
 * Berechnet alle Analytics-Metriken aus Clippings und Sends:
 * - Timeline (Veröffentlichungen über Zeit)
 * - Outlet-Verteilung (Medium-Typen)
 * - Sentiment-Verteilung
 * - Top 5 Outlets nach Reichweite
 * - Email-Stats (Öffnungsrate, Conversion)
 *
 * @param clippings - Array von MediaClipping
 * @param sends - Array von EmailCampaignSend
 * @returns Aggregierte Statistiken
 *
 * @example
 * ```tsx
 * const stats = useClippingStats(clippings, sends);
 *
 * <TimelineChart data={stats.timelineData} />
 * <SentimentChart data={stats.sentimentData} />
 * ```
 */
export function useClippingStats(
  clippings: MediaClipping[],
  sends: EmailCampaignSend[]
): ClippingStats {
  const totalClippings = clippings.length;

  const totalReach = useMemo(
    () => clippings.reduce((sum, c) => sum + (c.reach || 0), 0),
    [clippings]
  );

  const timelineData = useMemo(() => {
    const groupedByDate = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) return acc;

      const date = clipping.publishedAt.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
      });

      if (!acc[date]) {
        acc[date] = { date, clippings: 0, reach: 0 };
      }

      acc[date].clippings += 1;
      acc[date].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, TimelineDataPoint>);

    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [clippings]);

  const outletDistribution = useMemo(() => {
    const distribution = clippings.reduce((acc, clipping) => {
      const type = clipping.outletType || 'Unbekannt';
      if (!acc[type]) {
        acc[type] = { name: type, count: 0, reach: 0 };
      }
      acc[type].count += 1;
      acc[type].reach += clipping.reach || 0;
      return acc;
    }, {} as Record<string, OutletDistribution>);

    return Object.values(distribution);
  }, [clippings]);

  const sentimentData = useMemo(() => {
    const counts = {
      positive: clippings.filter((c) => c.sentiment === 'positive').length,
      neutral: clippings.filter((c) => c.sentiment === 'neutral').length,
      negative: clippings.filter((c) => c.sentiment === 'negative').length,
    };

    return [
      { name: 'Positiv', value: counts.positive, color: BRAND_COLORS.success },
      { name: 'Neutral', value: counts.neutral, color: BRAND_COLORS.gray },
      { name: 'Negativ', value: counts.negative, color: BRAND_COLORS.danger },
    ].filter((item) => item.value > 0);
  }, [clippings]);

  const topOutlets = useMemo(() => {
    const outletStats = clippings.reduce((acc, clipping) => {
      const outlet = clipping.outletName || 'Unbekannt';
      if (!acc[outlet]) {
        acc[outlet] = { name: outlet, reach: 0, count: 0 };
      }
      acc[outlet].reach += clipping.reach || 0;
      acc[outlet].count += 1;
      return acc;
    }, {} as Record<string, TopOutlet>);

    return Object.values(outletStats)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5);
  }, [clippings]);

  const emailStats = useMemo(() => {
    const total = sends.length;
    const opened = sends.filter((s) => s.status === 'opened' || s.status === 'clicked').length;
    const clicked = sends.filter((s) => s.status === 'clicked').length;
    const withClippings = sends.filter((s) => s.clippingId).length;

    return {
      total,
      opened,
      clicked,
      withClippings,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      conversionRate: opened > 0 ? Math.round((withClippings / opened) * 100) : 0,
    };
  }, [sends]);

  return {
    totalClippings,
    totalReach,
    timelineData,
    outletDistribution,
    sentimentData,
    topOutlets,
    emailStats,
  };
}
