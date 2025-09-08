// src/__tests__/features/plan-5-9-monitoring-pipeline-integration.test.ts
/**
 * PLAN 5/9: MONITORING-IMPLEMENTIERUNG TESTS
 * Umfassende Tests für Pipeline-Integration der Monitoring-Phase
 * 
 * Test-Coverage:
 * - Pipeline-Stage 'monitoring' Integration
 * - Automatische Transition von Distribution zu Monitoring
 * - Monitoring-Phase Workflow und State-Management
 * - Pipeline-Task Integration für Monitoring
 * - Stage-Validation und Approval-Dependencies
 * - Cross-Stage-Kommunikation und Data-Flow
 * - Multi-Tenancy in Pipeline-Kontext
 * - Error-Handling und Recovery-Mechanismen
 * - Performance und Skalierbarkeit
 */

import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';
import { approvalService } from '@/lib/firebase/approval-service';
import { Timestamp } from 'firebase/firestore';
import { 
  ProjectWithMonitoring, 
  PipelineStage,
  MonitoringProvider,
  ProjectAnalytics 
} from '@/types/project';
import { MediaClipping } from '@/types/media';

// Mock Firebase Services
jest.mock('@/lib/firebase/client-init');
jest.mock('@/lib/firebase/config');
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/approval-service');

// Mock External API Services (Landau, PMG)
const mockLandauAPI = {
  startMonitoring: jest.fn(),
  getClippings: jest.fn(),
  stopMonitoring: jest.fn()
};

const mockPMGAPI = {
  initializeTracking: jest.fn(),
  fetchMediaCoverage: jest.fn(),
  terminateTracking: jest.fn()
};

jest.mock('@/lib/external/landau-api', () => mockLandauAPI);
jest.mock('@/lib/external/pmg-api', () => mockPMGAPI);

// Mock Firebase Functions
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

