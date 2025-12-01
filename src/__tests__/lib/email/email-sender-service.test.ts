/**
 * Tests für EmailSenderService
 * Test-First Development (TDD)
 */

// Mock Firebase Admin SDK
jest.mock('@/lib/firebase/admin-init', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  }
}));

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn(() => Promise.resolve([{ statusCode: 202 }]))
  }
}));

// Mock email-composer-service
jest.mock('@/lib/email/email-composer-service', () => ({
  emailComposerService: {
    prepareVariables: jest.fn((contact, sender, campaign) => ({
      recipient: {
        salutation: contact.salutation || '',
        salutationFormal: contact.salutation === 'Herr' ? 'Sehr geehrter Herr' : 'Sehr geehrte Frau',
        title: contact.title || '',
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        companyName: contact.companyName || ''
      },
      sender: {
        name: sender.contactData?.firstName + ' ' + sender.contactData?.lastName || '',
        title: sender.contactData?.title || '',
        company: sender.contactData?.companyName || '',
        phone: sender.contactData?.phone || '',
        email: sender.contactData?.email || ''
      },
      campaign: {
        title: campaign.title,
        clientName: campaign.clientName
      }
    })),
    replaceVariables: jest.fn((text, vars) => {
      // Einfache Variablen-Ersetzung für Tests
      let result = text;
      if (vars?.recipient) {
        result = result.replace(/\{\{firstName\}\}/g, vars.recipient.firstName || '');
        result = result.replace(/\{\{lastName\}\}/g, vars.recipient.lastName || '');
        result = result.replace(/\{\{salutationFormal\}\}/g, vars.recipient.salutationFormal || '');
        result = result.replace(/\{\{title\}\}/g, vars.recipient.title || '');
      }
      if (vars?.sender) {
        result = result.replace(/\{\{senderName\}\}/g, vars.sender.name || '');
      }
      if (vars?.campaign) {
        result = result.replace(/\{\{campaignTitle\}\}/g, vars.campaign.title || '');
      }
      return result;
    })
  }
}));

// Mock pdf-template-service
jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getTemplateById: jest.fn(),
    getSystemTemplates: jest.fn(() => Promise.resolve([{ id: 'template-1' }])),
    renderTemplateWithStyle: jest.fn(() => Promise.resolve('<html>Template</html>'))
  }
}));

import { EmailSenderService } from '@/lib/email/email-sender-service';
import { adminDb } from '@/lib/firebase/admin-init';
import sgMail from '@sendgrid/mail';

// Mock fetch für PDF-API
global.fetch = jest.fn((url: string | URL | Request) => {
  const urlString = typeof url === 'string' ? url : url.toString();

  if (urlString.includes('/api/generate-pdf')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        pdfBase64: 'bW9jay1wZGYtYmFzZTY0LXN0cmluZw==',
        fileName: 'test-pressemitteilung.pdf'
      })
    } as Response);
  }

  return Promise.reject(new Error('Unhandled fetch: ' + urlString));
}) as jest.Mock;

// Typed mocks
const mockAdminDbCollection = adminDb.collection as jest.MockedFunction<typeof adminDb.collection>;
const mockSgMailSend = sgMail.send as jest.MockedFunction<typeof sgMail.send>;

// Mock-Daten-Store
const mockDataStore: Record<string, Record<string, any>> = {};

// Helper-Funktionen für Mocks
function mockDocumentData(collectionName: string, docId: string, data: any) {
  // Speichere im Store
  if (!mockDataStore[collectionName]) {
    mockDataStore[collectionName] = {};
  }
  mockDataStore[collectionName][docId] = data;

  // Mock-Implementation die alle Collections berücksichtigt
  mockAdminDbCollection.mockImplementation((name: string) => {
    const collectionDocs = mockDataStore[name] || {};

    return {
      doc: jest.fn((id: string) => {
        const docData = collectionDocs[id];
        return {
          get: jest.fn(() => Promise.resolve({
            exists: !!docData,
            data: () => docData,
            id: id
          }))
        };
      })
    } as any;
  });
}

