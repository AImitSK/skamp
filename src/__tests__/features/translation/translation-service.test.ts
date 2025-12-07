/**
 * Tests für den Translation Service
 *
 * @module translation-service.test
 */

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(),
  })),
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { translationService } from '@/lib/services/translation-service';
import { CreateTranslationInput, UpdateTranslationInput } from '@/types/translation';

describe('TranslationService', () => {
  const mockOrgId = 'org-123';
  const mockProjectId = 'proj-456';
  const mockTranslationId = 'trans-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: getByProject
  // ═══════════════════════════════════════════════════════════════

  describe('getByProject', () => {
    it('sollte alle Übersetzungen eines Projekts laden', async () => {
      const mockDocs = [
        {
          id: 'trans-1',
          data: () => ({
            language: 'en',
            title: 'English Title',
            content: '<p>English content</p>',
            status: 'generated',
            isOutdated: false,
            generatedAt: { toDate: () => new Date() },
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            language: 'fr',
            title: 'French Title',
            content: '<p>French content</p>',
            status: 'reviewed',
            isOutdated: true,
            generatedAt: { toDate: () => new Date() },
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const result = await translationService.getByProject(mockOrgId, mockProjectId);

      expect(collection).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].language).toBe('en');
      expect(result[1].language).toBe('fr');
      expect(result[0].organizationId).toBe(mockOrgId);
      expect(result[0].projectId).toBe(mockProjectId);
    });

    it('sollte nach Sprache filtern können', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'trans-1',
            data: () => ({
              language: 'en',
              title: 'English',
              content: '<p>Content</p>',
              status: 'generated',
              isOutdated: false,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });

      const result = await translationService.getByProject(mockOrgId, mockProjectId, {
        language: 'en',
      });

      expect(where).toHaveBeenCalledWith('language', '==', 'en');
      expect(result).toHaveLength(1);
    });

    it('sollte nach Status filtern können', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      await translationService.getByProject(mockOrgId, mockProjectId, {
        status: 'approved',
      });

      expect(where).toHaveBeenCalledWith('status', '==', 'approved');
    });

    it('sollte nur veraltete Übersetzungen filtern können', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      await translationService.getByProject(mockOrgId, mockProjectId, {
        outdatedOnly: true,
      });

      expect(where).toHaveBeenCalledWith('isOutdated', '==', true);
    });

    it('sollte Pagination unterstützen', async () => {
      const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `trans-${i}`,
        data: () => ({
          language: 'en',
          title: `Title ${i}`,
          content: '<p>Content</p>',
          status: 'generated',
          isOutdated: false,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      }));

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const result = await translationService.getByProject(mockOrgId, mockProjectId, {
        offset: 2,
        limit: 3,
      });

      expect(result).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: getByLanguage
  // ═══════════════════════════════════════════════════════════════

  describe('getByLanguage', () => {
    it('sollte Übersetzung nach Sprache finden', async () => {
      const mockDoc = {
        id: 'trans-1',
        data: () => ({
          language: 'en',
          title: 'English Title',
          content: '<p>Content</p>',
          status: 'generated',
          isOutdated: false,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await translationService.getByLanguage(mockOrgId, mockProjectId, 'en');

      expect(where).toHaveBeenCalledWith('language', '==', 'en');
      expect(result).not.toBeNull();
      expect(result?.language).toBe('en');
    });

    it('sollte null zurückgeben wenn Sprache nicht existiert', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await translationService.getByLanguage(mockOrgId, mockProjectId, 'zh');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: getById
  // ═══════════════════════════════════════════════════════════════

  describe('getById', () => {
    it('sollte Übersetzung nach ID finden', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockTranslationId,
        data: () => ({
          language: 'en',
          title: 'Title',
          content: '<p>Content</p>',
          status: 'generated',
          isOutdated: false,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await translationService.getById(
        mockOrgId,
        mockProjectId,
        mockTranslationId
      );

      expect(doc).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTranslationId);
    });

    it('sollte null zurückgeben wenn nicht gefunden', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await translationService.getById(
        mockOrgId,
        mockProjectId,
        'non-existent'
      );

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: create
  // ═══════════════════════════════════════════════════════════════

  describe('create', () => {
    it('sollte neue Übersetzung erstellen', async () => {
      const input: CreateTranslationInput = {
        projectId: mockProjectId,
        language: 'en',
        title: 'New Translation',
        content: '<p>Translated content</p>',
        sourceVersion: 1,
        modelUsed: 'gemini-2.5-flash',
        glossaryEntriesUsed: ['g1', 'g2'],
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'new-trans-id' });

      const result = await translationService.create(mockOrgId, input);

      expect(addDoc).toHaveBeenCalled();
      expect(result.id).toBe('new-trans-id');
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.projectId).toBe(mockProjectId);
      expect(result.language).toBe('en');
      expect(result.status).toBe('generated');
      expect(result.isOutdated).toBe(false);
      expect(result.glossaryEntriesUsed).toEqual(['g1', 'g2']);
    });

    it('sollte ohne optionale Felder funktionieren', async () => {
      const input: CreateTranslationInput = {
        projectId: mockProjectId,
        language: 'fr',
        content: '<p>Simple content</p>',
        sourceVersion: 1,
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'new-id' });

      const result = await translationService.create(mockOrgId, input);

      expect(result.title).toBeUndefined();
      expect(result.glossaryEntriesUsed).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: update
  // ═══════════════════════════════════════════════════════════════

  describe('update', () => {
    it('sollte Übersetzung aktualisieren', async () => {
      const updates: UpdateTranslationInput = {
        title: 'Updated Title',
        content: '<p>Updated content</p>',
        status: 'reviewed',
      };

      await translationService.update(
        mockOrgId,
        mockProjectId,
        mockTranslationId,
        updates
      );

      expect(updateDoc).toHaveBeenCalled();
    });

    it('sollte isOutdated Flag aktualisieren', async () => {
      await translationService.update(mockOrgId, mockProjectId, mockTranslationId, {
        isOutdated: true,
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('sollte reviewedBy mit reviewedAt setzen', async () => {
      await translationService.update(mockOrgId, mockProjectId, mockTranslationId, {
        reviewedBy: 'user-123',
      });

      const updateCall = (updateDoc as jest.Mock).mock.calls[0];
      const updateData = updateCall[1];

      expect(updateData.reviewedBy).toBe('user-123');
      expect(updateData.reviewedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: delete
  // ═══════════════════════════════════════════════════════════════

  describe('delete', () => {
    it('sollte Übersetzung löschen', async () => {
      await translationService.delete(mockOrgId, mockProjectId, mockTranslationId);

      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: markAsOutdated
  // ═══════════════════════════════════════════════════════════════

  describe('markAsOutdated', () => {
    it('sollte alle nicht-veralteten Übersetzungen als veraltet markieren', async () => {
      const mockDocs = [
        {
          id: 'trans-1',
          data: () => ({
            language: 'en',
            isOutdated: false,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            language: 'fr',
            isOutdated: false,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-3',
          data: () => ({
            language: 'es',
            isOutdated: true, // Bereits veraltet
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn(),
      };
      (writeBatch as jest.Mock).mockReturnValue(mockBatch);

      const count = await translationService.markAsOutdated(mockOrgId, mockProjectId);

      // Sollte 2 zurückgeben (nur die nicht-veralteten)
      expect(count).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('sollte 0 zurückgeben wenn keine Übersetzungen existieren', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      const count = await translationService.markAsOutdated(mockOrgId, mockProjectId);

      expect(count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: markAsCurrent
  // ═══════════════════════════════════════════════════════════════

  describe('markAsCurrent', () => {
    it('sollte Übersetzung als aktuell markieren', async () => {
      await translationService.markAsCurrent(mockOrgId, mockProjectId, mockTranslationId);

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: getSummary
  // ═══════════════════════════════════════════════════════════════

  describe('getSummary', () => {
    it('sollte Zusammenfassung der Übersetzungen zurückgeben', async () => {
      const mockDocs = [
        {
          id: 'trans-1',
          data: () => ({
            language: 'en',
            status: 'approved',
            isOutdated: false,
            generatedAt: { toDate: () => new Date() },
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            language: 'fr',
            status: 'generated',
            isOutdated: true,
            generatedAt: { toDate: () => new Date() },
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const summary = await translationService.getSummary(mockOrgId, mockProjectId);

      expect(summary.projectId).toBe(mockProjectId);
      expect(summary.totalCount).toBe(2);
      expect(summary.outdatedCount).toBe(1);
      expect(summary.languages).toHaveLength(2);
      expect(summary.languages[0].code).toBe('en');
      expect(summary.languages[0].isOutdated).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: exists
  // ═══════════════════════════════════════════════════════════════

  describe('exists', () => {
    it('sollte true zurückgeben wenn Sprache existiert', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: 'trans-1', data: () => ({ language: 'en' }) }],
      });

      const exists = await translationService.exists(mockOrgId, mockProjectId, 'en');

      expect(exists).toBe(true);
    });

    it('sollte false zurückgeben wenn Sprache nicht existiert', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const exists = await translationService.exists(mockOrgId, mockProjectId, 'zh');

      expect(exists).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST: getAvailableLanguages
  // ═══════════════════════════════════════════════════════════════

  describe('getAvailableLanguages', () => {
    it('sollte alle verfügbaren Sprachen zurückgeben', async () => {
      const mockDocs = [
        {
          id: 'trans-1',
          data: () => ({
            language: 'en',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-2',
          data: () => ({
            language: 'fr',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'trans-3',
          data: () => ({
            language: 'es',
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const languages = await translationService.getAvailableLanguages(
        mockOrgId,
        mockProjectId
      );

      expect(languages).toEqual(['en', 'fr', 'es']);
    });

    it('sollte leeres Array zurückgeben wenn keine Übersetzungen', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      const languages = await translationService.getAvailableLanguages(
        mockOrgId,
        mockProjectId
      );

      expect(languages).toEqual([]);
    });
  });
});
