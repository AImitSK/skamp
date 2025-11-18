import { renderHook } from '@testing-library/react';
import { useClippingStats } from './useClippingStats';
import { MediaClipping } from '@/types/monitoring';
import { EmailCampaignSend } from '@/types/email';

// Mock Firestore Timestamp
const createTimestamp = (date: Date) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
});

// Test-Daten
const mockClippings: MediaClipping[] = [
  {
    id: 'clip-1',
    organizationId: 'org-123',
    title: 'Article 1',
    url: 'https://example.com/1',
    outletName: 'Outlet A',
    outletType: 'online',
    reach: 10000,
    sentiment: 'positive',
    publishedAt: createTimestamp(new Date('2025-01-15')) as any,
    detectionMethod: 'manual',
    detectedAt: createTimestamp(new Date('2025-01-15')) as any,
    createdBy: 'user-123',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
    updatedAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'clip-2',
    organizationId: 'org-123',
    title: 'Article 2',
    url: 'https://example.com/2',
    outletName: 'Outlet B',
    outletType: 'print',
    reach: 50000,
    sentiment: 'neutral',
    publishedAt: createTimestamp(new Date('2025-01-15')) as any,
    detectionMethod: 'manual',
    detectedAt: createTimestamp(new Date('2025-01-15')) as any,
    createdBy: 'user-123',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
    updatedAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'clip-3',
    organizationId: 'org-123',
    title: 'Article 3',
    url: 'https://example.com/3',
    outletName: 'Outlet A',
    outletType: 'online',
    reach: 15000,
    sentiment: 'negative',
    publishedAt: createTimestamp(new Date('2025-01-16')) as any,
    detectionMethod: 'manual',
    detectedAt: createTimestamp(new Date('2025-01-16')) as any,
    createdBy: 'user-123',
    createdAt: createTimestamp(new Date('2025-01-16')) as any,
    updatedAt: createTimestamp(new Date('2025-01-16')) as any,
  },
];

const mockSends: EmailCampaignSend[] = [
  {
    id: 'send-1',
    campaignId: 'camp-1',
    recipientEmail: 'test1@example.com',
    recipientName: 'Test User 1',
    userId: 'user-1',
    status: 'opened',
    clippingId: 'clip-1',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'send-2',
    campaignId: 'camp-1',
    recipientEmail: 'test2@example.com',
    recipientName: 'Test User 2',
    userId: 'user-2',
    status: 'clicked',
    clippingId: 'clip-2',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'send-3',
    campaignId: 'camp-1',
    recipientEmail: 'test3@example.com',
    recipientName: 'Test User 3',
    userId: 'user-3',
    status: 'sent',
    createdAt: createTimestamp(new Date('2025-01-15')) as any,
  },
  {
    id: 'send-4',
    campaignId: 'camp-1',
    recipientEmail: 'test4@example.com',
    recipientName: 'Test User 4',
    userId: 'user-4',
    status: 'opened',
    createdAt: createTimestamp(new Date('2025-01-16')) as any,
  },
];

