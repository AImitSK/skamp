import { ReportStatsCalculator } from '../../core/stats-calculator';
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';
import { Timestamp } from 'firebase/firestore';

describe('ReportStatsCalculator', () => {
  let calculator: ReportStatsCalculator;

  beforeEach(() => {
    calculator = new ReportStatsCalculator();
  });

  describe('calculateEmailStats', () => {
    it('sollte Statistiken für leere Sends berechnen', () => {
      const sends: EmailCampaignSend[] = [];
      const clippings: MediaClipping[] = [];

      const result = calculator.calculateEmailStats(sends, clippings);

      expect(result).toEqual({
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        openRate: 0,
        clickRate: 0,
        ctr: 0,
        conversionRate: 0
      });
    });

    it('sollte korrekte Email-Statistiken berechnen', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'delivered' } as EmailCampaignSend,
        { id: '2', status: 'opened' } as EmailCampaignSend,
        { id: '3', status: 'opened' } as EmailCampaignSend,
        { id: '4', status: 'clicked' } as EmailCampaignSend,
        { id: '5', status: 'clicked' } as EmailCampaignSend,
        { id: '6', status: 'bounced' } as EmailCampaignSend,
        { id: '7', status: 'pending' } as EmailCampaignSend,
        { id: '8', status: 'failed' } as EmailCampaignSend
      ];

      const result = calculator.calculateEmailStats(sends, []);

      expect(result.totalSent).toBe(8);
      expect(result.delivered).toBe(5);
      expect(result.opened).toBe(4);
      expect(result.clicked).toBe(2);
      expect(result.bounced).toBe(1);
      expect(result.openRate).toBe(50);
      expect(result.clickRate).toBe(50);
      expect(result.ctr).toBe(25);
    });

    it('sollte Conversion-Rate basierend auf clippingId berechnen', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'opened', clippingId: 'clip-1' } as EmailCampaignSend,
        { id: '2', status: 'opened', clippingId: 'clip-2' } as EmailCampaignSend,
        { id: '3', status: 'opened' } as EmailCampaignSend,
        { id: '4', status: 'opened' } as EmailCampaignSend
      ];

      const result = calculator.calculateEmailStats(sends, []);

      expect(result.opened).toBe(4);
      expect(result.conversionRate).toBe(50);
    });

    it('sollte Conversion-Rate 0 sein wenn keine Öffnungen', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'delivered', clippingId: 'clip-1' } as EmailCampaignSend,
        { id: '2', status: 'pending' } as EmailCampaignSend
      ];

      const result = calculator.calculateEmailStats(sends, []);

      expect(result.conversionRate).toBe(0);
    });

    it('sollte Click-Rate 0 sein wenn keine Öffnungen', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'delivered' } as EmailCampaignSend,
        { id: '2', status: 'bounced' } as EmailCampaignSend
      ];

      const result = calculator.calculateEmailStats(sends, []);

      expect(result.clickRate).toBe(0);
    });

    it('sollte Prozentwerte runden', () => {
      const sends: EmailCampaignSend[] = [
        { id: '1', status: 'delivered' } as EmailCampaignSend,
        { id: '2', status: 'opened' } as EmailCampaignSend,
        { id: '3', status: 'pending' } as EmailCampaignSend
      ];

      const result = calculator.calculateEmailStats(sends, []);

      expect(result.openRate).toBe(33);
    });
  });

  describe('calculateClippingStats', () => {
    it('sollte Statistiken für leere Clippings berechnen', () => {
      const clippings: MediaClipping[] = [];

      const result = calculator.calculateClippingStats(clippings);

      expect(result).toEqual({
        totalClippings: 0,
        totalReach: 0,
        totalAVE: 0,
        avgReach: 0,
        sentimentDistribution: {
          positive: 0,
          neutral: 0,
          negative: 0
        },
        topOutlets: [],
        outletTypeDistribution: []
      });
    });

    it('sollte Gesamt-Reichweite und AVE korrekt summieren', () => {
      const clippings: MediaClipping[] = [
        { id: '1', reach: 10000, ave: 5000 } as MediaClipping,
        { id: '2', reach: 20000, ave: 8000 } as MediaClipping,
        { id: '3', reach: 15000, ave: 7000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.totalClippings).toBe(3);
      expect(result.totalReach).toBe(45000);
      expect(result.totalAVE).toBe(20000);
      expect(result.avgReach).toBe(15000);
    });

    it('sollte fehlende Reach/AVE Werte als 0 behandeln', () => {
      const clippings: MediaClipping[] = [
        { id: '1', reach: undefined, ave: undefined } as MediaClipping,
        { id: '2', reach: 10000, ave: 5000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.totalReach).toBe(10000);
      expect(result.totalAVE).toBe(5000);
    });

    it('sollte Sentiment-Verteilung korrekt berechnen', () => {
      const clippings: MediaClipping[] = [
        { id: '1', sentiment: 'positive' } as MediaClipping,
        { id: '2', sentiment: 'positive' } as MediaClipping,
        { id: '3', sentiment: 'positive' } as MediaClipping,
        { id: '4', sentiment: 'neutral' } as MediaClipping,
        { id: '5', sentiment: 'neutral' } as MediaClipping,
        { id: '6', sentiment: 'negative' } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.sentimentDistribution).toEqual({
        positive: 3,
        neutral: 2,
        negative: 1
      });
    });

    it('sollte Top 5 Outlets nach Reichweite sortieren', () => {
      const clippings: MediaClipping[] = [
        { id: '1', outletName: 'Outlet A', reach: 50000 } as MediaClipping,
        { id: '2', outletName: 'Outlet A', reach: 30000 } as MediaClipping,
        { id: '3', outletName: 'Outlet B', reach: 60000 } as MediaClipping,
        { id: '4', outletName: 'Outlet C', reach: 10000 } as MediaClipping,
        { id: '5', outletName: 'Outlet D', reach: 40000 } as MediaClipping,
        { id: '6', outletName: 'Outlet E', reach: 20000 } as MediaClipping,
        { id: '7', outletName: 'Outlet F', reach: 5000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.topOutlets).toHaveLength(5);
      expect(result.topOutlets[0]).toEqual({
        name: 'Outlet A',
        reach: 80000,
        clippingsCount: 2
      });
      expect(result.topOutlets[1]).toEqual({
        name: 'Outlet B',
        reach: 60000,
        clippingsCount: 1
      });
      expect(result.topOutlets[2]).toEqual({
        name: 'Outlet D',
        reach: 40000,
        clippingsCount: 1
      });
      expect(result.topOutlets[3]).toEqual({
        name: 'Outlet E',
        reach: 20000,
        clippingsCount: 1
      });
      expect(result.topOutlets[4]).toEqual({
        name: 'Outlet C',
        reach: 10000,
        clippingsCount: 1
      });
    });

    it('sollte fehlende outletName als Unbekannt behandeln', () => {
      const clippings: MediaClipping[] = [
        { id: '1', outletName: undefined, reach: 10000 } as MediaClipping,
        { id: '2', outletName: 'Test Outlet', reach: 20000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      const unbekanntes = result.topOutlets.find(o => o.name === 'Unbekannt');
      expect(unbekanntes).toEqual({
        name: 'Unbekannt',
        reach: 10000,
        clippingsCount: 1
      });
    });

    it('sollte Outlet-Typ Verteilung korrekt berechnen', () => {
      const clippings: MediaClipping[] = [
        { id: '1', outletType: 'online', reach: 10000 } as MediaClipping,
        { id: '2', outletType: 'online', reach: 15000 } as MediaClipping,
        { id: '3', outletType: 'online', reach: 20000 } as MediaClipping,
        { id: '4', outletType: 'print', reach: 30000 } as MediaClipping,
        { id: '5', outletType: 'print', reach: 25000 } as MediaClipping,
        { id: '6', outletType: 'broadcast', reach: 50000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.outletTypeDistribution).toHaveLength(3);

      const online = result.outletTypeDistribution.find(d => d.type === 'online');
      expect(online).toEqual({
        type: 'online',
        count: 3,
        reach: 45000,
        percentage: 50
      });

      const print = result.outletTypeDistribution.find(d => d.type === 'print');
      expect(print).toEqual({
        type: 'print',
        count: 2,
        reach: 55000,
        percentage: 33
      });

      const broadcast = result.outletTypeDistribution.find(d => d.type === 'broadcast');
      expect(broadcast).toEqual({
        type: 'broadcast',
        count: 1,
        reach: 50000,
        percentage: 17
      });
    });

    it('sollte Outlet-Typ Verteilung nach Count sortieren', () => {
      const clippings: MediaClipping[] = [
        { id: '1', outletType: 'online' } as MediaClipping,
        { id: '2', outletType: 'print' } as MediaClipping,
        { id: '3', outletType: 'print' } as MediaClipping,
        { id: '4', outletType: 'print' } as MediaClipping,
        { id: '5', outletType: 'online' } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      expect(result.outletTypeDistribution[0].type).toBe('print');
      expect(result.outletTypeDistribution[1].type).toBe('online');
    });

    it('sollte fehlende outletType als Unbekannt behandeln', () => {
      const clippings: MediaClipping[] = [
        { id: '1', outletType: undefined, reach: 10000 } as MediaClipping,
        { id: '2', outletType: 'online', reach: 20000 } as MediaClipping
      ];

      const result = calculator.calculateClippingStats(clippings);

      const unbekannt = result.outletTypeDistribution.find(d => d.type === 'Unbekannt');
      expect(unbekannt).toBeDefined();
      expect(unbekannt?.count).toBe(1);
      expect(unbekannt?.reach).toBe(10000);
    });
  });
});
