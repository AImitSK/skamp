/**
 * Tests für POST /api/pr/email/cron
 * Cron-Job: Verarbeitet geplante Emails
 */

// Mocks müssen VOR imports definiert werden
jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0, toDate: () => date }))
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

import { POST, GET } from '@/app/api/pr/email/cron/route';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { emailSenderService } from '@/lib/email/email-sender-service';
import { Timestamp } from 'firebase-admin/firestore';

const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockEmailSenderService = emailSenderService as jest.Mocked<typeof emailSenderService>;

describe('POST /api/pr/email/cron', () => {
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Environment
    process.env.CRON_SECRET = 'test-cron-secret';

    // Mock Firestore Query Chain
    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockGet = jest.fn();
    mockLimit = jest.fn(() => ({ get: mockGet }));
    mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
    mockWhere = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));

    mockAdminDb.collection = jest.fn(() => ({
      where: mockWhere
    } as any));

    // Mock emailSenderService
    mockEmailSenderService.prepareEmailData = jest.fn();
    mockEmailSenderService.sendToRecipients = jest.fn();
  });

  const createMockRequest = (secret?: string): NextRequest => {
    const headers: Record<string, string> = {};
    if (secret) {
      headers['authorization'] = `Bearer ${secret}`;
    }

    return new NextRequest('http://localhost:3000/api/pr/email/cron', {
      method: 'POST',
      headers
    });
  };

  const createMockDoc = (id: string, data: any) => ({
    id,
    data: () => data,
    ref: {
      update: mockUpdate
    }
  });

  describe('Authentication', () => {
    it('sollte 500 zurückgeben wenn CRON_SECRET nicht konfiguriert', async () => {
      delete process.env.CRON_SECRET;

      const request = createMockRequest();
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('CRON_SECRET nicht konfiguriert');
    });

    it('sollte 401 zurückgeben bei fehlendem Authorization Header', async () => {
      const request = createMockRequest();
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('sollte 401 zurückgeben bei ungültigem Secret', async () => {
      const request = createMockRequest('wrong-secret');
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('sollte erfolgreich sein mit gültigem Secret', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const request = createMockRequest('test-cron-secret');
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Email-Verarbeitung', () => {
    beforeEach(() => {
      mockEmailSenderService.prepareEmailData.mockResolvedValue({
        campaign: { id: 'campaign-123', title: 'Test' } as any,
        signatureHtml: '',
        pdfBase64: 'base64-pdf',
        mediaShareUrl: undefined
      });

      mockEmailSenderService.sendToRecipients.mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        errors: []
      });
    });

    it('sollte Nachricht zurückgeben wenn keine Emails fällig sind', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const request = createMockRequest('test-cron-secret');
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe('Keine geplanten Emails zum Versenden');
      expect(json.processed).toBe(0);
    });

    it('sollte fällige Emails verarbeiten', async () => {
      const mockDocs = [
        createMockDoc('email-1', {
          organizationId: 'org-123',
          userId: 'user-123',
          campaignId: 'campaign-123',
          draft: {
            content: { signatureId: 'sig-123' },
            recipients: { listIds: [], manual: [], totalCount: 10 },
            sender: { type: 'contact', contactData: { email: 'sender@example.com' } },
            metadata: { subject: 'Test' }
          },
          sendAt: Timestamp.now(),
          timezone: 'Europe/Berlin',
          status: 'pending',
          attempts: 0
        }),
        createMockDoc('email-2', {
          organizationId: 'org-123',
          userId: 'user-123',
          campaignId: 'campaign-456',
          draft: {
            content: {},
            recipients: { listIds: [], manual: [], totalCount: 5 },
            sender: { type: 'manual', manual: { email: 'sender@example.com' } },
            metadata: { subject: 'Test 2' }
          },
          sendAt: Timestamp.now(),
          timezone: 'Europe/Berlin',
          status: 'pending',
          attempts: 0
        })
      ];

      mockGet.mockResolvedValue({ empty: false, docs: mockDocs });

      const request = createMockRequest('test-cron-secret');
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.results.processed).toBe(2);
      expect(json.results.sent).toBe(2);
      expect(json.results.failed).toBe(0);

      // Verify Status-Updates: pending → processing → sent
      expect(mockUpdate).toHaveBeenCalledTimes(4); // 2x processing, 2x sent

      // Verify Service Calls
      expect(mockEmailSenderService.prepareEmailData).toHaveBeenCalledTimes(2);
      expect(mockEmailSenderService.sendToRecipients).toHaveBeenCalledTimes(2);
    });

    it('sollte Status auf "sent" setzen bei Erfolg', async () => {
      const mockDoc = createMockDoc('email-1', {
        organizationId: 'org-123',
        userId: 'user-123',
        campaignId: 'campaign-123',
        draft: {
          content: {},
          recipients: { listIds: [], manual: [], totalCount: 10 },
          sender: { type: 'contact', contactData: { email: 'sender@example.com' } },
          metadata: { subject: 'Test' }
        },
        sendAt: Timestamp.now(),
        status: 'pending',
        attempts: 0
      });

      mockGet.mockResolvedValue({ empty: false, docs: [mockDoc] });

      const request = createMockRequest('test-cron-secret');
      await POST(request);

      // First update: status = 'processing'
      expect(mockUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
        status: 'processing'
      }));

      // Second update: status = 'sent'
      expect(mockUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
        status: 'sent',
        result: {
          successCount: 10,
          failureCount: 0,
          errors: []
        }
      }));
    });

    it('sollte Status auf "failed" setzen bei Fehler', async () => {
      mockEmailSenderService.sendToRecipients.mockResolvedValue({
        successCount: 5,
        failureCount: 5,
        errors: ['user1@example.com: Error', 'user2@example.com: Error']
      });

      const mockDoc = createMockDoc('email-1', {
        organizationId: 'org-123',
        userId: 'user-123',
        campaignId: 'campaign-123',
        draft: {
          content: {},
          recipients: { listIds: [], manual: [], totalCount: 10 },
          sender: { type: 'contact', contactData: { email: 'sender@example.com' } },
          metadata: { subject: 'Test' }
        },
        sendAt: Timestamp.now(),
        status: 'pending',
        attempts: 0
      });

      mockGet.mockResolvedValue({ empty: false, docs: [mockDoc] });

      const request = createMockRequest('test-cron-secret');
      const response = await POST(request);
      const json = await response.json();

      expect(json.results.failed).toBe(1);
      expect(json.results.sent).toBe(0);

      // Status sollte auf 'failed' gesetzt werden (failureCount > 0)
      expect(mockUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
        status: 'failed'
      }));
    });

    it('sollte attempts Counter erhöhen', async () => {
      const mockDoc = createMockDoc('email-1', {
        organizationId: 'org-123',
        userId: 'user-123',
        campaignId: 'campaign-123',
        draft: {
          content: {},
          recipients: { listIds: [], manual: [], totalCount: 10 },
          sender: { type: 'contact', contactData: { email: 'sender@example.com' } },
          metadata: { subject: 'Test' }
        },
        sendAt: Timestamp.now(),
        status: 'pending',
        attempts: 2 // Bereits 2 Versuche
      });

      mockGet.mockResolvedValue({ empty: false, docs: [mockDoc] });

      const request = createMockRequest('test-cron-secret');
      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        attempts: 3 // Sollte auf 3 erhöht werden
      }));
    });

    it('sollte Exception-Fehler abfangen und in Status schreiben', async () => {
      mockEmailSenderService.prepareEmailData.mockRejectedValue(
        new Error('Campaign nicht gefunden')
      );

      const mockDoc = createMockDoc('email-1', {
        organizationId: 'org-123',
        userId: 'user-123',
        campaignId: 'campaign-123',
        draft: {
          content: {},
          recipients: { listIds: [], manual: [], totalCount: 10 },
          sender: { type: 'contact', contactData: { email: 'sender@example.com' } },
          metadata: { subject: 'Test' }
        },
        sendAt: Timestamp.now(),
        status: 'pending',
        attempts: 0
      });

      mockGet.mockResolvedValue({ empty: false, docs: [mockDoc] });

      const request = createMockRequest('test-cron-secret');
      const response = await POST(request);
      const json = await response.json();

      expect(json.results.failed).toBe(1);
      expect(json.results.errors).toContain('email-1: Campaign nicht gefunden');

      // Status auf 'failed' mit error message
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error: 'Campaign nicht gefunden'
      }));
    });

    it('sollte Batch-Limit von 50 Emails respektieren', async () => {
      const request = createMockRequest('test-cron-secret');
      await POST(request);

      // Verify Firestore Query
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });

  describe('Firestore Query', () => {
    it('sollte korrekte Query-Parameter verwenden', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const request = createMockRequest('test-cron-secret');
      await POST(request);

      // Collection
      expect(mockAdminDb.collection).toHaveBeenCalledWith('scheduled_emails');

      // where status == 'pending'
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');

      // where sendAt <= now
      expect(mockWhere).toHaveBeenCalledWith('sendAt', '<=', expect.any(Object));

      // orderBy sendAt asc
      expect(mockOrderBy).toHaveBeenCalledWith('sendAt', 'asc');

      // limit 50
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });
});

