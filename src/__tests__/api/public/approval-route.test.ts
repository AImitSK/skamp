// src/__tests__/api/public/approval-route.test.ts
// Test: Öffentliche Freigabe-API-Route - Email-Versand und Status-Updates

// ============================================
// Mocks - jest.mock Factory-Funktionen werden gehoistet,
// daher alle Referenzen inline oder via require
// ============================================

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'mock-msg-id' } }]),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-id'),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    arrayUnion: jest.fn((item: any) => ({ _type: 'arrayUnion', item })),
    increment: jest.fn((n: number) => ({ _type: 'increment', value: n })),
    delete: jest.fn(() => ({ _type: 'delete' })),
  },
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
}));

// adminDb als globales Objekt — muss INNERHALB der Factory-Funktion definiert werden
jest.mock('@/lib/firebase/admin-init', () => {
  const mockObj = {
    collection: jest.fn(),
  };
  return {
    adminDb: mockObj,
    __mockAdminDb: mockObj, // Export für Zugriff im Test
  };
});

// ============================================
// Imports (nach den Mocks)
// ============================================
import { NextRequest } from 'next/server';
import sgMail from '@sendgrid/mail';
import { POST } from '@/app/api/public/approval/[shareId]/route';

// Mock-Referenzen holen
const mockSgMailSend = sgMail.send as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockAdminDb } = require('@/lib/firebase/admin-init');
const mockCollection = __mockAdminDb.collection as jest.Mock;

// ============================================
// Test-Daten
// ============================================
const mockApprovalData = {
  shareId: 'test-share-123',
  status: 'pending',
  campaignId: 'campaign-abc',
  campaignTitle: 'Test Pressemitteilung',
  clientName: 'Test GmbH',
  organizationId: 'org-xyz',
  createdBy: 'user-123',
  recipients: [
    { name: 'Max Mustermann', email: 'max@test.de', status: 'pending' }
  ],
  history: [],
  analytics: null,
};

const mockCampaignData = {
  id: 'campaign-abc',
  title: 'Test Pressemitteilung',
  clientName: 'Test GmbH',
  organizationId: 'org-xyz',
  userId: 'user-123',
  status: 'in_review',
};

const mockEmailAddressData = {
  email: 'presse@testagency.de',
  localPart: 'presse',
  organizationId: 'org-xyz',
  isDefault: true,
};

// ============================================
// Hilfsfunktionen
// ============================================

function createRequest(shareId: string, body: any): NextRequest {
  const url = `http://localhost:3000/api/public/approval/${shareId}`;
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createParams(shareId: string) {
  return { params: Promise.resolve({ shareId }) };
}

/**
 * Konfiguriert die Firestore-Mocks für einen Standard-Ablauf.
 * Gibt die shared mocks zurück damit Tests darauf prüfen können.
 */
function setupFirestoreMocks(overrides?: {
  approvalData?: any;
  campaignData?: any;
  emailAddressEmpty?: boolean;
  approvalEmpty?: boolean;
}) {
  const approval = overrides?.approvalData ?? mockApprovalData;
  const campaign = overrides?.campaignData ?? mockCampaignData;
  const approvalEmpty = overrides?.approvalEmpty ?? false;
  const emailAddressEmpty = overrides?.emailAddressEmpty ?? false;

  const sharedUpdate = jest.fn().mockResolvedValue(undefined);
  const sharedSet = jest.fn().mockResolvedValue(undefined);

  mockCollection.mockReset();
  mockSgMailSend.mockClear();
  mockSgMailSend.mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'mock-msg-id' } }]);

  mockCollection.mockImplementation((name: string) => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(() => {
      if (name === 'approvals') {
        return Promise.resolve({
          empty: approvalEmpty,
          docs: approvalEmpty ? [] : [{
            id: 'approval-doc-id',
            ref: { update: sharedUpdate },
            data: () => ({ ...approval }),
          }],
        });
      }
      if (name === 'email_addresses') {
        return Promise.resolve({
          empty: emailAddressEmpty,
          docs: emailAddressEmpty ? [] : [{
            id: 'email-addr-id',
            data: () => ({ ...mockEmailAddressData }),
          }],
        });
      }
      if (name === 'inbox_threads') {
        return Promise.resolve({
          empty: false,
          docs: [{
            id: 'thread-123',
            ref: { update: sharedUpdate },
            data: () => ({ id: 'thread-123', organizationId: 'org-xyz' }),
          }],
        });
      }
      return Promise.resolve({ empty: true, docs: [] });
    }),
    doc: jest.fn(() => ({
      id: 'mock-doc-id',
      set: sharedSet,
      update: sharedUpdate,
      get: jest.fn().mockImplementation(() => {
        if (name === 'pr_campaigns') {
          return Promise.resolve({
            exists: true,
            id: campaign.id,
            data: () => ({ ...campaign }),
          });
        }
        return Promise.resolve({ exists: false, data: () => null });
      }),
      ref: { update: sharedUpdate },
    })),
  }));

  return { mockUpdate: sharedUpdate, mockSet: sharedSet };
}

