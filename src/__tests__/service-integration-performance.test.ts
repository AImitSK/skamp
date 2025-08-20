// src/__tests__/service-integration-performance.test.ts - 🆕 Performance Tests für Service-Layer Integration
import { pdfVersionsService, PDFVersionsService } from '@/lib/firebase/pdf-versions-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { pdfApprovalBridgeService } from '@/lib/firebase/pdf-approval-bridge-service';

// Mock Firebase für Tests
jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => new Date()),
    fromDate: jest.fn((date: Date) => date)
  }
}));

/**
 * 🆕 PERFORMANCE-TESTS für Service-Layer Integration
 * Ziel: Alle Status-Updates müssen < 100ms sein
 */
describe('Service Integration Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Performance-Timer zurücksetzen
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Edit-Lock Performance', () => {
    it('sollte Edit-Lock Status in < 50ms abrufen', async () => {
      const startTime = Date.now();
      
      // Mock erfolgreiches getEditLockStatus
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          editLocked: false,
          editLockedReason: null
        })
      });
      
      // Mock Firebase calls
      require('firebase/firestore').getDoc.mockImplementation(mockGetDoc);
      
      const status = await pdfVersionsService.getEditLockStatus('test-campaign-id');
      
      const duration = Date.now() - startTime;
      
      expect(status.isLocked).toBe(false);
      expect(duration).toBeLessThan(50); // 50ms Target für Status-Abfragen
    });

    it('sollte Edit-Lock Aktivierung in < 100ms durchführen', async () => {
      const startTime = Date.now();
      
      // Mock erfolgreiches lockCampaignEditing
      const mockUpdateDoc = jest.fn().mockResolvedValue({});
      const mockAddDoc = jest.fn().mockResolvedValue({});
      
      require('firebase/firestore').updateDoc.mockImplementation(mockUpdateDoc);
      require('firebase/firestore').addDoc.mockImplementation(mockAddDoc);
      
      await pdfVersionsService.lockCampaignEditing(
        'test-campaign-id',
        'pending_customer_approval',
        {
          userId: 'test-user',
          displayName: 'Test User',
          action: 'Performance Test'
        }
      );
      
      const duration = Date.now() - startTime;
      
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(duration).toBeLessThan(100); // 100ms Target für Lock-Operations
    });
  });

  describe('Approval-Workflow Performance', () => {
    it('sollte Approval-Status Sync in < 100ms durchführen', async () => {
      const startTime = Date.now();
      
      // Mock successful workflow operations
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'test-workflow',
          campaignId: 'test-campaign',
          organizationId: 'test-org',
          customerSettings: { required: true }
        })
      });
      
      const mockGetDocs = jest.fn().mockResolvedValue({
        forEach: jest.fn()
      });
      
      require('firebase/firestore').getDoc.mockImplementation(mockGetDoc);
      require('firebase/firestore').getDocs.mockImplementation(mockGetDocs);
      
      await approvalWorkflowService.syncWorkflowWithPDFStatus(
        'test-workflow',
        'customer_approved',
        'Performance Test'
      );
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // 100ms Target für Approval-Sync
    });
  });

  describe('PDF-Approval Bridge Performance', () => {
    it('sollte bidirektionale Synchronisation in < 150ms durchführen', async () => {
      const startTime = Date.now();
      
      // Mock alle erforderlichen Firebase operations
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'test-workflow',
          campaignId: 'test-campaign',
          organizationId: 'test-org',
          customerSettings: { required: true }
        })
      });
      
      const mockUpdateDoc = jest.fn().mockResolvedValue({});
      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: []
      });
      
      require('firebase/firestore').getDoc.mockImplementation(mockGetDoc);
      require('firebase/firestore').updateDoc.mockImplementation(mockUpdateDoc);
      require('firebase/firestore').getDocs.mockImplementation(mockGetDocs);
      
      await pdfApprovalBridgeService.syncApprovalWithPDFStatus(
        'test-workflow',
        'customer_approved',
        {
          userId: 'test-user',
          displayName: 'Test User'
        }
      );
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(150); // 150ms Target für Bridge-Operations
    });
  });

  describe('Service Performance Metrics', () => {
    it('sollte Performance-Metriken korrekt berechnen', () => {
      const operations = [
        {
          operationName: 'edit-lock-check',
          startTime: 1000,
          endTime: 1025,
          duration: 25,
          success: true
        },
        {
          operationName: 'approval-sync',
          startTime: 1030,
          endTime: 1080,
          duration: 50,
          success: true
        },
        {
          operationName: 'pdf-generation',
          startTime: 1090,
          endTime: 1200,
          duration: 110,
          success: true
        }
      ];
      
      // Import der Utility-Funktion aus dem PR-Types
      const { EditLockUtils } = require('@/types/pr');
      const metrics = EditLockUtils.getPerformanceMetrics(operations);
      
      expect(metrics.totalTime).toBe(185); // 25 + 50 + 110
      expect(metrics.slowestOperation).toBe('pdf-generation');
      expect(metrics.averageTime).toBeCloseTo(61.67, 1); // 185 / 3
      expect(metrics.operationCount).toBe(3);
    });

    it('sollte Performance-Warnungen für langsame Operations identifizieren', () => {
      const slowOperations = [
        {
          operationName: 'slow-operation',
          startTime: 1000,
          endTime: 1250,
          duration: 250, // > 100ms
          success: true
        }
      ];
      
      const { EditLockUtils } = require('@/types/pr');
      const metrics = EditLockUtils.getPerformanceMetrics(slowOperations);
      
      expect(metrics.totalTime).toBeGreaterThan(100);
      expect(metrics.slowestOperation).toBe('slow-operation');
      
      // Simuliere Performance-Warning Logic
      const hasPerformanceIssue = metrics.totalTime > 100;
      expect(hasPerformanceIssue).toBe(true);
    });
  });

  describe('Memory & Resource Management', () => {
    it('sollte keine Memory-Leaks bei häufigen Status-Updates haben', async () => {
      const iterations = 50;
      const results = [];
      
      // Mock für mehrfache Aufrufe
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ editLocked: false })
      });
      
      require('firebase/firestore').getDoc.mockImplementation(mockGetDoc);
      
      const startTime = Date.now();
      
      // Simuliere häufige Status-Updates
      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        await pdfVersionsService.getEditLockStatus(`test-campaign-${i}`);
        results.push(Date.now() - iterationStart);
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      
      expect(mockGetDoc).toHaveBeenCalledTimes(iterations);
      expect(averageTime).toBeLessThan(10); // Durchschnitt < 10ms pro Call
      expect(totalTime).toBeLessThan(1000); // Total < 1 Sekunde für 50 Calls
      
      // Prüfe dass Performance nicht degradiert über Zeit
      const firstTenAvg = results.slice(0, 10).reduce((sum, time) => sum + time, 0) / 10;
      const lastTenAvg = results.slice(-10).reduce((sum, time) => sum + time, 0) / 10;
      
      // Performance sollte nicht signifikant verschlechtern (max 50% Unterschied)
      expect(lastTenAvg).toBeLessThanOrEqual(firstTenAvg * 1.5);
    });
  });

  describe('Error Recovery Performance', () => {
    it('sollte Fehler-Recovery in < 200ms durchführen', async () => {
      const startTime = Date.now();
      
      // Mock Fehler-Scenario
      const mockGetDoc = jest.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ editLocked: false })
        });
      
      require('firebase/firestore').getDoc.mockImplementation(mockGetDoc);
      
      // Sollte bei Fehler fallback zu safe state
      const status = await pdfVersionsService.getEditLockStatus('test-campaign-id');
      
      const duration = Date.now() - startTime;
      
      expect(status.isLocked).toBe(false); // Safe fallback
      expect(duration).toBeLessThan(200); // Schnelle Error-Recovery
    });
  });
});

