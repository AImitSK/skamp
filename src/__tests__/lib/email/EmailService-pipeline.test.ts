// src/__tests__/lib/email/EmailService-pipeline.test.ts
// Tests für EmailService Pipeline-Features und Event-Tracking (Plan 4/9)

import { EmailService, emailService } from '@/lib/email/email-service';
import { PRCampaign } from '@/types/pr';
import { Contact } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';

// Mock Dependencies
const mockApiClient = {
  post: jest.fn()
};

const mockNotificationsService = {
  notifyEmailSent: jest.fn(),
  notifyEmailBounced: jest.fn()
};

const mockAddDoc = jest.fn();
const mockQuery = jest.fn();
const mockCollection = jest.fn();
const mockWhere = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('@/lib/api/api-client', () => ({
  apiClient: mockApiClient
}));

jest.mock('@/lib/firebase/notifications-service', () => ({
  notificationsService: mockNotificationsService
}));

jest.mock('firebase/firestore', () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000 })
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

describe('EmailService Pipeline-Features Tests', () => {
  const baseCampaign: PRCampaign = {
    id: 'test-campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    title: 'Test Pipeline Campaign',
    contentHtml: '<p>Test content</p>',
    status: 'draft',
    distributionListId: 'list-1',
    distributionListName: 'Test List',
    recipientCount: 100,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const testContacts: Contact[] = [
    {
      id: 'contact-1',
      userId: 'test-user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      companyName: 'Example Corp',
      companyId: 'company-1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'contact-2',
      userId: 'test-user-123',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      companyName: 'Test Inc',
      companyId: 'company-2',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  const senderInfo = {
    name: 'Test Sender',
    title: 'Marketing Manager',
    company: 'Test Company',
    phone: '+49 123 456789',
    email: 'sender@test.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue('mock-collection');
    mockQuery.mockReturnValue('mock-query');
    mockWhere.mockReturnValue('mock-where');
  });

  describe('Pipeline-Options Integration', () => {
    it('sollte Pipeline-Mode korrekt erkennen und Pipeline-Event erstellen', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-123',
        projectTitle: 'Test Pipeline Project',
        pipelineStage: 'distribution'
      };

      const mockResult = {
        results: [
          { email: 'john@example.com', status: 'sent', messageId: 'msg-1' },
          { email: 'jane@example.com', status: 'sent', messageId: 'msg-2' }
        ],
        summary: { total: 2, success: 2, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockAddDoc.mockResolvedValue({ id: 'event-123' });

      const result = await emailService.sendPRCampaign(
        pipelineCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello {{firstName}}',
          introduction: 'Test intro',
          pressReleaseHtml: '<p>Press release</p>',
          closing: 'Best regards',
          signature: 'Test Sender'
        },
        senderInfo,
        testContacts,
        'https://media.example.com',
        { url: 'https://image.example.com', cropData: {} },
        { pipelineMode: true, projectId: 'project-123' }
      );

      expect(result.summary.success).toBe(2);
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          type: 'distribution',
          projectId: 'project-123',
          campaignId: 'test-campaign-123',
          recipientCount: 2,
          metadata: expect.objectContaining({
            emailContent: 'Test Subject',
            senderInfo: 'Test Sender'
          })
        })
      );
    });

    it('sollte ohne Pipeline-Mode keine Pipeline-Events erstellen', async () => {
      const mockResult = {
        results: [
          { email: 'john@example.com', status: 'sent', messageId: 'msg-1' }
        ],
        summary: { total: 1, success: 1, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);

      await emailService.sendPRCampaign(
        baseCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello {{firstName}}',
          introduction: 'Test intro',
          pressReleaseHtml: '<p>Press release</p>',
          closing: 'Best regards',
          signature: 'Test Sender'
        },
        senderInfo,
        testContacts.slice(0, 1)
        // Keine Pipeline-Options
      );

      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('sollte Pipeline-Event-Erstellung-Fehler graceful behandeln', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-error',
        pipelineStage: 'distribution'
      };

      const mockResult = {
        results: [{ email: 'john@example.com', status: 'sent', messageId: 'msg-1' }],
        summary: { total: 1, success: 1, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockAddDoc.mockRejectedValue(new Error('Event creation failed'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await emailService.sendPRCampaign(
        pipelineCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        testContacts.slice(0, 1),
        undefined,
        undefined,
        { pipelineMode: true, projectId: 'project-error' }
      );

      expect(result.summary.success).toBe(1); // E-Mail-Versand sollte trotzdem erfolgreich sein
      expect(consoleSpy).toHaveBeenCalledWith('Pipeline-Event creation failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('sollte korrekte distributionId generieren', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-dist-id',
        pipelineStage: 'distribution'
      };

      const mockResult = {
        results: [{ email: 'john@example.com', status: 'sent', messageId: 'msg-1' }],
        summary: { total: 1, success: 1, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockAddDoc.mockResolvedValue({ id: 'event-456' });

      await emailService.sendPRCampaign(
        pipelineCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        testContacts.slice(0, 1),
        undefined,
        undefined,
        { pipelineMode: true, projectId: 'project-dist-id' }
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          distributionId: expect.stringMatching(/^dist_\d+$/)
        })
      );
    });
  });

  describe('Pipeline-Distribution-Event-Tracking', () => {
    it('sollte createPipelineDistributionEvent korrekt implementieren', async () => {
      const eventData = {
        projectId: 'project-event-test',
        campaignId: 'campaign-event-test',
        distributionId: 'dist_1234567890',
        recipientCount: 50,
        timestamp: Timestamp.now(),
        metadata: {
          emailSubject: 'Test Event Subject',
          senderName: 'Event Sender'
        },
        organizationId: 'org-event-test'
      };

      mockAddDoc.mockResolvedValue({ id: 'created-event-123' });

      await emailService.createPipelineDistributionEvent(eventData);

      expect(mockCollection).toHaveBeenCalledWith({ mockDb: true }, 'pipeline_events');
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          type: 'distribution',
          projectId: 'project-event-test',
          campaignId: 'campaign-event-test',
          distributionId: 'dist_1234567890',
          recipientCount: 50,
          metadata: expect.objectContaining({
            emailSubject: 'Test Event Subject',
            senderName: 'Event Sender'
          }),
          organizationId: 'org-event-test',
          createdAt: expect.any(Object)
        })
      );
    });

    it('sollte Fehler bei createPipelineDistributionEvent korrekt werfen', async () => {
      const eventData = {
        projectId: 'project-error',
        campaignId: 'campaign-error',
        distributionId: 'dist_error',
        recipientCount: 0,
        timestamp: Timestamp.now(),
        metadata: {}
      };

      const mockError = new Error('Firestore write failed');
      mockAddDoc.mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(emailService.createPipelineDistributionEvent(eventData))
        .rejects.toThrow('Firestore write failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create pipeline distribution event:',
        mockError
      );

      consoleSpy.mockRestore();
    });

    it('sollte Pipeline-Events mit korrektem Timestamp erstellen', async () => {
      const testTimestamp = Timestamp.now();
      const eventData = {
        projectId: 'project-timestamp',
        campaignId: 'campaign-timestamp',
        distributionId: 'dist_timestamp',
        recipientCount: 25,
        timestamp: testTimestamp,
        metadata: { test: 'data' }
      };

      mockAddDoc.mockResolvedValue({ id: 'timestamp-event' });

      await emailService.createPipelineDistributionEvent(eventData);

      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          timestamp: testTimestamp,
          createdAt: expect.any(Object) // Neuer Timestamp
        })
      );
    });
  });

  describe('Pipeline-Distribution-Statistiken', () => {
    it('sollte getPipelineDistributionStats korrekt implementieren', async () => {
      const mockEvents = [
        { projectId: 'project-stats', recipientCount: 100, timestamp: Timestamp.now() },
        { projectId: 'project-stats', recipientCount: 50, timestamp: Timestamp.now() },
        { projectId: 'project-stats', recipientCount: 75, timestamp: Timestamp.now() }
      ];

      const mockSnapshot = {
        docs: mockEvents.map(event => ({ data: () => event }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        callback(mockSnapshot);
        return jest.fn(); // unsubscribe function
      });

      const stats = await emailService.getPipelineDistributionStats(
        'project-stats',
        { organizationId: 'org-stats' }
      );

      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-stats');
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'distribution');
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'org-stats');

      expect(stats).toEqual({
        totalCampaigns: 3,
        totalRecipients: 225, // 100 + 50 + 75
        distributionDates: expect.arrayContaining([
          expect.any(Object), expect.any(Object), expect.any(Object)
        ]),
        successRate: 75 // 225 / 3
      });
    });

    it('sollte leere Statistiken für Projekt ohne Events zurückgeben', async () => {
      const mockEmptySnapshot = { docs: [] };

      mockOnSnapshot.mockImplementation((query, callback) => {
        callback(mockEmptySnapshot);
        return jest.fn();
      });

      const stats = await emailService.getPipelineDistributionStats(
        'project-no-events',
        { organizationId: 'org-empty' }
      );

      expect(stats).toEqual({
        totalCampaigns: 0,
        totalRecipients: 0,
        distributionDates: [],
        successRate: 0
      });
    });

    it('sollte Fehler bei getPipelineDistributionStats korrekt behandeln', async () => {
      const mockError = new Error('Firestore query failed');
      mockOnSnapshot.mockImplementation((query, callback, errorCallback) => {
        errorCallback(mockError);
        return jest.fn();
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(emailService.getPipelineDistributionStats(
        'project-error-stats',
        { organizationId: 'org-error' }
      )).rejects.toThrow('Firestore query failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get pipeline distribution stats:',
        mockError
      );

      consoleSpy.mockRestore();
    });

    it('sollte Multi-Tenancy in Statistiken berücksichtigen', async () => {
      await emailService.getPipelineDistributionStats(
        'project-multi-tenant',
        { organizationId: 'specific-org-123' }
      );

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'specific-org-123');
      expect(mockQuery).toHaveBeenCalledWith(
        'mock-collection',
        'mock-where',
        'mock-where',
        'mock-where'
      );
    });
  });

  describe('Notification-Integration Tests', () => {
    it('sollte Email-Sent Notifications korrekt senden', async () => {
      const mockResult = {
        results: [
          { email: 'john@example.com', status: 'sent', messageId: 'msg-1' },
          { email: 'jane@example.com', status: 'sent', messageId: 'msg-2' }
        ],
        summary: { total: 2, success: 2, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockNotificationsService.notifyEmailSent.mockResolvedValue({});

      await emailService.sendPRCampaign(
        baseCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        testContacts
      );

      expect(mockNotificationsService.notifyEmailSent).toHaveBeenCalledWith(
        baseCampaign,
        2, // success count
        'test-user-123'
      );
    });

    it('sollte Email-Bounce Notifications korrekt senden', async () => {
      const mockResult = {
        results: [
          { email: 'john@example.com', status: 'sent', messageId: 'msg-1' },
          { email: 'bounce@example.com', status: 'failed', error: 'Hard bounce' }
        ],
        summary: { total: 2, success: 1, failed: 1 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockNotificationsService.notifyEmailBounced.mockResolvedValue({});

      await emailService.sendPRCampaign(
        baseCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        [
          testContacts[0],
          {
            ...testContacts[1],
            email: 'bounce@example.com'
          }
        ]
      );

      expect(mockNotificationsService.notifyEmailBounced).toHaveBeenCalledWith(
        baseCampaign,
        'bounce@example.com',
        'test-user-123'
      );
    });

    it('sollte Multiple Bounces aggregiert behandeln', async () => {
      const mockResult = {
        results: [
          { email: 'bounce1@example.com', status: 'failed', error: 'Bounce 1' },
          { email: 'bounce2@example.com', status: 'failed', error: 'Bounce 2' },
          { email: 'bounce3@example.com', status: 'failed', error: 'Bounce 3' },
          { email: 'bounce4@example.com', status: 'failed', error: 'Bounce 4' },
          { email: 'bounce5@example.com', status: 'failed', error: 'Bounce 5' },
          { email: 'bounce6@example.com', status: 'failed', error: 'Bounce 6' }
        ],
        summary: { total: 6, success: 0, failed: 6 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockNotificationsService.notifyEmailBounced.mockResolvedValue({});

      const bouncedContacts = Array.from({ length: 6 }, (_, i) => ({
        ...testContacts[0],
        id: `bounce-contact-${i}`,
        email: `bounce${i + 1}@example.com`
      }));

      await emailService.sendPRCampaign(
        baseCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        bouncedContacts
      );

      // Bei mehr als 5 Bounces sollte aggregierte Nachricht gesendet werden
      expect(mockNotificationsService.notifyEmailBounced).toHaveBeenCalledWith(
        baseCampaign,
        '6 E-Mails',
        'test-user-123'
      );
    });

    it('sollte Notification-Fehler graceful behandeln', async () => {
      const mockResult = {
        results: [{ email: 'john@example.com', status: 'sent', messageId: 'msg-1' }],
        summary: { total: 1, success: 1, failed: 0 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockNotificationsService.notifyEmailSent.mockRejectedValue(new Error('Notification failed'));

      // E-Mail-Versand sollte trotz Notification-Fehler erfolgreich sein
      const result = await emailService.sendPRCampaign(
        baseCampaign,
        {
          subject: 'Test Subject',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        testContacts.slice(0, 1)
      );

      expect(result.summary.success).toBe(1);
      expect(mockNotificationsService.notifyEmailSent).toHaveBeenCalled();
    });
  });

  describe('Integration Tests Pipeline + Notifications', () => {
    it('sollte Pipeline-Events und Notifications kombiniert handhaben', async () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-integration',
        pipelineStage: 'distribution'
      };

      const mockResult = {
        results: [
          { email: 'john@example.com', status: 'sent', messageId: 'msg-1' },
          { email: 'bounce@example.com', status: 'failed', error: 'Bounce' }
        ],
        summary: { total: 2, success: 1, failed: 1 }
      };

      mockApiClient.post.mockResolvedValue(mockResult);
      mockAddDoc.mockResolvedValue({ id: 'integration-event' });
      mockNotificationsService.notifyEmailSent.mockResolvedValue({});
      mockNotificationsService.notifyEmailBounced.mockResolvedValue({});

      await emailService.sendPRCampaign(
        pipelineCampaign,
        {
          subject: 'Integration Test',
          greeting: 'Hello',
          introduction: 'Intro',
          pressReleaseHtml: '<p>PR</p>',
          closing: 'Closing',
          signature: 'Sender'
        },
        senderInfo,
        [
          testContacts[0],
          { ...testContacts[1], email: 'bounce@example.com' }
        ],
        undefined,
        undefined,
        { pipelineMode: true, projectId: 'project-integration' }
      );

      // Pipeline-Event sollte erstellt werden
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          type: 'distribution',
          projectId: 'project-integration',
          recipientCount: 1 // Success count
        })
      );

      // Notifications sollten gesendet werden
      expect(mockNotificationsService.notifyEmailSent).toHaveBeenCalledWith(
        pipelineCampaign,
        1,
        'test-user-123'
      );

      expect(mockNotificationsService.notifyEmailBounced).toHaveBeenCalledWith(
        pipelineCampaign,
        'bounce@example.com',
        'test-user-123'
      );
    });
  });
});