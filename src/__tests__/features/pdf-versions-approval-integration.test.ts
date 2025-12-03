// src/__tests__/features/pdf-versions-approval-integration.test.ts
import { pdfVersionsService, PDFVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { approvalService } from '@/lib/firebase/approval-service';
import { ApprovalEnhanced, ApprovalStatus } from '@/types/approvals';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

jest.mock('@/lib/firebase/approval-service', () => ({
  approvalService: {
    getById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    sendForApproval: jest.fn(),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-id'),
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockLimit = limit as jest.MockedFunction<typeof limit>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockApprovalService = approvalService as jest.Mocked<typeof approvalService>;

describe('PDF Versions Approval Integration', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockCampaignId = 'campaign-123';
  
  const mockContent = {
    title: 'Approval Test Campaign',
    mainContent: '<p>This content needs customer approval</p>',
    boilerplateSections: [
      {
        id: 'section-1',
        type: 'company',
        content: '<p>Company boilerplate</p>',
        order: 1,
      },
    ],
    keyVisual: {
      type: 'image',
      url: 'https://example.com/keyvisual.jpg',
    },
  };

  const mockApproval: Partial<ApprovalEnhanced> = {
    id: 'approval-123',
    organizationId: mockContext.organizationId,
    shareId: 'share-abc-123',
    campaignId: mockCampaignId,
    status: 'draft',
    title: 'Customer Approval for Campaign',
    clientName: 'Test Customer',
    recipients: [
      {
        id: 'recipient-1',
        email: 'customer@test.com',
        name: 'Customer User',
        role: 'approver',
        status: 'pending',
        isRequired: true,
        notificationsSent: 0,
        order: 0,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Standard Firebase Mock Setup
    const mockCollectionRef = { name: 'pdf_versions' };
    const mockQueryRef = { collection: mockCollectionRef };
    const mockDocRef = { id: 'pdf-version-123' };

    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockQuery.mockReturnValue(mockQueryRef as any);
    mockWhere.mockReturnValue(mockQueryRef as any);
    mockOrderBy.mockReturnValue(mockQueryRef as any);
    mockLimit.mockReturnValue(mockQueryRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);

    // Mock generateRealPDF (private Methode)
    jest.spyOn(pdfVersionsService as any, 'generateRealPDF').mockResolvedValue({
      pdfUrl: 'https://storage.example.com/test.pdf',
      fileSize: 123456,
    });

    // Mock getLatestVersionNumber
    jest.spyOn(pdfVersionsService as any, 'getLatestVersionNumber').mockResolvedValue(0);

    // Mock getVersionById - wird per-Test überschrieben falls nötig
    jest.spyOn(pdfVersionsService as any, 'getVersionById').mockImplementation((...args: unknown[]): Promise<any> => {
      const versionId = args[0] as string;
      // Default: Return mock version with campaignId
      return Promise.resolve({
        id: versionId,
        campaignId: mockCampaignId,
        organizationId: mockContext.organizationId,
        version: 1,
        status: 'pending_customer',
      });
    });
  });

  describe('PDF Creation with Approval Integration', () => {
    it('sollte PDF mit Approval-Metadaten für Kundenfreigabe erstellen', async () => {
      mockApprovalService.getById.mockResolvedValue(mockApproval as ApprovalEnhanced);
      
      const mockDocRef = { id: 'pdf-with-approval' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }
      );

      expect(mockApprovalService.getById).toHaveBeenCalledWith(
        'approval-123',
        mockContext.organizationId
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending_customer',
          approvalId: 'approval-123',
          customerApproval: {
            shareId: 'share-abc-123',
            requestedAt: expect.anything(),
          },
          contentSnapshot: expect.objectContaining({
            createdForApproval: true,
          }),
        })
      );

      expect(result).toBe('pdf-with-approval');
    });

    it('sollte Campaign bei Approval-PDF sperren', async () => {
      mockApprovalService.getById.mockResolvedValue(mockApproval as ApprovalEnhanced);

      const mockDocRef = { id: 'pdf-locks-campaign' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }
      );

      // Verify campaign was locked
      // Note: Der Service konvertiert 'pending_approval' zu 'pending_customer_approval'
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaigns doc
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          lockedAt: expect.anything(),
        })
      );
    });

    it('sollte Draft-PDF ohne Approval-Integration erstellen', async () => {
      const mockDocRef = { id: 'pdf-draft-no-approval' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'draft', // Kein Approval erforderlich
        }
      );

      expect(mockApprovalService.getById).not.toHaveBeenCalled();

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall).toMatchObject({
        status: 'draft',
        contentSnapshot: expect.objectContaining({
          createdForApproval: false,
        }),
      });

      // Stelle sicher, dass approvalId und customerApproval NICHT gesetzt sind
      expect(addDocCall.approvalId).toBeUndefined();
      expect(addDocCall.customerApproval).toBeUndefined();

      // Campaign sollte nicht gesperrt werden für Draft
      // Da wir 2 Updates haben (PDF creation + campaign update), prüfen wir spezifisch nach Lock
      const campaignLockUpdate = mockUpdateDoc.mock.calls.find(call =>
        call[1] && typeof call[1] === 'object' && 'editLocked' in call[1] && call[1].editLocked === true
      );
      expect(campaignLockUpdate).toBeUndefined();

      expect(result).toBe('pdf-draft-no-approval');
    });
  });

  describe('Approval Status Updates', () => {
    it('sollte PDF Status bei Approval-Genehmigung aktualisieren', async () => {
      const mockVersionDoc = {
        exists: () => true,
        data: () => ({
          id: 'version-approved',
          campaignId: mockCampaignId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }),
      };

      mockGetDoc.mockResolvedValue(mockVersionDoc as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.updateVersionStatus(
        'version-approved',
        'approved',
        'approval-123'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // version doc
        expect.objectContaining({
          status: 'approved',
          approvalId: 'approval-123',
          'customerApproval.approvedAt': expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      // Campaign sollte mit approved-Lock gesperrt bleiben
      // Note: Der Service konvertiert 'approved' zu 'approved_final'
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaign doc
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'approved_final',
          lockedAt: expect.anything(),
        })
      );
    });

    it('sollte PDF Status bei Approval-Ablehnung aktualisieren und Campaign entsperren', async () => {
      const mockVersionDoc = {
        exists: () => true,
        data: () => ({
          id: 'version-rejected',
          campaignId: mockCampaignId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }),
      };

      mockGetDoc.mockResolvedValue(mockVersionDoc as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.updateVersionStatus(
        'version-rejected',
        'rejected'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // version doc
        expect.objectContaining({
          status: 'rejected',
          updatedAt: expect.anything(),
        })
      );

      // Campaign sollte entsperrt werden nach Ablehnung
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaign doc
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
        })
      );
    });

    it('sollte Draft Status Campaign entsperren', async () => {
      const mockVersionDoc = {
        exists: () => true,
        data: () => ({
          id: 'version-back-to-draft',
          campaignId: mockCampaignId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }),
      };

      mockGetDoc.mockResolvedValue(mockVersionDoc as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.updateVersionStatus(
        'version-back-to-draft',
        'draft'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // version doc
        expect.objectContaining({
          status: 'draft',
          updatedAt: expect.anything(),
        })
      );

      // Campaign sollte entsperrt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaign doc
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
        })
      );
    });
  });

  describe('Approval Workflow Integration', () => {
    it('sollte PDF mit Approval verknüpfen', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.linkVersionToApproval(
        'version-123',
        'approval-456'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // version doc
        expect.objectContaining({
          approvalId: 'approval-456',
          status: 'pending_customer',
          linkedAt: expect.anything(),
        })
      );
    });

    it('sollte mehrere PDF-Versionen mit derselben Approval handhaben', async () => {
      const approval1 = { ...mockApproval, shareId: 'share-v1' };
      const approval2 = { ...mockApproval, shareId: 'share-v2' };

      mockApprovalService.getById
        .mockResolvedValueOnce(approval1 as ApprovalEnhanced)
        .mockResolvedValueOnce(approval2 as ApprovalEnhanced);

      const mockDocRef1 = { id: 'pdf-v1' };
      const mockDocRef2 = { id: 'pdf-v2' };
      
      mockAddDoc
        .mockResolvedValueOnce(mockDocRef1 as any)
        .mockResolvedValueOnce(mockDocRef2 as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      // Version 1 erstellen
      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }
      );

      // Version 2 erstellen (z.B. nach Änderungen)
      const updatedContent = {
        ...mockContent,
        title: 'Updated Campaign Title',
      };

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        updatedContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }
      );

      expect(mockApprovalService.getById).toHaveBeenCalledTimes(2);

      // Filter nur PDF-Version-Aufrufe (nicht audit_logs)
      const pdfVersionCalls = mockAddDoc.mock.calls.filter((call: any) => {
        const data = call[1];
        return data && data.version !== undefined && data.campaignId;
      });

      expect(pdfVersionCalls).toHaveLength(2);

      const call1 = pdfVersionCalls[0][1] as any;
      const call2 = pdfVersionCalls[1][1] as any;

      expect(call1.customerApproval.shareId).toBe('share-v1');
      expect(call2.customerApproval.shareId).toBe('share-v2');
    });
  });

  describe('Approval History Integration', () => {
    it('sollte PDF-Versionen in Approval-Workflow korrekt tracken', async () => {
      const versionsWithApprovals = [
        {
          id: 'version-1',
          data: () => ({
            version: 1,
            status: 'approved',
            approvalId: 'approval-1',
            createdAt: { seconds: 1000 },
          }),
        },
        {
          id: 'version-2',
          data: () => ({
            version: 2,
            status: 'rejected',
            approvalId: 'approval-2',
            createdAt: { seconds: 2000 },
          }),
        },
        {
          id: 'version-3',
          data: () => ({
            version: 3,
            status: 'pending_customer',
            approvalId: 'approval-3',
            createdAt: { seconds: 3000 },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: versionsWithApprovals,
        empty: false,
        forEach: (callback: any) => {
          versionsWithApprovals.forEach(callback);
        },
      } as any);

      const result = await pdfVersionsService.getVersionHistory(mockCampaignId);

      expect(result).toHaveLength(3);
      
      // Verify approval timeline
      const approvedVersion = result.find(v => v.status === 'approved');
      const rejectedVersion = result.find(v => v.status === 'rejected');
      const pendingVersion = result.find(v => v.status === 'pending_customer');

      expect(approvedVersion?.version).toBe(1);
      expect(approvedVersion?.approvalId).toBe('approval-1');
      
      expect(rejectedVersion?.version).toBe(2);
      expect(rejectedVersion?.approvalId).toBe('approval-2');
      
      expect(pendingVersion?.version).toBe(3);
      expect(pendingVersion?.approvalId).toBe('approval-3');
    });
  });

  describe('Customer Access Integration', () => {
    it('sollte Customer Approval Metadaten korrekt setzen', async () => {
      const customerApproval = {
        ...mockApproval,
        shareId: 'customer-share-xyz',
        recipients: [
          {
            id: 'customer-1',
            email: 'customer@company.com',
            name: 'John Customer',
            role: 'decision_maker',
            status: 'pending' as const,
            isRequired: true,
            notificationsSent: 0,
            order: 0,
          },
        ],
      };

      mockApprovalService.getById.mockResolvedValue(customerApproval as ApprovalEnhanced);
      
      const mockDocRef = { id: 'pdf-customer-access' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-customer',
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;

      expect(addDocCall.customerApproval).toEqual({
        shareId: 'customer-share-xyz',
        requestedAt: expect.anything(),
      });

      expect(addDocCall.contentSnapshot.createdForApproval).toBe(true);
    });
  });

  describe('Error Scenarios in Approval Integration', () => {
    it('sollte nicht-existierende Approval graceful behandeln', async () => {
      mockApprovalService.getById.mockResolvedValue(null);
      
      const mockDocRef = { id: 'pdf-no-approval' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'non-existent-approval',
        }
      );

      expect(result).toBe('pdf-no-approval');
      
      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.customerApproval).toBeUndefined();
      expect(addDocCall.approvalId).toBe('non-existent-approval');
    });

    it('sollte Approval Service Fehler abfangen', async () => {
      mockApprovalService.getById.mockRejectedValue(new Error('Approval service unavailable'));
      
      const mockDocRef = { id: 'pdf-approval-error' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'error-approval',
        }
      );

      expect(result).toBe('pdf-approval-error');
      
      // PDF sollte trotzdem erstellt werden
      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.status).toBe('pending_customer');
      expect(addDocCall.approvalId).toBe('error-approval');
    });

    it('sollte falsche Organization bei Approval Zugriff behandeln', async () => {
      // Approval gehört zu anderer Organization
      const wrongOrgApproval = {
        ...mockApproval,
        organizationId: 'other-org-456',
      };

      mockApprovalService.getById.mockResolvedValue(wrongOrgApproval as ApprovalEnhanced);
      
      const mockDocRef = { id: 'pdf-wrong-org-approval' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'wrong-org-approval',
        }
      );

      expect(result).toBe('pdf-wrong-org-approval');
      
      // Sollte Approval-Daten verwenden, auch wenn organizationId unterschiedlich
      // (Dies ist ein Edge Case - in Realität würde getById null zurückgeben)
      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.customerApproval.shareId).toBe('share-abc-123');
    });
  });

  describe('Approval Status Change Propagation', () => {
    it('sollte Approval Status Changes zu PDF-Version propagieren', async () => {
      const mockVersionDoc = {
        exists: () => true,
        data: () => ({
          id: 'version-propagate',
          campaignId: mockCampaignId,
          status: 'pending_customer',
          approvalId: 'approval-status-change',
        }),
      };

      mockGetDoc.mockResolvedValue(mockVersionDoc as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      // Simuliere externen Approval Status Change
      await pdfVersionsService.updateVersionStatus(
        'version-propagate',
        'approved',
        'approval-status-change'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'approved',
          'customerApproval.approvedAt': expect.anything(),
        })
      );
    });

    it('sollte Campaign Lock Status basierend auf Approval Status aktualisieren', async () => {
      // Note: Der Service konvertiert 'approved' zu 'approved_final'
      const testCases = [
        { status: 'approved', expectedLock: true, expectedReason: 'approved_final' },
        { status: 'rejected', expectedLock: false, expectedReason: null },
        { status: 'draft', expectedLock: false, expectedReason: null },
      ] as const;

      for (const testCase of testCases) {
        const mockVersionDoc = {
          exists: () => true,
          data: () => ({
            id: `version-${testCase.status}`,
            campaignId: mockCampaignId,
            status: 'pending_customer',
          }),
        };

        mockGetDoc.mockResolvedValue(mockVersionDoc as any);
        mockUpdateDoc.mockResolvedValue(undefined);

        await pdfVersionsService.updateVersionStatus(
          `version-${testCase.status}`,
          testCase.status
        );

        // Check campaign lock update
        const campaignUpdateCall = mockUpdateDoc.mock.calls.find(call =>
          call[1] && typeof call[1] === 'object' && 'editLocked' in call[1]
        );

        expect(campaignUpdateCall).toBeDefined();
        expect(campaignUpdateCall![1]).toEqual(
          expect.objectContaining({
            editLocked: testCase.expectedLock,
            editLockedReason: testCase.expectedReason,
            [testCase.expectedLock ? 'lockedAt' : 'unlockedAt']: expect.anything(),
          })
        );

        // Reset for next test case
        jest.clearAllMocks();
      }
    });
  });
});