// ============================================
// Tests
// ============================================

describe('Öffentliche Freigabe-API-Route', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'SG.test-key',
      NEXT_PUBLIC_BASE_URL: 'https://test.celeropress.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // POST: Freigabe erteilen (approve)
  // ============================================
  describe('POST action=approve', () => {
    it('sollte Approval-Status auf approved setzen und Email senden', async () => {
      const { mockUpdate } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('test-share-123'));
      const data = await response.json();

      expect(data.success).toBe(true);

      // Approval-Update verifizieren
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          approvedAt: 'SERVER_TIMESTAMP',
        })
      );

      // SendGrid Email-Versand verifizieren
      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      const emailCall = mockSgMailSend.mock.calls[0][0];

      expect(emailCall.subject).toContain('Freigabe erhalten');
      expect(emailCall.subject).toContain('Test Pressemitteilung');
      expect(emailCall.html).toContain('Freigabe erhalten');
      expect(emailCall.html).toContain('Max Mustermann');
      expect(emailCall.from.email).toBe('presse@testagency.de');
      expect(emailCall.to.email).toContain('@inbox.sk-online-marketing.de');
    });

    it('sollte Campaign-Status auf approved setzen', async () => {
      const { mockUpdate } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      // Mindestens ein Update mit status: approved
      const approvedCalls = mockUpdate.mock.calls.filter(
        (call: any[]) => call[0]?.status === 'approved'
      );
      expect(approvedCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('sollte Dashboard-Notification erstellen', async () => {
      const { mockSet } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      // Notification via set() erstellt
      const notificationCalls = mockSet.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'APPROVAL_GRANTED'
      );
      expect(notificationCalls.length).toBe(1);
      expect(notificationCalls[0][0]).toMatchObject({
        type: 'APPROVAL_GRANTED',
        title: 'Freigabe erteilt',
        isRead: false,
        userId: 'user-123',
        organizationId: 'org-xyz',
      });
    });

    it('sollte auch ohne SendGrid-Key funktionieren (graceful degradation)', async () => {
      const savedKey = process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_API_KEY;

      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('test-share-123'));
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockSgMailSend).not.toHaveBeenCalled();

      process.env.SENDGRID_API_KEY = savedKey;
    });

    it('sollte auch ohne Email-Adresse funktionieren', async () => {
      setupFirestoreMocks({ emailAddressEmpty: true });

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('test-share-123'));
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockSgMailSend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // POST: Änderungen anfordern (requestChanges)
  // ============================================
  describe('POST action=requestChanges', () => {
    it('sollte Status auf changes_requested setzen und Email mit Feedback senden', async () => {
      const { mockUpdate } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Bitte den Titel ändern und das Datum korrigieren.',
        authorName: 'Max Mustermann',
        recipientEmail: 'max@test.de',
      });

      const response = await POST(req, createParams('test-share-123'));
      const data = await response.json();

      expect(data.success).toBe(true);

      // Approval-Update verifizieren
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'changes_requested',
        })
      );

      // SendGrid Email-Versand verifizieren
      expect(mockSgMailSend).toHaveBeenCalledTimes(1);
      const emailCall = mockSgMailSend.mock.calls[0][0];

      expect(emailCall.subject).toContain('Änderungen angefordert');
      expect(emailCall.html).toContain('Änderungen angefordert');
      expect(emailCall.html).toContain('Bitte den Titel ändern');
      expect(emailCall.html).toContain('Max Mustermann');
      expect(emailCall.from.email).toBe('presse@testagency.de');
    });

    it('sollte Campaign-Lock lösen bei Änderungswunsch', async () => {
      const { mockUpdate } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Änderung nötig',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      // Campaign-Update mit Lock-Lösung verifizieren
      const lockCalls = mockUpdate.mock.calls.filter(
        (call: any[]) => call[0]?.editLocked === false
      );
      expect(lockCalls.length).toBeGreaterThanOrEqual(1);
      expect(lockCalls[0][0]).toMatchObject({
        status: 'changes_requested',
        editLocked: false,
        lastUnlockedBy: expect.objectContaining({
          userId: 'system',
          displayName: 'Freigabe-System',
          reason: 'Änderung angefordert',
        }),
      });
    });

    it('sollte Notification mit korrektem Typ erstellen', async () => {
      const { mockSet } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Feedback Text',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      const notificationCalls = mockSet.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'CHANGES_REQUESTED'
      );
      expect(notificationCalls.length).toBe(1);
      expect(notificationCalls[0][0]).toMatchObject({
        type: 'CHANGES_REQUESTED',
        title: 'Änderungen erbeten',
      });
    });

    it('sollte Inbox-Thread erstellen mit Kunden-Nachricht', async () => {
      const { mockSet } = setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Bitte Datum korrigieren',
        authorName: 'Max Mustermann',
        recipientEmail: 'max@test.de',
      });

      await POST(req, createParams('test-share-123'));

      // Inbox-Thread erstellt
      const threadCalls = mockSet.mock.calls.filter(
        (call: any[]) => call[0]?.type === 'approval_feedback'
      );
      expect(threadCalls.length).toBe(1);

      // Nachricht mit Feedback-Text erstellt
      const messageCalls = mockSet.mock.calls.filter(
        (call: any[]) => call[0]?.content === 'Bitte Datum korrigieren'
      );
      expect(messageCalls.length).toBe(1);
      expect(messageCalls[0][0].sender).toMatchObject({
        name: 'Max Mustermann',
        email: 'max@test.de',
      });
    });

    it('sollte Inline-Kommentare in der Email erwähnen', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Diverse Änderungen nötig',
        authorName: 'Max Mustermann',
        inlineComments: [
          { text: 'Tippfehler in Absatz 2', position: 42 },
          { text: 'Falsches Datum', position: 100 },
          { text: 'Name falsch geschrieben', position: 200 },
        ],
      });

      await POST(req, createParams('test-share-123'));

      const emailCall = mockSgMailSend.mock.calls[0][0];
      expect(emailCall.html).toContain('Inline-Kommentare');
      expect(emailCall.html).toContain('3');
    });

    it('sollte bei leerem Kommentar einen Fehler zurückgeben', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: '',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('test-share-123'));
      expect(response.status).toBe(500);
      expect(mockSgMailSend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Fehlerbehandlung
  // ============================================
  describe('Fehlerbehandlung', () => {
    it('sollte bei SendGrid-Fehler trotzdem success zurückgeben', async () => {
      setupFirestoreMocks();
      mockSgMailSend.mockRejectedValueOnce(new Error('SendGrid down'));

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('test-share-123'));
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('sollte bei nicht gefundener Freigabe 404 zurückgeben', async () => {
      setupFirestoreMocks({ approvalEmpty: true });

      const req = createRequest('invalid-share-id', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      const response = await POST(req, createParams('invalid-share-id'));
      expect(response.status).toBe(404);
    });

    it('sollte bei unbekannter Aktion 400 zurückgeben', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'deleteEverything',
      });

      const response = await POST(req, createParams('test-share-123'));
      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Email-Format-Validierung
  // ============================================
  describe('Email-Format', () => {
    it('sollte Reply-To-Adresse korrekt generieren', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      const emailCall = mockSgMailSend.mock.calls[0][0];
      // Reply-To sollte das Inbox-Routing-Format haben (prefix-orgId-emailId@inbox.domain)
      expect(emailCall.to.email).toMatch(
        /^[a-z0-9]+-[a-z0-9-]+-[a-z0-9-]+@inbox\.sk-online-marketing\.de$/i
      );
      expect(emailCall.replyTo).toBe(emailCall.to.email);
    });

    it('sollte Campaign-URL in der Email enthalten', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'approve',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      const emailCall = mockSgMailSend.mock.calls[0][0];
      expect(emailCall.html).toContain(
        'https://test.celeropress.com/dashboard/pr-tools/campaigns/campaign-abc'
      );
    });

    it('sollte Custom-Args für Tracking setzen', async () => {
      setupFirestoreMocks();

      const req = createRequest('test-share-123', {
        action: 'requestChanges',
        comment: 'Feedback',
        authorName: 'Max Mustermann',
      });

      await POST(req, createParams('test-share-123'));

      const emailCall = mockSgMailSend.mock.calls[0][0];
      expect(emailCall.customArgs).toEqual({
        type: 'approval_notification',
        approval_type: 'changes_requested',
        campaign_id: 'campaign-abc',
        organization_id: 'org-xyz',
      });
    });
  });
});
