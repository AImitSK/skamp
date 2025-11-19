// src/lib/email/__tests__/reply-to-parser-service.test.ts
import { replyToParserService } from '../reply-to-parser-service';
import { adminDb } from '@/lib/firebase/admin-init';

// Mock Firestore
jest.mock('@/lib/firebase/admin-init', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

describe('ReplyToParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parse()', () => {
    it('parst Domain-Postfach korrekt', async () => {
      // Mock Firestore query für Domain Mailbox
      const mockGet = jest.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            domainId: 'domain-xyz',
            domain: 'example.de'
          })
        }]
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet
          })
        })
      });

      const result = await replyToParserService.parse('example@inbox.sk-online-marketing.de');

      expect(result.type).toBe('domain');
      expect(result.domain).toBe('example');
      expect(result.domainId).toBe('domain-xyz');
    });

    it('parst Projekt-Postfach korrekt', async () => {
      // Mock project lookup
      const mockProjectGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'proj-123',
          domainId: 'domain-xyz'
        })
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: mockProjectGet
        })
      });

      const result = await replyToParserService.parse('presse-proj-123@inbox.sk-online-marketing.de');

      expect(result.type).toBe('project');
      expect(result.localPart).toBe('presse');
      expect(result.projectId).toBe('proj-123');
      expect(result.domainId).toBe('domain-xyz');
    });

    it('wirft Fehler bei ungültiger Domain', async () => {
      await expect(
        replyToParserService.parse('test@gmail.com')
      ).rejects.toThrow('Invalid inbox domain');
    });

    it('wirft Fehler wenn Domain-Postfach nicht gefunden', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        empty: true,
        docs: []
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet
          })
        })
      });

      await expect(
        replyToParserService.parse('unknown@inbox.sk-online-marketing.de')
      ).rejects.toThrow('Domain mailbox not found');
    });

    it('wirft Fehler wenn Projekt nicht gefunden', async () => {
      const mockProjectGet = jest.fn().mockResolvedValue({
        exists: false
      });

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: mockProjectGet
        })
      });

      await expect(
        replyToParserService.parse('presse-invalid-proj@inbox.sk-online-marketing.de')
      ).rejects.toThrow('Project not found');
    });
  });
});