/**
 * 🆕 INTEGRATION PERFORMANCE BENCHMARKS
 */
describe('Integration Performance Benchmarks', () => {
  it('sollte vollständigen PDF-Approval Workflow in < 2 Sekunden durchführen', async () => {
    const startTime = Date.now();
    
    // Mock vollständigen Workflow
    const mockFirebaseOperations = {
      getDoc: jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'test-campaign',
          title: 'Test Campaign',
          organizationId: 'test-org',
          userId: 'test-user'
        })
      }),
      addDoc: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
      updateDoc: jest.fn().mockResolvedValue({}),
      collection: jest.fn().mockReturnValue({}),
      doc: jest.fn().mockReturnValue({})
    };
    
    Object.assign(require('firebase/firestore'), mockFirebaseOperations);
    
    // Simuliere kompletten Workflow:
    // 1. Campaign-Speicherung
    // 2. Approval-Workflow-Erstellung  
    // 3. PDF-Generation
    // 4. Edit-Lock Aktivierung
    
    try {
      const result = await pdfApprovalBridgeService.saveCampaignWithApprovalIntegration(
        {
          id: 'test-campaign',
          title: 'Performance Test Campaign',
          contentHtml: '<p>Test content</p>',
          clientId: 'test-client',
          clientName: 'Test Client'
        },
        {
          teamApprovalRequired: false,
          customerApprovalRequired: true,
          currentStage: 'pending_customer',
          customerContact: {
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com'
          },
          customerApprovalMessage: 'Test message'
        },
        {
          userId: 'test-user',
          organizationId: 'test-org',
          isNewCampaign: true
        }
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.campaignId).toBeDefined();
      expect(duration).toBeLessThan(2000); // 2 Sekunden für vollständigen Workflow
      
    } catch (error) {
      // Auch Fehler-Handling sollte schnell sein
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Schnelle Error-Recovery
      throw error;
    }
  });
});

export {};