function mockCollectionData(collectionName: string, docs: any[]) {
  mockAdminDbCollection.mockImplementation((name: string) => {
    if (name === collectionName) {
      return {
        doc: jest.fn((id?: string) => ({
          get: jest.fn(() => {
            const doc = docs.find(d => d.id === id);
            return Promise.resolve({
              exists: !!doc,
              data: () => doc,
              id: id || 'unknown'
            });
          })
        }))
      } as any;
    }
    return {
      doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: false, data: () => null })) }))
    } as any;
  });
}

function mockSuccessfulSend() {
  mockSgMailSend.mockResolvedValueOnce([{ statusCode: 202, body: '', headers: {} }] as any);
}

function mockFailedSend(error: any = new Error('SendGrid error')) {
  mockSgMailSend.mockRejectedValueOnce(error);
}

function expectEmailSent(expectedParams: {
  to?: string;
  subject?: string;
  html?: string;
  attachments?: any[];
}) {
  expect(mockSgMailSend).toHaveBeenCalled();
  const lastCall = mockSgMailSend.mock.calls[mockSgMailSend.mock.calls.length - 1];
  const sentEmailData = lastCall[0];

  // SendGrid send() kann ein Array oder einzelnes Objekt akzeptieren
  const sentEmail = Array.isArray(sentEmailData) ? sentEmailData[0] : sentEmailData;

  if (expectedParams.to) {
    expect(sentEmail.to).toBe(expectedParams.to);
  }
  if (expectedParams.subject) {
    expect(sentEmail.subject).toContain(expectedParams.subject);
  }
  if (expectedParams.html) {
    expect(sentEmail.html).toContain(expectedParams.html);
  }
  if (expectedParams.attachments) {
    expect(sentEmail.attachments).toHaveLength(expectedParams.attachments.length);
  }
}

