// src/__tests__/features/plan-5-9-media-service-clipping-management.test.ts
/**
 * PLAN 5/9: MONITORING-IMPLEMENTIERUNG TESTS
 * Umfassende Tests für erweiterte Media Service Clipping-Management-Funktionen
 * 
 * Test-Coverage:
 * - Clipping-Asset Speicherung
 * - Projekt-Clippings Abfrage
 * - Clipping-Metriken Update
 * - Erweiterte Clipping-Suche
 * - Clipping-Export (PDF/Excel/CSV)
 * - Screenshot-Generierung
 * - Clipping-Package Erstellung
 * - Multi-Tenancy Sicherheit
 * - Error-Handling & Edge Cases
 */

import { mediaService } from '@/lib/firebase/media-service';
import { Timestamp } from 'firebase/firestore';
import { ClippingAsset, MediaClipping, ClippingMetrics } from '@/types/media';

// Firebase-Mocks
jest.mock('@/lib/firebase/config');

// Mock Firebase Firestore Functions
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  doc: mockDoc,
  collection: mockCollection,
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  }
}));

describe('MediaService Clipping-Management (Plan 5/9)', () => {
  const testContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456'
  };

  const mockClippingAsset: ClippingAsset = {
    id: 'clipping-123',
    type: 'clipping',
    userId: testContext.userId,
    fileName: 'test_article.txt',
    fileType: 'text/clipping',
    storagePath: 'clippings/test-org-123/clipping-123',
    downloadUrl: 'https://example.com/article',
    description: 'Test article about tech innovation',
    tags: ['tech', 'innovation', 'startup'],
    outlet: 'TechCrunch',
    publishDate: Timestamp.now(),
    reachValue: 50000,
    sentimentScore: 0.7,
    url: 'https://techcrunch.com/test-article',
    projectId: 'project-123',
    campaignId: 'campaign-456',
    distributionId: 'dist-789',
    monitoringPhaseId: 'monitor-101',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockClippingData = {
    id: 'clipping-123',
    title: 'Innovative Tech Startup Launches',
    outlet: 'TechCrunch',
    publishDate: Timestamp.now(),
    url: 'https://techcrunch.com/test-article',
    content: 'Tech startup announces revolutionary product...',
    reachValue: 50000,
    sentimentScore: 0.7,
    mediaValue: 12000,
    tags: ['tech', 'startup'],
    organizationId: testContext.organizationId,
    projectId: 'project-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' });
    mockCollection.mockReturnValue({ path: 'mock-collection' });
  });

  describe('saveClippingAsset', () => {
    it('sollte Clipping-Asset erfolgreich speichern', async () => {
      // Arrange
      mockAddDoc.mockResolvedValueOnce({ id: 'new-clipping-id' });

      // Act
      const result = await mediaService.saveClippingAsset(mockClippingData, testContext);

      // Assert
      expect(result).toBe('new-clipping-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          organizationId: testContext.organizationId,
          createdBy: testContext.userId,
          type: 'clipping',
          outlet: 'TechCrunch',
          reachValue: 50000,
          sentimentScore: 0.7,
          projectId: 'project-123',
          fileName: expect.stringContaining('TechCrunch_'),
          fileType: 'text/clipping',
          storagePath: expect.stringContaining(`clippings/${testContext.organizationId}/`),
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Default-Werte für fehlende Clipping-Daten setzen', async () => {
      // Arrange
      const minimalClipping = {
        outlet: 'TestOutlet',
        title: 'Test Title',
        publishDate: Timestamp.now()
      };
      
      mockAddDoc.mockResolvedValueOnce({ id: 'minimal-clipping-id' });

      // Act
      await mediaService.saveClippingAsset(minimalClipping, testContext);

      // Assert
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reachValue: 0,
          sentimentScore: 0,
          tags: [],
          downloadUrl: ''
        })
      );
    });

    it('sollte Pipeline-Kontext korrekt speichern', async () => {
      // Arrange
      const clippingWithContext = {
        ...mockClippingData,
        projectId: 'proj-123',
        campaignId: 'camp-456',
        distributionId: 'dist-789',
        monitoringPhaseId: 'monitor-101'
      };
      
      mockAddDoc.mockResolvedValueOnce({ id: 'context-clipping-id' });

      // Act
      await mediaService.saveClippingAsset(clippingWithContext, testContext);

      // Assert
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projectId: 'proj-123',
          campaignId: 'camp-456',
          distributionId: 'dist-789',
          monitoringPhaseId: 'monitor-101'
        })
      );
    });

    it('sollte Fehler bei Firestore-Error korrekt weiterleiten', async () => {
      // Arrange
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write failed'));

      // Act & Assert
      await expect(
        mediaService.saveClippingAsset(mockClippingData, testContext)
      ).rejects.toThrow('Firestore write failed');
    });
  });

  describe('getProjectClippings', () => {
    it('sollte Projekt-Clippings erfolgreich laden', async () => {
      // Arrange
      const mockClippings = [
        { ...mockClippingData, outlet: 'TechCrunch' },
        { ...mockClippingData, outlet: 'Wired' },
        { ...mockClippingData, outlet: 'The Verge' }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockClippings.map((clip, index) => ({
          id: `clip-${index + 1}`,
          data: () => ({ ...clip, createdBy: testContext.userId })
        }))
      });

      // Act
      const result = await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'clip-1',
        outlet: 'TechCrunch',
        userId: testContext.userId // Gemappt von createdBy
      }));

      // Verifizie Firestore Query
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testContext.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'clipping');
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-123');
      expect(mockOrderBy).toHaveBeenCalledWith('publishDate', 'desc');
    });

    it('sollte leeres Array bei nicht-existierenden Projekt zurückgeben', async () => {
      // Arrange
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      });

      // Act
      const result = await mediaService.getProjectClippings('nonexistent-project', testContext.organizationId);

      // Assert
      expect(result).toEqual([]);
    });

    it('sollte Multi-Tenancy-Sicherheit gewährleisten', async () => {
      // Arrange - Simuliere Query Ausführung
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      });

      // Act
      await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testContext.organizationId);
    });

    it('sollte bei Firestore-Fehler leeres Array zurückgeben und Fehler loggen', async () => {
      // Arrange
      mockGetDocs.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Projekt-Clippings:', 
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('sollte userId-Compatibility korrekt handhaben', async () => {
      // Arrange
      const clippingWithoutCreatedBy = {
        ...mockClippingData,
        organizationId: testContext.organizationId
        // Kein createdBy Feld (Legacy-Daten)
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [{
          id: 'clip-legacy',
          data: () => clippingWithoutCreatedBy
        }]
      });

      // Act
      const result = await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(result[0].userId).toBe(testContext.organizationId); // Fallback zu organizationId
    });
  });

  describe('updateClippingMetrics', () => {
    const mockMetrics: ClippingMetrics = {
      reachValue: 75000,
      sentimentScore: 0.8,
      mediaValue: 18000,
      engagementScore: 0.65,
      costPerReach: 0.24,
      earnedMediaValue: 22000
    };

    beforeEach(() => {
      mockDoc.mockReturnValue({ 
        id: 'clipping-123',
        update: mockUpdateDoc,
        get: mockGetDoc
      });
    });

    it('sollte Clipping-Metriken erfolgreich aktualisieren', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: testContext.organizationId
        })
      });

      // Act
      await mediaService.updateClippingMetrics('clipping-123', mockMetrics, testContext);

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reachValue: 75000,
          sentimentScore: 0.8,
          mediaValue: 18000,
          engagementScore: 0.65,
          costPerReach: 0.24,
          earnedMediaValue: 22000,
          updatedBy: testContext.userId,
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Fehler werfen wenn Clipping nicht existiert', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      });

      // Act & Assert
      await expect(
        mediaService.updateClippingMetrics('nonexistent-clipping', mockMetrics, testContext)
      ).rejects.toThrow('Clipping nicht gefunden');
    });

    it('sollte Multi-Tenancy-Sicherheit gewährleisten', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: 'other-org-456' // Anderer Organization-Owner
        })
      });

      // Act & Assert
      await expect(
        mediaService.updateClippingMetrics('clipping-123', mockMetrics, testContext)
      ).rejects.toThrow('Keine Berechtigung');
    });

    it('sollte partielle Metriken-Updates korrekt behandeln', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: testContext.organizationId
        })
      });

      const partialMetrics = {
        reachValue: 80000,
        sentimentScore: 0.9
        // Andere Felder fehlen
      };

      // Act
      await mediaService.updateClippingMetrics('clipping-123', partialMetrics, testContext);

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reachValue: 80000,
          sentimentScore: 0.9,
          mediaValue: undefined,
          engagementScore: undefined
        })
      );
    });

    it('sollte Firestore-Fehler korrekt weiterleiten', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: testContext.organizationId
        })
      });

      mockUpdateDoc.mockRejectedValueOnce(new Error('Update failed'));

      // Act & Assert
      await expect(
        mediaService.updateClippingMetrics('clipping-123', mockMetrics, testContext)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('searchClippings', () => {
    const mockClippingsData = [
      { 
        id: 'clip-1', 
        title: 'Tech Innovation Article',
        content: 'Breakthrough in AI technology...',
        outlet: 'TechCrunch', 
        publishDate: { seconds: Date.now() / 1000 },
        reachValue: 50000,
        sentimentScore: 0.5,
        projectId: 'proj-1',
        createdBy: testContext.userId,
        organizationId: testContext.organizationId
      },
      { 
        id: 'clip-2', 
        title: 'Startup Success Story',
        content: 'Local startup raises Series A...',
        outlet: 'Wired', 
        publishDate: { seconds: (Date.now() - 24*60*60*1000) / 1000 },
        reachValue: 30000,
        sentimentScore: 0.8,
        projectId: 'proj-2',
        createdBy: testContext.userId,
        organizationId: testContext.organizationId
      },
      { 
        id: 'clip-3', 
        title: 'Market Analysis',
        content: 'Critical review of market trends...',
        outlet: 'Bloomberg', 
        publishDate: { seconds: (Date.now() - 48*60*60*1000) / 1000 },
        reachValue: 100000,
        sentimentScore: -0.2,
        projectId: 'proj-1',
        createdBy: testContext.userId,
        organizationId: testContext.organizationId
      }
    ];

    beforeEach(() => {
      mockGetDocs.mockResolvedValue({
        docs: mockClippingsData.map(clip => ({
          id: clip.id,
          data: () => clip
        }))
      });
    });

    it('sollte alle Clippings ohne Filter zurückgeben', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {});

      // Assert
      expect(result).toHaveLength(3);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testContext.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'clipping');
    });

    it('sollte nach Projekt-IDs filtern', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        projectIds: ['proj-1']
      });

      // Assert
      expect(result).toHaveLength(2); // clip-1 und clip-3 haben projectId 'proj-1'
      expect(result.every(clip => (clip as any).projectId === 'proj-1')).toBe(true);
    });

    it('sollte nach Outlets filtern', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        outlets: ['TechCrunch', 'Wired']
      });

      // Assert
      expect(result).toHaveLength(2); // clip-1 (TechCrunch) und clip-2 (Wired)
      expect(result.some(clip => (clip as any).outlet === 'TechCrunch')).toBe(true);
      expect(result.some(clip => (clip as any).outlet === 'Wired')).toBe(true);
    });

    it('sollte nach Datum-Bereich filtern', async () => {
      // Arrange
      const yesterday = new Date(Date.now() - 24*60*60*1000);
      const today = new Date();

      // Mock Firestore-Filter für Datum
      mockQuery.mockImplementation((...args) => {
        // Simuliere Firestore Datum-Filterung
        if (args.some(arg => Array.isArray(arg) && arg.includes('publishDate'))) {
          return mockClippingsData
            .filter(clip => clip.publishDate.seconds * 1000 >= yesterday.getTime())
            .map(clip => ({ id: clip.id, data: () => clip }));
        }
        return args;
      });

      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        dateFrom: yesterday,
        dateTo: today
      });

      // Assert
      expect(mockWhere).toHaveBeenCalledWith('publishDate', '>=', expect.any(Object));
      expect(mockWhere).toHaveBeenCalledWith('publishDate', '<=', expect.any(Object));
    });

    it('sollte nach Sentiment-Bereich filtern', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        sentimentRange: { min: 0.0, max: 0.6 }
      });

      // Assert
      expect(result).toHaveLength(1); // Nur clip-1 mit sentiment 0.5
      expect((result[0] as any).sentimentScore).toBe(0.5);
    });

    it('sollte nach Mindest-Reichweite filtern', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        reachMin: 40000
      });

      // Assert
      expect(result).toHaveLength(2); // clip-1 (50k) und clip-3 (100k)
      expect(result.every(clip => (clip as any).reachValue >= 40000)).toBe(true);
    });

    it('sollte Text-Suche in Titel, Content und Outlet durchführen', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        searchTerm: 'tech'
      });

      // Assert
      expect(result).toHaveLength(2); // clip-1 (TechCrunch + Tech Innovation) und clip-1 (AI technology)
      expect(result.some(clip => 
        (clip as any).title?.toLowerCase().includes('tech') ||
        (clip as any).content?.toLowerCase().includes('tech') ||
        (clip as any).outlet?.toLowerCase().includes('tech')
      )).toBe(true);
    });

    it('sollte Ergebnisse nach Publish-Datum sortieren (neueste zuerst)', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {});

      // Assert
      expect(result).toHaveLength(3);
      
      // Prüfe Sortierung (neueste zuerst)
      for (let i = 0; i < result.length - 1; i++) {
        const currentTime = (result[i] as any).publishDate?.seconds || 0;
        const nextTime = (result[i + 1] as any).publishDate?.seconds || 0;
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    });

    it('sollte kombinierte Filter korrekt anwenden', async () => {
      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {
        projectIds: ['proj-1'],
        sentimentRange: { min: 0.0, max: 1.0 },
        reachMin: 40000,
        searchTerm: 'tech'
      });

      // Assert - Sollte clip-1 finden (proj-1, sentiment 0.5, reach 50k, title enthält 'Tech')
      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe('clip-1');
    });

    it('sollte bei Firestore-Fehler leeres Array zurückgeben', async () => {
      // Arrange
      mockGetDocs.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await mediaService.searchClippings(testContext.organizationId, {});

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Fehler bei Clipping-Suche:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('exportClippings', () => {
    const mockExportClippings = [
      {
        id: 'export-1',
        title: 'Export Test Article',
        outlet: 'Test Journal',
        publishDate: { seconds: Date.now() / 1000 },
        reachValue: 25000,
        sentimentScore: 0.6,
        mediaValue: 5000,
        url: 'https://example.com/article1',
        organizationId: testContext.organizationId
      },
      {
        id: 'export-2',
        title: 'Another Export Article',
        outlet: 'Another Journal',
        publishDate: { seconds: (Date.now() - 24*60*60*1000) / 1000 },
        reachValue: 35000,
        sentimentScore: 0.3,
        mediaValue: 7000,
        url: 'https://example.com/article2',
        organizationId: testContext.organizationId
      }
    ];

    beforeEach(() => {
      // Mock getDoc für einzelne Clipping-Abfragen
      mockGetDoc.mockImplementation((docRef) => {
        const clipping = mockExportClippings.find(c => c.id === docRef.id) || mockExportClippings[0];
        return Promise.resolve({
          exists: () => true,
          data: () => clipping,
          id: clipping.id
        });
      });
    });

    it('sollte CSV-Export erfolgreich durchführen', async () => {
      // Act
      const result = await mediaService.exportClippings(
        ['export-1', 'export-2'], 
        'csv', 
        testContext
      );

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv; charset=utf-8');
      
      // Prüfe CSV-Content
      const csvText = await result.text();
      expect(csvText).toContain('Titel,Outlet,Datum,Reichweite,Sentiment,Media Value,URL');
      expect(csvText).toContain('Export Test Article');
      expect(csvText).toContain('Test Journal');
      expect(csvText).toContain('25000');
      expect(csvText).toContain('0.6');
    });

    it('sollte PDF-Export erfolgreich durchführen', async () => {
      // Act
      const result = await mediaService.exportClippings(
        ['export-1', 'export-2'], 
        'pdf', 
        testContext
      );

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('sollte Excel-Export erfolgreich durchführen', async () => {
      // Act
      const result = await mediaService.exportClippings(
        ['export-1', 'export-2'], 
        'excel', 
        testContext
      );

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('sollte nur Clippings der eigenen Organisation exportieren', async () => {
      // Arrange - Ein Clipping gehört anderer Organisation
      const mixedClippings = [
        { ...mockExportClippings[0], organizationId: testContext.organizationId },
        { ...mockExportClippings[1], organizationId: 'other-org-456' }
      ];

      mockGetDoc.mockImplementation((docRef) => {
        const clipping = mixedClippings.find(c => c.id === docRef.id) || mixedClippings[0];
        return Promise.resolve({
          exists: () => true,
          data: () => clipping,
          id: clipping.id
        });
      });

      // Act
      const result = await mediaService.exportClippings(
        ['export-1', 'export-2'], 
        'csv', 
        testContext
      );

      // Assert
      const csvText = await result.text();
      // Sollte nur das erste Clipping enthalten (eigene Organisation)
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      expect(lines).toHaveLength(2); // Header + 1 Datenzeile
    });

    it('sollte leeren Export für nicht-existierende Clippings erstellen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      // Act
      const result = await mediaService.exportClippings(
        ['nonexistent-1', 'nonexistent-2'], 
        'csv', 
        testContext
      );

      // Assert
      const csvText = await result.text();
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      expect(lines).toHaveLength(1); // Nur Header
    });

    it('sollte CSV-Sonderzeichen korrekt escapen', async () => {
      // Arrange
      const specialCharClipping = {
        id: 'special-1',
        title: 'Article with "quotes" and, commas',
        outlet: 'Journal, Inc.',
        publishDate: { seconds: Date.now() / 1000 },
        reachValue: 15000,
        sentimentScore: 0.4,
        mediaValue: 3000,
        url: 'https://example.com/special',
        organizationId: testContext.organizationId
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => specialCharClipping,
        id: 'special-1'
      });

      // Act
      const result = await mediaService.exportClippings(['special-1'], 'csv', testContext);

      // Assert
      const csvText = await result.text();
      expect(csvText).toContain('"Article with "quotes" and, commas"');
      expect(csvText).toContain('"Journal, Inc."');
    });

    it('sollte Datum korrekt formatieren', async () => {
      // Arrange
      const testDate = new Date('2024-03-15T10:30:00Z');
      const dateClipping = {
        ...mockExportClippings[0],
        publishDate: { seconds: testDate.getTime() / 1000 }
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => dateClipping,
        id: 'date-test'
      });

      // Act
      const result = await mediaService.exportClippings(['date-test'], 'csv', testContext);

      // Assert
      const csvText = await result.text();
      const expectedDate = testDate.toLocaleDateString();
      expect(csvText).toContain(expectedDate);
    });
  });

  describe('generateClippingScreenshot', () => {
    it('sollte Screenshot-Placeholder erfolgreich generieren', async () => {
      // Arrange
      const testUrl = 'https://example.com/article';

      // Act
      const result = await mediaService.generateClippingScreenshot(
        testUrl, 
        'clipping-123', 
        testContext
      );

      // Assert
      expect(result).toContain('via.placeholder.com');
      expect(result).toContain('Screenshot wird generiert...');
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          screenshot: expect.stringContaining('via.placeholder.com'),
          screenshotGeneratedAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Fehler bei Screenshot-Generierung korrekt behandeln', async () => {
      // Arrange
      mockUpdateDoc.mockRejectedValueOnce(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(
        mediaService.generateClippingScreenshot('https://example.com', 'clipping-123', testContext)
      ).rejects.toThrow('Update failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler bei Screenshot-Generierung:', 
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createClippingPackage', () => {
    beforeEach(() => {
      // Mock createShareLink method
      jest.spyOn(mediaService, 'createShareLink').mockResolvedValue({
        id: 'share-link-123',
        shareId: 'package-share-id-456'
      } as any);
    });

    it('sollte Clipping-Package erfolgreich erstellen', async () => {
      // Arrange
      const clippingIds = ['clip-1', 'clip-2', 'clip-3'];
      
      // Mock getDoc für alle Clippings
      mockGetDoc.mockImplementation(() => Promise.resolve({
        exists: () => true,
        data: () => ({ 
          ...mockClippingData, 
          organizationId: testContext.organizationId 
        }),
        id: 'clip-test'
      }));

      // Act
      const result = await mediaService.createClippingPackage(
        clippingIds,
        'Q1 Media Coverage Package',
        testContext
      );

      // Assert
      expect(result).toBe('package-share-id-456');
      expect(mediaService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'clipping_package',
          type: 'clipping_package',
          title: 'Q1 Media Coverage Package',
          description: 'Package mit 3 Clippings',
          assetIds: clippingIds,
          organizationId: testContext.organizationId,
          createdBy: testContext.userId
        })
      );
    });

    it('sollte nur Clippings der eigenen Organisation in Package aufnehmen', async () => {
      // Arrange
      const clippingIds = ['clip-own-1', 'clip-other-1', 'clip-own-2'];
      
      mockGetDoc.mockImplementation((docRef) => {
        const isOwn = docRef.id.includes('own');
        return Promise.resolve({
          exists: () => true,
          data: () => ({ 
            ...mockClippingData, 
            organizationId: isOwn ? testContext.organizationId : 'other-org'
          }),
          id: docRef.id
        });
      });

      // Act
      const result = await mediaService.createClippingPackage(
        clippingIds,
        'Mixed Package',
        testContext
      );

      // Assert
      expect(mediaService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Package mit 2 Clippings' // Nur 2 eigene Clippings
        })
      );
    });

    it('sollte Fehler werfen wenn keine gültigen Clippings gefunden werden', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      // Act & Assert
      await expect(
        mediaService.createClippingPackage(
          ['invalid-1', 'invalid-2'],
          'Empty Package',
          testContext
        )
      ).rejects.toThrow('Keine gültigen Clippings gefunden');
    });

    it('sollte Package-Einstellungen korrekt setzen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ 
          ...mockClippingData, 
          organizationId: testContext.organizationId 
        }),
        id: 'clip-test'
      });

      // Act
      await mediaService.createClippingPackage(['clip-1'], 'Test Package', testContext);

      // Assert
      expect(mediaService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            expiresAt: expect.any(Date),
            downloadAllowed: true,
            passwordRequired: null,
            watermarkEnabled: false
          })
        })
      );
    });
  });

  describe('Edge Cases und Error-Handling', () => {
    it('sollte bei ungültigen Clipping-IDs robust reagieren', async () => {
      // Arrange
      mockGetDoc.mockRejectedValueOnce(new Error('Invalid document ID'));

      // Act & Assert
      await expect(
        mediaService.updateClippingMetrics('', {}, testContext)
      ).rejects.toThrow();
    });

    it('sollte bei Netzwerk-Timeouts korrekt reagieren', async () => {
      // Arrange
      jest.setTimeout(10000);
      mockGetDocs.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      // Act
      const result = await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(result).toEqual([]); // Fallback zu leerem Array
    });

    it('sollte bei fehlenden Permissions entsprechende Fehler werfen', async () => {
      // Arrange
      const restrictedContext = {
        organizationId: 'restricted-org',
        userId: 'unauthorized-user'
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: testContext.organizationId // Anderer Owner
        })
      });

      // Act & Assert
      await expect(
        mediaService.updateClippingMetrics('clipping-123', {}, restrictedContext)
      ).rejects.toThrow('Keine Berechtigung');
    });

    it('sollte Race-Conditions bei parallelen Clipping-Updates behandeln', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockClippingData,
          organizationId: testContext.organizationId
        })
      });

      const metrics1 = { reachValue: 1000 };
      const metrics2 = { reachValue: 2000 };
      const metrics3 = { reachValue: 3000 };

      // Act - Simuliere parallele Updates
      const promises = [
        mediaService.updateClippingMetrics('clipping-123', metrics1, testContext),
        mediaService.updateClippingMetrics('clipping-123', metrics2, testContext),
        mediaService.updateClippingMetrics('clipping-123', metrics3, testContext)
      ];

      // Assert - Alle sollten erfolgreich sein
      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
    });
  });
});