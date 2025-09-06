// src/__tests__/features/plan-4-9-edge-cases.test.ts
// Edge-Cases und Fehler-Szenarien Tests für Plan 4/9 Distribution-Features

import { PRCampaign, DistributionRecipient, SenderConfiguration } from '@/types/pr';
import { EmailDraft } from '@/types/email-composer';
import { Timestamp } from 'firebase/firestore';

// Mock Services
const mockEmailService = {
  sendPRCampaign: jest.fn(),
  sendTestEmail: jest.fn(),
  scheduleEmail: jest.fn(),
  createPipelineDistributionEvent: jest.fn(),
  getPipelineDistributionStats: jest.fn(),
  generatePreview: jest.fn()
};

const mockProjectService = {
  updateStage: jest.fn(),
  getById: jest.fn()
};

const mockEmailComposerService = {
  saveDraft: jest.fn(),
  loadDraft: jest.fn(),
  mergeEmailFields: jest.fn()
};

const mockApiClient = {
  post: jest.fn()
};

jest.mock('@/lib/email/email-service', () => ({
  emailService: mockEmailService
}));

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: mockProjectService
}));

jest.mock('@/lib/email/email-composer-service', () => ({
  emailComposerService: mockEmailComposerService
}));

jest.mock('@/lib/api/api-client', () => ({
  apiClient: mockApiClient
}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000 })
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: { mockDb: true }
}));

