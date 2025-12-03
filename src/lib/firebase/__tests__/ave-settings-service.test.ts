// src/lib/firebase/__tests__/ave-settings-service.test.ts
import { aveSettingsService } from '../ave-settings-service';
import { AVESettings, MediaClipping, DEFAULT_AVE_SETTINGS } from '@/types/monitoring';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('../client-init', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mocked-collection'),
  doc: jest.fn(() => 'mocked-doc'),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(() => 'mocked-query'),
  where: jest.fn(() => 'mocked-where'),
  limit: jest.fn(() => 'mocked-limit'),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
      seconds: date.getTime() / 1000,
      nanoseconds: 0,
    })),
  },
}));

const mockFirestore = require('firebase/firestore');

describe('AVE Settings Service - Phase 4 Tests', () => {
  const testOrganizationId = 'test-org';
  const testUserId = 'test-user';
  const testSettingsId = 'settings-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create test clipping
  const createTestClipping = (
    outletType: MediaClipping['outletType'],
    reach: number,
    sentiment: MediaClipping['sentiment'],
    sentimentScore?: number
  ): MediaClipping => ({
    organizationId: testOrganizationId,
    title: 'Test Clipping',
    url: 'https://example.com/article',
    publishedAt: Timestamp.now(),
    outletName: 'Test Outlet',
    outletType,
    reach,
    sentiment,
    sentimentScore,
    detectionMethod: 'manual',
    detectedAt: Timestamp.now(),
    createdBy: testUserId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  describe('DEFAULT_AVE_SETTINGS', () => {
    it('sollte audio-Faktor mit Wert 0.002 enthalten', () => {
      expect(DEFAULT_AVE_SETTINGS.factors.audio).toBe(0.002);
    });

    it('sollte KEINEN blog-Faktor enthalten', () => {
      expect((DEFAULT_AVE_SETTINGS.factors as any).blog).toBeUndefined();
    });

    it('sollte alle vier Standard-Faktoren haben', () => {
      expect(DEFAULT_AVE_SETTINGS.factors.print).toBe(0.003);
      expect(DEFAULT_AVE_SETTINGS.factors.online).toBe(0.001);
      expect(DEFAULT_AVE_SETTINGS.factors.broadcast).toBe(0.005);
      expect(DEFAULT_AVE_SETTINGS.factors.audio).toBe(0.002);
    });

    it('sollte Standard-Sentiment-Multipliers haben', () => {
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.positive).toBe(1.0);
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.neutral).toBe(0.8);
      expect(DEFAULT_AVE_SETTINGS.sentimentMultipliers.negative).toBe(0.5);
    });
  });

  describe('getOrCreate', () => {
    it('sollte bestehende Settings zurückgeben', async () => {
      const existingSettings: AVESettings = {
        id: testSettingsId,
        organizationId: testOrganizationId,
        factors: {
          print: 0.003,
          online: 0.001,
          broadcast: 0.005,
          audio: 0.002,
        },
        sentimentMultipliers: {
          positive: 1.0,
          neutral: 0.8,
          negative: 0.5,
        },
        updatedBy: testUserId,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: testSettingsId,
            data: () => existingSettings,
          },
        ],
      };

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await aveSettingsService.getOrCreate(testOrganizationId, testUserId);

      expect(result.id).toBe(testSettingsId);
      expect(result.factors.audio).toBe(0.002);
    });

    it('sollte neue Settings mit DEFAULT_AVE_SETTINGS erstellen wenn keine existieren', async () => {
      const mockEmptySnapshot = {
        empty: true,
        docs: [],
      };

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue(mockEmptySnapshot);

      const mockDocRef = { id: testSettingsId };
      const mockDoc = mockFirestore.doc as jest.Mock;
      mockDoc.mockReturnValue(mockDocRef);

      const mockSetDoc = mockFirestore.setDoc as jest.Mock;
      mockSetDoc.mockResolvedValue(undefined);

      const result = await aveSettingsService.getOrCreate(testOrganizationId, testUserId);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.factors.audio).toBe(0.002);
      expect((result.factors as any).blog).toBeUndefined();
    });
  });

  describe('calculateAVE - Audio (Podcast) Tests', () => {
    const audioSettings: AVESettings = {
      organizationId: testOrganizationId,
      factors: {
        print: 0.003,
        online: 0.001,
        broadcast: 0.005,
        audio: 0.002,
      },
      sentimentMultipliers: {
        positive: 1.0,
        neutral: 0.8,
        negative: 0.5,
      },
      updatedBy: testUserId,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    it('sollte für Podcast mit 120.000 Downloads und positive Sentiment 240 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 120000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // 120.000 × 0.002 × 1.0 = 240
      expect(ave).toBe(240);
    });

    it('sollte für Podcast mit 120.000 Downloads und neutral Sentiment 192 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 120000, 'neutral');
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // 120.000 × 0.002 × 0.8 = 192
      expect(ave).toBe(192);
    });

    it('sollte für Podcast mit 120.000 Downloads und negative Sentiment 120 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 120000, 'negative');
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // 120.000 × 0.002 × 0.5 = 120
      expect(ave).toBe(120);
    });

    it('sollte für Podcast mit 50.000 Downloads und positive Sentiment 100 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 50000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // 50.000 × 0.002 × 1.0 = 100
      expect(ave).toBe(100);
    });

    it('sollte für Podcast mit 1.000.000 Downloads und positive Sentiment 2000 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 1000000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // 1.000.000 × 0.002 × 1.0 = 2000
      expect(ave).toBe(2000);
    });

    it('sollte 0 zurückgeben wenn reach nicht vorhanden ist', () => {
      const clipping = createTestClipping('audio', 0, 'positive');
      clipping.reach = undefined;
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      expect(ave).toBe(0);
    });

    it('sollte sentimentScore verwenden wenn vorhanden (> 0.3 = positive)', () => {
      const clipping = createTestClipping('audio', 120000, 'neutral', 0.5);
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // sentimentScore 0.5 > 0.3 → positive multiplier (1.0)
      // 120.000 × 0.002 × 1.0 = 240
      expect(ave).toBe(240);
    });

    it('sollte sentimentScore verwenden wenn vorhanden (< -0.3 = negative)', () => {
      const clipping = createTestClipping('audio', 120000, 'neutral', -0.5);
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // sentimentScore -0.5 < -0.3 → negative multiplier (0.5)
      // 120.000 × 0.002 × 0.5 = 120
      expect(ave).toBe(120);
    });

    it('sollte sentimentScore verwenden wenn vorhanden (-0.3 <= score <= 0.3 = neutral)', () => {
      const clipping = createTestClipping('audio', 120000, 'positive', 0.1);
      const ave = aveSettingsService.calculateAVE(clipping, audioSettings);

      // sentimentScore 0.1 in [-0.3, 0.3] → neutral multiplier (0.8)
      // 120.000 × 0.002 × 0.8 = 192
      expect(ave).toBe(192);
    });
  });

  describe('calculateAVE - Vergleich aller Outlet Types', () => {
    const settings: AVESettings = {
      organizationId: testOrganizationId,
      factors: {
        print: 0.003,
        online: 0.001,
        broadcast: 0.005,
        audio: 0.002,
      },
      sentimentMultipliers: {
        positive: 1.0,
        neutral: 0.8,
        negative: 0.5,
      },
      updatedBy: testUserId,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    it('sollte für Online mit 50.000 PageViews 50 EUR berechnen', () => {
      const clipping = createTestClipping('online', 50000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 50.000 × 0.001 × 1.0 = 50
      expect(ave).toBe(50);
    });

    it('sollte für Print mit 50.000 Auflage 150 EUR berechnen', () => {
      const clipping = createTestClipping('print', 50000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 50.000 × 0.003 × 1.0 = 150
      expect(ave).toBe(150);
    });

    it('sollte für Broadcast mit 50.000 Viewership 250 EUR berechnen', () => {
      const clipping = createTestClipping('broadcast', 50000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 50.000 × 0.005 × 1.0 = 250
      expect(ave).toBe(250);
    });

    it('sollte für Audio mit 50.000 Downloads 100 EUR berechnen', () => {
      const clipping = createTestClipping('audio', 50000, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 50.000 × 0.002 × 1.0 = 100
      expect(ave).toBe(100);
    });

    it('sollte korrektes Verhältnis der Faktoren zeigen (Broadcast > Print > Audio > Online)', () => {
      const reach = 100000;
      const sentiment = 'positive';

      const audioAVE = aveSettingsService.calculateAVE(
        createTestClipping('audio', reach, sentiment),
        settings
      );
      const onlineAVE = aveSettingsService.calculateAVE(
        createTestClipping('online', reach, sentiment),
        settings
      );
      const printAVE = aveSettingsService.calculateAVE(
        createTestClipping('print', reach, sentiment),
        settings
      );
      const broadcastAVE = aveSettingsService.calculateAVE(
        createTestClipping('broadcast', reach, sentiment),
        settings
      );

      expect(audioAVE).toBe(200); // 100.000 × 0.002
      expect(onlineAVE).toBe(100); // 100.000 × 0.001
      expect(printAVE).toBe(300); // 100.000 × 0.003
      expect(broadcastAVE).toBe(500); // 100.000 × 0.005

      // Korrekte Reihenfolge: Broadcast > Print > Audio > Online
      expect(broadcastAVE).toBeGreaterThan(printAVE);
      expect(printAVE).toBeGreaterThan(audioAVE);
      expect(audioAVE).toBeGreaterThan(onlineAVE);
    });
  });

  describe('calculateAVE - Edge Cases', () => {
    const settings: AVESettings = {
      organizationId: testOrganizationId,
      factors: {
        print: 0.003,
        online: 0.001,
        broadcast: 0.005,
        audio: 0.002,
      },
      sentimentMultipliers: {
        positive: 1.0,
        neutral: 0.8,
        negative: 0.5,
      },
      updatedBy: testUserId,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    it('sollte 0 zurückgeben wenn reach 0 ist', () => {
      const clipping = createTestClipping('audio', 0, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      expect(ave).toBe(0);
    });

    it('sollte 0 zurückgeben wenn reach undefined ist', () => {
      const clipping = createTestClipping('audio', 0, 'positive');
      clipping.reach = undefined;
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      expect(ave).toBe(0);
    });

    it('sollte für sehr kleine Downloads korrekt runden', () => {
      const clipping = createTestClipping('audio', 100, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 100 × 0.002 × 1.0 = 0.2 → gerundet auf 0
      expect(ave).toBe(0);
    });

    it('sollte für exakt 500 Downloads auf 1 EUR runden', () => {
      const clipping = createTestClipping('audio', 500, 'positive');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 500 × 0.002 × 1.0 = 1.0
      expect(ave).toBe(1);
    });

    it('sollte negative Sentiment korrekt handhaben', () => {
      const clipping = createTestClipping('audio', 120000, 'negative');
      const ave = aveSettingsService.calculateAVE(clipping, settings);

      // 120.000 × 0.002 × 0.5 = 120
      expect(ave).toBe(120);
      expect(ave).toBeGreaterThan(0); // Auch negative Sentiment gibt positiven AVE
    });
  });

  describe('getSentimentScoreFromLabel', () => {
    it('sollte für positive 0.7 zurückgeben', () => {
      expect(aveSettingsService.getSentimentScoreFromLabel('positive')).toBe(0.7);
    });

    it('sollte für neutral 0 zurückgeben', () => {
      expect(aveSettingsService.getSentimentScoreFromLabel('neutral')).toBe(0);
    });

    it('sollte für negative -0.7 zurückgeben', () => {
      expect(aveSettingsService.getSentimentScoreFromLabel('negative')).toBe(-0.7);
    });
  });

  describe('Real-World Scenario: Podcast Campaign', () => {
    it('sollte realistisches Podcast-Szenario korrekt berechnen', () => {
      const settings: AVESettings = {
        organizationId: testOrganizationId,
        factors: {
          print: 0.003,
          online: 0.001,
          broadcast: 0.005,
          audio: 0.002,
        },
        sentimentMultipliers: {
          positive: 1.0,
          neutral: 0.8,
          negative: 0.5,
        },
        updatedBy: testUserId,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      // Szenario: Tech-Podcast mit 3 Erwähnungen
      const podcast1 = createTestClipping('audio', 120000, 'positive'); // Großer Podcast
      const podcast2 = createTestClipping('audio', 50000, 'neutral'); // Mittelgroßer Podcast
      const podcast3 = createTestClipping('audio', 10000, 'positive'); // Kleiner Podcast

      const ave1 = aveSettingsService.calculateAVE(podcast1, settings);
      const ave2 = aveSettingsService.calculateAVE(podcast2, settings);
      const ave3 = aveSettingsService.calculateAVE(podcast3, settings);

      expect(ave1).toBe(240); // 120.000 × 0.002 × 1.0
      expect(ave2).toBe(80); // 50.000 × 0.002 × 0.8
      expect(ave3).toBe(20); // 10.000 × 0.002 × 1.0

      const totalAVE = ave1 + ave2 + ave3;
      expect(totalAVE).toBe(340); // 340 EUR für 3 Podcast-Erwähnungen
    });
  });
});
