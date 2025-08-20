// src/__tests__/features/edit-lock-system-enhanced.test.ts
import {
  pdfVersionsService,
  EditLockReason,
  UnlockRequest
} from '@/lib/firebase/pdf-versions-service';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { nanoid } from 'nanoid';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-unlock-request-id')
}));

// Mock Approval Workflow Service (for integration tests)
jest.mock('@/lib/firebase/approval-workflow-service', () => ({
  approvalWorkflowService: {
    handlePDFStatusUpdate: jest.fn()
  }
}));

// Cast Mocks
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>;

describe('Enhanced Edit-Lock System Tests', () => {
  const mockCampaignId = 'campaign-123';
  const mockUserId = 'user-456';
  const mockDisplayName = 'John Doe';

  const mockCampaignDoc = {
    exists: () => true,
    data: () => ({
      editLocked: false,
      editLockedReason: null,
      lockedAt: null,
      lockedBy: null,
      unlockRequests: []
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock Setup
    const mockCollectionRef = { name: 'campaigns' };
    const mockDocRef = { id: mockCampaignId };
    
    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);
    mockGetDoc.mockResolvedValue(mockCampaignDoc as any);
  });

  describe('Enhanced Lock Campaign Editing', () => {
    it('sollte Campaign mit erweiterten Metadaten sperren', async () => {
      const context = {
        userId: mockUserId,
        displayName: mockDisplayName,
        action: 'PDF für Freigabe erstellt',
        metadata: {
          workflowId: 'workflow-789',
          approvalType: 'customer'
        }
      };
      
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval',
        context
      );
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          lockedAt: expect.anything(),
          lockedBy: {
            userId: mockUserId,
            displayName: mockDisplayName,
            action: 'PDF für Freigabe erstellt'
          },
          lockMetadata: {
            workflowId: 'workflow-789',
            approvalType: 'customer'
          }
        })
      );
    });

    it('sollte Legacy-Reason-Mapping korrekt durchführen', async () => {
      // Test Legacy 'pending_approval' -> 'pending_customer_approval'
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_approval' as any
      );
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLockedReason: 'pending_customer_approval'
        })
      );
      
      // Test Legacy 'approved' -> 'approved_final'
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'approved' as any
      );
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLockedReason: 'approved_final'
        })
      );
    });

    it('sollte alle gültigen EditLockReasons unterstützen', async () => {
      const validReasons: EditLockReason[] = [
        'pending_customer_approval',
        'pending_team_approval',
        'approved_final',
        'system_processing',
        'manual_lock'
      ];
      
      for (const reason of validReasons) {
        await pdfVersionsService.lockCampaignEditing(
          mockCampaignId,
          reason
        );
        
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            editLockedReason: reason
          })
        );
      }
    });

    it('sollte Audit-Log für Lock-Events erstellen', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-123' } as any);
      
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval',
        {
          userId: mockUserId,
          displayName: mockDisplayName,
          action: 'Test lock'
        }
      );
      
      // Audit-Log sollte erstellt werden
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // audit_logs collection
        expect.objectContaining({
          campaignId: mockCampaignId,
          action: 'locked',
          reason: 'pending_customer_approval',
          timestamp: expect.anything(),
          actor: expect.objectContaining({
            userId: mockUserId,
            displayName: mockDisplayName,
            action: 'Test lock'
          })
        })
      );
    });
  });

  describe('Enhanced Unlock Campaign Editing', () => {
    it('sollte Campaign mit Audit-Trail entsperren', async () => {
      const context = {
        userId: mockUserId,
        displayName: mockDisplayName,
        reason: 'Freigabe abgeschlossen'
      };
      
      await pdfVersionsService.unlockCampaignEditing(
        mockCampaignId,
        context
      );
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
          lastUnlockedBy: {
            userId: mockUserId,
            displayName: mockDisplayName,
            reason: 'Freigabe abgeschlossen'
          }
        })
      );
    });

    it('sollte Audit-Log für Unlock-Events erstellen', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-456' } as any);
      
      const context = {
        userId: mockUserId,
        displayName: mockDisplayName,
        reason: 'Manual unlock'
      };
      
      await pdfVersionsService.unlockCampaignEditing(
        mockCampaignId,
        context
      );
      
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          campaignId: mockCampaignId,
          action: 'unlocked',
          reason: null,
          actor: context
        })
      );
    });
  });

  describe('Detaillierter Edit-Lock Status', () => {
    it('sollte detaillierten Lock-Status zurückgeben', async () => {
      const lockedCampaignDoc = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          lockedBy: {
            userId: mockUserId,
            displayName: mockDisplayName,
            action: 'PDF created for approval'
          },
          lockedAt: Timestamp.now(),
          unlockRequests: []
        })
      };
      
      mockGetDoc.mockResolvedValue(lockedCampaignDoc as any);
      
      const status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      
      expect(status).toEqual({
        isLocked: true,
        reason: 'pending_customer_approval',
        lockedBy: {
          userId: mockUserId,
          displayName: mockDisplayName,
          action: 'PDF created for approval'
        },
        lockedAt: expect.any(Object),
        unlockRequests: [],
        canRequestUnlock: true
      });
    });

    it('sollte canRequestUnlock korrekt bestimmen', async () => {
      // Test 1: System Processing - kein Unlock-Request möglich
      const systemProcessingDoc = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'system_processing',
          unlockRequests: []
        })
      };
      
      mockGetDoc.mockResolvedValue(systemProcessingDoc as any);
      
      let status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      expect(status.canRequestUnlock).toBe(false);
      
      // Test 2: Pending Request exists - kein neuer Request möglich
      const pendingRequestDoc = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          unlockRequests: [{
            id: 'request-1',
            status: 'pending'
          }]
        })
      };
      
      mockGetDoc.mockResolvedValue(pendingRequestDoc as any);
      
      status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      expect(status.canRequestUnlock).toBe(false);
      
      // Test 3: Normal Lock - Unlock-Request möglich
      const normalLockDoc = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          unlockRequests: []
        })
      };
      
      mockGetDoc.mockResolvedValue(normalLockDoc as any);
      
      status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      expect(status.canRequestUnlock).toBe(true);
    });

    it('sollte nicht existierende Campaign graceful behandeln', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      
      const status = await pdfVersionsService.getEditLockStatus('nonexistent-campaign');
      
      expect(status).toEqual({
        isLocked: false,
        canRequestUnlock: false
      });
    });
  });

  describe('Unlock-Request System', () => {
    const mockExistingCampaignDoc = {
      exists: () => true,
      data: () => ({
        editLocked: true,
        editLockedReason: 'pending_customer_approval',
        unlockRequests: []
      })
    };

    beforeEach(() => {
      mockGetDoc.mockResolvedValue(mockExistingCampaignDoc as any);
    });

    it('sollte Unlock-Request erstellen', async () => {
      const requestContext = {
        userId: mockUserId,
        displayName: mockDisplayName,
        reason: 'Dringende Änderungen nötig'
      };
      
      const requestId = await pdfVersionsService.requestUnlock(
        mockCampaignId,
        requestContext
      );
      
      expect(requestId).toBe('mock-unlock-request-id');
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          unlockRequests: expect.arrayContaining([
            expect.objectContaining({
              id: 'mock-unlock-request-id',
              requestedBy: mockUserId,
              requestedAt: expect.anything(),
              reason: 'Dringende Änderungen nötig',
              status: 'pending'
            })
          ])
        })
      );
    });

    it('sollte Unlock-Request genehmigen', async () => {
      const existingRequest: UnlockRequest = {
        id: 'existing-request-123',
        requestedBy: 'other-user',
        requestedAt: Timestamp.now(),
        reason: 'Test request',
        status: 'pending'
      };
      
      const campaignWithRequest = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          unlockRequests: [existingRequest]
        })
      };
      
      mockGetDoc.mockResolvedValue(campaignWithRequest as any);
      
      const approverContext = {
        userId: 'admin-user',
        displayName: 'Admin User'
      };
      
      await pdfVersionsService.approveUnlockRequest(
        mockCampaignId,
        'existing-request-123',
        approverContext
      );
      
      // Campaign sollte entsperrt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
          unlockRequests: expect.arrayContaining([
            expect.objectContaining({
              id: 'existing-request-123',
              status: 'approved',
              approvedBy: 'admin-user',
              approvedAt: expect.anything()
            })
          ]),
          lastUnlockedBy: approverContext
        })
      );
    });

    it('sollte Unlock-Request für nicht existierende Campaign ablehnen', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      
      await expect(
        pdfVersionsService.approveUnlockRequest(
          'nonexistent-campaign',
          'request-123',
          { userId: 'admin', displayName: 'Admin' }
        )
      ).rejects.toThrow('Campaign nicht gefunden');
    });
  });

  describe('Backward Compatibility', () => {
    it('sollte einfache isEditingLocked-Abfrage unterstützen', async () => {
      // Test gesperrte Campaign
      const lockedDoc = {
        exists: () => true,
        data: () => ({ editLocked: true })
      };
      
      mockGetDoc.mockResolvedValue(lockedDoc as any);
      
      const isLocked = await pdfVersionsService.isEditingLocked(mockCampaignId);
      expect(isLocked).toBe(true);
      
      // Test nicht gesperrte Campaign
      const unlockedDoc = {
        exists: () => true,
        data: () => ({ editLocked: false })
      };
      
      mockGetDoc.mockResolvedValue(unlockedDoc as any);
      
      const isNotLocked = await pdfVersionsService.isEditingLocked(mockCampaignId);
      expect(isNotLocked).toBe(false);
    });

    it('sollte Legacy-Lock ohne Kontext funktionieren', async () => {
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval'
      );
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          lockedAt: expect.anything()
        })
      );
    });

    it('sollte Legacy-Unlock ohne Kontext funktionieren', async () => {
      await pdfVersionsService.unlockCampaignEditing(mockCampaignId);
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything()
        })
      );
    });
  });

  describe('Integration mit PDF-Status Updates', () => {
    it('sollte Edit-Lock bei PDF-Status-Änderungen aktualisieren', async () => {
      const mockPDFVersion = {
        id: 'pdf-version-123',
        campaignId: mockCampaignId,
        version: 1,
        status: 'approved',
        organizationId: 'org-123'
      };
      
      // Mock getVersionById für updateVersionStatus
      jest.spyOn(pdfVersionsService as any, 'getVersionById')
        .mockResolvedValue(mockPDFVersion);
      
      // Mock notifyApprovalWorkflowOfPDFUpdate
      const { approvalWorkflowService } = require('@/lib/firebase/approval-workflow-service');
      
      await pdfVersionsService.updateVersionStatus(
        'pdf-version-123',
        'approved'
      );
      
      // Edit-Lock sollte für approved Status aktiviert werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'approved_final',
          lockedAt: expect.anything(),
          lockedBy: expect.objectContaining({
            userId: 'system',
            displayName: 'PDF-System',
            action: expect.stringContaining('PDF-Version 1 freigegeben')
          })
        })
      );
      
      // Approval-Workflow sollte benachrichtigt werden
      expect(approvalWorkflowService.handlePDFStatusUpdate).toHaveBeenCalledWith(
        mockCampaignId,
        'pdf-version-123',
        'approved',
        { organizationId: 'org-123' }
      );
    });

    it('sollte Edit-Lock bei rejected Status aufheben', async () => {
      const mockPDFVersion = {
        id: 'pdf-version-123',
        campaignId: mockCampaignId,
        version: 2,
        status: 'rejected',
        organizationId: 'org-123'
      };
      
      jest.spyOn(pdfVersionsService as any, 'getVersionById')
        .mockResolvedValue(mockPDFVersion);
      
      await pdfVersionsService.updateVersionStatus(
        'pdf-version-123',
        'rejected'
      );
      
      // Edit-Lock sollte für rejected Status aufgehoben werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
          lastUnlockedBy: expect.objectContaining({
            userId: 'system',
            displayName: 'PDF-System',
            reason: 'PDF-Freigabe abgelehnt'
          })
        })
      );
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('sollte Lock-Fehler graceful behandeln', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));
      
      await expect(
        pdfVersionsService.lockCampaignEditing(
          mockCampaignId,
          'pending_customer_approval'
        )
      ).rejects.toThrow();
    });

    it('sollte Audit-Log-Fehler graceful behandeln', async () => {
      // Main update sollte funktionieren
      mockUpdateDoc.mockResolvedValue(undefined);
      
      // Aber Audit-Log fehlschlagen
      mockAddDoc.mockRejectedValue(new Error('Audit log error'));
      
      // Sollte trotzdem nicht werfen
      await expect(
        pdfVersionsService.lockCampaignEditing(
          mockCampaignId,
          'pending_customer_approval',
          { userId: mockUserId, displayName: mockDisplayName, action: 'test' }
        )
      ).resolves.not.toThrow();
    });

    it('sollte Status-Check-Fehler graceful behandeln', async () => {
      mockGetDoc.mockRejectedValue(new Error('Database error'));
      
      const status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      
      expect(status).toEqual({
        isLocked: false,
        canRequestUnlock: false
      });
    });

    it('sollte mehrfache gleichzeitige Unlock-Requests verhindern', async () => {
      const campaignWithPendingRequest = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          unlockRequests: [{
            id: 'existing-request',
            status: 'pending',
            requestedBy: 'other-user'
          }]
        })
      };
      
      mockGetDoc.mockResolvedValue(campaignWithPendingRequest as any);
      
      const status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      expect(status.canRequestUnlock).toBe(false);
    });
  });

  describe('Performance & Security', () => {
    it('sollte Edit-Lock Operations unter 100ms abschließen', async () => {
      const startTime = Date.now();
      
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval'
      );
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('sollte User-Context sicher verarbeiten', async () => {
      const maliciousContext = {
        userId: '<script>alert("xss")</script>',
        displayName: 'Evil User',
        action: 'Malicious action'
      };
      
      await pdfVersionsService.lockCampaignEditing(
        mockCampaignId,
        'pending_customer_approval',
        maliciousContext
      );
      
      // Daten sollten wie eingegeben gespeichert werden (kein XSS-Schutz hier erforderlich)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lockedBy: maliciousContext
        })
      );
    });

    it('sollte große Anzahl von Unlock-Requests handhaben', async () => {
      const manyRequests = Array.from({ length: 100 }, (_, i) => ({
        id: `request-${i}`,
        status: 'pending',
        requestedBy: `user-${i}`
      }));
      
      const campaignWithManyRequests = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          unlockRequests: manyRequests
        })
      };
      
      mockGetDoc.mockResolvedValue(campaignWithManyRequests as any);
      
      const startTime = Date.now();
      const status = await pdfVersionsService.getEditLockStatus(mockCampaignId);
      const endTime = Date.now();
      
      expect(status.unlockRequests).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(200); // Sollte auch mit vielen Requests schnell sein
    });
  });
});