describe('EmailSenderService', () => {
  let service: EmailSenderService;

  beforeEach(() => {
    service = new EmailSenderService();
    jest.clearAllMocks();
    mockAdminDbCollection.mockReset();
    mockSgMailSend.mockReset();
  });

  describe('prepareEmailData', () => {
    const mockCampaign = {
      id: 'campaign-123',
      organizationId: 'org-123', // WICHTIG: organizationId hinzufügen
      title: 'Test Pressemitteilung',
      mainContent: '<h1>Test Content</h1><p>Dies ist der Hauptinhalt.</p>',
      contentHtml: '<p>Generated Content</p>',
      keyVisual: 'https://example.com/image.jpg',
      clientName: 'Test Client',
      attachedAssets: [
        { id: 'asset-1', name: 'test.pdf', url: 'https://example.com/test.pdf' }
      ],
      assetShareUrl: 'https://example.com/share/abc123'
    };

    const mockSignature = {
      id: 'sig-123',
      content: '<div class="signature"><p>{{senderName}}</p></div>'
    };

    it('sollte Campaign aus Firestore laden', async () => {
      // Arrange: Campaign-Daten mocken
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      expect(result.campaign).toBeDefined();
      expect(result.campaign.title).toBe('Test Pressemitteilung');
      expect(adminDb.collection).toHaveBeenCalledWith('pr_campaigns');
    });

    it('sollte HTML-Signatur laden wenn signatureId vorhanden', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);
      mockDocumentData('email_signatures', 'sig-123', mockSignature);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123', 'sig-123');

      // Assert
      expect(result.signatureHtml).toBe(mockSignature.content);
      expect(adminDb.collection).toHaveBeenCalledWith('email_signatures');
    });

    it('sollte leeren String zurückgeben wenn keine signatureId', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      expect(result.signatureHtml).toBe('');
    });

    it('sollte PDF mit korrektem Content generieren', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      expect(result.pdfBase64).toBe('bW9jay1wZGYtYmFzZTY0LXN0cmluZw==');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate-pdf'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"mainContent"')
        })
      );
    });

    it('sollte mainContent für PDF verwenden, nicht contentHtml', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);

      // Act
      await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.mainContent).toBe(mockCampaign.mainContent);
      expect(requestBody.mainContent).not.toBe(mockCampaign.contentHtml);
    });

    it('sollte vorhandenen Share-Link verwenden', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', mockCampaign);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      expect(result.mediaShareUrl).toBe('https://example.com/share/abc123');
    });

    it('sollte undefined zurückgeben wenn keine Assets', async () => {
      // Arrange
      const campaignWithoutAssets = { ...mockCampaign, attachedAssets: [], assetShareUrl: undefined };
      mockDocumentData('pr_campaigns', 'campaign-123', campaignWithoutAssets);

      // Act
      const result = await service.prepareEmailData('campaign-123', 'org-123');

      // Assert
      expect(result.mediaShareUrl).toBeUndefined();
    });

    it('sollte Fehler werfen wenn Campaign nicht existiert', async () => {
      // Arrange
      mockDocumentData('pr_campaigns', 'campaign-123', null);

      // Act & Assert
      await expect(
        service.prepareEmailData('campaign-123', 'org-123')
      ).rejects.toThrow('Campaign nicht gefunden');
    });
  });

  describe('sendToRecipients', () => {
    const mockPreparedData = {
      campaign: {
        id: 'campaign-123',
        userId: 'user-123',
        organizationId: 'org-123',
        title: 'Test Pressemitteilung',
        mainContent: '<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p><h1>Test</h1>',
        contentHtml: '<p>Generated Content</p>',
        status: 'draft' as const,
        distributionListId: '',
        distributionListName: '',
        recipientCount: 0,
        approvalRequired: false
      },
      signatureHtml: '<div class="signature">{{senderName}}</div>',
      pdfBase64: 'bW9jay1wZGYtYmFzZTY0',
      mediaShareUrl: 'https://example.com/share/abc123'
    };

    const mockRecipients = {
      listIds: ['list-1'],
      listNames: ['Test Liste'],
      manual: [
        {
          id: 'manual-1',
          salutation: 'Herr',
          title: 'Dr.',
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max@example.com',
          companyName: 'Test GmbH',
          isValid: true
        }
      ],
      totalCount: 2,
      validCount: 2
    };

    const mockEmailAddressId = 'email-address-123';

    const mockEmailAddress = {
      id: mockEmailAddressId,
      email: 'anna@example.com',
      displayName: 'Anna Schmidt',
      domain: 'example.com',
      isActive: true,
      verificationStatus: 'verified',
      organizationId: 'org-123',
      localPart: 'anna'
    };

    const mockMetadata = {
      subject: 'Pressemitteilung: {{campaignTitle}}',
      preheader: 'Neue Pressemitteilung'
    };

    const mockEmailBody = '<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p><p>hiermit möchten wir Sie über folgende Neuigkeit informieren...</p>';

    const mockListRecipients = [
      {
        id: 'list-recipient-1',
        salutation: 'Frau',
        title: '',
        firstName: 'Lisa',
        lastName: 'Müller',
        email: 'lisa@example.com',
        companyName: 'Media GmbH'
      }
    ];

    beforeEach(() => {
      // Mock email_addresses Collection (wird in sendToRecipients aufgerufen)
      mockCollectionData('email_addresses', [mockEmailAddress]);

      // Mock loadAllRecipients (wird in sendToRecipients aufgerufen)
      mockCollectionData('distribution_lists', [
        {
          id: 'list-1',
          name: 'Test Liste',
          contacts: mockListRecipients
        }
      ]);
    });

    it('sollte Emails an alle Empfänger senden', async () => {
      // Arrange
      mockSuccessfulSend();
      mockSuccessfulSend();

      // Act
      const result = await service.sendToRecipients(
        mockRecipients,
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockSgMailSend).toHaveBeenCalledTimes(2);
    });

    it('sollte Variablen korrekt ersetzen', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      expectEmailSent({
        to: 'max@example.com',
        subject: 'Pressemitteilung: Test Pressemitteilung',
        html: 'Max'
      });
    });

    it('sollte salutationFormal korrekt berechnen', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      const sentEmailData = mockSgMailSend.mock.calls[0][0];
      const sentEmail = Array.isArray(sentEmailData) ? sentEmailData[0] : sentEmailData;
      expect(sentEmail.html).toContain('Sehr geehrter Herr');
    });

    it('sollte PDF als Anhang mitsenden', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      expectEmailSent({
        attachments: [
          expect.objectContaining({
            content: mockPreparedData.pdfBase64,
            type: 'application/pdf',
            filename: expect.stringContaining('.pdf')
          })
        ]
      });
    });

    it('sollte Media-Share-Link im Email-Body einbinden', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      expectEmailSent({
        html: 'https://example.com/share/abc123'
      });
    });

    it('sollte Fehler bei einzelnen Empfängern abfangen', async () => {
      // Arrange
      mockSuccessfulSend(); // Erster Empfänger erfolgreich
      mockFailedSend(new Error('SendGrid error')); // Zweiter schlägt fehl

      // Act
      const result = await service.sendToRecipients(
        mockRecipients,
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('SendGrid error');
    });

    it('sollte KEINE unnötigen Info-Boxen im Email-HTML haben', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      const sentEmailData = mockSgMailSend.mock.calls[0][0];
      const sentEmail = Array.isArray(sentEmailData) ? sentEmailData[0] : sentEmailData;

      // Diese Texte sollten NICHT im Email-HTML sein:
      expect(sentEmail.html).not.toContain('Reply-To System aktiv');
      expect(sentEmail.html).not.toContain('Pressemitteilung ist als PDF im Anhang');
      expect(sentEmail.html).not.toContain('Weitere Anhänge:');
    });

    it('sollte HTML-Signatur über Text-Signatur bevorzugen', async () => {
      // Arrange
      mockSuccessfulSend();

      // Act
      await service.sendToRecipients(
        { ...mockRecipients, listIds: [], listNames: [] },
        mockPreparedData,
        mockEmailAddressId,
        mockMetadata,
        mockEmailBody
      );

      // Assert
      const sentEmailData = mockSgMailSend.mock.calls[0][0];
      const sentEmail = Array.isArray(sentEmailData) ? sentEmailData[0] : sentEmailData;
      expect(sentEmail.html).toContain('Anna Schmidt'); // Von signatureHtml mit Variablen
    });
  });

  describe('buildEmailHtml', () => {
    it('sollte Email ohne TEST-Banner für Produktion erstellen', () => {
      // Diese Funktion ist private, wird über sendToRecipients getestet
      // Siehe Test: "sollte KEINE unnötigen Info-Boxen im Email-HTML haben"
    });
  });

  describe('Error Handling', () => {
    it('sollte aussagekräftige Fehlermeldung bei PDF-Generation-Fehler geben', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('PDF API error'));
      mockDocumentData('pr_campaigns', 'campaign-123', {
        id: 'campaign-123',
        organizationId: 'org-123', // WICHTIG: organizationId hinzufügen
        title: 'Test',
        mainContent: '<p>Test</p>'
      });

      // Act & Assert
      await expect(
        service.prepareEmailData('campaign-123', 'org-123')
      ).rejects.toThrow('PDF-Generation fehlgeschlagen');
    });

    it('sollte Fehler bei fehlender Campaign-ID abfangen', async () => {
      // Act & Assert
      await expect(
        service.prepareEmailData('', 'org-123')
      ).rejects.toThrow();
    });
  });
});
