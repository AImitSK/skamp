// src/lib/firebase/__tests__/monitoring-suggestion-service.test.ts
import { monitoringSuggestionService } from '../monitoring-suggestion-service';
import { detectOutletType } from '@/lib/utils/outlet-type-detector';
import { Publication as LibraryPublication } from '@/types/library';
import { MonitoringSuggestion } from '@/types/monitoring';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('../config', () => ({
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
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(() => 'mocked-query'),
  where: jest.fn(() => 'mocked-where'),
  orderBy: jest.fn(() => 'mocked-orderBy'),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Date.now() / 1000,
      nanoseconds: 0,
      toMillis: () => Date.now()
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
      seconds: date.getTime() / 1000,
      nanoseconds: 0,
    })),
  },
}));

jest.mock('../clipping-service', () => ({
  clippingService: {
    create: jest.fn().mockResolvedValue('clipping-123'),
  },
}));

jest.mock('../library-service', () => ({
  publicationService: {
    getById: jest.fn(),
  },
}));

jest.mock('../pr-service', () => ({
  prService: {
    getById: jest.fn(),
  },
}));

const mockFirestore = require('firebase/firestore');
const { clippingService } = require('../clipping-service');
const { publicationService } = require('../library-service');
const { prService } = require('../pr-service');

describe('Monitoring Suggestion Service - Phase 4 Integration Tests', () => {
  const testOrganizationId = 'test-org';
  const testCampaignId = 'test-campaign';
  const testProjectId = 'test-project';
  const testUserId = 'test-user';
  const testPublicationId = 'test-publication';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create test publication
  const createTestPublication = (
    type: LibraryPublication['type'],
    format: LibraryPublication['format'],
    metrics?: Partial<LibraryPublication['metrics']>
  ): LibraryPublication => ({
    id: testPublicationId,
    organizationId: testOrganizationId,
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
    createdBy: testUserId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Helper function to create test suggestion
  const createTestSuggestion = (
    sourceName: string,
    publicationId?: string
  ): MonitoringSuggestion => ({
    id: 'suggestion-123',
    organizationId: testOrganizationId,
    campaignId: testCampaignId,
    articleUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    articleTitle: 'Test Article about Product',
    articleExcerpt: 'Great product review...',
    sources: [
      {
        type: 'rss_feed',
        sourceName,
        sourceId: publicationId,
        publicationId,
        matchScore: 85,
        matchedKeywords: ['Product', 'Company'],
        foundAt: Timestamp.now(),
      },
    ],
    avgMatchScore: 85,
    highestMatchScore: 85,
    confidence: 'high',
    autoConfirmed: false,
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  describe('confirmSuggestion - Outlet Type Detection Integration', () => {
    it('sollte für Podcast-Publication outletType: audio verwenden', async () => {
      // Setup: Podcast Publication
      const podcastPublication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 120000,
        },
      });

      const suggestion = createTestSuggestion('Tech Podcast', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(podcastPublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit outletType: 'audio' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'audio',
          outletName: 'Tech Podcast',
        }),
        expect.any(Object)
      );
    });

    it('sollte für Online-Publication outletType: online verwenden', async () => {
      // Setup: Online Publication (Blog)
      const blogPublication = createTestPublication('blog', 'online', {
        online: {
          monthlyPageViews: 50000,
        },
      });

      const suggestion = createTestSuggestion('Tech Blog', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(blogPublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit outletType: 'online' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'online',
          outletName: 'Tech Blog',
        }),
        expect.any(Object)
      );
    });

    it('sollte für Print-Publication outletType: print verwenden', async () => {
      // Setup: Print Publication (Magazine)
      const magazinePublication = createTestPublication('magazine', 'print', {
        print: {
          circulation: 50000,
          circulationType: 'sold',
        },
      });

      const suggestion = createTestSuggestion('Tech Magazine', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(magazinePublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit outletType: 'print' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'print',
          outletName: 'Tech Magazine',
        }),
        expect.any(Object)
      );
    });

    it('sollte für TV-Publication outletType: broadcast verwenden', async () => {
      // Setup: Broadcast Publication (TV)
      const tvPublication = createTestPublication('tv', 'online', {
        broadcast: {
          viewership: 2000000,
        },
      });

      const suggestion = createTestSuggestion('Tech TV', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(tvPublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit outletType: 'broadcast' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'broadcast',
          outletName: 'Tech TV',
        }),
        expect.any(Object)
      );
    });

    it('sollte Default outletType: online verwenden wenn Publication nicht gefunden wird', async () => {
      const suggestion = createTestSuggestion('Unknown Publication', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service - gibt null zurück (nicht gefunden)
      publicationService.getById.mockResolvedValue(null);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit Default outletType: 'online' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'online',
        }),
        expect.any(Object)
      );
    });

    it('sollte Default outletType: online verwenden wenn keine publicationId vorhanden ist', async () => {
      const suggestion = createTestSuggestion('Google News', undefined);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify: Clipping wurde mit Default outletType: 'online' erstellt
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'online',
          outletName: 'Google News',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Real-World Scenarios', () => {
    it('sollte Podcast-RSS-Feed-Fund korrekt als audio klassifizieren', async () => {
      // Szenario: Podcast-RSS-Feed findet Erwähnung
      const podcastPublication = createTestPublication('podcast', 'online', {
        audio: {
          monthlyDownloads: 120000,
          monthlyListeners: 80000,
        },
      });

      const suggestion = createTestSuggestion('Tech Talk Podcast', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(podcastPublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'positive',
      });

      // Verify
      expect(publicationService.getById).toHaveBeenCalledWith(
        testPublicationId,
        testOrganizationId
      );
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: testOrganizationId,
          campaignId: testCampaignId,
          projectId: testProjectId,
          outletType: 'audio',
          outletName: 'Tech Talk Podcast',
          sentiment: 'positive',
        }),
        expect.any(Object)
      );
    });

    it('sollte Online-Blog-RSS-Feed-Fund korrekt als online klassifizieren', async () => {
      // Szenario: Blog-RSS-Feed findet Erwähnung
      const blogPublication = createTestPublication('blog', 'online', {
        online: {
          monthlyPageViews: 50000,
          monthlyUniqueVisitors: 25000,
        },
      });

      const suggestion = createTestSuggestion('Tech News Blog', testPublicationId);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock Publication Service
      publicationService.getById.mockResolvedValue(blogPublication);

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
        sentiment: 'neutral',
      });

      // Verify
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'online',
          outletName: 'Tech News Blog',
          sentiment: 'neutral',
        }),
        expect.any(Object)
      );
    });

    it('sollte Google News Fund ohne Publication korrekt als online klassifizieren', async () => {
      // Szenario: Google News findet Artikel (keine Publication verknüpft)
      const suggestion = createTestSuggestion('Google News', undefined);

      // Mock Campaign
      prService.getById.mockResolvedValue({
        id: testCampaignId,
        projectId: testProjectId,
      });

      // Mock getById für Suggestion
      const mockDocSnap = {
        exists: () => true,
        id: suggestion.id,
        data: () => suggestion,
      };
      mockFirestore.getDoc.mockResolvedValue(mockDocSnap);

      // Mock updateDoc
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      // Execute
      await monitoringSuggestionService.confirmSuggestion(suggestion.id!, {
        userId: testUserId,
        organizationId: testOrganizationId,
      });

      // Verify
      expect(publicationService.getById).not.toHaveBeenCalled(); // Keine Publication
      expect(clippingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletType: 'online', // Default
          outletName: 'Google News',
          sentiment: 'neutral', // Default wenn nicht angegeben
        }),
        expect.any(Object)
      );
    });
  });

  describe('detectOutletType() Helper Integration', () => {
    it('sollte detectOutletType() korrekt aufrufen für Podcast', () => {
      const podcastPublication = createTestPublication('podcast', 'online');
      const outletType = detectOutletType(podcastPublication);

      expect(outletType).toBe('audio');
    });

    it('sollte detectOutletType() korrekt aufrufen für Blog', () => {
      const blogPublication = createTestPublication('blog', 'online');
      const outletType = detectOutletType(blogPublication);

      expect(outletType).toBe('online');
    });

    it('sollte detectOutletType() korrekt aufrufen für Magazine (print)', () => {
      const magazinePublication = createTestPublication('magazine', 'print');
      const outletType = detectOutletType(magazinePublication);

      expect(outletType).toBe('print');
    });

    it('sollte detectOutletType() korrekt aufrufen für TV', () => {
      const tvPublication = createTestPublication('tv', 'online');
      const outletType = detectOutletType(tvPublication);

      expect(outletType).toBe('broadcast');
    });
  });
});