describe('GET /api/pr/email/cron', () => {
  let mockWhere: jest.Mock;
  let mockCount: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.CRON_SECRET = 'test-cron-secret';

    // Mock count().get()
    mockGet = jest.fn();
    mockCount = jest.fn(() => ({ get: mockGet }));
    mockWhere = jest.fn(() => ({ count: mockCount }));

    mockAdminDb.collection = jest.fn(() => ({
      where: mockWhere
    } as any));
  });

  const createMockRequest = (secret?: string): NextRequest => {
    const headers: Record<string, string> = {};
    if (secret) {
      headers['authorization'] = `Bearer ${secret}`;
    }

    return new NextRequest('http://localhost:3000/api/pr/email/cron', {
      method: 'GET',
      headers
    });
  };

  describe('Authentication', () => {
    it('sollte 401 zurückgeben bei fehlendem Secret', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('sollte erfolgreich sein mit gültigem Secret', async () => {
      mockGet.mockResolvedValue({ data: () => ({ count: 5 }) });

      const request = createMockRequest('test-cron-secret');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Health-Check', () => {
    it('sollte Status und Statistiken zurückgeben', async () => {
      mockGet
        .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // pending
        .mockResolvedValueOnce({ data: () => ({ count: 2 }) }); // processing

      const request = createMockRequest('test-cron-secret');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.status).toBe('healthy');
      expect(json.timestamp).toBeDefined();
      expect(json.stats).toEqual({
        pending: 10,
        processing: 2
      });
    });

    it('sollte Status "unhealthy" bei Fehler zurückgeben', async () => {
      mockGet.mockRejectedValue(new Error('Firestore connection failed'));

      const request = createMockRequest('test-cron-secret');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.status).toBe('unhealthy');
      expect(json.error).toBe('Firestore connection failed');
    });
  });
});
