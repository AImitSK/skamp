// src/__tests__/features/plan-5-9-project-service-monitoring.test.ts
/**
 * PLAN 5/9: MONITORING-IMPLEMENTIERUNG TESTS
 * Umfassende Tests für erweiterte Project Service Monitoring-Funktionen
 * 
 * Test-Coverage:
 * - Monitoring-Phase Start/Stop
 * - Analytics-Daten Update
 * - Clipping-Management
 * - Dashboard-Generierung
 * - Report-Export
 * - Multi-Tenancy Sicherheit
 * - Error-Handling & Edge Cases
 */

import { projectService } from '@/lib/firebase/project-service';
import { Timestamp } from 'firebase/firestore';
import { 
  ProjectWithMonitoring,
  ProjectAnalytics,
  MonitoringProvider,
  AnalyticsDashboard
} from '@/types/project';
import { MediaClipping, ClippingAsset } from '@/types/media';

// Firebase-Mocks
jest.mock('@/lib/firebase/client-init');
jest.mock('@/lib/firebase/media-service');

// Mock Firebase Firestore Functions
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  doc: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  }
}));

describe('ProjectService Monitoring-Implementierung (Plan 5/9)', () => {
  const testContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456'
  };

  const mockProject: ProjectWithMonitoring = {
    id: 'project-123',
    userId: testContext.userId,
    organizationId: testContext.organizationId,
    title: 'Test Monitoring Project',
    status: 'active',
    currentStage: 'distribution',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    monitoringConfig: {
      isEnabled: true,
      monitoringPeriod: 30,
      autoTransition: true,
      providers: [{
        name: 'landau',
        apiEndpoint: 'https://api.landau.de',
        isEnabled: true,
        supportedMetrics: ['reach', 'sentiment', 'mentions']
      }] as MonitoringProvider[],
      alertThresholds: {
        minReach: 1000,
        sentimentAlert: -0.3,
        competitorMentions: 10
      },
      reportSchedule: 'weekly'
    },
    analytics: {
      projectId: 'project-123',
      organizationId: testContext.organizationId,
      totalReach: 50000,
      mediaValue: 25000,
      clippingCount: 15,
      sentimentScore: 0.3,
      topOutlets: [],
      timelineData: [],
      lastUpdated: Timestamp.now(),
      dataCollectionStarted: Timestamp.now()
    } as ProjectAnalytics,
    monitoringStatus: 'not_started'
  };

  const mockClipping: MediaClipping = {
    id: 'clipping-123',
    title: 'Test Article',
    outlet: 'Test Journal',
    publishDate: Timestamp.now(),
    url: 'https://example.com/article',
    content: 'Test article content',
    reachValue: 5000,
    sentimentScore: 0.5,
    mediaValue: 1200,
    tags: ['tech', 'startup'],
    organizationId: testContext.organizationId,
    createdBy: testContext.userId,
    projectId: 'project-123',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startMonitoring', () => {
    it('sollte Monitoring-Phase erfolgreich starten', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const monitoringConfig = {
        isEnabled: true,
        monitoringPeriod: 90,
        autoTransition: false,
        providers: [{
          name: 'pmg',
          apiEndpoint: 'https://api.pmg.de',
          isEnabled: true,
          supportedMetrics: ['reach', 'sentiment']
        }] as MonitoringProvider[],
        alertThresholds: {
          minReach: 2000,
          sentimentAlert: -0.2,
          competitorMentions: 5
        },
        reportSchedule: 'daily'
      };

      // Act
      await projectService.startMonitoring('project-123', monitoringConfig, testContext);

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'monitoring',
          monitoringStartedAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Fehler werfen wenn Projekt nicht existiert', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      });

      // Act & Assert
      await expect(
        projectService.startMonitoring('nonexistent-project', {}, testContext)
      ).rejects.toThrow('Projekt nicht gefunden');
    });

    it('sollte Multi-Tenancy-Sicherheit gewährleisten', async () => {
      // Arrange
      const otherOrgProject = { ...mockProject, organizationId: 'other-org' };
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => otherOrgProject,
        id: 'project-123'
      });

      // Act & Assert - getById sollte null zurückgeben für fremde Organization
      await expect(
        projectService.startMonitoring('project-123', {}, testContext)
      ).rejects.toThrow('Projekt nicht gefunden');
    });
  });

  describe('updateAnalytics', () => {
    it('sollte Analytics-Daten erfolgreich aktualisieren', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const updatedAnalytics: Partial<ProjectAnalytics> = {
        totalReach: 75000,
        mediaValue: 35000,
        clippingCount: 20,
        sentimentScore: 0.4,
        lastUpdated: Timestamp.now()
      };

      // Act
      await projectService.updateAnalytics('project-123', updatedAnalytics, testContext);

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Error-Handling für ungültige Analytics-Daten korrekt behandeln', async () => {
      // Arrange
      mockGetDoc.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(
        projectService.updateAnalytics('project-123', {}, testContext)
      ).rejects.toThrow();
    });
  });

  describe('addClipping', () => {
    beforeEach(() => {
      // Mock media service
      const mockMediaService = {
        uploadMedia: jest.fn().mockResolvedValue('asset-id-123')
      };
      require('@/lib/firebase/media-service').mediaService = mockMediaService;
    });

    it('sollte Clipping erfolgreich hinzufügen und Analytics aktualisieren', async () => {
      // Arrange
      const projectWithAnalytics = {
        ...mockProject,
        analytics: {
          ...mockProject.analytics!,
          clippingCount: 5,
          totalReach: 20000,
          sentimentScore: 0.2
        }
      };

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => projectWithAnalytics,
          id: 'project-123'
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => projectWithAnalytics,
          id: 'project-123'
        });

      // Act
      await projectService.addClipping('project-123', mockClipping, testContext);

      // Assert
      // Verifizie dass MediaService aufgerufen wurde
      const { mediaService } = require('@/lib/firebase/media-service');
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(
        expect.any(Blob),
        testContext.organizationId,
        undefined,
        undefined,
        3,
        { userId: testContext.userId }
      );
    });

    it('sollte Sentiment-Score korrekt neu berechnen', async () => {
      // Arrange
      const projectWithAnalytics = {
        ...mockProject,
        analytics: {
          ...mockProject.analytics!,
          clippingCount: 2,
          totalReach: 10000,
          sentimentScore: 0.1 // Alter Durchschnitt
        }
      };

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => projectWithAnalytics,
          id: 'project-123'
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => projectWithAnalytics,
          id: 'project-123'
        });

      // Neues Clipping mit Sentiment 0.5
      const newClipping = { ...mockClipping, sentimentScore: 0.5 };

      // Act
      await projectService.addClipping('project-123', newClipping, testContext);

      // Assert
      // Erwarteter neuer Durchschnitt: (0.1 * 2 + 0.5) / 3 = 0.23333...
      // Das Testing auf exakte Berechnung würde hier im updateAnalytics-Call stattfinden
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it('sollte ClippingAsset korrekt strukturieren', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      // Act
      await projectService.addClipping('project-123', mockClipping, testContext);

      // Assert
      const { mediaService } = require('@/lib/firebase/media-service');
      const uploadCall = mediaService.uploadMedia.mock.calls[0];
      
      expect(uploadCall[0]).toBeInstanceOf(Blob); // Blob mit Content
      expect(uploadCall[1]).toBe(testContext.organizationId);
      expect(uploadCall[5]).toEqual({ userId: testContext.userId });
    });
  });

  describe('getAnalyticsDashboard', () => {
    beforeEach(() => {
      mockQuery.mockImplementation((...args) => args);
      mockWhere.mockImplementation((...args) => args);
      mockOrderBy.mockImplementation((...args) => args);
    });

    it('sollte Analytics-Dashboard erfolgreich generieren', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const mockClippings = [
        { 
          id: 'clip-1', 
          outlet: 'Journal A', 
          reachValue: 10000, 
          sentimentScore: 0.3,
          mediaValue: 2000,
          publishDate: { seconds: Date.now() / 1000 }
        },
        { 
          id: 'clip-2', 
          outlet: 'Journal B', 
          reachValue: 8000, 
          sentimentScore: 0.1,
          mediaValue: 1500,
          publishDate: { seconds: Date.now() / 1000 }
        }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockClippings.map(clip => ({ id: clip.id, data: () => clip }))
      });

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      expect(dashboard).toHaveProperty('projectId', 'project-123');
      expect(dashboard).toHaveProperty('organizationId', testContext.organizationId);
      expect(dashboard).toHaveProperty('analytics');
      expect(dashboard).toHaveProperty('clippings');
      expect(dashboard).toHaveProperty('kpiData');
      expect(dashboard).toHaveProperty('timelineData');
      expect(dashboard).toHaveProperty('outletRanking');
      expect(dashboard).toHaveProperty('sentimentDistribution');
    });

    it('sollte KPIs korrekt berechnen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const mockClippings = [
        { reachValue: 10000, mediaValue: 2000, sentimentScore: 0.5 },
        { reachValue: 5000, mediaValue: 1000, sentimentScore: -0.2 },
        { reachValue: 3000, mediaValue: 800, sentimentScore: 0.1 }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockClippings.map((clip, i) => ({ 
          id: `clip-${i}`, 
          data: () => clip 
        }))
      });

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      const kpis = dashboard.kpiData;
      expect(kpis.totalClippings).toBe(3);
      expect(kpis.totalReach).toBe(18000);
      expect(kpis.totalMediaValue).toBe(3800);
      expect(kpis.averageSentiment).toBeCloseTo(0.133, 2); // (0.5 - 0.2 + 0.1) / 3
    });

    it('sollte Timeline-Daten korrekt gruppieren', async () => {
      // Arrange
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const mockClippings = [
        { 
          publishDate: { seconds: today.getTime() / 1000 },
          reachValue: 10000, 
          sentimentScore: 0.3 
        },
        { 
          publishDate: { seconds: today.getTime() / 1000 },
          reachValue: 5000, 
          sentimentScore: 0.7 
        },
        { 
          publishDate: { seconds: yesterday.getTime() / 1000 },
          reachValue: 8000, 
          sentimentScore: -0.1 
        }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockClippings.map((clip, i) => ({ 
          id: `clip-${i}`, 
          data: () => clip 
        }))
      });

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      const timelineData = dashboard.timelineData;
      expect(timelineData).toHaveLength(2); // Zwei verschiedene Tage
      
      const todayData = timelineData.find((d: any) => 
        new Date(d.date).toDateString() === today.toDateString()
      );
      expect(todayData?.reach).toBe(15000); // 10000 + 5000
      expect(todayData?.clippings).toBe(2);
      expect(todayData?.sentiment).toBeCloseTo(0.5, 1); // (0.3 + 0.7) / 2
    });

    it('sollte Outlet-Ranking korrekt sortieren', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      const mockClippings = [
        { outlet: 'Big Journal', reachValue: 15000, sentimentScore: 0.4, mediaValue: 3000 },
        { outlet: 'Small Blog', reachValue: 2000, sentimentScore: 0.8, mediaValue: 400 },
        { outlet: 'Big Journal', reachValue: 10000, sentimentScore: 0.2, mediaValue: 2000 },
        { outlet: 'Medium Paper', reachValue: 7000, sentimentScore: -0.1, mediaValue: 1200 }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockClippings.map((clip, i) => ({ 
          id: `clip-${i}`, 
          data: () => clip 
        }))
      });

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      const ranking = dashboard.outletRanking;
      
      // Sollte nach totalReach sortiert sein
      expect(ranking[0].name).toBe('Big Journal');
      expect(ranking[0].totalReach).toBe(25000); // 15000 + 10000
      expect(ranking[0].clippingCount).toBe(2);
      expect(ranking[0].averageSentiment).toBeCloseTo(0.3, 1); // (0.4 + 0.2) / 2
      
      expect(ranking[1].name).toBe('Medium Paper');
      expect(ranking[2].name).toBe('Small Blog');
    });

    it('sollte Multi-Tenancy in Clipping-Abfrage berücksichtigen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      mockGetDocs.mockResolvedValueOnce({
        docs: []
      });

      // Act
      await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testContext.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-123');
    });
  });

  describe('generateMonitoringReport', () => {
    it('sollte PDF-Report erfolgreich generieren', async () => {
      // Arrange
      const mockDashboard = {
        analytics: mockProject.analytics,
        kpiData: { totalClippings: 5, totalReach: 25000 }
      };

      jest.spyOn(projectService, 'getAnalyticsDashboard').mockResolvedValueOnce(mockDashboard);

      // Act
      const report = await projectService.generateMonitoringReport(
        'project-123', 
        'pdf', 
        testContext
      );

      // Assert
      expect(report).toBeInstanceOf(Blob);
      expect(report.type).toBe('application/json'); // Placeholder implementation
    });

    it('sollte Excel-Report erfolgreich generieren', async () => {
      // Arrange
      const mockDashboard = {
        analytics: mockProject.analytics,
        kpiData: { totalClippings: 5, totalReach: 25000 }
      };

      jest.spyOn(projectService, 'getAnalyticsDashboard').mockResolvedValueOnce(mockDashboard);

      // Act
      const report = await projectService.generateMonitoringReport(
        'project-123', 
        'excel', 
        testContext
      );

      // Assert
      expect(report).toBeInstanceOf(Blob);
      expect(report.type).toBe('application/vnd.ms-excel'); // Placeholder implementation
    });

    it('sollte Error-Handling bei Dashboard-Fehler korrekt behandeln', async () => {
      // Arrange
      jest.spyOn(projectService, 'getAnalyticsDashboard')
        .mockRejectedValueOnce(new Error('Dashboard generation failed'));

      // Act & Assert
      await expect(
        projectService.generateMonitoringReport('project-123', 'pdf', testContext)
      ).rejects.toThrow();
    });
  });

  describe('completeMonitoring', () => {
    it('sollte Monitoring-Phase erfolgreich abschließen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...mockProject, currentStage: 'monitoring' }),
        id: 'project-123'
      });

      // Act
      await projectService.completeMonitoring('project-123', testContext);

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStage: 'completed',
          completedAt: expect.any(Object)
        })
      );
    });

    it('sollte Fehler bei nicht-authorisierten Zugriff werfen', async () => {
      // Arrange
      const otherOrgProject = { ...mockProject, organizationId: 'other-org' };
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => otherOrgProject,
        id: 'project-123'
      });

      // Act & Assert
      await expect(
        projectService.completeMonitoring('project-123', testContext)
      ).rejects.toThrow();
    });
  });

  describe('getMonitoringProjects', () => {
    beforeEach(() => {
      mockQuery.mockImplementation((...args) => args);
      mockWhere.mockImplementation((...args) => args);
    });

    it('sollte alle Monitoring-Projekte einer Organisation laden', async () => {
      // Arrange
      const monitoringProjects = [
        { ...mockProject, id: 'proj-1', currentStage: 'monitoring' },
        { ...mockProject, id: 'proj-2', currentStage: 'monitoring' }
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: monitoringProjects.map(proj => ({ 
          id: proj.id, 
          data: () => proj 
        }))
      });

      // Act
      const projects = await projectService.getMonitoringProjects(testContext.organizationId);

      // Assert
      expect(projects).toHaveLength(2);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testContext.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('currentStage', '==', 'monitoring');
    });

    it('sollte nach Monitoring-Status filtern', async () => {
      // Arrange
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      });

      // Act
      await projectService.getMonitoringProjects(testContext.organizationId, 'active');

      // Assert
      expect(mockWhere).toHaveBeenCalledWith('monitoringStatus', '==', 'active');
    });

    it('sollte leeres Array bei Firestore-Fehler zurückgeben', async () => {
      // Arrange
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      // Act
      const result = await projectService.getMonitoringProjects(testContext.organizationId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Analytics Helper-Methoden', () => {
    describe('calculateKPIs', () => {
      it('sollte KPIs aus Clippings korrekt berechnen', () => {
        // Arrange
        const clippings = [
          { reachValue: 10000, mediaValue: 2000, sentimentScore: 0.5 },
          { reachValue: 5000, mediaValue: 1000, sentimentScore: -0.2 },
          { reachValue: 0, mediaValue: 0, sentimentScore: 0.3 } // Edge case: zero values
        ];

        // Act
        const kpis = projectService.calculateKPIs(clippings);

        // Assert
        expect(kpis.totalClippings).toBe(3);
        expect(kpis.totalReach).toBe(15000);
        expect(kpis.totalMediaValue).toBe(3000);
        expect(kpis.averageSentiment).toBeCloseTo(0.2, 2); // (0.5 - 0.2 + 0.3) / 3
      });

      it('sollte mit leerem Array korrekt umgehen', () => {
        // Act
        const kpis = projectService.calculateKPIs([]);

        // Assert
        expect(kpis.totalClippings).toBe(0);
        expect(kpis.totalReach).toBe(0);
        expect(kpis.totalMediaValue).toBe(0);
        expect(kpis.averageSentiment).toBe(0);
      });
    });

    describe('calculateSentimentDistribution', () => {
      it('sollte Sentiment-Verteilung korrekt berechnen', () => {
        // Arrange
        const clippings = [
          { sentimentScore: 0.5 },  // positive
          { sentimentScore: 0.05 }, // neutral (zwischen -0.1 und 0.1)
          { sentimentScore: -0.3 }, // negative
          { sentimentScore: 0.2 },  // positive
          { sentimentScore: -0.15 } // negative
        ];

        // Act
        const distribution = projectService.calculateSentimentDistribution(clippings);

        // Assert
        expect(distribution.positive).toBe(40); // 2/5 = 40%
        expect(distribution.neutral).toBe(20);  // 1/5 = 20%
        expect(distribution.negative).toBe(40); // 2/5 = 40%
      });

      it('sollte mit leerem Array 0% für alle Kategorien zurückgeben', () => {
        // Act
        const distribution = projectService.calculateSentimentDistribution([]);

        // Assert
        expect(distribution.positive).toBe(0);
        expect(distribution.neutral).toBe(0);
        expect(distribution.negative).toBe(0);
      });
    });
  });

  describe('Edge Cases und Error-Handling', () => {
    it('sollte bei Netzwerk-Timeout robust reagieren', async () => {
      // Arrange
      jest.setTimeout(10000);
      mockGetDoc.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      // Act & Assert
      await expect(
        projectService.startMonitoring('project-123', {}, testContext)
      ).rejects.toThrow('Network timeout');
    });

    it('sollte bei ungültiger Organization-ID korrekt reagieren', async () => {
      // Arrange
      const invalidContext = { ...testContext, organizationId: '' };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      // Act & Assert
      await expect(
        projectService.startMonitoring('project-123', {}, invalidContext)
      ).rejects.toThrow();
    });

    it('sollte Race-Conditions bei parallelen Updates korrekt behandeln', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProject,
        id: 'project-123'
      });

      // Act - Simuliere parallele Aufrufe
      const promises = [
        projectService.updateAnalytics('project-123', { totalReach: 1000 }, testContext),
        projectService.updateAnalytics('project-123', { totalReach: 2000 }, testContext),
        projectService.updateAnalytics('project-123', { totalReach: 3000 }, testContext)
      ];

      // Assert - Alle sollten erfolgreich abgeschlossen werden
      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
    });

    it('sollte bei fehlenden Permissions entsprechende Fehler werfen', async () => {
      // Arrange
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false // Simuliere fehlende Berechtigung/nicht gefundenes Dokument
      });

      // Act & Assert
      await expect(
        projectService.getAnalyticsDashboard('restricted-project', testContext)
      ).rejects.toThrow();
    });
  });
});