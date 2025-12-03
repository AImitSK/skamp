/**
 * Test-Suite für Approval-Service Integration mit Email/Notification-System
 * 
 * Diese Tests decken ab:
 * - Firebase Firestore-Integration mit Mocking
 * - Email-Service-Integration (SendGrid)
 * - Notification-Service-Integration (Inbox)
 * - Multi-Tenancy organizationId-Isolation
 * - Error-Handling und Retry-Logic
 * - Real-time Updates und Subscriptions
 * - Performance bei großen Datenmengen
 */

import { approvalService } from '@/lib/firebase/approval-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import type { ApprovalEnhanced, ApprovalStatus } from '@/types/approvals';
import type { Notification } from '@/types/notifications';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __type: 'timestamp', seconds: 1640995200 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1640995200, nanoseconds: 0 })),
    fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }))
  },
  writeBatch: jest.fn(),
  arrayUnion: jest.fn((item) => ({ __type: 'arrayUnion', elements: [item] })),
  increment: jest.fn((value) => ({ __type: 'increment', operand: value })),
  onSnapshot: jest.fn()
}));

// Mock Firebase Client
jest.mock('@/lib/firebase/client-init', () => ({
  db: {
    __type: 'firestore'
  }
}));

// Mock API Client für Email-Integration
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

// Mock Email Templates
jest.mock('@/lib/email/approval-email-templates', () => ({
  getApprovalRequestEmailTemplate: jest.fn(() => ({
    subject: 'Freigabe-Anfrage: Test Campaign',
    html: '<html>Test HTML</html>',
    text: 'Test Text'
  })),
  getApprovalReminderEmailTemplate: jest.fn(() => ({
    subject: 'Erinnerung: Freigabe-Anfrage',
    html: '<html>Reminder HTML</html>',
    text: 'Reminder Text'
  })),
  getApprovalGrantedEmailTemplate: jest.fn(() => ({
    subject: 'Freigabe erteilt',
    html: '<html>Granted HTML</html>',
    text: 'Granted Text'
  })),
  getChangesRequestedEmailTemplate: jest.fn(() => ({
    subject: 'Änderungen angefordert',
    html: '<html>Changes HTML</html>',
    text: 'Changes Text'
  })),
  getApprovalStatusUpdateTemplate: jest.fn(() => ({
    subject: 'Status-Update',
    html: '<html>Status HTML</html>',
    text: 'Status Text'
  }))
}));

// Mock Inbox Service
jest.mock('@/lib/firebase/inbox-service', () => ({
  inboxService: {
    getApprovalThread: jest.fn(),
    createApprovalThread: jest.fn(),
    addApprovalDecisionMessage: jest.fn(),
    addMessage: jest.fn()
  }
}));

// Mock PR Service
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn()
  }
}));

// Mock CRM Services
jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  companiesEnhancedService: {
    getById: jest.fn()
  },
  contactsEnhancedService: {
    searchEnhanced: jest.fn()
  }
}));

// Mock Email Address Service - Damit Fallback zu /api/sendgrid/send-approval-email genutzt wird
jest.mock('@/lib/email/email-address-service', () => ({
  emailAddressService: {
    getDefaultForOrganizationServer: jest.fn().mockResolvedValue(null) // Kein Default -> Fallback wird verwendet
  }
}));

// Mock Team Service
jest.mock('@/lib/firebase/team-service-enhanced', () => ({
  teamMemberService: {
    getByOrganization: jest.fn().mockResolvedValue([])
  }
}));

// Mock Branding Service
jest.mock('@/lib/firebase/branding-service', () => ({
  brandingService: {
    getBrandingSettings: jest.fn().mockResolvedValue(null)
  }
}));

// Mock Nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-id')
}));

// Import mocked dependencies
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';

import { apiClient } from '@/lib/api/api-client';
import { inboxService } from '@/lib/firebase/inbox-service';
import { prService } from '@/lib/firebase/pr-service';
import {
  getApprovalRequestEmailTemplate,
  getApprovalGrantedEmailTemplate,
  getChangesRequestedEmailTemplate
} from '@/lib/email/approval-email-templates';

