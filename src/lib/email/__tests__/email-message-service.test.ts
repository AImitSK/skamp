// src/lib/email/__tests__/email-message-service.test.ts
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EmailMessageService } from '../email-message-service';
import { EmailMessage } from '@/types/inbox-enhanced';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('@/lib/firebase/client-init', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    serverTimestamp: jest.fn(() => Timestamp.now()),
    writeBatch: jest.fn()
  }
}));

jest.mock('@/lib/firebase/server-init', () => ({
  serverDb: {},
  isServerSide: jest.fn(() => false)
}));

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'test-message-id' }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => Timestamp.now()),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  }))
};

describe('EmailMessageService - Communication Inbox Core Tests', () => {
  let emailMessageService: EmailMessageService;
  const TEST_ORG_ID = 'test-org-123';
  const TEST_USER_ID = 'test-user-456';
  const TEST_EMAIL_ACCOUNT_ID = 'test-email-account-789';

  beforeEach(() => {
    emailMessageService = new EmailMessageService();
    jest.clearAllMocks();
    
    // Setup Firestore mocks
    (emailMessageService as any).db = mockFirestore;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createTestEmailMessage = (): Partial<EmailMessage> => ({
    messageId: 'test-message-123',
    organizationId: TEST_ORG_ID,
    userId: TEST_USER_ID,
    emailAccountId: TEST_EMAIL_ACCOUNT_ID,
    from: { email: 'sender@example.com', name: 'Test Sender' },
    to: [{ email: 'receiver@celeropress.com', name: 'Test Receiver' }],
    subject: 'Test E-Mail Subject',
    textContent: 'Dies ist ein Test-E-Mail Inhalt.',
    htmlContent: '<p>Dies ist ein Test-E-Mail Inhalt.</p>',
    snippet: 'Dies ist ein Test-E-Mail Inhalt.',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDraft: false,
    labels: [],
    importance: 'normal',
    attachments: []
  });

  describe('CRUD Operations - Basis-Funktionalität', () => {
    it('should create email message with proper organization isolation', async () => {
      const testMessage = createTestEmailMessage();
      
      const result = await emailMessageService.create(testMessage);
      
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          messageId: testMessage.messageId,
          organizationId: TEST_ORG_ID,
          emailAccountId: TEST_EMAIL_ACCOUNT_ID
        })
      );
      
      expect(result.id).toBe('test-message-id');
      expect(result.organizationId).toBe(TEST_ORG_ID);
    });

    it('should validate required fields on create', async () => {
      const invalidMessage = {
        subject: 'Test ohne MessageID'
      };

      await expect(emailMessageService.create(invalidMessage))
        .rejects.toThrow('Fehlende Pflichtfelder: messageId, organizationId, emailAccountId');
    });

    it('should get email message by id', async () => {
      const testMessage = createTestEmailMessage();
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => testMessage,
        id: 'test-message-id'
      });

      const result = await emailMessageService.get('test-message-id');
      
      expect(result).toEqual({
        ...testMessage,
        id: 'test-message-id'
      });
      expect(mockFirestore.doc).toHaveBeenCalledWith(
        expect.anything(),
        'email_messages',
        'test-message-id'
      );
    });

    it('should return null for non-existent email', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await emailMessageService.get('non-existent-id');
      
      expect(result).toBeNull();
    });

    it('should update email message with timestamp', async () => {
      const updates = { isRead: true, priority: 'high' as const };
      
      await emailMessageService.update('test-message-id', updates);
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: expect.anything()
        })
      );
    });
  });

  describe('Thread Management - Business Logic', () => {
    it('should soft delete email (move to trash)', async () => {
      const testMessage = createTestEmailMessage();
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => testMessage,
        id: 'test-message-id'
      });

      await emailMessageService.delete('test-message-id');
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          folder: 'trash'
        })
      );
    });

    it('should get thread messages excluding trash', async () => {
      const threadId = 'test-thread-123';
      const mockMessages = [
        { ...createTestEmailMessage(), id: 'msg-1', threadId, folder: 'inbox' },
        { ...createTestEmailMessage(), id: 'msg-2', threadId, folder: 'inbox' }
      ];

      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          mockMessages.forEach(msg => callback({
            data: () => msg,
            id: msg.id
          }));
        },
        size: mockMessages.length
      });

      const result = await emailMessageService.getThreadMessages(threadId);
      
      expect(result).toHaveLength(2);
      expect(result[0].folder).toBe('inbox');
      expect(mockFirestore.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(), // where threadId
        expect.anything(), // where folder != trash
        expect.anything(), // orderBy folder
        expect.anything()  // orderBy receivedAt
      );
    });

    it('should handle thread messages fallback when index missing', async () => {
      const threadId = 'test-thread-123';
      
      // First call throws (missing index)
      mockFirestore.getDocs.mockRejectedValueOnce(new Error('Index missing'));
      
      // Fallback call succeeds
      const mockMessages = [
        { ...createTestEmailMessage(), id: 'msg-1', threadId, folder: 'inbox' }
      ];
      
      mockFirestore.getDocs.mockResolvedValueOnce({
        forEach: (callback: Function) => {
          mockMessages.forEach(msg => callback({
            data: () => msg,
            id: msg.id
          }));
        }
      });

      const result = await emailMessageService.getThreadMessages(threadId);
      
      expect(result).toHaveLength(1);
      expect(mockFirestore.getDocs).toHaveBeenCalledTimes(2); // Original + fallback
    });
  });

  describe('Multi-Tenancy & Security', () => {
    it('should isolate emails by organizationId in getMessages', async () => {
      const options = { folder: 'inbox' as const };
      
      await emailMessageService.getMessages(TEST_ORG_ID, options);
      
      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', TEST_ORG_ID);
    });

    it('should apply folder filter correctly', async () => {
      const options = { folder: 'sent' as const };
      
      await emailMessageService.getMessages(TEST_ORG_ID, options);
      
      expect(mockFirestore.where).toHaveBeenCalledWith('folder', '==', 'sent');
    });

    it('should handle search query filtering', async () => {
      const mockMessages = [
        { ...createTestEmailMessage(), subject: 'PR Anfrage wichtig', from: { email: 'journalist@zeitung.de' } },
        { ...createTestEmailMessage(), subject: 'Newsletter', from: { email: 'marketing@firma.de' } }
      ];

      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          mockMessages.forEach((msg, index) => callback({
            data: () => msg,
            id: `msg-${index}`
          }));
        },
        docs: mockMessages.map((msg, index) => ({ id: `msg-${index}` }))
      });

      const options = { searchQuery: 'journalist' };
      const result = await emailMessageService.getMessages(TEST_ORG_ID, options);
      
      // Should filter client-side for 'journalist'
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].from.email).toContain('journalist');
    });
  });

  describe('Folder Operations', () => {
    it('should get folder statistics by organization', async () => {
      mockFirestore.getDocs.mockResolvedValue({ size: 5 });
      
      const stats = await emailMessageService.getFolderStats(TEST_ORG_ID);
      
      expect(stats).toHaveProperty('inbox');
      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('trash');
      expect(mockFirestore.where).toHaveBeenCalledWith('organizationId', '==', TEST_ORG_ID);
      expect(mockFirestore.where).toHaveBeenCalledWith('isRead', '==', false);
    });

    it('should move email to specified folder', async () => {
      const testMessage = createTestEmailMessage();
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => testMessage,
        id: 'test-message-id'
      });

      await emailMessageService.moveToFolder('test-message-id', 'spam');
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          folder: 'spam'
        })
      );
    });

    it('should archive email correctly', async () => {
      const testMessage = createTestEmailMessage();
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => testMessage,
        id: 'test-message-id'
      });

      await emailMessageService.archive('test-message-id');
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isArchived: true,
          folder: 'inbox' // Bleibt in inbox aber archiviert
        })
      );
    });
  });

  describe('Draft Management', () => {
    it('should create draft with correct properties', async () => {
      const draftData = {
        subject: 'Entwurf E-Mail',
        textContent: 'Entwurf Inhalt',
        to: [{ email: 'test@example.com', name: 'Test User' }]
      };

      const result = await emailMessageService.createDraft(
        draftData,
        TEST_ORG_ID,
        TEST_EMAIL_ACCOUNT_ID
      );
      
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          organizationId: TEST_ORG_ID,
          emailAccountId: TEST_EMAIL_ACCOUNT_ID,
          folder: 'draft',
          isDraft: true,
          isRead: true, // Eigene Entwürfe sind "gelesen"
          messageId: expect.stringMatching(/^draft-/)
        })
      );
    });

    it('should mark draft as sent', async () => {
      const sentMessageId = 'sent-message-123';
      
      await emailMessageService.markAsSent('draft-id', sentMessageId);
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          folder: 'sent',
          isDraft: false,
          messageId: sentMessageId,
          sentAt: expect.anything()
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      mockFirestore.addDoc.mockRejectedValue(new Error('Firestore connection error'));
      
      const testMessage = createTestEmailMessage();
      
      await expect(emailMessageService.create(testMessage))
        .rejects.toThrow('Firestore connection error');
    });

    it('should handle thread update errors without failing delete', async () => {
      const testMessage = { ...createTestEmailMessage(), threadId: 'test-thread' };
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => testMessage,
        id: 'test-message-id'
      });

      // Thread update fails
      mockFirestore.writeBatch().commit.mockRejectedValue(new Error('Thread update failed'));
      
      // Should not throw - email delete succeeds even if thread update fails
      await expect(emailMessageService.delete('test-message-id')).resolves.not.toThrow();
    });
  });

  describe('Performance & Pagination', () => {
    it('should handle pagination correctly', async () => {
      const mockMessages = Array.from({ length: 21 }, (_, i) => ({
        ...createTestEmailMessage(),
        id: `msg-${i}`,
        subject: `Test Message ${i}`
      }));

      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          mockMessages.forEach(msg => callback({
            data: () => msg,
            id: msg.id
          }));
        },
        docs: mockMessages.map(msg => ({ id: msg.id }))
      });

      const options = { limit: 20 };
      const result = await emailMessageService.getMessages(TEST_ORG_ID, options);
      
      expect(result.hasMore).toBe(true);
      expect(result.messages).toHaveLength(20); // +1 removed for hasMore check
      expect(mockFirestore.limit).toHaveBeenCalledWith(21); // +1 for hasMore
    });
  });
});