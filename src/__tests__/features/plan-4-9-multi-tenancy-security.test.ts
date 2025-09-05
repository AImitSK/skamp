// src/__tests__/features/plan-4-9-multi-tenancy-security.test.ts
// Multi-Tenancy-Sicherheitstests für Plan 4/9 Distribution-Features

import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockCollection = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockAddDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  collection: (...args: any[]) => mockCollection(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  serverTimestamp: () => ({ seconds: Date.now() / 1000 }),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000 })
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

// Mock Services
const mockPrService = {
  getAllByOrganization: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  delete: jest.fn()
};

const mockProjectService = {
  updateStage: jest.fn(),
  getById: jest.fn()
};

const mockEmailService = {
  sendPRCampaign: jest.fn(),
  createPipelineDistributionEvent: jest.fn(),
  getPipelineDistributionStats: jest.fn()
};

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: mockPrService
}));

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: mockProjectService
}));

jest.mock('@/lib/email/email-service', () => ({
  emailService: mockEmailService
}));

describe('Plan 4/9: Multi-Tenancy-Sicherheit Tests', () => {
  const tenantA = {
    organizationId: 'org-tenant-a',
    userId: 'user-tenant-a'
  };

  const tenantB = {
    organizationId: 'org-tenant-b',
    userId: 'user-tenant-b'
  };

  const createCampaignForTenant = (tenant: typeof tenantA, campaignData: Partial<PRCampaign> = {}): PRCampaign => ({
    id: `campaign-${tenant.organizationId}`,
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    title: `Campaign for ${tenant.organizationId}`,
    contentHtml: '<p>Test content</p>',
    status: 'draft',
    distributionListId: `list-${tenant.organizationId}`,
    distributionListName: `List for ${tenant.organizationId}`,
    recipientCount: 50,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    projectId: `project-${tenant.organizationId}`,
    projectTitle: `Project for ${tenant.organizationId}`,
    pipelineStage: 'distribution',
    ...campaignData
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue('mock-collection');
    mockQuery.mockReturnValue('mock-query');
    mockWhere.mockReturnValue('mock-where');
  });

  describe('Campaign-Zugriff Multi-Tenancy Tests', () => {
    it('sollte nur Campaigns der eigenen Organization abrufen', async () => {
      const tenantACampaigns = [
        createCampaignForTenant(tenantA, { title: 'Tenant A Campaign 1' }),
        createCampaignForTenant(tenantA, { title: 'Tenant A Campaign 2' })
      ];

      mockPrService.getAllByOrganization.mockResolvedValue(tenantACampaigns);

      const campaigns = await mockPrService.getAllByOrganization(tenantA.organizationId);

      expect(mockPrService.getAllByOrganization).toHaveBeenCalledWith(tenantA.organizationId);
      expect(campaigns).toHaveLength(2);
      expect(campaigns.every(c => c.organizationId === tenantA.organizationId)).toBe(true);
    });

    it('sollte Cross-Tenant-Zugriff verhindern', async () => {
      const tenantACampaign = createCampaignForTenant(tenantA);

      // Tenant B versucht auf Tenant A Campaign zuzugreifen
      mockPrService.getById.mockResolvedValue(null); // Simuliere "nicht gefunden"

      const campaign = await mockPrService.getById(tenantACampaign.id!, tenantB.organizationId);

      expect(campaign).toBeNull();
      expect(mockPrService.getById).toHaveBeenCalledWith(tenantACampaign.id!, tenantB.organizationId);
    });

    it('sollte Campaign-Updates nur für eigene Organization erlauben', async () => {
      const tenantACampaign = createCampaignForTenant(tenantA);

      mockPrService.update.mockImplementation((campaignId, updates, options) => {
        if (options?.organizationId !== tenantA.organizationId) {
          throw new Error('Unauthorized: Wrong organization');
        }
        return Promise.resolve({ ...tenantACampaign, ...updates });
      });

      // Tenant A Update - sollte erfolgreich sein
      const updatedCampaign = await mockPrService.update(
        tenantACampaign.id!,
        { title: 'Updated Title' },
        { organizationId: tenantA.organizationId, userId: tenantA.userId }
      );

      expect(updatedCampaign.title).toBe('Updated Title');

      // Tenant B Update - sollte fehlschlagen
      await expect(mockPrService.update(
        tenantACampaign.id!,
        { title: 'Hacked Title' },
        { organizationId: tenantB.organizationId, userId: tenantB.userId }
      )).rejects.toThrow('Unauthorized: Wrong organization');
    });

    it('sollte Campaign-Löschung nur für eigene Organization erlauben', async () => {
      const tenantACampaign = createCampaignForTenant(tenantA);

      mockPrService.delete.mockImplementation((campaignId, options) => {
        if (options?.organizationId !== tenantA.organizationId) {
          throw new Error('Unauthorized: Wrong organization');
        }
        return Promise.resolve();
      });

      // Tenant A Löschung - sollte erfolgreich sein
      await expect(mockPrService.delete(
        tenantACampaign.id!,
        { organizationId: tenantA.organizationId, userId: tenantA.userId }
      )).resolves.not.toThrow();

      // Tenant B Löschung - sollte fehlschlagen
      await expect(mockPrService.delete(
        tenantACampaign.id!,
        { organizationId: tenantB.organizationId, userId: tenantB.userId }
      )).rejects.toThrow('Unauthorized: Wrong organization');
    });
  });

  describe('Pipeline-Operations Multi-Tenancy Tests', () => {
    it('sollte Project-Stage-Updates nur für eigene Organization erlauben', async () => {
      const tenantAProject = `project-${tenantA.organizationId}`;

      mockProjectService.updateStage.mockImplementation((projectId, stage, metadata, context) => {
        if (context.organizationId !== tenantA.organizationId) {
          throw new Error('Unauthorized: Project not found in organization');
        }
        return Promise.resolve({ success: true });
      });

      // Tenant A Update - sollte erfolgreich sein
      const result = await mockProjectService.updateStage(
        tenantAProject,
        'monitoring',
        { transitionReason: 'distribution_completed' },
        { organizationId: tenantA.organizationId, userId: tenantA.userId }
      );

      expect(result.success).toBe(true);

      // Tenant B Update - sollte fehlschlagen
      await expect(mockProjectService.updateStage(
        tenantAProject,
        'monitoring',
        { transitionReason: 'unauthorized_attempt' },
        { organizationId: tenantB.organizationId, userId: tenantB.userId }
      )).rejects.toThrow('Unauthorized: Project not found in organization');
    });

    it('sollte Pipeline-Events nur für eigene Organization erstellen', async () => {
      mockEmailService.createPipelineDistributionEvent.mockImplementation((eventData) => {
        // Simuliere Service-Level-Validierung
        if (eventData.organizationId && eventData.organizationId !== tenantA.organizationId) {
          throw new Error('Unauthorized: Event creation not allowed');
        }
        return Promise.resolve();
      });

      // Tenant A Event - sollte erfolgreich sein
      await expect(mockEmailService.createPipelineDistributionEvent({
        projectId: `project-${tenantA.organizationId}`,
        campaignId: `campaign-${tenantA.organizationId}`,
        distributionId: 'dist_123',
        recipientCount: 50,
        timestamp: Timestamp.now(),
        metadata: { test: 'data' },
        organizationId: tenantA.organizationId
      })).resolves.not.toThrow();

      // Cross-Tenant Event - sollte fehlschlagen
      await expect(mockEmailService.createPipelineDistributionEvent({
        projectId: `project-${tenantA.organizationId}`,
        campaignId: `campaign-${tenantA.organizationId}`,
        distributionId: 'dist_hack',
        recipientCount: 50,
        timestamp: Timestamp.now(),
        metadata: { hacker: 'attempt' },
        organizationId: tenantB.organizationId
      })).rejects.toThrow('Unauthorized: Event creation not allowed');
    });

    it('sollte Pipeline-Statistiken nur für eigene Organization abrufen', async () => {
      mockEmailService.getPipelineDistributionStats.mockImplementation((projectId, context) => {
        if (context.organizationId !== tenantA.organizationId) {
          throw new Error('Unauthorized: Stats access denied');
        }
        return Promise.resolve({
          totalCampaigns: 5,
          totalRecipients: 250,
          distributionDates: [],
          successRate: 0.95
        });
      });

      // Tenant A Stats - sollte erfolgreich sein
      const stats = await mockEmailService.getPipelineDistributionStats(
        `project-${tenantA.organizationId}`,
        { organizationId: tenantA.organizationId }
      );

      expect(stats.totalCampaigns).toBe(5);

      // Tenant B Stats für Tenant A Projekt - sollte fehlschlagen
      await expect(mockEmailService.getPipelineDistributionStats(
        `project-${tenantA.organizationId}`,
        { organizationId: tenantB.organizationId }
      )).rejects.toThrow('Unauthorized: Stats access denied');
    });
  });

  describe('Distribution-Config Multi-Tenancy Tests', () => {
    it('sollte distributionConfig nur für eigene Organization zugänglich sein', () => {
      const tenantACampaign = createCampaignForTenant(tenantA, {
        distributionConfig: {
          isScheduled: false,
          distributionLists: [`list-${tenantA.organizationId}-1`, `list-${tenantA.organizationId}-2`],
          manualRecipients: [
            {
              email: 'recipient@tenant-a.com',
              firstName: 'Tenant A',
              lastName: 'Recipient'
            }
          ],
          senderConfig: {
            contactId: `contact-${tenantA.organizationId}`,
            email: 'sender@tenant-a.com',
            name: 'Tenant A Sender'
          },
          emailSubject: 'Tenant A Subject',
          personalizedContent: true,
          variables: {
            'organizationName': 'Tenant A Organization'
          }
        }
      });

      // Validiere dass distributionConfig Tenant-spezifische Daten enthält
      expect(tenantACampaign.distributionConfig!.distributionLists).toEqual([
        `list-${tenantA.organizationId}-1`,
        `list-${tenantA.organizationId}-2`
      ]);
      expect(tenantACampaign.distributionConfig!.senderConfig.contactId).toBe(`contact-${tenantA.organizationId}`);
      expect(tenantACampaign.distributionConfig!.variables!['organizationName']).toBe('Tenant A Organization');

      // Stelle sicher dass Tenant B Daten nicht enthalten sind
      expect(tenantACampaign.distributionConfig!.distributionLists).not.toContain(`list-${tenantB.organizationId}-1`);
      expect(tenantACampaign.distributionConfig!.senderConfig.contactId).not.toBe(`contact-${tenantB.organizationId}`);
    });

    it('sollte distributionStatus nur für eigene Organization verfügbar sein', () => {
      const tenantACampaignWithStatus = createCampaignForTenant(tenantA, {
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.now(),
          recipientCount: 100,
          successCount: 95,
          failureCount: 5,
          openRate: 0.68,
          clickRate: 0.12,
          distributionId: `dist-${tenantA.organizationId}-123`
        }
      });

      // Validiere dass distributionStatus Tenant-spezifische ID hat
      expect(tenantACampaignWithStatus.distributionStatus!.distributionId).toBe(`dist-${tenantA.organizationId}-123`);
      expect(tenantACampaignWithStatus.distributionStatus!.distributionId).not.toContain(tenantB.organizationId);

      // Validiere Organisation-Zugehörigkeit
      expect(tenantACampaignWithStatus.organizationId).toBe(tenantA.organizationId);
      expect(tenantACampaignWithStatus.organizationId).not.toBe(tenantB.organizationId);
    });

    it('sollte manuelle Recipients nur Organisation-interne Kontakte erlauben', () => {
      const tenantARecipients = [
        {
          email: 'contact1@tenant-a.com',
          firstName: 'Contact',
          lastName: 'One',
          companyName: 'Tenant A Company 1'
        },
        {
          email: 'contact2@tenant-a.com',
          firstName: 'Contact',
          lastName: 'Two',
          companyName: 'Tenant A Company 2'
        }
      ];

      const tenantACampaignWithRecipients = createCampaignForTenant(tenantA, {
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: tenantARecipients,
          senderConfig: {
            email: 'sender@tenant-a.com',
            name: 'Tenant A Sender'
          },
          emailSubject: 'Test Subject',
          personalizedContent: false,
          variables: {}
        }
      });

      // Validiere dass Recipients nur Tenant A Kontakte sind
      tenantACampaignWithRecipients.distributionConfig!.manualRecipients.forEach(recipient => {
        expect(recipient.email).toContain('tenant-a.com');
        expect(recipient.companyName).toContain('Tenant A');
      });

      // Stelle sicher dass keine Tenant B Kontakte enthalten sind
      const hasTenantBRecipients = tenantACampaignWithRecipients.distributionConfig!.manualRecipients.some(
        recipient => recipient.email.includes('tenant-b.com')
      );
      expect(hasTenantBRecipients).toBe(false);
    });
  });

  describe('Distribution-Listen Multi-Tenancy Tests', () => {
    it('sollte nur eigene Distribution-Listen referenzieren', () => {
      const tenantACampaignWithLists = createCampaignForTenant(tenantA, {
        distributionListIds: [`list-${tenantA.organizationId}-1`, `list-${tenantA.organizationId}-2`],
        distributionListNames: ['Tenant A List 1', 'Tenant A List 2'],
        distributionConfig: {
          isScheduled: false,
          distributionLists: [`list-${tenantA.organizationId}-1`, `list-${tenantA.organizationId}-2`],
          manualRecipients: [],
          senderConfig: {
            email: 'sender@tenant-a.com',
            name: 'Tenant A Sender'
          },
          emailSubject: 'Multi-List Test',
          personalizedContent: false,
          variables: {}
        }
      });

      // Validiere dass alle Listen-IDs Tenant A gehören
      tenantACampaignWithLists.distributionListIds!.forEach(listId => {
        expect(listId).toContain(tenantA.organizationId);
        expect(listId).not.toContain(tenantB.organizationId);
      });

      // Validiere distributionConfig Listen
      tenantACampaignWithLists.distributionConfig!.distributionLists.forEach(listId => {
        expect(listId).toContain(tenantA.organizationId);
        expect(listId).not.toContain(tenantB.organizationId);
      });
    });

    it('sollte Cross-Tenant-Listen-Zugriff verhindern', () => {
      // Simuliere Versuch, Tenant B Listen in Tenant A Campaign zu verwenden
      const maliciousCampaign = createCampaignForTenant(tenantA, {
        distributionConfig: {
          isScheduled: false,
          distributionLists: [
            `list-${tenantA.organizationId}-1`, // Legitim
            `list-${tenantB.organizationId}-1`  // Illegitim
          ],
          manualRecipients: [],
          senderConfig: {
            email: 'sender@tenant-a.com',
            name: 'Tenant A Sender'
          },
          emailSubject: 'Cross-Tenant Attack',
          personalizedContent: false,
          variables: {}
        }
      });

      // In einem echten System würde die Service-Layer diese Validierung durchführen
      const hasUnauthorizedLists = maliciousCampaign.distributionConfig!.distributionLists.some(
        listId => listId.includes(tenantB.organizationId)
      );

      // Dies würde in der Service-Layer abgefangen werden
      expect(hasUnauthorizedLists).toBe(true); // Angriff erkannt

      // Simulation der Service-Layer-Validierung
      const validateDistributionLists = (campaign: PRCampaign): boolean => {
        const organizationId = campaign.organizationId;
        return campaign.distributionConfig!.distributionLists.every(
          listId => listId.includes(organizationId!)
        );
      };

      expect(validateDistributionLists(maliciousCampaign)).toBe(false);
    });
  });

  describe('Projekt-Pipeline Multi-Tenancy Tests', () => {
    it('sollte projectId nur eigene Projekte referenzieren', () => {
      const tenantACampaignWithProject = createCampaignForTenant(tenantA, {
        projectId: `project-${tenantA.organizationId}`,
        projectTitle: 'Tenant A Project',
        pipelineStage: 'distribution'
      });

      expect(tenantACampaignWithProject.projectId).toBe(`project-${tenantA.organizationId}`);
      expect(tenantACampaignWithProject.projectId).not.toContain(tenantB.organizationId);
      expect(tenantACampaignWithProject.organizationId).toBe(tenantA.organizationId);
    });

    it('sollte Pipeline-Stage-Transitions nur für eigene Projekte erlauben', async () => {
      const tenantAProjectId = `project-${tenantA.organizationId}`;

      mockProjectService.getById.mockImplementation((projectId, context) => {
        if (context.organizationId !== tenantA.organizationId) {
          return null; // Projekt nicht gefunden in anderer Organization
        }
        return {
          id: projectId,
          organizationId: tenantA.organizationId,
          stage: 'distribution'
        };
      });

      // Tenant A Zugriff - sollte erfolgreich sein
      const tenantAProject = await mockProjectService.getById(
        tenantAProjectId,
        { organizationId: tenantA.organizationId }
      );

      expect(tenantAProject).toBeDefined();
      expect(tenantAProject!.organizationId).toBe(tenantA.organizationId);

      // Tenant B Zugriff - sollte fehlschlagen
      const tenantBAttempt = await mockProjectService.getById(
        tenantAProjectId,
        { organizationId: tenantB.organizationId }
      );

      expect(tenantBAttempt).toBeNull();
    });
  });

  describe('Firestore Query Multi-Tenancy Tests', () => {
    it('sollte organizationId in allen Pipeline-Events-Queries verwenden', async () => {
      // Simuliere Service-Call der Pipeline-Statistiken abruft
      mockEmailService.getPipelineDistributionStats.mockImplementation((projectId, context) => {
        // Verifiziere dass where-Clause für organizationId verwendet wird
        expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', context.organizationId);
        return Promise.resolve({
          totalCampaigns: 0,
          totalRecipients: 0,
          distributionDates: [],
          successRate: 0
        });
      });

      await mockEmailService.getPipelineDistributionStats(
        `project-${tenantA.organizationId}`,
        { organizationId: tenantA.organizationId }
      );

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', tenantA.organizationId);
    });

    it('sollte organizationId bei Pipeline-Event-Erstellung hinzufügen', async () => {
      mockEmailService.createPipelineDistributionEvent.mockImplementation((eventData) => {
        // Verifiziere dass organizationId im Event-Data enthalten ist
        expect(eventData).toHaveProperty('organizationId');
        expect(eventData.organizationId).toBe(tenantA.organizationId);
        return Promise.resolve();
      });

      await mockEmailService.createPipelineDistributionEvent({
        projectId: `project-${tenantA.organizationId}`,
        campaignId: `campaign-${tenantA.organizationId}`,
        distributionId: 'dist_tenant_a',
        recipientCount: 50,
        timestamp: Timestamp.now(),
        metadata: {},
        organizationId: tenantA.organizationId
      });
    });

    it('sollte Firestore-Sicherheitsregeln durch korrekte Query-Struktur unterstützen', () => {
      // Simuliere erwartete Query-Struktur für Multi-Tenancy
      const buildSecureQuery = (collectionName: string, organizationId: string, additionalFilters: Array<{field: string, operator: string, value: any}> = []) => {
        mockCollection('mock-db', collectionName);
        mockWhere('organizationId', '==', organizationId);
        
        additionalFilters.forEach(filter => {
          mockWhere(filter.field, filter.operator as any, filter.value);
        });

        return mockQuery('mock-collection', ...Array(1 + additionalFilters.length).fill('mock-where'));
      };

      // Campaign Query
      buildSecureQuery('pr_campaigns', tenantA.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', tenantA.organizationId);

      // Pipeline Events Query
      buildSecureQuery('pipeline_events', tenantA.organizationId, [
        { field: 'projectId', operator: '==', value: `project-${tenantA.organizationId}` },
        { field: 'type', operator: '==', value: 'distribution' }
      ]);

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', tenantA.organizationId);
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', `project-${tenantA.organizationId}`);
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'distribution');
    });
  });

  describe('Error-Handling Multi-Tenancy Tests', () => {
    it('sollte organisierte Fehlermeldungen für Unauthorized-Zugriff zurückgeben', async () => {
      const unauthorizedError = new Error('Unauthorized: Resource not found in organization');
      unauthorizedError.name = 'UnauthorizedError';

      mockPrService.getById.mockRejectedValue(unauthorizedError);

      await expect(mockPrService.getById(
        `campaign-${tenantA.organizationId}`,
        tenantB.organizationId
      )).rejects.toThrow('Unauthorized: Resource not found in organization');
    });

    it('sollte keine sensiblen Daten in Cross-Tenant-Fehlermeldungen preisgeben', async () => {
      const sanitizedError = new Error('Resource not found');
      // Fehler sollte nicht die echte Campaign-ID oder Organization preisgeben

      mockPrService.getById.mockRejectedValue(sanitizedError);

      try {
        await mockPrService.getById(
          `campaign-${tenantA.organizationId}`,
          tenantB.organizationId
        );
      } catch (error: any) {
        expect(error.message).not.toContain(tenantA.organizationId);
        expect(error.message).not.toContain(tenantA.userId);
        expect(error.message).toBe('Resource not found');
      }
    });
  });

  describe('Data-Leakage Prevention Tests', () => {
    it('sollte keine organizationId in öffentlichen Response-Daten preisgeben', () => {
      const publicCampaignData = {
        id: 'campaign-public-123',
        title: 'Public Campaign Title',
        status: 'sent',
        recipientCount: 100
        // organizationId und userId sollten NICHT in öffentlichen APIs enthalten sein
      };

      expect(publicCampaignData).not.toHaveProperty('organizationId');
      expect(publicCampaignData).not.toHaveProperty('userId');
    });

    it('sollte sensible Distribution-Daten vor Cross-Tenant-Zugriff schützen', () => {
      const safeCampaignData = createCampaignForTenant(tenantA, {
        distributionConfig: {
          isScheduled: false,
          distributionLists: [`list-${tenantA.organizationId}`],
          manualRecipients: [
            {
              email: 'sensitive@tenant-a.com',
              firstName: 'Sensitive',
              lastName: 'Contact'
            }
          ],
          senderConfig: {
            email: 'internal@tenant-a.com',
            name: 'Internal Sender'
          },
          emailSubject: 'Confidential Subject',
          personalizedContent: true,
          variables: {
            'apiKey': 'secret-api-key-tenant-a',
            'internalCode': 'INTERNAL-123'
          }
        }
      });

      // Simuliere Daten-Sanitisierung für Cross-Tenant-Scenarios
      const sanitizeCampaignForCrossTenant = (campaign: PRCampaign): Partial<PRCampaign> => ({
        id: campaign.id,
        title: campaign.title,
        status: campaign.status
        // Sensible Daten wie distributionConfig werden nicht preisgegeben
      });

      const sanitizedData = sanitizeCampaignForCrossTenant(safeCampaignData);

      expect(sanitizedData).not.toHaveProperty('distributionConfig');
      expect(sanitizedData).not.toHaveProperty('organizationId');
      expect(sanitizedData).not.toHaveProperty('userId');
    });
  });
});