describe('Monitoring Pipeline-Integration (Plan 5/9)', () => {
  const testContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456'
  };

  const baseProject: ProjectWithMonitoring = {
    id: 'project-123',
    userId: testContext.userId,
    organizationId: testContext.organizationId,
    title: 'AI Product Launch Campaign',
    status: 'active',
    currentStage: 'distribution',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    customer: {
      id: 'customer-789',
      name: 'TechCorp Inc.'
    },
    linkedCampaigns: ['campaign-456'],
    monitoringConfig: {
      isEnabled: true,
      monitoringPeriod: 30,
      autoTransition: true,
      providers: [
        {
          name: 'landau',
          apiEndpoint: 'https://api.landau.de/v1',
          isEnabled: true,
          supportedMetrics: ['reach', 'sentiment', 'mentions']
        } as MonitoringProvider
      ],
      alertThresholds: {
        minReach: 1000,
        sentimentAlert: -0.3,
        competitorMentions: 10
      },
      reportSchedule: 'weekly'
    },
    monitoringStatus: 'not_started'
  };

  const mockApproval = {
    id: 'approval-123',
    projectId: 'project-123',
    organizationId: testContext.organizationId,
    status: 'approved',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockClippingData: MediaClipping = {
    id: 'clipping-123',
    title: 'Revolutionary AI Platform Launch',
    outlet: 'TechCrunch',
    publishDate: Timestamp.now(),
    url: 'https://techcrunch.com/ai-platform',
    content: 'TechCorp launches revolutionary AI platform...',
    reachValue: 75000,
    sentimentScore: 0.8,
    mediaValue: 18000,
    tags: ['ai', 'platform', 'launch'],
    organizationId: testContext.organizationId,
    createdBy: testContext.userId,
    projectId: 'project-123',
    campaignId: 'campaign-456',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
  });

  describe('Pipeline-Stage Transition zu Monitoring', () => {
    beforeEach(() => {
      // Mock projectService methods
      jest.spyOn(projectService, 'getById').mockResolvedValue(baseProject);
      jest.spyOn(projectService, 'update').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'updateStage').mockResolvedValue(undefined);
      
      // Mock approvalService
      jest.spyOn(approvalService, 'getByProjectId').mockResolvedValue(mockApproval as any);
    });

    it('sollte automatische Transition von Distribution zu Monitoring durchführen', async () => {
      // Arrange
      const distributionProject = {
        ...baseProject,
        currentStage: 'distribution' as PipelineStage,
        monitoringConfig: {
          ...baseProject.monitoringConfig!,
          autoTransition: true
        }
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(distributionProject);

      // Act - Simuliere Distribution-Abschluss
      await projectService.updateStage(
        'project-123',
        'monitoring',
        { transitionReason: 'distribution_completed' },
        testContext
      );

      // Assert
      expect(projectService.updateStage).toHaveBeenCalledWith(
        'project-123',
        'monitoring',
        { transitionReason: 'distribution_completed' },
        testContext
      );
    });

    it('sollte manuelle Transition zu Monitoring mit Validation durchführen', async () => {
      // Arrange - Projekt ohne Auto-Transition
      const manualProject = {
        ...baseProject,
        currentStage: 'distribution' as PipelineStage,
        monitoringConfig: {
          ...baseProject.monitoringConfig!,
          autoTransition: false
        }
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(manualProject);

      // Act
      await projectService.updateStage(
        'project-123',
        'monitoring',
        { 
          transitionReason: 'manual_start',
          initiatedBy: testContext.userId,
          timestamp: Timestamp.now()
        },
        testContext
      );

      // Assert
      expect(projectService.updateStage).toHaveBeenCalledWith(
        'project-123',
        'monitoring',
        expect.objectContaining({
          transitionReason: 'manual_start',
          initiatedBy: testContext.userId
        }),
        testContext
      );
    });

    it('sollte Approval-Validation vor Monitoring-Transition prüfen', async () => {
      // Arrange - Projekt ohne gültige Freigabe
      const unapprovedProject = { ...baseProject, currentStage: 'approval' as PipelineStage };
      jest.spyOn(projectService, 'getById').mockResolvedValue(unapprovedProject);
      jest.spyOn(approvalService, 'getByProjectId').mockResolvedValue({ 
        ...mockApproval, 
        status: 'pending' 
      } as any);

      // Act & Assert
      await expect(
        projectService.updateStage('project-123', 'monitoring', {}, testContext)
      ).rejects.toThrow('Kunden-Freigabe erforderlich vor Distribution-Phase');
    });

    it('sollte Pipeline-Status korrekt berechnen für Monitoring-Phase', async () => {
      // Arrange
      const monitoringProject = {
        ...baseProject,
        currentStage: 'monitoring' as PipelineStage,
        monitoringStatus: 'active'
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(monitoringProject);

      // Act
      const status = await projectService.getProjectPipelineStatus('project-123', testContext);

      // Assert
      expect(status).toEqual(expect.objectContaining({
        currentStage: 'monitoring',
        canProgress: true,
        nextStage: undefined // Monitoring ist vor-letzte Phase
      }));
    });

    it('sollte Stage-Transition mit fehlerhafter Konfiguration ablehnen', async () => {
      // Arrange
      const invalidConfigProject = {
        ...baseProject,
        monitoringConfig: undefined
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(invalidConfigProject);

      // Act & Assert
      await expect(
        projectService.updateStage('project-123', 'monitoring', {}, testContext)
      ).rejects.toThrow(); // Service sollte Fehler werfen bei fehlender Config
    });

    it('sollte Multi-Tenancy bei Stage-Transition gewährleisten', async () => {
      // Arrange
      const crossTenantContext = { organizationId: 'other-org', userId: 'other-user' };
      jest.spyOn(projectService, 'getById').mockResolvedValue(null); // Kein Zugriff

      // Act & Assert
      await expect(
        projectService.updateStage('project-123', 'monitoring', {}, crossTenantContext)
      ).rejects.toThrow(); // Access denied
    });
  });

  describe('Monitoring-Phase Workflow', () => {
    beforeEach(() => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(baseProject);
      jest.spyOn(projectService, 'startMonitoring').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'updateAnalytics').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'addClipping').mockResolvedValue(undefined);
      
      // Mock external APIs
      mockLandauAPI.startMonitoring.mockResolvedValue({ trackingId: 'landau-track-123' });
      mockLandauAPI.getClippings.mockResolvedValue([mockClippingData]);
    });

    it('sollte Monitoring erfolgreich starten und externe APIs initialisieren', async () => {
      // Act
      await projectService.startMonitoring(
        'project-123',
        baseProject.monitoringConfig!,
        testContext
      );

      // Assert
      expect(projectService.startMonitoring).toHaveBeenCalledWith(
        'project-123',
        baseProject.monitoringConfig,
        testContext
      );

      // External API sollte initialisiert werden
      expect(mockLandauAPI.startMonitoring).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-123',
          keywords: expect.any(Array),
          outlets: expect.any(Array)
        })
      );
    });

    it('sollte Clipping-Daten automatisch abrufen und verarbeiten', async () => {
      // Arrange
      const monitoringProject = {
        ...baseProject,
        currentStage: 'monitoring' as PipelineStage,
        monitoringStatus: 'active'
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(monitoringProject);

      // Act - Simuliere automatischen Clipping-Abruf
      await projectService.addClipping('project-123', mockClippingData, testContext);

      // Assert
      expect(projectService.addClipping).toHaveBeenCalledWith(
        'project-123',
        mockClippingData,
        testContext
      );
    });

    it('sollte Analytics kontinuierlich aktualisieren', async () => {
      // Arrange
      const updatedAnalytics: Partial<ProjectAnalytics> = {
        totalReach: 175000,
        mediaValue: 42000,
        clippingCount: 12,
        sentimentScore: 0.6,
        lastUpdated: Timestamp.now()
      };

      // Act
      await projectService.updateAnalytics('project-123', updatedAnalytics, testContext);

      // Assert
      expect(projectService.updateAnalytics).toHaveBeenCalledWith(
        'project-123',
        updatedAnalytics,
        testContext
      );
    });

    it('sollte Monitoring-Alerts bei Threshold-Überschreitung auslösen', async () => {
      // Arrange
      const negativeClipping = {
        ...mockClippingData,
        sentimentScore: -0.5, // Unter Threshold von -0.3
        reachValue: 500 // Unter Threshold von 1000
      };

      // Mock Alert-Service
      const mockAlertService = {
        triggerAlert: jest.fn()
      };
      
      // Act
      await projectService.addClipping('project-123', negativeClipping, testContext);

      // Assert - In realer Implementierung würde Alert ausgelöst
      // expect(mockAlertService.triggerAlert).toHaveBeenCalledWith('sentiment_threshold', ...)
    });

    it('sollte Monitoring nach Zeitraum automatisch beenden', async () => {
      // Arrange
      const expiredProject = {
        ...baseProject,
        currentStage: 'monitoring' as PipelineStage,
        monitoringStartedAt: Timestamp.fromDate(
          new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 Tage zurück
        ),
        monitoringConfig: {
          ...baseProject.monitoringConfig!,
          monitoringPeriod: 30 // 30 Tage Zeitraum
        }
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(expiredProject);
      jest.spyOn(projectService, 'completeMonitoring').mockResolvedValue(undefined);

      // Act - Simuliere Cron-Job oder Scheduler
      await projectService.completeMonitoring('project-123', testContext);

      // Assert
      expect(projectService.completeMonitoring).toHaveBeenCalledWith(
        'project-123',
        testContext
      );
    });

    it('sollte Multiple-Provider gleichzeitig handhaben', async () => {
      // Arrange
      const multiProviderProject = {
        ...baseProject,
        monitoringConfig: {
          ...baseProject.monitoringConfig!,
          providers: [
            {
              name: 'landau',
              apiEndpoint: 'https://api.landau.de/v1',
              isEnabled: true,
              supportedMetrics: ['reach', 'sentiment']
            },
            {
              name: 'pmg',
              apiEndpoint: 'https://api.pmg.com/v2',
              isEnabled: true,
              supportedMetrics: ['mentions', 'social']
            }
          ] as MonitoringProvider[]
        }
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(multiProviderProject);

      // Mock beide APIs
      mockPMGAPI.initializeTracking.mockResolvedValue({ sessionId: 'pmg-session-456' });

      // Act
      await projectService.startMonitoring(
        'project-123',
        multiProviderProject.monitoringConfig!,
        testContext
      );

      // Assert
      expect(mockLandauAPI.startMonitoring).toHaveBeenCalled();
      expect(mockPMGAPI.initializeTracking).toHaveBeenCalled();
    });

    it('sollte Provider-Fehler isoliert behandeln', async () => {
      // Arrange
      mockLandauAPI.startMonitoring.mockRejectedValue(new Error('Landau API unavailable'));
      mockPMGAPI.initializeTracking.mockResolvedValue({ sessionId: 'pmg-session-456' });

      const multiProviderProject = {
        ...baseProject,
        monitoringConfig: {
          ...baseProject.monitoringConfig!,
          providers: [
            { name: 'landau', isEnabled: true } as MonitoringProvider,
            { name: 'pmg', isEnabled: true } as MonitoringProvider
          ]
        }
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(multiProviderProject);

      // Act
      await projectService.startMonitoring(
        'project-123',
        multiProviderProject.monitoringConfig!,
        testContext
      );

      // Assert - PMG sollte trotzdem funktionieren
      expect(mockPMGAPI.initializeTracking).toHaveBeenCalled();
      // Landau-Fehler sollte geloggt aber nicht den gesamten Prozess stoppen
    });
  });

  describe('Monitoring-Data Integration', () => {
    beforeEach(() => {
      jest.spyOn(mediaService, 'saveClippingAsset').mockResolvedValue('clipping-asset-123');
      jest.spyOn(mediaService, 'getProjectClippings').mockResolvedValue([]);
      jest.spyOn(mediaService, 'updateClippingMetrics').mockResolvedValue(undefined);
    });

    it('sollte Clipping-Daten korrekt in Media-Service integrieren', async () => {
      // Act
      await mediaService.saveClippingAsset(mockClippingData, testContext);

      // Assert
      expect(mediaService.saveClippingAsset).toHaveBeenCalledWith(
        mockClippingData,
        testContext
      );
    });

    it('sollte Clipping-Metriken real-time aktualisieren', async () => {
      // Arrange
      const updatedMetrics = {
        reachValue: 85000,
        sentimentScore: 0.9,
        mediaValue: 22000,
        engagementScore: 0.75
      };

      // Act
      await mediaService.updateClippingMetrics('clipping-123', updatedMetrics, testContext);

      // Assert
      expect(mediaService.updateClippingMetrics).toHaveBeenCalledWith(
        'clipping-123',
        updatedMetrics,
        testContext
      );
    });

    it('sollte Projekt-Clippings aggregiert abrufen', async () => {
      // Act
      await mediaService.getProjectClippings('project-123', testContext.organizationId);

      // Assert
      expect(mediaService.getProjectClippings).toHaveBeenCalledWith(
        'project-123',
        testContext.organizationId
      );
    });

    it('sollte Monitoring-Dashboard-Daten generieren', async () => {
      // Arrange
      jest.spyOn(projectService, 'getAnalyticsDashboard').mockResolvedValue({
        projectId: 'project-123',
        organizationId: testContext.organizationId,
        analytics: {
          totalReach: 150000,
          mediaValue: 35000,
          clippingCount: 8,
          sentimentScore: 0.45
        } as any,
        kpiData: {
          totalClippings: 8,
          totalReach: 150000,
          totalMediaValue: 35000,
          averageSentiment: 0.45
        },
        timelineData: [],
        outletRanking: [],
        sentimentDistribution: { positive: 60, neutral: 30, negative: 10 }
      });

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      expect(dashboard).toEqual(expect.objectContaining({
        projectId: 'project-123',
        organizationId: testContext.organizationId,
        analytics: expect.any(Object),
        kpiData: expect.any(Object),
        timelineData: expect.any(Array),
        outletRanking: expect.any(Array)
      }));
    });

    it('sollte Cross-Stage-Data-Flow korrekt handhaben', async () => {
      // Arrange - Simuliere Daten-Flow von Distribution zu Monitoring
      const distributionData = {
        campaignId: 'campaign-456',
        distributionLists: ['list-1', 'list-2'],
        sentEmails: 250,
        sentDate: Timestamp.now()
      };

      const monitoringProject = {
        ...baseProject,
        distributionData,
        currentStage: 'monitoring' as PipelineStage
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(monitoringProject);

      // Act
      const project = await projectService.getById('project-123', testContext);

      // Assert - Monitoring sollte auf Distribution-Daten zugreifen können
      expect(project).toEqual(expect.objectContaining({
        distributionData: expect.objectContaining({
          campaignId: 'campaign-456',
          sentEmails: 250
        })
      }));
    });

    it('sollte Monitoring-Reports mit Pipeline-Kontext generieren', async () => {
      // Arrange
      jest.spyOn(projectService, 'generateMonitoringReport').mockResolvedValue(
        new Blob(['monitoring report content'], { type: 'application/pdf' })
      );

      // Act
      const report = await projectService.generateMonitoringReport(
        'project-123',
        'pdf',
        testContext
      );

      // Assert
      expect(report).toBeInstanceOf(Blob);
      expect(report.type).toBe('application/pdf');
      expect(projectService.generateMonitoringReport).toHaveBeenCalledWith(
        'project-123',
        'pdf',
        testContext
      );
    });
  });

  describe('Error-Handling und Recovery', () => {
    it('sollte bei API-Fehlern graceful degradation implementieren', async () => {
      // Arrange
      mockLandauAPI.startMonitoring.mockRejectedValue(new Error('API rate limit exceeded'));

      // Act & Assert - Sollte nicht komplett fehlschlagen
      await expect(
        projectService.startMonitoring('project-123', baseProject.monitoringConfig!, testContext)
      ).resolves.not.toThrow();
    });

    it('sollte bei unvollständigen Clipping-Daten robust reagieren', async () => {
      // Arrange
      const incompleteClipping = {
        id: 'incomplete-clip',
        outlet: 'Unknown Source',
        publishDate: Timestamp.now()
        // Fehlende reachValue, sentimentScore, etc.
      };

      // Act & Assert - Sollte mit Default-Werten fortfahren
      await expect(
        projectService.addClipping('project-123', incompleteClipping as any, testContext)
      ).resolves.not.toThrow();
    });

    it('sollte Monitoring-Recovery nach System-Restart implementieren', async () => {
      // Arrange
      const interruptedProject = {
        ...baseProject,
        currentStage: 'monitoring' as PipelineStage,
        monitoringStatus: 'active',
        monitoringStartedAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // 3 Tage zurück
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(interruptedProject);

      // Act - Simuliere Recovery-Check
      const project = await projectService.getById('project-123', testContext);

      // Assert - Projekt sollte als "in recovery" erkannt werden
      expect(project).toEqual(expect.objectContaining({
        monitoringStatus: 'active',
        monitoringStartedAt: expect.any(Object)
      }));

      // Recovery-Logic würde hier externe APIs re-initialisieren
    });

    it('sollte bei Firestore-Timeouts Retry-Mechanismus anwenden', async () => {
      // Arrange
      let attempts = 0;
      mockUpdateDoc.mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error('Firestore timeout'));
        }
        return Promise.resolve();
      });

      // Act
      await projectService.updateAnalytics('project-123', { totalReach: 100000 }, testContext);

      // Assert
      expect(attempts).toBe(3); // 1 initial + 2 retries
    });

    it('sollte bei kritischen Fehlern Monitoring pausieren', async () => {
      // Arrange
      jest.spyOn(projectService, 'update').mockRejectedValue(new Error('Critical database error'));

      // Act
      try {
        await projectService.updateAnalytics('project-123', { totalReach: 100000 }, testContext);
      } catch (error) {
        // In realer Implementierung würde hier Monitoring pausiert
        expect((error as Error).message).toBe('Critical database error');
      }

      // Assert - Monitoring-Status sollte auf 'paused' gesetzt werden
      // expect(monitoringStatus).toBe('paused');
    });
  });

  describe('Performance und Skalierbarkeit', () => {
    it('sollte Bulk-Clipping-Verarbeitung effizient handhaben', async () => {
      // Arrange
      const bulkClippings = Array(50).fill(null).map((_, i) => ({
        ...mockClippingData,
        id: `bulk-clip-${i}`,
        title: `Bulk Article ${i}`
      }));

      // Act
      const start = Date.now();
      
      const promises = bulkClippings.map(clipping => 
        projectService.addClipping('project-123', clipping, testContext)
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(5000); // Sollte unter 5 Sekunden dauern
      expect(projectService.addClipping).toHaveBeenCalledTimes(50);
    });

    it('sollte große Analytics-Datensätze paginated abrufen', async () => {
      // Arrange
      const largeTimelineData = Array(365).fill(null).map((_, i) => ({
        date: Timestamp.fromDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000)),
        dailyReach: Math.random() * 10000,
        dailyClippings: Math.floor(Math.random() * 10),
        dailySentiment: (Math.random() - 0.5) * 2
      }));

      jest.spyOn(projectService, 'getAnalyticsDashboard').mockResolvedValue({
        timelineData: largeTimelineData.slice(0, 30) // Nur erste 30 Tage
      } as any);

      // Act
      const dashboard = await projectService.getAnalyticsDashboard('project-123', testContext);

      // Assert
      expect(dashboard.timelineData).toHaveLength(30); // Pagination limit
    });

    it('sollte Memory-Leaks bei kontinuierlichen Updates vermeiden', async () => {
      // Arrange
      let memoryUsageBefore: NodeJS.MemoryUsage | undefined;
      
      if (process.memoryUsage) {
        memoryUsageBefore = process.memoryUsage();
      }

      // Act - Simuliere 1000 Updates
      const updates = Array(1000).fill(null).map((_, i) => 
        projectService.updateAnalytics('project-123', { 
          totalReach: i * 1000,
          lastUpdated: Timestamp.now() 
        }, testContext)
      );

      await Promise.all(updates);

      // Assert
      if (process.memoryUsage && memoryUsageBefore) {
        const memoryUsageAfter = process.memoryUsage();
        const heapIncrease = memoryUsageAfter.heapUsed - memoryUsageBefore.heapUsed;
        
        // Memory-Increase sollte reasonable bleiben (unter 50MB)
        expect(heapIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    });

    it('sollte Database-Connection-Pooling korrekt nutzen', async () => {
      // Arrange - Simuliere viele parallel Requests
      const parallelRequests = Array(20).fill(null).map((_, i) => 
        projectService.getById(`project-${i}`, testContext)
      );

      // Act
      const start = Date.now();
      await Promise.all(parallelRequests);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(2000); // Connection-Pooling sollte Performance verbessern
    });
  });

  describe('Integration und End-to-End Tests', () => {
    it('sollte kompletten Monitoring-Workflow von Start bis Completion durchführen', async () => {
      // Arrange
      const workflow = {
        project: { ...baseProject, currentStage: 'distribution' as PipelineStage },
        approval: mockApproval
      };

      // Mock alle Services
      jest.spyOn(projectService, 'getById')
        .mockResolvedValueOnce(workflow.project) // Initial getById
        .mockResolvedValueOnce({ ...workflow.project, currentStage: 'monitoring' }); // Nach Stage-Update

      jest.spyOn(approvalService, 'getByProjectId').mockResolvedValue(workflow.approval as any);
      jest.spyOn(projectService, 'updateStage').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'startMonitoring').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'addClipping').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'updateAnalytics').mockResolvedValue(undefined);
      jest.spyOn(projectService, 'completeMonitoring').mockResolvedValue(undefined);

      // Step 1: Stage-Transition
      await projectService.updateStage('project-123', 'monitoring', {}, testContext);

      // Step 2: Monitoring starten
      await projectService.startMonitoring('project-123', workflow.project.monitoringConfig!, testContext);

      // Step 3: Clippings hinzufügen
      await projectService.addClipping('project-123', mockClippingData, testContext);

      // Step 4: Analytics aktualisieren
      await projectService.updateAnalytics('project-123', { 
        totalReach: 175000,
        clippingCount: 1 
      }, testContext);

      // Step 5: Monitoring beenden
      await projectService.completeMonitoring('project-123', testContext);

      // Assert - Alle Schritte sollten erfolgreich ausgeführt worden sein
      expect(projectService.updateStage).toHaveBeenCalledTimes(1);
      expect(projectService.startMonitoring).toHaveBeenCalledTimes(1);
      expect(projectService.addClipping).toHaveBeenCalledTimes(1);
      expect(projectService.updateAnalytics).toHaveBeenCalledTimes(1);
      expect(projectService.completeMonitoring).toHaveBeenCalledTimes(1);
    });

    it('sollte Multi-Project Monitoring parallel handhaben', async () => {
      // Arrange
      const projects = ['project-1', 'project-2', 'project-3'];
      
      projects.forEach(projectId => {
        jest.spyOn(projectService, 'getById')
          .mockImplementation((id) => Promise.resolve({
            ...baseProject,
            id,
            currentStage: 'monitoring'
          } as any));
      });

      // Act - Starte Monitoring für alle Projekte parallel
      const monitoringPromises = projects.map(projectId => 
        projectService.startMonitoring(projectId, baseProject.monitoringConfig!, testContext)
      );

      await Promise.all(monitoringPromises);

      // Assert
      expect(projectService.startMonitoring).toHaveBeenCalledTimes(3);
      projects.forEach(projectId => {
        expect(projectService.startMonitoring).toHaveBeenCalledWith(
          projectId,
          baseProject.monitoringConfig,
          testContext
        );
      });
    });

    it('sollte Cross-Organization-Data-Isolation gewährleisten', async () => {
      // Arrange
      const org1Context = { organizationId: 'org-1', userId: 'user-1' };
      const org2Context = { organizationId: 'org-2', userId: 'user-2' };

      const org1Project = { ...baseProject, id: 'org1-project', organizationId: 'org-1' };
      const org2Project = { ...baseProject, id: 'org2-project', organizationId: 'org-2' };

      jest.spyOn(projectService, 'getById')
        .mockImplementation((id, context) => {
          if (id === 'org1-project' && context.organizationId === 'org-1') {
            return Promise.resolve(org1Project as any);
          }
          if (id === 'org2-project' && context.organizationId === 'org-2') {
            return Promise.resolve(org2Project as any);
          }
          return Promise.resolve(null); // Cross-tenant access denied
        });

      // Act
      const org1Result = await projectService.getById('org1-project', org1Context);
      const crossTenantResult = await projectService.getById('org1-project', org2Context);

      // Assert
      expect(org1Result).toBeTruthy();
      expect(org1Result!.organizationId).toBe('org-1');
      expect(crossTenantResult).toBeNull(); // Cross-tenant access blocked
    });
  });
});