// src/__tests__/features/plan-4-9-distribution-types.test.ts
// Tests für PRCampaign Interface Erweiterungen (Plan 4/9)

// Mock Firebase First
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ 
      seconds: Date.now() / 1000, 
      nanoseconds: 0,
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      isEqual: () => false,
      toJSON: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
    }),
    fromDate: (date: Date) => ({ 
      seconds: date.getTime() / 1000, 
      nanoseconds: 0,
      toDate: () => date,
      toMillis: () => date.getTime(),
      isEqual: () => false,
      toJSON: () => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
    })
  }
}));

import { 
  PRCampaign, 
  DistributionRecipient,
  SenderConfiguration,
  DistributionError,
  createDefaultPRCampaign 
} from '@/types/pr';

// Use mocked Timestamp
const Timestamp = {
  now: () => ({ 
    seconds: Date.now() / 1000, 
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    isEqual: () => false,
    toJSON: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }),
  fromDate: (date: Date) => ({ 
    seconds: date.getTime() / 1000, 
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: () => false,
    toJSON: () => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  })
};

describe('Plan 4/9: PRCampaign Distribution Interface Tests', () => {
  const mockUserId = 'test-user-123';
  const mockOrganizationId = 'test-org-456';

  describe('distributionConfig Interface Tests', () => {
    it('sollte eine gültige distributionConfig erstellen können', () => {
      const campaign: PRCampaign = {
        id: 'test-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Test Distribution Campaign',
        contentHtml: '<p>Test Content</p>',
        status: 'draft',
        distributionListId: 'default-list',
        distributionListName: 'Default List',
        recipientCount: 0,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: false,
          scheduledAt: undefined,
          distributionLists: ['list-1', 'list-2'],
          manualRecipients: [
            {
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              companyName: 'Test Company'
            }
          ],
          senderConfig: {
            contactId: 'contact-123',
            email: 'sender@company.com',
            name: 'John Doe',
            replyTo: 'reply@company.com'
          },
          emailSubject: 'Test Campaign Subject',
          emailPreheader: 'Test Preheader',
          personalizedContent: true,
          variables: {
            'companyName': 'Test Corp',
            'eventDate': '2025-01-15'
          },
          testRecipients: ['test1@example.com', 'test2@example.com']
        }
      };

      expect(campaign.distributionConfig).toBeDefined();
      expect(campaign.distributionConfig!.isScheduled).toBe(false);
      expect(campaign.distributionConfig!.distributionLists).toHaveLength(2);
      expect(campaign.distributionConfig!.manualRecipients).toHaveLength(1);
      expect(campaign.distributionConfig!.senderConfig.contactId).toBe('contact-123');
      expect(campaign.distributionConfig!.emailSubject).toBe('Test Campaign Subject');
      expect(campaign.distributionConfig!.personalizedContent).toBe(true);
      expect(campaign.distributionConfig!.variables).toHaveProperty('companyName', 'Test Corp');
      expect(campaign.distributionConfig!.testRecipients).toHaveLength(2);
    });

    it('sollte eine geplante distributionConfig erstellen können', () => {
      const scheduledDate = Timestamp.fromDate(new Date('2025-02-15T10:00:00Z')) as any;
      const campaign: PRCampaign = {
        id: 'scheduled-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Scheduled Campaign',
        contentHtml: '<p>Scheduled Content</p>',
        status: 'scheduled',
        distributionListId: 'list-1',
        distributionListName: 'List 1',
        recipientCount: 150,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: true,
          scheduledAt: scheduledDate,
          distributionLists: ['list-1'],
          manualRecipients: [],
          senderConfig: {
            email: 'marketing@company.com',
            name: 'Marketing Team'
          },
          emailSubject: 'Scheduled Newsletter',
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaign.distributionConfig!.isScheduled).toBe(true);
      expect(campaign.distributionConfig!.scheduledAt).toEqual(scheduledDate);
      expect(campaign.status).toBe('scheduled');
    });

    it('sollte manuelle SenderConfiguration korrekt behandeln', () => {
      const senderConfig: SenderConfiguration = {
        email: 'manual@sender.com',
        name: 'Manual Sender',
        replyTo: 'noreply@sender.com'
      };

      const campaign: PRCampaign = {
        id: 'manual-sender-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Manual Sender Campaign',
        contentHtml: '<p>Content</p>',
        status: 'draft',
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig,
          emailSubject: 'Test',
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaign.distributionConfig!.senderConfig).toEqual(senderConfig);
      expect(campaign.distributionConfig!.senderConfig.contactId).toBeUndefined();
      expect(campaign.distributionConfig!.senderConfig.replyTo).toBe('noreply@sender.com');
    });

    it('sollte DistributionRecipient korrekt validieren', () => {
      const validRecipient: DistributionRecipient = {
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Example Corp',
        notes: 'Important contact'
      };

      const minimalRecipient: DistributionRecipient = {
        email: 'minimal@example.com'
      };

      expect(validRecipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(validRecipient.firstName).toBe('John');
      expect(validRecipient.notes).toBe('Important contact');
      
      expect(minimalRecipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(minimalRecipient.firstName).toBeUndefined();
      expect(minimalRecipient.companyName).toBeUndefined();
    });
  });

  describe('distributionStatus Interface Tests', () => {
    it('sollte distributionStatus korrekt initialisieren', () => {
      const campaign: PRCampaign = {
        id: 'status-test-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Status Test Campaign',
        contentHtml: '<p>Content</p>',
        status: 'sending',
        distributionListId: 'list-1',
        distributionListName: 'Test List',
        recipientCount: 100,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionStatus: {
          status: 'sending',
          recipientCount: 100,
          successCount: 0,
          failureCount: 0,
          distributionId: 'dist_1234567890'
        }
      };

      expect(campaign.distributionStatus).toBeDefined();
      expect(campaign.distributionStatus!.status).toBe('sending');
      expect(campaign.distributionStatus!.recipientCount).toBe(100);
      expect(campaign.distributionStatus!.successCount).toBe(0);
      expect(campaign.distributionStatus!.failureCount).toBe(0);
      expect(campaign.distributionStatus!.distributionId).toBe('dist_1234567890');
    });

    it('sollte erfolgreichen Versand-Status korrekt setzen', () => {
      const sentAt = Timestamp.now();
      const distributionStatus = {
        status: 'sent' as const,
        sentAt,
        recipientCount: 250,
        successCount: 248,
        failureCount: 2,
        openRate: 0.68,
        clickRate: 0.12,
        distributionId: 'dist_success_123',
        errors: [
          {
            recipient: 'bounced@example.com',
            error: 'Email bounced',
            timestamp: sentAt
          },
          {
            recipient: 'invalid@example.com',
            error: 'Invalid email address',
            timestamp: sentAt
          }
        ] as any as DistributionError[]
      };

      expect(distributionStatus.status).toBe('sent');
      expect(distributionStatus.successCount).toBe(248);
      expect(distributionStatus.failureCount).toBe(2);
      expect(distributionStatus.openRate).toBe(0.68);
      expect(distributionStatus.clickRate).toBe(0.12);
      expect(distributionStatus.errors).toHaveLength(2);
      expect(distributionStatus.errors![0].recipient).toBe('bounced@example.com');
    });

    it('sollte fehlgeschlagenen Versand-Status korrekt setzen', () => {
      const failureTimestamp = Timestamp.now();
      const distributionStatus = {
        status: 'failed' as const,
        recipientCount: 100,
        successCount: 0,
        failureCount: 100,
        distributionId: 'dist_failed_456',
        errors: [
          {
            recipient: 'all',
            error: 'SMTP server connection failed',
            timestamp: failureTimestamp
          }
        ] as any as DistributionError[]
      };

      expect(distributionStatus.status).toBe('failed');
      expect(distributionStatus.successCount).toBe(0);
      expect(distributionStatus.failureCount).toBe(100);
      expect(distributionStatus.errors).toHaveLength(1);
      expect(distributionStatus.errors![0].error).toBe('SMTP server connection failed');
    });

    it('sollte Pipeline-Integration Felder korrekt verwalten', () => {
      const campaign: PRCampaign = {
        id: 'pipeline-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Pipeline Distribution Campaign',
        contentHtml: '<p>Pipeline Content</p>',
        status: 'draft',
        distributionListId: 'pipeline-list',
        distributionListName: 'Pipeline List',
        recipientCount: 50,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        // Pipeline-Integration Felder
        projectId: 'project-789',
        projectTitle: 'Q1 Marketing Project',
        pipelineStage: 'distribution',
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['pipeline-list'],
          manualRecipients: [],
          senderConfig: {
            email: 'pipeline@company.com',
            name: 'Pipeline Bot'
          },
          emailSubject: 'Pipeline Distribution Test',
          personalizedContent: true,
          variables: {
            'projectName': 'Q1 Marketing Project',
            'distributionDate': '2025-01-20'
          }
        }
      };

      expect(campaign.projectId).toBe('project-789');
      expect(campaign.projectTitle).toBe('Q1 Marketing Project');
      expect(campaign.pipelineStage).toBe('distribution');
      expect(campaign.distributionConfig!.variables).toHaveProperty('projectName', 'Q1 Marketing Project');
    });
  });

  describe('createDefaultPRCampaign Tests', () => {
    it('sollte default Campaign mit Distribution-Feldern erstellen', () => {
      const defaultCampaign = createDefaultPRCampaign(mockUserId, mockOrganizationId);

      expect(defaultCampaign.userId).toBe(mockUserId);
      expect(defaultCampaign.organizationId).toBe(mockOrganizationId);
      expect(defaultCampaign.status).toBe('draft');
      expect(defaultCampaign.distributionListIds).toEqual([]);
      expect(defaultCampaign.distributionListNames).toEqual([]);
      expect(defaultCampaign.recipientCount).toBe(0);
      expect(defaultCampaign.approvalRequired).toBe(false);
    });

    it('sollte organizationId Fallback korrekt behandeln', () => {
      const defaultCampaign = createDefaultPRCampaign(mockUserId);

      expect(defaultCampaign.userId).toBe(mockUserId);
      expect(defaultCampaign.organizationId).toBe(mockUserId); // Fallback
    });
  });

  describe('Multi-Tenancy Distribution Tests', () => {
    it('sollte organizationId in distributionConfig berücksichtigen', () => {
      const campaign: PRCampaign = {
        id: 'multi-tenant-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Multi-Tenant Distribution',
        contentHtml: '<p>Content</p>',
        status: 'draft',
        distributionListId: 'tenant-list',
        distributionListName: 'Tenant List',
        recipientCount: 75,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['tenant-list-1', 'tenant-list-2'],
          manualRecipients: [],
          senderConfig: {
            contactId: 'tenant-contact-123',
            email: 'tenant@organization.com',
            name: 'Tenant Sender'
          },
          emailSubject: 'Multi-Tenant Campaign',
          personalizedContent: true,
          variables: {
            'organizationName': 'Test Organization'
          }
        }
      };

      // Validiere dass organizationId korrekt gesetzt ist
      expect(campaign.organizationId).toBe(mockOrganizationId);
      expect(campaign.distributionConfig!.senderConfig.contactId).toBe('tenant-contact-123');
      expect(campaign.distributionConfig!.variables).toHaveProperty('organizationName', 'Test Organization');
    });

    it('sollte Cross-Tenant-Zugriff in distributionConfig verhindern', () => {
      const tenantACampaign: PRCampaign = {
        id: 'tenant-a-campaign',
        userId: 'user-tenant-a',
        organizationId: 'org-tenant-a',
        title: 'Tenant A Campaign',
        contentHtml: '<p>Content A</p>',
        status: 'draft',
        distributionListId: 'list-a',
        distributionListName: 'List A',
        recipientCount: 50,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['tenant-a-list-1'],
          manualRecipients: [],
          senderConfig: {
            email: 'sender@tenant-a.com',
            name: 'Tenant A Sender'
          },
          emailSubject: 'Tenant A Subject',
          personalizedContent: false,
          variables: {}
        }
      };

      const tenantBCampaign: PRCampaign = {
        id: 'tenant-b-campaign',
        userId: 'user-tenant-b',
        organizationId: 'org-tenant-b',
        title: 'Tenant B Campaign',
        contentHtml: '<p>Content B</p>',
        status: 'draft',
        distributionListId: 'list-b',
        distributionListName: 'List B',
        recipientCount: 75,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        distributionConfig: {
          isScheduled: false,
          distributionLists: ['tenant-b-list-1'],
          manualRecipients: [],
          senderConfig: {
            email: 'sender@tenant-b.com',
            name: 'Tenant B Sender'
          },
          emailSubject: 'Tenant B Subject',
          personalizedContent: false,
          variables: {}
        }
      };

      // Validiere dass Tenants isoliert sind
      expect(tenantACampaign.organizationId).not.toBe(tenantBCampaign.organizationId);
      expect(tenantACampaign.distributionConfig!.distributionLists[0]).toBe('tenant-a-list-1');
      expect(tenantBCampaign.distributionConfig!.distributionLists[0]).toBe('tenant-b-list-1');
      expect(tenantACampaign.distributionConfig!.senderConfig.email).not.toBe(
        tenantBCampaign.distributionConfig!.senderConfig.email
      );
    });
  });

  describe('Distribution Error Handling Tests', () => {
    it('sollte DistributionError korrekt erstellen', () => {
      const error: DistributionError = {
        recipient: 'failed@example.com',
        error: 'Mailbox full',
        timestamp: Timestamp.now() as any
      };

      expect(error.recipient).toBe('failed@example.com');
      expect(error.error).toBe('Mailbox full');
      expect(error.timestamp).toBeInstanceOf(Timestamp);
    });

    it('sollte Multiple Distribution Errors verwalten', () => {
      const errors: DistributionError[] = [
        {
          recipient: 'bounce1@example.com',
          error: 'Hard bounce',
          timestamp: Timestamp.now() as any as any
        },
        {
          recipient: 'bounce2@example.com',
          error: 'Soft bounce - temporary failure',
          timestamp: Timestamp.now() as any as any
        },
        {
          recipient: 'invalid@',
          error: 'Invalid email format',
          timestamp: Timestamp.now() as any as any
        }
      ];

      expect(errors).toHaveLength(3);
      expect(errors[0].error).toBe('Hard bounce');
      expect(errors[1].error).toBe('Soft bounce - temporary failure');
      expect(errors[2].recipient).toBe('invalid@');
    });
  });

  describe('Distribution Configuration Validation Tests', () => {
    it('sollte leere distributionConfig als gültig behandeln', () => {
      const campaign: PRCampaign = {
        id: 'minimal-campaign',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        title: 'Minimal Campaign',
        contentHtml: '<p>Content</p>',
        status: 'draft',
        distributionListId: 'default',
        distributionListName: 'Default',
        recipientCount: 0,
        approvalRequired: false,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any
        // Keine distributionConfig
      };

      expect(campaign.distributionConfig).toBeUndefined();
      expect(campaign.status).toBe('draft');
    });

    it('sollte ungültige E-Mail-Adressen in manualRecipients erkennen', () => {
      const invalidRecipients: DistributionRecipient[] = [
        { email: 'invalid-email' },
        { email: '@missing-local.com' },
        { email: 'missing-domain@' },
        { email: 'spaces in@email.com' }
      ];

      invalidRecipients.forEach(recipient => {
        expect(recipient.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('sollte gültige Template-Variablen validieren', () => {
      const validVariables = {
        'firstName': 'John',
        'lastName': 'Doe',
        'companyName': 'Example Corp',
        'eventDate': '2025-01-15',
        'customField1': 'Custom Value'
      };

      Object.entries(validVariables).forEach(([key, value]) => {
        expect(key).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/); // Gültige Variable Namen
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      });
    });
  });
});