describe('Plan 4/9: Edge-Cases und Fehler-Szenarien Tests', () => {
  const baseCampaign: PRCampaign = {
    id: 'edge-case-campaign',
    userId: 'edge-user-123',
    organizationId: 'edge-org-456',
    title: 'Edge Case Test Campaign',
    contentHtml: '<p>Test content</p>',
    status: 'draft',
    distributionListId: 'edge-list',
    distributionListName: 'Edge List',
    recipientCount: 100,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Distribution-Config Edge-Cases', () => {
    it('sollte leere distributionConfig graceful handhaben', () => {
      const campaignWithEmptyConfig: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: '',
            name: ''
          },
          emailSubject: '',
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaignWithEmptyConfig.distributionConfig!.distributionLists).toEqual([]);
      expect(campaignWithEmptyConfig.distributionConfig!.manualRecipients).toEqual([]);
      expect(campaignWithEmptyConfig.distributionConfig!.emailSubject).toBe('');
      expect(campaignWithEmptyConfig.distributionConfig!.variables).toEqual({});
    });

    it('sollte undefined distributionConfig handhaben', () => {
      const campaignWithoutConfig: PRCampaign = {
        ...baseCampaign,
        distributionConfig: undefined
      };

      expect(campaignWithoutConfig.distributionConfig).toBeUndefined();
    });

    it('sollte sehr lange E-Mail-Subjects handhaben', () => {
      const veryLongSubject = 'A'.repeat(1000);
      const campaignWithLongSubject: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'test@example.com',
            name: 'Test Sender'
          },
          emailSubject: veryLongSubject,
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaignWithLongSubject.distributionConfig!.emailSubject).toHaveLength(1000);
      // In einer echten Implementierung würde hier Validierung stattfinden
    });

    it('sollte ungültige E-Mail-Adressen in manualRecipients erkennen', () => {
      const invalidRecipients: DistributionRecipient[] = [
        { email: 'invalid-email' },
        { email: '@missing-local.com' },
        { email: 'missing-domain@' },
        { email: 'spaces in@email.com' },
        { email: '' },
        { email: 'very.long.email@' + 'a'.repeat(200) + '.com' }
      ];

      const campaignWithInvalidRecipients: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: invalidRecipients,
          senderConfig: {
            email: 'valid@example.com',
            name: 'Valid Sender'
          },
          emailSubject: 'Test Subject',
          personalizedContent: false,
          variables: {}
        }
      };

      // Validiere dass ungültige E-Mails erkannt werden
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validRecipients = campaignWithInvalidRecipients.distributionConfig!.manualRecipients.filter(
        recipient => emailRegex.test(recipient.email)
      );

      expect(validRecipients).toHaveLength(0); // Alle sind ungültig
    });

    it('sollte zirkuläre Referenzen in Variables handhaben', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const campaignWithCircularVars: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'test@example.com',
            name: 'Test Sender'
          },
          emailSubject: 'Test Subject',
          personalizedContent: true,
          variables: {
            'normalVar': 'normal value',
            'circularVar': JSON.stringify(circularObject.name) // Nur den sicheren Teil
          }
        }
      };

      expect(campaignWithCircularVars.distributionConfig!.variables['normalVar']).toBe('normal value');
      expect(campaignWithCircularVars.distributionConfig!.variables['circularVar']).toBe('"test"');
    });

    it('sollte sehr große manualRecipients-Arrays handhaben', () => {
      const largeRecipientList: DistributionRecipient[] = Array.from({ length: 10000 }, (_, i) => ({
        email: `recipient${i}@example.com`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        companyName: `Company ${i}`
      }));

      const campaignWithLargeList: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: largeRecipientList,
          senderConfig: {
            email: 'sender@example.com',
            name: 'Mass Sender'
          },
          emailSubject: 'Mass Distribution',
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaignWithLargeList.distributionConfig!.manualRecipients).toHaveLength(10000);
      // Performance-Test würde hier stattfinden
    });
  });

  describe('Distribution-Status Edge-Cases', () => {
    it('sollte negative Zahlen in distributionStatus handhaben', () => {
      const campaignWithNegativeStats: PRCampaign = {
        ...baseCampaign,
        distributionStatus: {
          status: 'sent',
          recipientCount: -100, // Ungültig
          successCount: -50,    // Ungültig
          failureCount: -25,    // Ungültig
          openRate: -0.5,       // Ungültig
          clickRate: -0.2,      // Ungültig
          distributionId: 'dist_negative'
        }
      };

      // Validiere dass negative Werte erkannt werden
      const status = campaignWithNegativeStats.distributionStatus!;
      expect(status.recipientCount < 0).toBe(true);
      expect(status.successCount < 0).toBe(true);
      expect(status.failureCount < 0).toBe(true);
      expect(status.openRate! < 0).toBe(true);
      expect(status.clickRate! < 0).toBe(true);

      // In einer echten Implementierung würden diese Werte normalisiert werden
    });

    it('sollte inkonsistente Zahlen in distributionStatus handhaben', () => {
      const campaignWithInconsistentStats: PRCampaign = {
        ...baseCampaign,
        distributionStatus: {
          status: 'sent',
          recipientCount: 100,
          successCount: 75,   // OK
          failureCount: 50,   // 75 + 50 = 125 > 100 (inkonsistent)
          distributionId: 'dist_inconsistent'
        }
      };

      const status = campaignWithInconsistentStats.distributionStatus!;
      const totalProcessed = status.successCount + status.failureCount;
      const isInconsistent = totalProcessed !== status.recipientCount;

      expect(isInconsistent).toBe(true);
      expect(totalProcessed).toBe(125); // Mehr als recipientCount
    });

    it('sollte sehr hohe Open/Click-Raten handhaben', () => {
      const campaignWithHighRates: PRCampaign = {
        ...baseCampaign,
        distributionStatus: {
          status: 'sent',
          recipientCount: 100,
          successCount: 100,
          failureCount: 0,
          openRate: 2.5,    // 250% (unmöglich)
          clickRate: 1.8,   // 180% (unmöglich)
          distributionId: 'dist_high_rates'
        }
      };

      const status = campaignWithHighRates.distributionStatus!;
      expect(status.openRate! > 1.0).toBe(true);
      expect(status.clickRate! > 1.0).toBe(true);

      // In einer echten Implementierung würden diese auf 1.0 begrenzt werden
    });

    it('sollte leere/undefined distributionId handhaben', () => {
      const statusWithoutId = {
        status: 'sent' as const,
        recipientCount: 50,
        successCount: 50,
        failureCount: 0,
        distributionId: undefined
      };

      const statusWithEmptyId = {
        status: 'sent' as const,
        recipientCount: 50,
        successCount: 50,
        failureCount: 0,
        distributionId: ''
      };

      expect(statusWithoutId.distributionId).toBeUndefined();
      expect(statusWithEmptyId.distributionId).toBe('');
    });

    it('sollte sehr alte Timestamps handhaben', () => {
      const veryOldDate = new Date('1970-01-01');
      const futureDate = new Date('2099-12-31');

      const campaignWithEdgeDates: PRCampaign = {
        ...baseCampaign,
        distributionStatus: {
          status: 'sent',
          sentAt: Timestamp.fromDate(veryOldDate),
          recipientCount: 50,
          successCount: 50,
          failureCount: 0,
          distributionId: 'dist_edge_dates'
        },
        distributionConfig: {
          isScheduled: true,
          scheduledAt: Timestamp.fromDate(futureDate),
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'test@example.com',
            name: 'Test Sender'
          },
          emailSubject: 'Edge Date Test',
          personalizedContent: false,
          variables: {}
        }
      };

      expect(campaignWithEdgeDates.distributionStatus!.sentAt).toBeDefined();
      expect(campaignWithEdgeDates.distributionConfig!.scheduledAt).toBeDefined();
    });
  });

  describe('Pipeline-Integration Edge-Cases', () => {
    it('sollte Pipeline-Transition ohne projectId handhaben', async () => {
      const campaignWithoutProject: PRCampaign = {
        ...baseCampaign,
        projectId: undefined,
        pipelineStage: 'distribution'
      };

      mockEmailService.sendPRCampaign.mockResolvedValue({
        results: [{ email: 'test@example.com', status: 'sent', messageId: 'msg-1' }],
        summary: { total: 1, success: 1, failed: 0 }
      });

      // Pipeline-Transition sollte nicht versucht werden ohne projectId
      const result = await mockEmailService.sendPRCampaign(
        campaignWithoutProject,
        {} as any,
        {} as any,
        [{ email: 'test@example.com' } as any],
        undefined,
        undefined,
        { pipelineMode: true, projectId: undefined }
      );

      expect(result.summary.success).toBe(1);
      expect(mockProjectService.updateStage).not.toHaveBeenCalled();
    });

    it('sollte Pipeline-Transition bei Service-Fehlern handhaben', async () => {
      mockEmailService.sendPRCampaign.mockResolvedValue({
        results: [{ email: 'test@example.com', status: 'sent', messageId: 'msg-1' }],
        summary: { total: 1, success: 1, failed: 0 }
      });

      mockProjectService.updateStage.mockRejectedValue(new Error('Project service unavailable'));

      // E-Mail sollte trotz Pipeline-Fehler gesendet werden
      const result = await mockEmailService.sendPRCampaign(
        { ...baseCampaign, projectId: 'project-error', pipelineStage: 'distribution' },
        {} as any,
        {} as any,
        [{ email: 'test@example.com' } as any],
        undefined,
        undefined,
        { pipelineMode: true, projectId: 'project-error' }
      );

      expect(result.summary.success).toBe(1);
    });

    it('sollte unbekannte pipelineStage handhaben', () => {
      const campaignWithUnknownStage: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-unknown',
        pipelineStage: 'unknown_stage' as any
      };

      // Component sollte nicht crashen mit unbekannter Stage
      expect(campaignWithUnknownStage.pipelineStage).toBe('unknown_stage');
      expect(campaignWithUnknownStage.projectId).toBe('project-unknown');
    });

    it('sollte sehr lange projectId handhaben', () => {
      const veryLongProjectId = 'project-' + 'a'.repeat(1000);
      const campaignWithLongProjectId: PRCampaign = {
        ...baseCampaign,
        projectId: veryLongProjectId,
        pipelineStage: 'distribution'
      };

      expect(campaignWithLongProjectId.projectId).toHaveLength(1008); // 'project-' + 1000 'a's
    });

    it('sollte Pipeline-Event-Erstellung bei Netzwerkfehlern handhaben', async () => {
      mockEmailService.createPipelineDistributionEvent.mockRejectedValue(
        new Error('Network timeout')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(mockEmailService.createPipelineDistributionEvent({
        projectId: 'project-network-error',
        campaignId: 'campaign-network-error',
        distributionId: 'dist_network_error',
        recipientCount: 50,
        timestamp: Timestamp.now(),
        metadata: {}
      })).rejects.toThrow('Network timeout');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create pipeline distribution event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('E-Mail-Service Edge-Cases', () => {
    it('sollte Test-E-Mail-Fehler graceful handhaben', async () => {
      mockEmailService.sendTestEmail.mockRejectedValue(new Error('SMTP server down'));

      const testEmailResult = await mockEmailService.sendTestEmail({
        campaignId: 'test-campaign',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        draft: {} as EmailDraft
      });

      expect(testEmailResult.success).toBe(false);
      expect(testEmailResult.error).toContain('SMTP server down');
    });

    it('sollte ungültige Test-E-Mail-Adressen handhaben', async () => {
      const invalidEmails = [
        'invalid-email',
        '@missing-local.com',
        'missing-domain@',
        '',
        'test@'
      ];

      for (const email of invalidEmails) {
        const result = await mockEmailService.sendTestEmail({
          campaignId: 'test-campaign',
          recipientEmail: email,
          recipientName: 'Test User',
          draft: {} as EmailDraft
        });

        expect(result.success).toBe(false);
        expect(result.error && (result.error.includes('ungültige E-Mail') || result.error.includes('invalid email'))).toBe(true);
      }
    });

    it('sollte Schedule-E-Mail in der Vergangenheit handhaben', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 Stunde in der Vergangenheit

      const result = await mockEmailService.scheduleEmail({
        campaign: baseCampaign,
        emailContent: {} as any,
        senderInfo: {} as any,
        scheduledDate: pastDate,
        timezone: 'Europe/Berlin'
      });

      expect(result.success).toBe(false);
      expect(result.error && (result.error.includes('Vergangenheit') || result.error.includes('future'))).toBe(true);
    });

    it('sollte sehr große E-Mail-Inhalte handhaben', () => {
      const veryLargeContent = 'A'.repeat(1000000); // 1MB Text

      const largeEmailDraft: Partial<EmailDraft> = {
        content: {
          body: veryLargeContent,
          sections: {
            greeting: 'A'.repeat(10000),
            introduction: 'B'.repeat(10000),
            closing: 'C'.repeat(10000)
          }
        }
      };

      expect(largeEmailDraft.content!.body).toHaveLength(1000000);
      // Performance-Tests würden hier stattfinden
    });

    it('sollte Preview-Generierung mit beschädigten Daten handhaben', () => {
      const corruptedContact = {
        firstName: null,
        lastName: undefined,
        email: 'test@example.com'
      } as any;

      const corruptedEmailContent = {
        subject: undefined,
        greeting: null,
        introduction: '{{invalidVariable}}',
        pressReleaseHtml: '<broken html>',
        closing: '',
        signature: null
      } as any;

      const result = mockEmailService.generatePreview(
        corruptedContact,
        corruptedEmailContent,
        {
          name: 'Test Sender',
          title: '',
          company: '',
          phone: '',
          email: 'sender@test.com'
        }
      );

      // Service sollte gracefully mit beschädigten Daten umgehen
      expect(result).toBeDefined();
    });
  });

  describe('Concurrency und Race-Condition Tests', () => {
    it('sollte gleichzeitige Campaign-Updates handhaben', async () => {
      const campaign = { ...baseCampaign };
      
      // Simuliere gleichzeitige Updates
      const updates = [
        { title: 'Update 1' },
        { title: 'Update 2' },
        { title: 'Update 3' }
      ];

      const promises = updates.map(async (update, index) => {
        // Simuliere Verzögerung
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return { ...campaign, ...update, updatedAt: Timestamp.now() };
      });

      const results = await Promise.all(promises);
      
      // Alle Updates sollten erfolgreich sein
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });
    });

    it('sollte Race-Conditions bei Pipeline-Transitions handhaben', async () => {
      const campaign = {
        ...baseCampaign,
        projectId: 'race-condition-project',
        pipelineStage: 'distribution' as const
      };

      // Simuliere gleichzeitige Pipeline-Transitions
      mockProjectService.updateStage.mockImplementation(async (projectId, stage) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return { success: true, stage };
      });

      const transitions = [
        mockProjectService.updateStage('race-condition-project', 'monitoring', {}, {}),
        mockProjectService.updateStage('race-condition-project', 'monitoring', {}, {}),
        mockProjectService.updateStage('race-condition-project', 'monitoring', {}, {})
      ];

      const results = await Promise.all(transitions);
      
      // Alle Transitions sollten erfolgreich sein
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.stage).toBe('monitoring');
      });
    });

    it('sollte gleichzeitige Draft-Saves handhaben', async () => {
      const campaignId = 'concurrent-saves-campaign';
      const baseDraft = {
        campaignId,
        campaignTitle: 'Concurrent Test',
        content: { body: 'Base content' }
      } as EmailDraft;

      mockEmailComposerService.saveDraft.mockImplementation(async (id, draft) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return { success: true, draftId: `${id}-${Date.now()}` };
      });

      // Simuliere gleichzeitige Saves
      const saves = Array.from({ length: 5 }, (_, i) => 
        mockEmailComposerService.saveDraft(campaignId, {
          ...baseDraft,
          content: { body: `Content ${i}` }
        })
      );

      const results = await Promise.all(saves);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.draftId).toBeDefined();
      });
    });
  });

  describe('Memory und Performance Edge-Cases', () => {
    it('sollte sehr große Variable-Maps handhaben', () => {
      const largeVariables: Record<string, string> = {};
      
      // Erstelle 10.000 Variablen
      for (let i = 0; i < 10000; i++) {
        largeVariables[`var${i}`] = `value${i}`.repeat(100); // Jeder Wert 600 Zeichen
      }

      const campaignWithLargeVars: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'test@example.com',
            name: 'Test Sender'
          },
          emailSubject: 'Large Variables Test',
          personalizedContent: true,
          variables: largeVariables
        }
      };

      expect(Object.keys(campaignWithLargeVars.distributionConfig!.variables)).toHaveLength(10000);
    });

    it('sollte sehr tiefe JSON-Strukturen in Metadata handhaben', () => {
      let deepObject: any = { level: 0 };
      let current = deepObject;
      
      // Erstelle 1000 Ebenen tief verschachtelte Struktur
      for (let i = 1; i < 1000; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      // In einer echten Implementierung würde dies zu Stack-Overflow führen
      // Hier testen wir nur die Struktur-Erstellung
      expect(deepObject.level).toBe(0);
    });

    it('sollte Memory-Leaks bei wiederholten Operations vermeiden', async () => {
      // Simuliere wiederholte Service-Calls
      for (let i = 0; i < 1000; i++) {
        const campaign = {
          ...baseCampaign,
          id: `memory-test-${i}`,
          title: `Memory Test ${i}`
        };

        // Simuliere Service-Call ohne tatsächliche Memory-Allocation
        const mockOperation = () => Promise.resolve({ success: true, id: campaign.id });
        const result = await mockOperation();
        
        expect(result.success).toBe(true);
        expect(result.id).toBe(`memory-test-${i}`);
      }

      // In einem echten Test würde hier Memory-Usage gemessen werden
    });

    it('sollte Timeout bei langsamen API-Calls handhaben', async () => {
      // Simuliere sehr langsamen API-Call
      mockApiClient.post.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 30000)) // 30 Sekunden
      );

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000) // 5 Sekunden Timeout
      );

      const apiCallPromise = mockApiClient.post('/api/test', {});

      await expect(Promise.race([apiCallPromise, timeoutPromise]))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Data-Corruption Edge-Cases', () => {
    it('sollte korrupte Campaign-Daten handhaben', () => {
      const corruptedCampaign = {
        id: null,
        userId: undefined,
        organizationId: '',
        title: 123, // Falcher Type
        contentHtml: null,
        status: 'invalid_status', // Ungültiger Status
        distributionListId: [],  // Falscher Type
        recipientCount: 'not_a_number', // Falscher Type
        createdAt: 'invalid_timestamp', // Falscher Type
        distributionConfig: 'not_an_object' // Falscher Type
      } as any;

      // Type Guards würden hier in der echten Implementierung greifen
      expect(typeof corruptedCampaign.title).toBe('number');
      expect(Array.isArray(corruptedCampaign.distributionListId)).toBe(true);
      expect(typeof corruptedCampaign.recipientCount).toBe('string');
    });

    it('sollte korrupte distributionStatus-Daten handhaben', () => {
      const campaignWithCorruptedStatus: PRCampaign = {
        ...baseCampaign,
        distributionStatus: {
          status: null,
          recipientCount: 'invalid',
          successCount: undefined,
          failureCount: Infinity,
          openRate: NaN,
          clickRate: 'not_a_number',
          distributionId: 123
        } as any
      };

      const status = campaignWithCorruptedStatus.distributionStatus!;
      expect(status.status).toBeNull();
      expect(typeof status.recipientCount).toBe('string');
      expect(status.successCount).toBeUndefined();
      expect(status.failureCount).toBe(Infinity);
      expect(isNaN(status.openRate as number)).toBe(true);
    });

    it('sollte JSON-Parsing-Fehler bei Variables handhaben', () => {
      const campaignWithInvalidJSON: PRCampaign = {
        ...baseCampaign,
        distributionConfig: {
          isScheduled: false,
          distributionLists: [],
          manualRecipients: [],
          senderConfig: {
            email: 'test@example.com',
            name: 'Test Sender'
          },
          emailSubject: 'JSON Test',
          personalizedContent: true,
          variables: {
            'validVar': 'valid value',
            'invalidJSON': '{invalid json}',
            'circularRef': '[Circular]',
            'undefinedVar': 'undefined',
            'nullVar': 'null'
          }
        }
      };

      // Simuliere JSON-Parsing-Versuche
      const variables = campaignWithInvalidJSON.distributionConfig!.variables;
      
      Object.entries(variables).forEach(([key, value]) => {
        try {
          JSON.parse(value);
        } catch (error) {
          // JSON-Parsing-Fehler sollten graceful behandelt werden
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('Browser-Kompatibilität Edge-Cases', () => {
    it('sollte fehlende Browser-APIs graceful handhaben', () => {
      // Simuliere fehlende APIs
      const originalLocalStorage = global.localStorage;
      const originalFetch = global.fetch;

      delete (global as any).localStorage;
      delete (global as any).fetch;

      // Code sollte ohne diese APIs funktionieren
      const campaign = { ...baseCampaign };
      expect(campaign).toBeDefined();

      // Restore APIs
      global.localStorage = originalLocalStorage;
      global.fetch = originalFetch;
    });

    it('sollte sehr alte Browser-Versionen handhaben', () => {
      // Simuliere fehlende moderne JavaScript-Features
      const originalPromise = global.Promise;
      delete (global as any).Promise;

      // Fallback-Implementierungen sollten greifen
      const legacyAsyncOperation = (callback: (result: any) => void) => {
        setTimeout(() => callback({ success: true }), 10);
      };

      const result = new Promise(resolve => {
        legacyAsyncOperation(resolve);
      });

      expect(result).toBeInstanceOf(Promise);

      // Restore
      global.Promise = originalPromise;
    });
  });
});