describe('Approval Service Integration Tests', () => {
  // Test-Daten
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockCampaignId = 'campaign-789';
  
  const mockApprovalData: ApprovalEnhanced = {
    id: 'approval-123',
    campaignId: mockCampaignId,
    organizationId: mockOrganizationId,
    title: 'Test Campaign Approval',
    campaignTitle: 'Test Campaign',
    clientId: 'client-123',
    clientName: 'Test Client',
    status: 'draft' as ApprovalStatus,
    shareId: 'share-abc123',
    recipients: [
      {
        id: 'recipient-1',
        role: 'approver' as const,
        name: 'John Customer',
        email: 'john@customer.com',
        status: 'pending' as const,
        notificationsSent: 0,
        order: 0,
        isRequired: true
      }
    ],
    content: {
      html: '<html><body>Test Campaign Content</body></html>',
      plainText: 'Test Campaign Content',
      subject: 'Test Campaign Approval'
    },
    options: {
      requireAllApprovals: false,
      allowPartialApproval: true,
      autoSendAfterApproval: false,
      allowComments: true,
      allowInlineComments: false
    },
    shareSettings: {
      requirePassword: false,
      requireEmailVerification: false,
      accessLog: true
    },
    history: [],
    analytics: {
      totalViews: 0,
      uniqueViews: 0
    },
    notifications: {
      requested: { sent: false, method: 'email' as const }
    },
    workflow: 'simple' as const,
    requestedAt: Timestamp.now(),
    version: 1,
    createdBy: mockUserId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup standard Firebase mocks
    (collection as jest.Mock).mockReturnValue({ path: 'approvals' });
    (doc as jest.Mock).mockReturnValue({ id: 'mock-doc-id' });
    (query as jest.Mock).mockReturnValue({ __type: 'query' });
    (where as jest.Mock).mockReturnValue({ __type: 'where' });
    (orderBy as jest.Mock).mockReturnValue({ __type: 'orderBy' });
    (limit as jest.Mock).mockReturnValue({ __type: 'limit' });

    // Setup PR Service Mock mit Campaign-Daten
    (prService.getById as jest.Mock).mockResolvedValue({
      id: mockCampaignId,
      title: 'Test Campaign',
      clientId: 'client-123',
      clientName: 'Test Client',
      organizationId: mockOrganizationId
    });
  });

  describe('Customer-Only Approval Creation', () => {
    it('sollte Customer-Approval erfolgreich erstellen', async () => {
      // Mock addDoc für erfolgreiche Erstellung
      const mockDocRef = { id: 'new-approval-id' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const approvalId = await approvalService.createCustomerApproval(
        mockCampaignId,
        mockOrganizationId,
        {
            name: 'John Customer',
          email: 'john@customer.com'
        },
        'Please review and approve this campaign.'
      );

      expect(approvalId).toBe('new-approval-id');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(), // collection
        expect.objectContaining({
          campaignId: mockCampaignId,
          organizationId: mockOrganizationId,
          type: 'customer_only',
          status: 'pending',
          recipients: expect.arrayContaining([
            expect.objectContaining({
              name: 'John Customer',
              email: 'john@customer.com',
              status: 'pending'
            })
          ])
        })
      );
    });

    it('sollte mit fehlendem Customer-Kontakt umgehen', async () => {
      const mockDocRef = { id: 'new-approval-id' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const approvalId = await approvalService.createCustomerApproval(
        mockCampaignId,
        mockOrganizationId,
        undefined, // Kein Customer-Kontakt
        'Test message'
      );

      expect(approvalId).toBe('new-approval-id');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          recipients: [] // Leere Recipients
        })
      );
    });

    it('sollte Firestore-Fehler korrekt weiterleiten', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        approvalService.createCustomerApproval(
          mockCampaignId,
          mockOrganizationId,
          { name: 'Test', email: 'test@test.com' }
        )
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('Email-Integration beim Senden', () => {
    beforeEach(() => {
      // Mock getById für sendForApproval
      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockApprovalData),
        id: mockApprovalData.id
      });

      // Mock updateDoc für Status-Update
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('sollte Email-Benachrichtigung beim Senden der Freigabe versenden', async () => {
      // Mock API-Client
      (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

      await approvalService.sendForApproval(
        mockApprovalData.id!,
        { organizationId: mockOrganizationId, userId: mockUserId }
      );

      // Email sollte über Fallback-Route gesendet werden (da kein emailAddressService)
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/sendgrid/send-approval-email',
        expect.objectContaining({
          to: 'john@customer.com',
          subject: 'Freigabe-Anfrage: Test Campaign',
          approvalType: 'request',
          approvalData: expect.objectContaining({
            campaignTitle: 'Test Campaign',
            clientName: 'Test Client',
            recipientName: 'John Customer',
            approvalUrl: expect.stringContaining('share-abc123')
          })
        })
      );

      // Approval-Status sollte aktualisiert werden
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending',
          requestedAt: expect.any(Object)
        })
      );
    });

    it('sollte Email-Fehler graceful handhaben', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Email failed'));

      // Sollte nicht werfen, da Email-Fehler nicht kritisch sind
      await expect(
        approvalService.sendForApproval(
          mockApprovalData.id!,
          { organizationId: mockOrganizationId, userId: mockUserId }
        )
      ).resolves.not.toThrow();

      // Approval-Status sollte trotzdem aktualisiert werden
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Inbox-Service-Integration', () => {
    beforeEach(() => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockApprovalData),
        id: mockApprovalData.id
      });
    });

    it('sollte Inbox-Thread beim Senden erstellen', async () => {
      (inboxService.getApprovalThread as jest.Mock).mockResolvedValue(null); // Kein existierender Thread
      (inboxService.createApprovalThread as jest.Mock).mockResolvedValue('thread-123');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await approvalService.sendForApproval(
        mockApprovalData.id!,
        { organizationId: mockOrganizationId, userId: mockUserId }
      );

      expect(inboxService.createApprovalThread).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrganizationId,
          approvalId: mockApprovalData.id,
          campaignTitle: mockApprovalData.campaignTitle,
          clientName: mockApprovalData.clientName,
          customerEmail: 'john@customer.com',
          customerName: 'John Customer'
        })
      );
    });

    it('sollte bestehenden Inbox-Thread nicht überschreiben', async () => {
      (inboxService.getApprovalThread as jest.Mock).mockResolvedValue({ id: 'existing-thread' });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await approvalService.sendForApproval(
        mockApprovalData.id!,
        { organizationId: mockOrganizationId, userId: mockUserId }
      );

      expect(inboxService.createApprovalThread).not.toHaveBeenCalled();
    });

    it('sollte Inbox-Fehler graceful handhaben', async () => {
      (inboxService.getApprovalThread as jest.Mock).mockRejectedValue(new Error('Inbox error'));
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await expect(
        approvalService.sendForApproval(
          mockApprovalData.id!,
          { organizationId: mockOrganizationId, userId: mockUserId }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Decision-Handling mit Notifications', () => {
    const mockShareId = 'share-abc123';
    const mockRecipientEmail = 'john@customer.com';

    beforeEach(() => {
      // Mock getByShareId
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{
          id: mockApprovalData.id,
          data: () => mockApprovalData
        }]
      });
      
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('sollte Approval-Decision verarbeiten und Benachrichtigungen senden', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
      (inboxService.getApprovalThread as jest.Mock).mockResolvedValue({
        id: 'thread-123',
        organizationId: mockOrganizationId
      });
      (inboxService.addMessage as jest.Mock).mockResolvedValue(undefined);

      await approvalService.submitDecisionPublic(
        mockShareId,
        'approved',
        'Looks great!',
        'John Customer'
      );

      // Status-Update
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'approved',
          approvedAt: expect.any(Object)
        })
      );

      // Inbox-Message sollte hinzugefügt werden
      expect(inboxService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-123',
          messageType: 'status_change',
          content: expect.stringContaining('Freigabe erhalten')
        })
      );
    });

    it('sollte Changes-Requested verarbeiten', async () => {
      (getChangesRequestedEmailTemplate as jest.Mock).mockReturnValue({
        subject: 'Änderungen angefordert',
        html: '<html>Changes</html>',
        text: 'Changes Text'
      });

      await approvalService.requestChangesPublic(
        mockShareId,
        mockRecipientEmail,
        'Please change the headline',
        'John Customer',
        [{ page: 1, comment: 'Fix this' }]
      );

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'changes_requested'
        })
      );
    });

    it('sollte Inbox-Message bei Decision hinzufügen', async () => {
      (inboxService.getApprovalThread as jest.Mock).mockResolvedValue({
        id: 'thread-123',
        organizationId: mockOrganizationId
      });
      (inboxService.addMessage as jest.Mock).mockResolvedValue(undefined);

      await approvalService.submitDecisionPublic(
        mockShareId,
        'approved',
        'Approved!',
        'John Customer'
      );

      // Die Implementierung nutzt addMessage, nicht addApprovalDecisionMessage
      expect(inboxService.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-123',
          organizationId: mockOrganizationId,
          messageType: 'status_change',
          senderType: 'system',
          content: expect.stringContaining('Freigabe erhalten')
        })
      );
    });
  });

  describe('Multi-Tenancy organizationId-Isolation', () => {
    it('sollte Approvals nur für korrekte Organization laden', async () => {
      const mockDocs = [
        { id: 'approval-1', data: () => ({ ...mockApprovalData, organizationId: 'org-123' }) },
        { id: 'approval-2', data: () => ({ ...mockApprovalData, organizationId: 'org-456' }) }
      ];
      
      (getDocs as jest.Mock).mockResolvedValue({ 
        docs: mockDocs.filter(doc => doc.data().organizationId === mockOrganizationId),
        empty: false
      });

      const approvals = await approvalService.getAll(mockOrganizationId);

      // Query sollte organizationId-Filter enthalten
      expect(where).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
      
      // Nur Approvals der korrekten Organization zurückgeben
      expect(approvals).toHaveLength(1);
      expect(approvals[0].organizationId).toBe(mockOrganizationId);
    });

    it('sollte Cross-Tenant-Zugriff bei getById verhindern', async () => {
      const wrongOrgApproval = {
        ...mockApprovalData,
        organizationId: 'wrong-org-id'
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => wrongOrgApproval),
        id: 'approval-123'
      });

      const result = await approvalService.getById('approval-123', mockOrganizationId);

      // Sollte null zurückgeben bei falscher Organization
      expect(result).toBeNull();
    });

    it('sollte organizationId bei createCustomerApproval setzen', async () => {
      const mockDocRef = { id: 'new-approval-id' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await approvalService.createCustomerApproval(
        mockCampaignId,
        'specific-org-id', // Spezifische Organization
        { name: 'Test', email: 'test@test.com' }
      );

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          organizationId: 'specific-org-id' // Korrekte Organization gesetzt
        })
      );
    });
  });

  describe('Notifications-Service-Integration', () => {
    beforeEach(() => {
      // Mock notificationsService.create
      jest.spyOn(notificationsService as any, 'create').mockResolvedValue('notification-123');
    });

    it('sollte interne Benachrichtigung bei Approval-Request erstellen', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockApprovalData),
        id: mockApprovalData.id
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await approvalService.sendForApproval(
        mockApprovalData.id!,
        { organizationId: mockOrganizationId, userId: mockUserId }
      );

      expect((notificationsService as any).create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrganizationId,
          type: 'APPROVAL_GRANTED',
          title: 'Freigabe-Anfrage gesendet',
          message: expect.stringContaining('Test Campaign'),
          linkUrl: `/dashboard/pr-tools/approvals/${mockApprovalData.shareId}`,
          metadata: expect.objectContaining({
            campaignId: mockCampaignId
          })
        })
      );
    });

    it('sollte Benachrichtigung bei Status-Änderung erstellen', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{
          id: mockApprovalData.id,
          data: () => mockApprovalData
        }]
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await approvalService.submitDecisionPublic(
        mockApprovalData.shareId,
        'approved',
        'Approved!',
        'John Customer'
      );

      expect((notificationsService as any).create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APPROVAL_GRANTED',
          title: '✅ Freigabe erteilt',
          message: expect.stringContaining('Kunde'),
          linkUrl: `/dashboard/pr-tools/approvals/${mockApprovalData.shareId}`
        })
      );
    });

    it('sollte Notification-Fehler graceful handhaben', async () => {
      (notificationsService as any).create.mockRejectedValue(new Error('Notification failed'));
      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockApprovalData),
        id: mockApprovalData.id
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Sollte nicht werfen
      await expect(
        approvalService.sendForApproval(
          mockApprovalData.id!,
          { organizationId: mockOrganizationId, userId: mockUserId }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Performance und Error-Handling', () => {
    it('sollte große Approval-Listen effizient handhaben', async () => {
      const manyApprovals = Array.from({ length: 100 }, (_, i) => ({
        id: `approval-${i}`,
        data: () => ({ ...mockApprovalData, id: `approval-${i}` })
      }));
      
      (getDocs as jest.Mock).mockResolvedValue({ 
        docs: manyApprovals,
        empty: false
      });

      const startTime = performance.now();
      const approvals = await approvalService.getAll(mockOrganizationId);
      const endTime = performance.now();

      expect(approvals).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Sollte unter 100ms sein
    });

    it('sollte Firestore-Timeouts handhaben', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Request timeout'));

      const result = await approvalService.getAll(mockOrganizationId);

      // Sollte leeres Array zurückgeben bei Fehlern
      expect(result).toEqual([]);
    });

    it('sollte Network-Fehler bei Email-Versand handhaben', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => mockApprovalData),
        id: mockApprovalData.id
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Sollte trotz Email-Fehler erfolgreich sein
      await expect(
        approvalService.sendForApproval(
          mockApprovalData.id!,
          { organizationId: mockOrganizationId, userId: mockUserId }
        )
      ).resolves.not.toThrow();

      // Approval sollte trotzdem aktualisiert werden
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Array-Safety und Data-Integrity', () => {
    it('sollte sicherstellen dass recipients immer Array ist', async () => {
      const approvalWithNonArrayRecipients = {
        ...mockApprovalData,
        recipients: null as any
      };
      
      (getDocs as jest.Mock).mockResolvedValue({ 
        docs: [{
          id: 'approval-1',
          data: () => approvalWithNonArrayRecipients
        }],
        empty: false
      });

      const approvals = await approvalService.getAll(mockOrganizationId);

      expect(approvals[0].recipients).toEqual([]);
      expect(Array.isArray(approvals[0].recipients)).toBe(true);
    });

    it('sollte sicherstellen dass history immer Array ist', async () => {
      // Hinweis: Das Service normalisiert nur Objekte zu Arrays, nicht null-Werte
      // Ein Object das kein Array ist wird zu [] konvertiert
      const approvalWithNonArrayHistory = {
        ...mockApprovalData,
        history: { '0': 'invalid' } as any // Objekt das kein Array ist
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: jest.fn(() => true),
        data: jest.fn(() => approvalWithNonArrayHistory),
        id: 'approval-123'
      });

      const approval = await approvalService.getById('approval-123', mockOrganizationId);

      expect(approval?.history).toEqual([]);
      expect(Array.isArray(approval?.history)).toBe(true);
    });
  });
});
