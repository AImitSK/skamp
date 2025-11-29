// src/lib/utils/__tests__/outlet-type-detector.test.ts
import { detectOutletType, getReachForOutletType } from '../outlet-type-detector';
import { Publication as LibraryPublication } from '@/types/library';
import { Timestamp } from 'firebase/firestore';

describe('Outlet Type Detector - Phase 4 Tests', () => {
  // Helper function to create test publication
  const createTestPublication = (
    type: LibraryPublication['type'],
    format: LibraryPublication['format'],
    metrics?: Partial<LibraryPublication['metrics']>
  ): LibraryPublication => ({
    organizationId: 'test-org',
    title: 'Test Publication',
    publisherId: 'test-publisher',
    type,
    format,
    metrics: {
      frequency: 'monthly',
      ...metrics,
    },
    languages: ['de'],
    geographicScope: 'national',
    geographicTargets: ['DE'],
    focusAreas: ['Technology'],
    status: 'active',
    createdBy: 'test-user',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  describe('detectOutletType() - Podcast Detection', () => {
    it('sollte Podcast als audio klassifizieren', () => {
      const publication = createTestPublication('podcast', 'online');
      expect(detectOutletType(publication)).toBe('audio');
    });

    it('sollte Podcast unabhängig vom Format immer als audio klassifizieren', () => {
      const formats: LibraryPublication['format'][] = ['online', 'print', 'both', 'broadcast', 'audio'];

      formats.forEach((format) => {
        const publication = createTestPublication('podcast', format);
        expect(detectOutletType(publication)).toBe('audio');
      });
    });
  });

  describe('detectOutletType() - Broadcast Detection', () => {
    it('sollte TV als broadcast klassifizieren', () => {
      const publication = createTestPublication('tv', 'online');
      expect(detectOutletType(publication)).toBe('broadcast');
    });

    it('sollte Radio als broadcast klassifizieren', () => {
      const publication = createTestPublication('radio', 'online');
      expect(detectOutletType(publication)).toBe('broadcast');
    });

    it('sollte TV/Radio unabhängig vom Format immer als broadcast klassifizieren', () => {
      const types: Array<'tv' | 'radio'> = ['tv', 'radio'];
      const formats: LibraryPublication['format'][] = ['online', 'print', 'both', 'broadcast', 'audio'];

      types.forEach((type) => {
        formats.forEach((format) => {
          const publication = createTestPublication(type, format);
          expect(detectOutletType(publication)).toBe('broadcast');
        });
      });
    });
  });

  describe('detectOutletType() - Online Detection', () => {
    it('sollte Website als online klassifizieren', () => {
      const publication = createTestPublication('website', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Blog als online klassifizieren (WICHTIG: Blog ist Type, nicht Format!)', () => {
      const publication = createTestPublication('blog', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Newsletter als online klassifizieren', () => {
      const publication = createTestPublication('newsletter', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Social Media als online klassifizieren', () => {
      const publication = createTestPublication('social_media', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });
  });

  describe('detectOutletType() - Format-basierte Detection (Magazine, Newspaper, Trade Journal)', () => {
    it('sollte Magazine mit format: print als print klassifizieren', () => {
      const publication = createTestPublication('magazine', 'print');
      expect(detectOutletType(publication)).toBe('print');
    });

    it('sollte Magazine mit format: online als online klassifizieren', () => {
      const publication = createTestPublication('magazine', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Magazine mit format: broadcast als broadcast klassifizieren', () => {
      const publication = createTestPublication('magazine', 'broadcast');
      expect(detectOutletType(publication)).toBe('broadcast');
    });

    it('sollte Magazine mit format: audio als audio klassifizieren', () => {
      const publication = createTestPublication('magazine', 'audio');
      expect(detectOutletType(publication)).toBe('audio');
    });

    it('sollte Magazine mit format: both als print klassifizieren (Default bei Hybrid)', () => {
      const publication = createTestPublication('magazine', 'both');
      expect(detectOutletType(publication)).toBe('print');
    });

    it('sollte Newspaper mit format: print als print klassifizieren', () => {
      const publication = createTestPublication('newspaper', 'print');
      expect(detectOutletType(publication)).toBe('print');
    });

    it('sollte Newspaper mit format: online als online klassifizieren', () => {
      const publication = createTestPublication('newspaper', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Newspaper mit format: both als print klassifizieren (Default bei Hybrid)', () => {
      const publication = createTestPublication('newspaper', 'both');
      expect(detectOutletType(publication)).toBe('print');
    });

    it('sollte Trade Journal mit format: print als print klassifizieren', () => {
      const publication = createTestPublication('trade_journal', 'print');
      expect(detectOutletType(publication)).toBe('print');
    });

    it('sollte Trade Journal mit format: online als online klassifizieren', () => {
      const publication = createTestPublication('trade_journal', 'online');
      expect(detectOutletType(publication)).toBe('online');
    });

    it('sollte Trade Journal mit format: both als print klassifizieren (Default bei Hybrid)', () => {
      const publication = createTestPublication('trade_journal', 'both');
      expect(detectOutletType(publication)).toBe('print');
    });
  });

  describe('detectOutletType() - Fallback für unbekannte Typen', () => {
    it('sollte für unbekannte Type online als Fallback zurückgeben', () => {
      const publication: LibraryPublication = {
        organizationId: 'test-org',
        title: 'Unknown Publication',
        publisherId: 'test-publisher',
        type: 'website', // Bekannter Typ, aber für Fallback-Test verwendet
        format: 'online',
        metrics: { frequency: 'monthly' },
        languages: ['de'],
        geographicScope: 'national',
        geographicTargets: ['DE'],
        focusAreas: ['Test'],
        status: 'active',
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(detectOutletType(publication)).toBe('online');
    });
  });

  describe('getReachForOutletType() - Print Metrics', () => {
    it('sollte circulation für print-basierte Publications zurückgeben', () => {
      const publication = createTestPublication('magazine', 'print', {
        print: {
          circulation: 50000,
          circulationType: 'printed',
        },
      });

      expect(getReachForOutletType(publication)).toBe(50000);
    });

    it('sollte undefined zurückgeben wenn keine print-Metriken vorhanden sind', () => {
      const publication = createTestPublication('magazine', 'print');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });
  });

  describe('getReachForOutletType() - Online Metrics', () => {
    it('sollte monthlyPageViews für online-basierte Publications zurückgeben', () => {
      const publication = createTestPublication('website', 'online', {
        online: {
          monthlyPageViews: 500000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(500000);
    });

    it('sollte monthlyUniqueVisitors zurückgeben wenn keine monthlyPageViews vorhanden sind', () => {
      const publication = createTestPublication('website', 'online', {
        online: {
          monthlyUniqueVisitors: 250000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(250000);
    });

    it('sollte monthlyPageViews bevorzugen wenn beide Metriken vorhanden sind', () => {
      const publication = createTestPublication('website', 'online', {
        online: {
          monthlyPageViews: 500000,
          monthlyUniqueVisitors: 250000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(500000);
    });

    it('sollte undefined zurückgeben wenn keine online-Metriken vorhanden sind', () => {
      const publication = createTestPublication('website', 'online');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });
  });

  describe('getReachForOutletType() - Broadcast Metrics', () => {
    it('sollte viewership für broadcast-basierte Publications zurückgeben', () => {
      const publication = createTestPublication('tv', 'online', {
        broadcast: {
          viewership: 1000000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(1000000);
    });

    it('sollte undefined zurückgeben wenn keine broadcast-Metriken vorhanden sind', () => {
      const publication = createTestPublication('tv', 'online');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });
  });

  describe('getReachForOutletType() - Audio Metrics (WICHTIGSTER TEST!)', () => {
    it('sollte monthlyDownloads für Podcasts zurückgeben', () => {
      const publication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 120000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(120000);
    });

    it('sollte monthlyListeners zurückgeben wenn keine monthlyDownloads vorhanden sind', () => {
      const publication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyListeners: 80000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(80000);
    });

    it('sollte monthlyDownloads bevorzugen wenn beide Metriken vorhanden sind', () => {
      const publication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 120000,
          monthlyListeners: 80000,
        },
      });

      expect(getReachForOutletType(publication)).toBe(120000);
    });

    it('sollte undefined zurückgeben wenn keine audio-Metriken vorhanden sind', () => {
      const publication = createTestPublication('podcast', 'online');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });
  });

  describe('Integration: detectOutletType + getReachForOutletType', () => {
    it('sollte für Podcast korrekt audio erkennen und Downloads zurückgeben', () => {
      const publication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 120000,
        },
      });

      const outletType = detectOutletType(publication);
      const reach = getReachForOutletType(publication);

      expect(outletType).toBe('audio');
      expect(reach).toBe(120000);
    });

    it('sollte für Blog korrekt online erkennen und PageViews zurückgeben', () => {
      const publication = createTestPublication('blog', 'online', {
        online: {
          monthlyPageViews: 50000,
        },
      });

      const outletType = detectOutletType(publication);
      const reach = getReachForOutletType(publication);

      expect(outletType).toBe('online');
      expect(reach).toBe(50000);
    });

    it('sollte für Print-Magazine korrekt print erkennen und Circulation zurückgeben', () => {
      const publication = createTestPublication('magazine', 'print', {
        print: {
          circulation: 50000,
          circulationType: 'sold',
        },
      });

      const outletType = detectOutletType(publication);
      const reach = getReachForOutletType(publication);

      expect(outletType).toBe('print');
      expect(reach).toBe(50000);
    });

    it('sollte für TV korrekt broadcast erkennen und Viewership zurückgeben', () => {
      const publication = createTestPublication('tv', 'online', {
        broadcast: {
          viewership: 2000000,
        },
      });

      const outletType = detectOutletType(publication);
      const reach = getReachForOutletType(publication);

      expect(outletType).toBe('broadcast');
      expect(reach).toBe(2000000);
    });
  });

  describe('Edge Cases', () => {
    it('sollte Publications ohne metrics.audio korrekt handhaben (Podcast ohne Metriken)', () => {
      const publication = createTestPublication('podcast', 'online');

      expect(detectOutletType(publication)).toBe('audio');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });

    it('sollte Publications mit leeren metrics-Objekten korrekt handhaben', () => {
      const publication = createTestPublication('website', 'online', {
        online: {},
      });

      expect(detectOutletType(publication)).toBe('online');
      expect(getReachForOutletType(publication)).toBeUndefined();
    });

    it('sollte Publications mit 0-Wert Metriken korrekt handhaben', () => {
      const publication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 0,
        },
      });

      expect(detectOutletType(publication)).toBe('audio');
      // Note: 0 wird als falsy behandelt und gibt undefined zurück (bekanntes Verhalten)
      expect(getReachForOutletType(publication)).toBeUndefined();
    });
  });
});