describe('useClippingStats Hook', () => {
  describe('Basic Stats', () => {
    it('should return correct totalClippings', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.totalClippings).toBe(3);
    });

    it('should return totalClippings = 0 for empty array', () => {
      const { result } = renderHook(() => useClippingStats([], []));

      expect(result.current.totalClippings).toBe(0);
    });

    it('should calculate totalReach correctly', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.totalReach).toBe(75000); // 10000 + 50000 + 15000
    });

    it('should handle clippings without reach', () => {
      const clippingsNoReach: MediaClipping[] = [
        { ...mockClippings[0], reach: undefined },
        { ...mockClippings[1], reach: 0 },
      ];

      const { result } = renderHook(() => useClippingStats(clippingsNoReach, []));

      expect(result.current.totalReach).toBe(0);
    });
  });

  describe('Timeline Data', () => {
    it('should group clippings by date', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.timelineData).toHaveLength(2); // 2 verschiedene Tage
      expect(result.current.timelineData[0]).toMatchObject({
        date: expect.any(String),
        clippings: expect.any(Number),
        reach: expect.any(Number),
      });
    });

    it('should aggregate reach per date', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      const jan15 = result.current.timelineData.find((d) =>
        d.date.includes('15') || d.date.includes('Jan')
      );
      expect(jan15).toBeDefined();
      expect(jan15!.clippings).toBe(2); // clip-1, clip-2
      expect(jan15!.reach).toBe(60000); // 10000 + 50000
    });

    it('should sort timeline data by date', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      const dates = result.current.timelineData.map((d) => d.date);
      expect(dates.length).toBe(2);
    });

    it('should handle clippings without publishedAt', () => {
      const clippingsNoDate: MediaClipping[] = [
        { ...mockClippings[0], publishedAt: undefined as any },
        { ...mockClippings[1], publishedAt: null as any },
      ];

      const { result } = renderHook(() => useClippingStats(clippingsNoDate, []));

      expect(result.current.timelineData).toHaveLength(0);
    });

    it('should return empty array for no clippings', () => {
      const { result } = renderHook(() => useClippingStats([], []));

      expect(result.current.timelineData).toEqual([]);
    });
  });

  describe('Outlet Distribution', () => {
    it('should group clippings by outletType', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.outletDistribution).toHaveLength(2); // online, print

      const online = result.current.outletDistribution.find((d) => d.name === 'online');
      expect(online).toMatchObject({
        name: 'online',
        count: 2,
        reach: 25000,
      });

      const print = result.current.outletDistribution.find((d) => d.name === 'print');
      expect(print).toMatchObject({
        name: 'print',
        count: 1,
        reach: 50000,
      });
    });

    it('should handle missing outletType as "Unbekannt"', () => {
      const clippingsNoType: MediaClipping[] = [
        { ...mockClippings[0], outletType: undefined as any },
      ];

      const { result } = renderHook(() => useClippingStats(clippingsNoType, []));

      expect(result.current.outletDistribution).toHaveLength(1);
      expect(result.current.outletDistribution[0].name).toBe('Unbekannt');
    });

    it('should return empty array for no clippings', () => {
      const { result } = renderHook(() => useClippingStats([], []));

      expect(result.current.outletDistribution).toEqual([]);
    });
  });

  describe('Sentiment Data', () => {
    it('should aggregate sentiment counts', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.sentimentData).toHaveLength(3); // positive, neutral, negative

      const positive = result.current.sentimentData.find((s) => s.name === 'Positiv');
      expect(positive).toMatchObject({
        name: 'Positiv',
        value: 1,
        color: '#10b981',
      });

      const neutral = result.current.sentimentData.find((s) => s.name === 'Neutral');
      expect(neutral).toMatchObject({
        name: 'Neutral',
        value: 1,
        color: '#6b7280',
      });

      const negative = result.current.sentimentData.find((s) => s.name === 'Negativ');
      expect(negative).toMatchObject({
        name: 'Negativ',
        value: 1,
        color: '#ef4444',
      });
    });

    it('should filter out sentiments with value = 0', () => {
      const clippingsPositiveOnly: MediaClipping[] = [
        { ...mockClippings[0], sentiment: 'positive' },
        { ...mockClippings[1], sentiment: 'positive' },
      ];

      const { result } = renderHook(() => useClippingStats(clippingsPositiveOnly, []));

      expect(result.current.sentimentData).toHaveLength(1);
      expect(result.current.sentimentData[0].name).toBe('Positiv');
    });

    it('should return empty array when all sentiments are 0', () => {
      const { result } = renderHook(() => useClippingStats([], []));

      expect(result.current.sentimentData).toEqual([]);
    });
  });

  describe('Top Outlets', () => {
    it('should return top 5 outlets by reach', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.topOutlets).toHaveLength(2); // Nur 2 Outlets

      expect(result.current.topOutlets[0]).toMatchObject({
        name: 'Outlet B',
        reach: 50000,
        count: 1,
      });

      expect(result.current.topOutlets[1]).toMatchObject({
        name: 'Outlet A',
        reach: 25000,
        count: 2,
      });
    });

    it('should sort outlets by reach (descending)', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      const reaches = result.current.topOutlets.map((o) => o.reach);
      const sortedReaches = [...reaches].sort((a, b) => b - a);
      expect(reaches).toEqual(sortedReaches);
    });

    it('should limit to max 5 outlets', () => {
      const manyOutlets: MediaClipping[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockClippings[0],
        id: `clip-${i}`,
        outletName: `Outlet ${i}`,
        reach: (i + 1) * 1000,
      }));

      const { result } = renderHook(() => useClippingStats(manyOutlets, []));

      expect(result.current.topOutlets).toHaveLength(5);
    });

    it('should handle missing outletName as "Unbekannt"', () => {
      const clippingsNoName: MediaClipping[] = [
        { ...mockClippings[0], outletName: undefined as any },
      ];

      const { result } = renderHook(() => useClippingStats(clippingsNoName, []));

      expect(result.current.topOutlets[0].name).toBe('Unbekannt');
    });

    it('should return empty array for no clippings', () => {
      const { result } = renderHook(() => useClippingStats([], []));

      expect(result.current.topOutlets).toEqual([]);
    });
  });

  describe('Email Stats', () => {
    it('should calculate email stats correctly', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, mockSends));

      expect(result.current.emailStats).toMatchObject({
        total: 4,
        opened: 3, // send-1 (opened) + send-2 (clicked) + send-4 (opened)
        clicked: 1,
        withClippings: 2, // send-1, send-2
        openRate: 75, // 3/4 * 100
        conversionRate: 67, // 2/3 * 100 = 66.666... -> Math.round = 67
      });
    });

    it('should count "clicked" status as "opened"', () => {
      const sendsClickedOnly: EmailCampaignSend[] = [
        { ...mockSends[1], status: 'clicked' },
        { ...mockSends[2], status: 'sent' },
      ];

      const { result } = renderHook(() => useClippingStats([], sendsClickedOnly));

      expect(result.current.emailStats.opened).toBe(1);
      expect(result.current.emailStats.clicked).toBe(1);
    });

    it('should handle empty sends array', () => {
      const { result } = renderHook(() => useClippingStats(mockClippings, []));

      expect(result.current.emailStats).toMatchObject({
        total: 0,
        opened: 0,
        clicked: 0,
        withClippings: 0,
        openRate: 0,
        conversionRate: 0,
      });
    });

    it('should handle zero opened sends (avoid division by zero)', () => {
      const sendsNotOpened: EmailCampaignSend[] = [
        { ...mockSends[2], status: 'sent' },
        { ...mockSends[2], id: 'send-5', status: 'sent' },
      ];

      const { result } = renderHook(() => useClippingStats([], sendsNotOpened));

      expect(result.current.emailStats.openRate).toBe(0);
      expect(result.current.emailStats.conversionRate).toBe(0); // 0 opened -> 0 conversion
    });

    it('should calculate openRate correctly', () => {
      const customSends: EmailCampaignSend[] = [
        { ...mockSends[0], status: 'opened' },
        { ...mockSends[1], status: 'sent' },
        { ...mockSends[2], status: 'sent' },
        { ...mockSends[3], status: 'sent' },
      ];

      const { result } = renderHook(() => useClippingStats([], customSends));

      expect(result.current.emailStats.openRate).toBe(25); // 1/4 * 100
    });

    it('should calculate conversionRate correctly', () => {
      const customSends: EmailCampaignSend[] = [
        { ...mockSends[0], status: 'opened', clippingId: 'clip-1' },
        { ...mockSends[1], status: 'opened', clippingId: undefined },
        { ...mockSends[2], status: 'opened', clippingId: 'clip-2' },
      ];

      const { result } = renderHook(() => useClippingStats([], customSends));

      expect(result.current.emailStats.conversionRate).toBe(67); // 2/3 * 100 = 66.666... -> Math.round = 67
    });
  });

  describe('Memoization and Re-renders', () => {
    it('should memoize results when inputs do not change', () => {
      const { result, rerender } = renderHook(() => useClippingStats(mockClippings, mockSends));

      const firstResult = result.current;

      rerender();

      expect(result.current.timelineData).toBe(firstResult.timelineData);
      expect(result.current.outletDistribution).toBe(firstResult.outletDistribution);
      expect(result.current.sentimentData).toBe(firstResult.sentimentData);
      expect(result.current.topOutlets).toBe(firstResult.topOutlets);
      expect(result.current.emailStats).toBe(firstResult.emailStats);
    });

    it('should recalculate when clippings change', () => {
      const { result, rerender } = renderHook(
        ({ clippings, sends }) => useClippingStats(clippings, sends),
        { initialProps: { clippings: mockClippings, sends: mockSends } }
      );

      const firstResult = result.current;

      rerender({ clippings: [mockClippings[0]], sends: mockSends });

      expect(result.current.totalClippings).toBe(1);
      expect(result.current.timelineData).not.toBe(firstResult.timelineData);
    });
  });
});
