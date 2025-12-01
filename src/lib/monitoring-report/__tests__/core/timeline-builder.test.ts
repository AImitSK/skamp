import { TimelineBuilder } from '../../core/timeline-builder';
import type { MediaClipping } from '@/types/monitoring';

describe('TimelineBuilder', () => {
  let builder: TimelineBuilder;

  beforeEach(() => {
    builder = new TimelineBuilder();
  });

  const createTimestamp = (date: Date) => ({
    toDate: () => date
  }) as any;

  describe('buildTimeline', () => {
    it('sollte leere Timeline für leere Clippings zurückgeben', () => {
      const clippings: MediaClipping[] = [];

      const result = builder.buildTimeline(clippings);

      expect(result).toEqual([]);
    });

    it('sollte Clippings nach Datum gruppieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 10000
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          reach: 15000
        } as MediaClipping,
        {
          id: '3',
          organizationId: 'org-1',
          title: 'Test Artikel 3',
          url: 'https://example.com/article-3',
          publishedAt: createTimestamp(new Date('2024-01-16T09:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-16T09:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-16T09:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-16T09:00:00Z')),
          reach: 20000
        } as MediaClipping
      ];

      const result = builder.buildTimeline(clippings);

      expect(result).toHaveLength(2);
      expect(result[0].clippings).toBe(2);
      expect(result[0].reach).toBe(25000);
      expect(result[1].clippings).toBe(1);
      expect(result[1].reach).toBe(20000);
    });

    it('sollte Timeline chronologisch sortieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-20T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-20T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-20T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-20T10:00:00Z')),
          reach: 10000
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 15000
        } as MediaClipping,
        {
          id: '3',
          organizationId: 'org-1',
          title: 'Test Artikel 3',
          url: 'https://example.com/article-3',
          publishedAt: createTimestamp(new Date('2024-01-18T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-18T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-18T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-18T10:00:00Z')),
          reach: 20000
        } as MediaClipping
      ];

      const result = builder.buildTimeline(clippings);

      expect(result).toHaveLength(3);
      const dates = result.map(r => new Date(r.date).getTime());
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });

    it('sollte Clippings ohne publishedAt ignorieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: undefined,
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 10000
        } as unknown as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 15000
        } as MediaClipping
      ];

      const result = builder.buildTimeline(clippings);

      expect(result).toHaveLength(1);
      expect(result[0].clippings).toBe(1);
      expect(result[0].reach).toBe(15000);
    });

    it('sollte fehlende reach als 0 behandeln', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: undefined
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T14:00:00Z')),
          reach: 10000
        } as MediaClipping
      ];

      const result = builder.buildTimeline(clippings);

      expect(result).toHaveLength(1);
      expect(result[0].reach).toBe(10000);
    });

    it('sollte deutsches Datumsformat verwenden', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-03-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-03-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-03-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-03-15T10:00:00Z')),
          reach: 10000
        } as MediaClipping
      ];

      const result = builder.buildTimeline(clippings);

      expect(result[0].date).toContain('2024');
      expect(result[0].date).toContain('.');
    });
  });

  describe('buildWeeklyTimeline', () => {
    it('sollte leere Timeline für leere Clippings zurückgeben', () => {
      const clippings: MediaClipping[] = [];

      const result = builder.buildWeeklyTimeline(clippings);

      expect(result).toEqual([]);
    });

    it('sollte Clippings nach Wochen gruppieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 10000
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          reach: 15000
        } as MediaClipping,
        {
          id: '3',
          organizationId: 'org-1',
          title: 'Test Artikel 3',
          url: 'https://example.com/article-3',
          publishedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          reach: 20000
        } as MediaClipping
      ];

      const result = builder.buildWeeklyTimeline(clippings);

      expect(result).toHaveLength(2);
      expect(result[0].clippings).toBe(2);
      expect(result[0].reach).toBe(25000);
      expect(result[1].clippings).toBe(1);
      expect(result[1].reach).toBe(20000);
    });

    it('sollte Wochenbeginn auf Montag setzen', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-17T10:00:00Z')),
          reach: 10000
        } as MediaClipping
      ];

      const result = builder.buildWeeklyTimeline(clippings);

      const weekStart = new Date(result[0].date);
      const dayOfWeek = weekStart.getDay();

      expect([0, 1]).toContain(dayOfWeek);
    });

    it('sollte Timeline chronologisch sortieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-29T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-29T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-29T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-29T10:00:00Z')),
          reach: 10000
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 15000
        } as MediaClipping,
        {
          id: '3',
          organizationId: 'org-1',
          title: 'Test Artikel 3',
          url: 'https://example.com/article-3',
          publishedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-22T10:00:00Z')),
          reach: 20000
        } as MediaClipping
      ];

      const result = builder.buildWeeklyTimeline(clippings);

      expect(result).toHaveLength(3);
      const dates = result.map(r => new Date(r.date).getTime());
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });

    it('sollte Clippings ohne publishedAt ignorieren', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: undefined,
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 10000
        } as unknown as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: 15000
        } as MediaClipping
      ];

      const result = builder.buildWeeklyTimeline(clippings);

      expect(result).toHaveLength(1);
      expect(result[0].clippings).toBe(1);
    });

    it('sollte fehlende reach als 0 behandeln', () => {
      const clippings: MediaClipping[] = [
        {
          id: '1',
          organizationId: 'org-1',
          title: 'Test Artikel 1',
          url: 'https://example.com/article-1',
          publishedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-15T10:00:00Z')),
          reach: undefined
        } as MediaClipping,
        {
          id: '2',
          organizationId: 'org-1',
          title: 'Test Artikel 2',
          url: 'https://example.com/article-2',
          publishedAt: createTimestamp(new Date('2024-01-16T10:00:00Z')),
          outletName: 'Test Outlet',
          outletType: 'online',
          sentiment: 'positive',
          detectionMethod: 'manual',
          detectedAt: createTimestamp(new Date('2024-01-16T10:00:00Z')),
          createdBy: 'user-1',
          createdAt: createTimestamp(new Date('2024-01-16T10:00:00Z')),
          updatedAt: createTimestamp(new Date('2024-01-16T10:00:00Z')),
          reach: 10000
        } as MediaClipping
      ];

      const result = builder.buildWeeklyTimeline(clippings);

      expect(result).toHaveLength(1);
      expect(result[0].reach).toBe(10000);
    });
  });
});
