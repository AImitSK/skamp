// src/__tests__/features/approvals-service.test.ts
import { approvalService } from '@/lib/firebase/approval-service';
import { ApprovalEnhanced, ApprovalStatus, ApprovalFilters } from '@/types/approvals';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(),
  })),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid'),
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

describe('ApprovalService', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockApprovalData: Partial<ApprovalEnhanced> = {
    title: 'Test Approval',
    campaignId: 'campaign-123',
    campaignTitle: 'Test Campaign',
    clientName: 'Test Client',
    recipients: [
      {
        id: 'recipient-1',
        email: 'client@test.com',
        name: 'Client User',
        role: 'approver',
        status: 'pending',
        isRequired: true,
        notificationsSent: 0,
      },
    ],
    content: {
      html: '<p>Test content</p>',
    },
    status: 'pending',
    workflow: 'simple',
    shareSettings: {
      requirePassword: false,
      requireEmailVerification: false,
      accessLog: true,
    },
    options: {
      requireAllApprovals: false,
      allowPartialApproval: true,
      autoSendAfterApproval: false,
      allowComments: true,
      allowInlineComments: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new approval with correct data structure', async () => {
      const mockDocRef = { id: 'new-approval-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);

      const result = await approvalService.create(mockApprovalData as any, mockContext);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        expect.objectContaining({
          ...mockApprovalData,
          organizationId: mockContext.organizationId,
          createdBy: mockContext.userId,
          shareId: expect.stringMatching(/^[a-zA-Z0-9_-]{12}$/), // Base64 URL-safe, 12 chars
          recipients: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              status: 'pending',
              notificationsSent: 0,
            }),
          ]),
          history: [],
          analytics: {
            totalViews: 0,
            uniqueViews: 0,
          },
          notifications: {
            requested: {
              sent: false,
              method: 'email',
            },
          },
          version: 1,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      expect(result).toBe('new-approval-id');
    });

    it('should generate unique share IDs', async () => {
      const mockDocRef1 = { id: 'approval-1' };
      const mockDocRef2 = { id: 'approval-2' };
      
      mockAddDoc
        .mockResolvedValueOnce(mockDocRef1 as any)
        .mockResolvedValueOnce(mockDocRef2 as any);

      const result1 = await approvalService.create(mockApprovalData as any, mockContext);
      const result2 = await approvalService.create(mockApprovalData as any, mockContext);

      const calls = mockAddDoc.mock.calls;
      const shareId1 = calls[0][1].shareId;
      const shareId2 = calls[1][1].shareId;

      expect(shareId1).not.toBe(shareId2);
      expect(shareId1).toMatch(/^[a-zA-Z0-9_-]{12}$/);
      expect(shareId2).toMatch(/^[a-zA-Z0-9_-]{12}$/);
    });

    it('should handle creation errors gracefully', async () => {
      mockAddDoc.mockRejectedValue(new Error('Database error'));

      await expect(
        approvalService.create(mockApprovalData as any, mockContext)
      ).rejects.toThrow('Database error');
    });
  });

  describe('searchEnhanced', () => {
    const mockApprovalDoc = {
      id: 'approval-1',
      data: () => ({
        ...mockApprovalData,
        id: 'approval-1',
        organizationId: mockContext.organizationId,
      }),
    };

    beforeEach(() => {
      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);
    });

    it('should search approvals with basic filters', async () => {
      const filters: ApprovalFilters = {
        search: 'test',
        status: ['pending', 'in_review'],
      };

      await approvalService.searchEnhanced(mockContext.organizationId, filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        where('organizationId', '==', mockContext.organizationId),
        where('status', 'in', ['pending', 'in_review']),
        orderBy('updatedAt', 'desc')
      );
    });

    it('should handle empty search results', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await approvalService.searchEnhanced(mockContext.organizationId, {});

      expect(result).toEqual([]);
    });

    it('should calculate progress percentage correctly', async () => {
      const mockApprovalWithProgress = {
        ...mockApprovalDoc,
        data: () => ({
          ...mockApprovalData,
          recipients: [
            { status: 'approved', isRequired: true },
            { status: 'approved', isRequired: true },
            { status: 'pending', isRequired: true },
            { status: 'pending', isRequired: true },
          ],
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalWithProgress],
        empty: false,
      } as any);

      const result = await approvalService.searchEnhanced(mockContext.organizationId, {});

      expect(result[0].progressPercentage).toBe(50); // 2 of 4 approved
      expect(result[0].approvedCount).toBe(2);
      expect(result[0].pendingCount).toBe(2);
    });

    it('should identify overdue approvals', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 3); // 3 days ago

      const mockOverdueApproval = {
        ...mockApprovalDoc,
        data: () => ({
          ...mockApprovalData,
          requestedAt: { toDate: () => overdueDate },
          status: 'pending',
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockOverdueApproval],
        empty: false,
      } as any);

      const result = await approvalService.searchEnhanced(mockContext.organizationId, {});

      expect(result[0].isOverdue).toBe(true);
    });
  });

  describe('getByShareId', () => {
    const mockShareId = 'test-share-123';

    it('should retrieve approval by share ID', async () => {
      const mockApprovalDoc = {
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      const result = await approvalService.getByShareId(mockShareId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('shareId', '==', mockShareId)
      );

      expect(result).toEqual(expect.objectContaining({
        shareId: mockShareId,
      }));
    });

    it('should return null for non-existent share ID', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await approvalService.getByShareId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('submitDecision', () => {
    const mockShareId = 'test-share-123';
    const mockUserEmail = 'user@test.com';

    it('should submit approval decision', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'pending',
            },
          ],
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.submitDecision(mockShareId, mockUserEmail, 'approved');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          'recipients.0.status': 'approved',
          'recipients.0.decidedAt': expect.anything(),
          'recipients.0.decision': 'approved',
          updatedAt: expect.anything(),
          history: expect.arrayContaining([
            expect.objectContaining({
              action: 'approved',
              actorEmail: mockUserEmail,
            }),
          ]),
        })
      );
    });

    it('should update approval status when all required recipients approve', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'pending',
              isRequired: true,
            },
          ],
          options: {
            requireAllApprovals: true,
          },
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.submitDecision(mockShareId, mockUserEmail, 'approved');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          status: 'approved',
          approvedAt: expect.anything(),
        })
      );
    });

    it('should handle rejection decisions', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'pending',
            },
          ],
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.submitDecision(mockShareId, mockUserEmail, 'rejected');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          status: 'rejected',
          rejectedAt: expect.anything(),
          'recipients.0.status': 'rejected',
          'recipients.0.decision': 'rejected',
        })
      );
    });
  });

  describe('requestChanges', () => {
    const mockShareId = 'test-share-123';
    const mockUserEmail = 'user@test.com';
    const mockComment = 'Please change the title';

    it('should request changes with comment', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'pending',
            },
          ],
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.requestChanges(mockShareId, mockUserEmail, mockComment);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          status: 'changes_requested',
          'recipients.0.status': 'commented',
          'recipients.0.comment': mockComment,
          history: expect.arrayContaining([
            expect.objectContaining({
              action: 'changes_requested',
              actorEmail: mockUserEmail,
              details: expect.objectContaining({
                comment: mockComment,
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('markAsViewed', () => {
    const mockShareId = 'test-share-123';
    const mockUserEmail = 'user@test.com';

    it('should mark approval as viewed and update analytics', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          status: 'pending',
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'pending',
            },
          ],
          analytics: {
            totalViews: 0,
            uniqueViews: 0,
            firstViewedAt: null,
          },
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.markAsViewed(mockShareId, mockUserEmail);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          status: 'in_review',
          'recipients.0.status': 'viewed',
          'recipients.0.viewedAt': expect.anything(),
          'analytics.totalViews': expect.anything(), // increment
          'analytics.uniqueViews': expect.anything(), // increment
          'analytics.firstViewedAt': expect.anything(),
          'analytics.lastViewedAt': expect.anything(),
        })
      );
    });

    it('should not change status if already viewed', async () => {
      const mockApprovalDoc = {
        id: 'approval-1',
        ref: {},
        exists: () => true,
        data: () => ({
          ...mockApprovalData,
          shareId: mockShareId,
          status: 'in_review',
          recipients: [
            {
              id: 'recipient-1',
              email: mockUserEmail,
              status: 'viewed',
              viewedAt: { seconds: 1234567890 },
            },
          ],
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApprovalDoc],
        empty: false,
      } as any);

      await approvalService.markAsViewed(mockShareId, mockUserEmail);

      // Should still update analytics but not change status
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockApprovalDoc.ref,
        expect.objectContaining({
          'analytics.totalViews': expect.anything(),
          'analytics.lastViewedAt': expect.anything(),
        })
      );

      // Should NOT update recipient status again
      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('recipients.0.status');
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore connection error'));

      await expect(
        approvalService.searchEnhanced(mockContext.organizationId, {})
      ).rejects.toThrow('Firestore connection error');
    });

    it('should handle invalid share ID format', async () => {
      const invalidShareId = '';

      await expect(
        approvalService.getByShareId(invalidShareId)
      ).rejects.toThrow();
    });

    it('should handle non-existent approval updates', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      await expect(
        approvalService.submitDecision('non-existent', 'user@test.com', 'approved')
      ).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate approval data before creation', async () => {
      const invalidData = {
        // Missing required fields
        title: '',
        recipients: [],
      };

      await expect(
        approvalService.create(invalidData as any, mockContext)
      ).rejects.toThrow();
    });

    it('should sanitize HTML content', async () => {
      const dataWithScript = {
        ...mockApprovalData,
        content: {
          html: '<p>Safe content</p><script>alert("xss")</script>',
        },
      };

      const mockDocRef = { id: 'new-approval-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);

      await approvalService.create(dataWithScript as any, mockContext);

      const savedData = mockAddDoc.mock.calls[0][1];
      expect(savedData.content.html).not.toContain('<script>');
    });
  });
});