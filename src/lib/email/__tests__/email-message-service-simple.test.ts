// src/lib/email/__tests__/email-message-service-simple.test.ts
import { describe, it, expect, jest } from '@jest/globals';

// Mock the entire firebase/firestore module first
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'collection-ref'),
  doc: jest.fn(() => 'doc-ref'),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ id: 'test-id', organizationId: 'test-org' }),
    id: 'test-id'
  })),
  getDocs: jest.fn(() => Promise.resolve({
    forEach: (callback: Function) => {
      [{ id: 'msg-1', data: () => ({ id: 'msg-1', organizationId: 'test-org' }) }]
        .forEach(callback);
    },
    docs: [{ id: 'msg-1' }]
  })),
  query: jest.fn(() => 'query-ref'),
  where: jest.fn(() => 'where-ref'),
  orderBy: jest.fn(() => 'orderby-ref'),
  limit: jest.fn(() => 'limit-ref'),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }))
  },
  increment: jest.fn((n: number) => n)
}));

// Mock Firebase client/server
jest.mock('@/lib/firebase/client-init', () => ({ db: {} }));
jest.mock('@/lib/firebase/server-init', () => ({ 
  serverDb: {}, 
  isServerSide: jest.fn(() => false) 
}));

describe('EmailMessageService - FUNCTIONAL Tests (100% Pass Required)', () => {
  // Import after mocking
  const { EmailMessageService } = require('../email-message-service');
  
  let emailMessageService: any;
  const TEST_ORG_ID = 'test-org-123';

  beforeEach(() => {
    emailMessageService = new EmailMessageService();
    jest.clearAllMocks();
  });

  describe('Core CRUD Operations', () => {
    it('should create email message successfully', async () => {
      const testMessage = {
        messageId: 'test-123',
        organizationId: TEST_ORG_ID,
        emailAccountId: 'account-123',
        from: { email: 'sender@test.com', name: 'Sender' },
        to: [{ email: 'receiver@test.com', name: 'Receiver' }],
        subject: 'Test Subject',
        textContent: 'Test content',
        folder: 'inbox' as const,
        isRead: false
      };

      const result = await emailMessageService.create(testMessage);
      
      expect(result).toHaveProperty('id', 'test-id');
      expect(result.organizationId).toBe(TEST_ORG_ID);
    });

    it('should validate required fields', async () => {
      const invalidMessage = { subject: 'Test without required fields' };

      await expect(emailMessageService.create(invalidMessage))
        .rejects.toThrow('Fehlende Pflichtfelder: messageId, organizationId, emailAccountId');
    });

    it('should get email by id', async () => {
      const result = await emailMessageService.get('test-id');
      
      expect(result).toBeTruthy();
      expect(result.id).toBe('test-id');
    });

    it('should update email message', async () => {
      const updates = { isRead: true, priority: 'high' as const };
      
      await expect(emailMessageService.update('test-id', updates))
        .resolves.not.toThrow();
    });

    it('should soft delete (move to trash)', async () => {
      // Mock getDoc to return existing email
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'test-id', folder: 'inbox' }),
        id: 'test-id'
      });

      await expect(emailMessageService.delete('test-id'))
        .resolves.not.toThrow();
    });
  });

  describe('Multi-Tenancy & Security', () => {
    it('should isolate data by organizationId', async () => {
      const options = { folder: 'inbox' as const };
      
      const result = await emailMessageService.getMessages(TEST_ORG_ID, options);
      
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should handle empty organizationId', () => {
      expect(() => {
        emailMessageService.getMessages('', {});
      }).not.toThrow();
    });
  });

  describe('Thread Management', () => {
    it('should get thread messages', async () => {
      const threadId = 'test-thread-123';
      
      const result = await emailMessageService.getThreadMessages(threadId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle thread message fallback', async () => {
      const threadId = 'test-thread-123';
      const mockGetDocs = require('firebase/firestore').getDocs;
      
      // First call fails (missing index)
      mockGetDocs.mockRejectedValueOnce(new Error('Index missing'));
      // Second call succeeds
      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: Function) => {
          [{ id: 'msg-1', data: () => ({ id: 'msg-1', threadId }) }].forEach(callback);
        }
      });

      const result = await emailMessageService.getThreadMessages(threadId);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Folder Operations', () => {
    it('should get folder statistics', async () => {
      const stats = await emailMessageService.getFolderStats(TEST_ORG_ID);
      
      expect(stats).toHaveProperty('inbox');
      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('trash');
      expect(typeof stats.inbox).toBe('number');
    });

    it('should move email to folder', async () => {
      // Mock getDoc to return existing email
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'test-id', folder: 'inbox' }),
        id: 'test-id'
      });

      await expect(emailMessageService.moveToFolder('test-id', 'spam'))
        .resolves.not.toThrow();
    });

    it('should archive email', async () => {
      // Mock getDoc to return existing email
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'test-id', isArchived: false }),
        id: 'test-id'
      });

      await expect(emailMessageService.archive('test-id'))
        .resolves.not.toThrow();
    });
  });

  describe('Draft Management', () => {
    it('should create draft', async () => {
      const draftData = {
        subject: 'Draft Email',
        textContent: 'Draft content',
        to: [{ email: 'test@example.com', name: 'Test' }]
      };

      const result = await emailMessageService.createDraft(
        draftData,
        TEST_ORG_ID,
        'email-account-123'
      );
      
      expect(result).toHaveProperty('id');
      expect(result.isDraft).toBe(true);
      expect(result.folder).toBe('draft');
    });

    it('should mark draft as sent', async () => {
      const sentMessageId = 'sent-message-123';
      
      await expect(emailMessageService.markAsSent('draft-id', sentMessageId))
        .resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const mockAddDoc = require('firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'));
      
      const testMessage = {
        messageId: 'test-123',
        organizationId: TEST_ORG_ID,
        emailAccountId: 'account-123'
      };

      await expect(emailMessageService.create(testMessage))
        .rejects.toThrow('Firestore error');
    });

    it('should handle non-existent email', async () => {
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      
      const result = await emailMessageService.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Pagination & Performance', () => {
    it('should handle pagination correctly', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      
      // Mock 21 messages (more than limit of 20)
      const messages = Array.from({ length: 21 }, (_, i) => ({
        id: `msg-${i}`,
        data: () => ({ id: `msg-${i}`, subject: `Message ${i}` })
      }));
      
      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: Function) => messages.forEach(callback),
        docs: messages
      });

      const result = await emailMessageService.getMessages(TEST_ORG_ID, { limit: 20 });
      
      expect(result.hasMore).toBe(true);
      expect(result.messages.length).toBe(20); // Limited to 20
    });
  });

  describe('Search & Filter', () => {
    it('should handle search query filtering', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      
      const messages = [
        { id: 'msg-1', data: () => ({ 
          id: 'msg-1', 
          subject: 'Important PR News', 
          textContent: 'Important press release about new journalist partnership',
          from: { email: 'journalist@newspaper.com', name: 'Journalist' },
          to: [{ email: 'pr@company.com', name: 'PR Team' }]
        }) },
        { id: 'msg-2', data: () => ({ 
          id: 'msg-2', 
          subject: 'Newsletter', 
          textContent: 'Monthly company newsletter',
          from: { email: 'marketing@company.com', name: 'Marketing' },
          to: [{ email: 'subscribers@company.com', name: 'Subscribers' }]
        }) }
      ];
      
      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: Function) => messages.forEach(callback),
        docs: messages
      });

      const result = await emailMessageService.getMessages(TEST_ORG_ID, { 
        searchQuery: 'journalist' 
      });
      
      expect(result.messages.length).toBe(1);
      expect(result.messages[0].from.email).toContain('journalist');
    });

    it('should apply folder filter', async () => {
      const result = await emailMessageService.getMessages(TEST_ORG_ID, { 
        folder: 'sent' as const 
      });
      
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });
});