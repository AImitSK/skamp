// src/types/__tests__/monitoring.test.ts
import {
  MediaClipping,
  AVESettings,
  DEFAULT_AVE_SETTINGS,
  ClippingStats
} from '../monitoring';
import { Timestamp } from 'firebase/firestore';

describe('AVE System Type Definitions - Phase 4 Tests', () => {
  describe('MediaClipping.outletType', () => {
    it('sollte audio akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test Podcast Episode',
        url: 'https://example.com/podcast/episode-1',
        publishedAt: Timestamp.now(),
        outletName: 'Tech Podcast',
        outletType: 'audio', // ✅ Audio sollte akzeptiert werden
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.outletType).toBe('audio');
    });

    it('sollte print akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test Article',
        url: 'https://example.com/article',
        publishedAt: Timestamp.now(),
        outletName: 'Test Magazine',
        outletType: 'print',
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.outletType).toBe('print');
    });

    it('sollte online akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test Article',
        url: 'https://example.com/article',
        publishedAt: Timestamp.now(),
        outletName: 'Test Website',
        outletType: 'online',
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.outletType).toBe('online');
    });

    it('sollte broadcast akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test Broadcast',
        url: 'https://example.com/broadcast',
        publishedAt: Timestamp.now(),
        outletName: 'Test TV',
        outletType: 'broadcast',
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.outletType).toBe('broadcast');
    });

    // TypeScript-Fehler Test (wird bei Kompilierung geprüft)
    // Dieser Test dokumentiert dass 'blog' NICHT mehr erlaubt ist
    it('sollte blog NICHT akzeptieren (TypeScript Error erwartet)', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test',
        url: 'https://example.com',
        publishedAt: Timestamp.now(),
        outletName: 'Test',
        // @ts-expect-error - blog sollte nicht mehr erlaubt sein
        outletType: 'blog', // ❌ Blog sollte TypeScript Error werfen
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Dieser Test existiert nur zur Dokumentation
      expect(clipping).toBeDefined();
    });
  });

  describe('AVESettings.factors', () => {
    it('sollte audio-Faktor haben', () => {
      const settings: AVESettings = {
        organizationId: 'test-org',
        factors: {
          print: 3,
          online: 1,
          broadcast: 5,
          audio: 0.002, // ✅ Audio-Faktor vorhanden
        },
        sentimentMultipliers: {
          positive: 1.0,
          neutral: 0.8,
          negative: 0.5,
        },
        updatedBy: 'test-user',
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      expect(settings.factors.audio).toBe(0.002);
    });

    it('sollte alle vier Faktoren haben (print, online, broadcast, audio)', () => {
      const settings: AVESettings = {
        organizationId: 'test-org',
        factors: {
          print: 3,
          online: 1,
          broadcast: 5,
          audio: 0.002,
        },
        sentimentMultipliers: {
          positive: 1.0,
          neutral: 0.8,
          negative: 0.5,
        },
        updatedBy: 'test-user',
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      expect(Object.keys(settings.factors)).toHaveLength(4);
      expect(settings.factors.print).toBeDefined();
      expect(settings.factors.online).toBeDefined();
      expect(settings.factors.broadcast).toBeDefined();
      expect(settings.factors.audio).toBeDefined();
    });

    // TypeScript-Fehler Test (wird bei Kompilierung geprüft)
    it('sollte KEINEN blog-Faktor akzeptieren (TypeScript Error erwartet)', () => {
      const settings: AVESettings = {
        organizationId: 'test-org',
        factors: {
          print: 3,
          online: 1,
          broadcast: 5,
          audio: 0.002,
          // @ts-expect-error - blog sollte nicht mehr existieren
          blog: 0.5, // ❌ Blog sollte TypeScript Error werfen
        },
        sentimentMultipliers: {
          positive: 1.0,
          neutral: 0.8,
          negative: 0.5,
        },
        updatedBy: 'test-user',
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      expect((settings.factors as any).blog).toBeDefined();
    });
  });

  describe('DEFAULT_AVE_SETTINGS', () => {
    it('sollte audio-Faktor mit Wert 0.002 haben', () => {
      expect(DEFAULT_AVE_SETTINGS.factors.audio).toBe(0.002);
    });

    it('sollte KEINEN blog-Faktor haben', () => {
      expect((DEFAULT_AVE_SETTINGS.factors as any).blog).toBeUndefined();
    });

    it('sollte alle Standard-Faktoren haben', () => {
      expect(DEFAULT_AVE_SETTINGS.factors.print).toBe(3);
      expect(DEFAULT_AVE_SETTINGS.factors.online).toBe(1);
      expect(DEFAULT_AVE_SETTINGS.factors.broadcast).toBe(5);
      expect(DEFAULT_AVE_SETTINGS.factors.audio).toBe(0.002);
    });

    it('sollte Standard-Sentiment-Multipliers haben', () => {
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.positive).toBe(1.0);
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.neutral).toBe(0.8);
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.negative).toBe(0.5);
    });
  });

  describe('ClippingStats.byOutletType', () => {
    it('sollte audio-Statistik akzeptieren', () => {
      const stats: ClippingStats = {
        totalClippings: 100,
        totalReach: 1000000,
        totalAVE: 500000,
        sentimentBreakdown: {
          positive: 60,
          neutral: 30,
          negative: 10,
        },
        byOutletType: {
          print: 20,
          online: 50,
          broadcast: 10,
          audio: 20, // ✅ Audio sollte akzeptiert werden
        },
        byCategory: {
          news: 30,
          feature: 40,
          interview: 20,
          mention: 10,
        },
      };

      expect(stats.byOutletType.audio).toBe(20);
    });

    it('sollte alle vier Outlet-Types haben', () => {
      const stats: ClippingStats = {
        totalClippings: 100,
        totalReach: 1000000,
        totalAVE: 500000,
        sentimentBreakdown: {
          positive: 60,
          neutral: 30,
          negative: 10,
        },
        byOutletType: {
          print: 20,
          online: 50,
          broadcast: 10,
          audio: 20,
        },
        byCategory: {
          news: 30,
          feature: 40,
          interview: 20,
          mention: 10,
        },
      };

      expect(Object.keys(stats.byOutletType)).toHaveLength(4);
      expect(stats.byOutletType.print).toBeDefined();
      expect(stats.byOutletType.online).toBeDefined();
      expect(stats.byOutletType.broadcast).toBeDefined();
      expect(stats.byOutletType.audio).toBeDefined();
    });

    // TypeScript-Fehler Test (wird bei Kompilierung geprüft)
    it('sollte KEINEN blog-Eintrag akzeptieren (TypeScript Error erwartet)', () => {
      const stats: ClippingStats = {
        totalClippings: 100,
        totalReach: 1000000,
        totalAVE: 500000,
        sentimentBreakdown: {
          positive: 60,
          neutral: 30,
          negative: 10,
        },
        byOutletType: {
          print: 20,
          online: 50,
          broadcast: 10,
          audio: 20,
          // @ts-expect-error - blog sollte nicht mehr existieren
          blog: 5, // ❌ Blog sollte TypeScript Error werfen
        },
        byCategory: {
          news: 30,
          feature: 40,
          interview: 20,
          mention: 10,
        },
      };

      expect((stats.byOutletType as any).blog).toBeDefined();
    });
  });

  describe('Sentiment Types', () => {
    it('sollte positive sentiment akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test',
        url: 'https://example.com',
        publishedAt: Timestamp.now(),
        outletName: 'Test',
        outletType: 'online',
        sentiment: 'positive',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.sentiment).toBe('positive');
    });

    it('sollte neutral sentiment akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test',
        url: 'https://example.com',
        publishedAt: Timestamp.now(),
        outletName: 'Test',
        outletType: 'online',
        sentiment: 'neutral',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.sentiment).toBe('neutral');
    });

    it('sollte negative sentiment akzeptieren', () => {
      const clipping: MediaClipping = {
        organizationId: 'test-org',
        title: 'Test',
        url: 'https://example.com',
        publishedAt: Timestamp.now(),
        outletName: 'Test',
        outletType: 'online',
        sentiment: 'negative',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      expect(clipping.sentiment).toBe('negative');
    });
  });
});
