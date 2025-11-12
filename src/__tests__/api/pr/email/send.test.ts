/**
 * Tests für POST /api/pr/email/send
 * Email sofort versenden ODER für späteren Versand einplanen
 */

// Mocks müssen VOR imports definiert werden
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn()
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0, toDate: () => date }))
  },
  FieldValue: {
    serverTimestamp: jest.fn()
  }
}));

jest.mock('@/lib/firebase/admin-init', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

jest.mock('@/lib/email/email-sender-service', () => ({
  emailSenderService: {
    prepareEmailData: jest.fn(),
    sendToRecipients: jest.fn()
  }
}));

import { POST } from '@/app/api/pr/email/send/route';
import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/admin-init';
import { emailSenderService } from '@/lib/email/email-sender-service';
import { Timestamp } from 'firebase-admin/firestore';

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockEmailSenderService = emailSenderService as jest.Mocked<typeof emailSenderService>;

describe('POST /api/pr/email/send', () => {
  let mockVerifyIdToken: jest.Mock;
  let mockCollectionAdd: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firebase Auth
    mockVerifyIdToken = jest.fn();
    mockGetAuth.mockReturnValue({
      verifyIdToken: mockVerifyIdToken
    } as any);

    // Mock Firestore collection.add
    mockCollectionAdd = jest.fn();
    mockAdminDb.collection = jest.fn(() => ({
      add: mockCollectionAdd
    } as any));

    // Mock emailSenderService
    mockEmailSenderService.prepareEmailData = jest.fn();
    mockEmailSenderService.sendToRecipients = jest.fn();
  });

  const createMockRequest = (body: any, token?: string): NextRequest => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }

    return new NextRequest('http://localhost:3000/api/pr/email/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  };

  const validDraft = {
    campaignId: 'campaign-123',
    campaignTitle: 'Test Campaign',
    content: {
      body: 'Email body',
      signatureId: 'sig-123'
    },
    recipients: {
      listIds: ['list-1'],
      listNames: ['Test List'],
      manual: [],
      totalCount: 10,
      validCount: 10
    },
    sender: {
      type: 'contact' as const,
      contactId: 'contact-123',
      contactData: {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Test Company'
      }
    },
    metadata: {
      subject: 'Test Subject',
      preheader: 'Test Preheader'
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  describe('Authentication', () => {
    it('sollte 401 zurückgeben wenn kein Authorization Header', async () => {
      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('sollte 401 zurückgeben bei ungültigem Token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'invalid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Invalid token');
    });

    it('sollte erfolgreich sein mit gültigem Token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'user-123'
      } as any);

      mockEmailSenderService.prepareEmailData.mockResolvedValue({
        campaign: { id: 'campaign-123', title: 'Test' } as any,
        signatureHtml: '<p>Signature</p>',
        pdfBase64: 'base64-pdf-data',
        mediaShareUrl: undefined
      });

      mockEmailSenderService.sendToRecipients.mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        errors: []
      });

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' } as any);
    });

    it('sollte 400 zurückgeben wenn campaignId fehlt', async () => {
      const request = createMockRequest({
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('campaignId ist erforderlich');
    });

    it('sollte 400 zurückgeben wenn organizationId fehlt', async () => {
      const request = createMockRequest({
        campaignId: 'campaign-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('organizationId ist erforderlich');
    });

    it('sollte 400 zurückgeben wenn draft unvollständig ist', async () => {
      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: { content: {} }, // Unvollständig
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Unvollständiger Email-Entwurf');
    });

    it('sollte 400 zurückgeben wenn scheduledDate fehlt bei geplantem Versand', async () => {
      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: false
        // scheduledDate fehlt
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('scheduledDate ist erforderlich wenn nicht sofort gesendet wird');
    });
  });

  describe('Sofort-Versand', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' } as any);
    });

    it('sollte Email sofort versenden', async () => {
      const mockPreparedData = {
        campaign: { id: 'campaign-123', title: 'Test' } as any,
        signatureHtml: '<p>Signature</p>',
        pdfBase64: 'base64-pdf-data',
        mediaShareUrl: 'https://example.com/media'
      };

      mockEmailSenderService.prepareEmailData.mockResolvedValue(mockPreparedData);
      mockEmailSenderService.sendToRecipients.mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        errors: []
      });

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.result).toEqual({
        successCount: 10,
        failureCount: 0,
        errors: []
      });

      // Verify service calls
      expect(mockEmailSenderService.prepareEmailData).toHaveBeenCalledWith(
        'campaign-123',
        'org-123',
        'sig-123'
      );

      expect(mockEmailSenderService.sendToRecipients).toHaveBeenCalledWith(
        validDraft.recipients,
        mockPreparedData,
        validDraft.sender,
        validDraft.metadata
      );
    });

    it('sollte success=false zurückgeben bei Fehlern', async () => {
      mockEmailSenderService.prepareEmailData.mockResolvedValue({
        campaign: { id: 'campaign-123', title: 'Test' } as any,
        signatureHtml: '',
        pdfBase64: 'base64-pdf-data',
        mediaShareUrl: undefined
      });

      mockEmailSenderService.sendToRecipients.mockResolvedValue({
        successCount: 5,
        failureCount: 5,
        errors: ['user1@example.com: SendGrid error', 'user2@example.com: Invalid email']
      });

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(false); // failureCount > 0
      expect(json.result.failureCount).toBe(5);
      expect(json.result.errors).toHaveLength(2);
    });
  });

  describe('Geplanter Versand', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' } as any);
    });

    it('sollte Email für späteren Versand einplanen', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
      const mockDocRef = { id: 'scheduled-email-123' };

      mockCollectionAdd.mockResolvedValue(mockDocRef);

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: {
          ...validDraft,
          scheduling: {
            sendAt: futureDate,
            timezone: 'Europe/Berlin'
          }
        },
        sendImmediately: false,
        scheduledDate: futureDate.toISOString()
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.scheduledEmailId).toBe('scheduled-email-123');
      expect(json.scheduledFor).toBe(futureDate.toISOString());

      // Verify Firestore call
      expect(mockAdminDb.collection).toHaveBeenCalledWith('scheduled_emails');
      expect(mockCollectionAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          userId: 'user-123',
          campaignId: 'campaign-123',
          status: 'pending',
          attempts: 0
        })
      );
    });

    it('sollte 400 zurückgeben wenn Datum in Vergangenheit liegt', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 Sekunde in der Vergangenheit

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: false,
        scheduledDate: pastDate.toISOString()
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Geplantes Datum muss in der Zukunft liegen');
    });

    it('sollte Europe/Berlin als Default-Timezone verwenden', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockDocRef = { id: 'scheduled-email-123' };

      mockCollectionAdd.mockResolvedValue(mockDocRef);

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft, // Kein scheduling.timezone
        sendImmediately: false,
        scheduledDate: futureDate.toISOString()
      }, 'valid-token');

      await POST(request);

      expect(mockCollectionAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: 'Europe/Berlin'
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' } as any);
    });

    it('sollte 500 zurückgeben bei Service-Fehler', async () => {
      mockEmailSenderService.prepareEmailData.mockRejectedValue(
        new Error('Campaign nicht gefunden')
      );

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: true
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Campaign nicht gefunden');
    });

    it('sollte 500 zurückgeben bei Firestore-Fehler', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockCollectionAdd.mockRejectedValue(new Error('Firestore connection failed'));

      const request = createMockRequest({
        campaignId: 'campaign-123',
        organizationId: 'org-123',
        draft: validDraft,
        sendImmediately: false,
        scheduledDate: futureDate.toISOString()
      }, 'valid-token');

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Firestore connection failed');
    });
  });
});
