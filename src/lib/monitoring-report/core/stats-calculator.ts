import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';
import type { EmailStats, ClippingStats, OutletStats, OutletTypeDistribution } from '../types';

/**
 * Stats Calculator für Monitoring Reports
 *
 * Berechnet alle Statistiken aus Rohdaten:
 * - Email Performance (Open-Rate, CTR, Conversion-Rate)
 * - Clipping Performance (Reach, AVE, Sentiment, Top Outlets)
 * - Medientyp-Verteilung
 */
export class ReportStatsCalculator {
  /**
   * Berechnet Email-Statistiken
   *
   * @param sends - Email Campaign Sends
   * @param clippings - Media Clippings (für Conversion-Rate)
   * @returns Email Stats
   */
  calculateEmailStats(
    sends: EmailCampaignSend[],
    clippings: MediaClipping[]
  ): EmailStats {
    const total = sends.length;
    const delivered = sends.filter(s =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length;
    const opened = sends.filter(s =>
      s.status === 'opened' || s.status === 'clicked'
    ).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;

    // Conversion-Rate: Sends mit Clipping-Referenz
    const withClippings = sends.filter(s => s.clippingId).length;

    return {
      totalSent: total,
      delivered,
      opened,
      clicked,
      bounced,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      ctr: total > 0 ? Math.round((clicked / total) * 100) : 0,
      conversionRate: opened > 0 ? Math.round((withClippings / opened) * 100) : 0
    };
  }

  /**
   * Berechnet Clipping-Statistiken
   *
   * @param clippings - Media Clippings
   * @returns Clipping Stats
   */
  calculateClippingStats(clippings: MediaClipping[]): ClippingStats {
    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);
    const totalClippings = clippings.length;

    // Durchschnitts-Reichweite
    const avgReach = totalClippings > 0 ? Math.round(totalReach / totalClippings) : 0;

    // Sentiment Distribution
    const sentimentDistribution = {
      positive: clippings.filter(c => c.sentiment === 'positive').length,
      neutral: clippings.filter(c => c.sentiment === 'neutral').length,
      negative: clippings.filter(c => c.sentiment === 'negative').length
    };

    // Top Outlets (nach Reichweite sortiert, Top 5)
    const topOutlets = this.calculateTopOutlets(clippings);

    // Medientyp-Verteilung
    const outletTypeDistribution = this.calculateOutletTypeDistribution(clippings, totalClippings);

    return {
      totalClippings,
      totalReach,
      totalAVE,
      avgReach,
      sentimentDistribution,
      topOutlets,
      outletTypeDistribution
    };
  }

  /**
   * Berechnet Top Outlets nach Reichweite
   *
   * @param clippings - Media Clippings
   * @returns Top 5 Outlets
   */
  private calculateTopOutlets(clippings: MediaClipping[]): OutletStats[] {
    const outletStats = clippings.reduce((acc, clipping) => {
      const outlet = clipping.outletName || 'Unbekannt';
      if (!acc[outlet]) {
        acc[outlet] = { name: outlet, reach: 0, clippingsCount: 0 };
      }
      acc[outlet].reach += clipping.reach || 0;
      acc[outlet].clippingsCount += 1;
      return acc;
    }, {} as Record<string, OutletStats>);

    return Object.values(outletStats)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5);
  }

  /**
   * Berechnet Medientyp-Verteilung
   *
   * @param clippings - Media Clippings
   * @param totalClippings - Gesamt-Anzahl Clippings
   * @returns Outlet Type Distribution mit Prozent-Anteilen
   */
  private calculateOutletTypeDistribution(
    clippings: MediaClipping[],
    totalClippings: number
  ): OutletTypeDistribution[] {
    const outletTypeStats = clippings.reduce((acc, clipping) => {
      const type = clipping.outletType || 'Unbekannt';
      if (!acc[type]) {
        acc[type] = { type, count: 0, reach: 0, percentage: 0 };
      }
      acc[type].count += 1;
      acc[type].reach += clipping.reach || 0;
      return acc;
    }, {} as Record<string, OutletTypeDistribution>);

    // Prozent-Anteile berechnen
    return Object.values(outletTypeStats)
      .map(stat => ({
        ...stat,
        percentage: totalClippings > 0 ? Math.round((stat.count / totalClippings) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
}

// Singleton Export
export const reportStatsCalculator = new ReportStatsCalculator();
