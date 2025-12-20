// src/lib/firebase/__tests__/marken-dna-service.test.ts
import { markenDNAService } from '../marken-dna-service';
import {
  MarkenDNADocument,
  MarkenDNADocumentType,
  MarkenDNACreateData,
  MARKEN_DNA_DOCUMENTS,
} from '@/types/marken-dna';
import { Timestamp } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn(),
  })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock db
jest.mock('../client-init', () => ({
  db: {},
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'abcdef1234567890abcdef1234567890'),
  })),
}));

// Mock-Daten Helper
const createMockDocument = (
  type: MarkenDNADocumentType,
  companyId: string = 'company-1',
  completeness: number = 100
): MarkenDNADocument => ({
  id: type,
  companyId,
  companyName: 'Test Company GmbH',
  organizationId: 'org-1',
  type,
  title: MARKEN_DNA_DOCUMENTS[type].title,
  content: `<h1>${MARKEN_DNA_DOCUMENTS[type].title}</h1><p>Test content for ${type}</p>`,
  plainText: `${MARKEN_DNA_DOCUMENTS[type].title}\n\nTest content for ${type}`,
  status: completeness === 100 ? 'completed' : 'draft',
  completeness,
  chatHistory: [],
  createdAt: { seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 } as any,
  updatedAt: { seconds: 2000, nanoseconds: 0, toMillis: () => 2000000 } as any,
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

describe('MarkenDNAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET OPERATIONS
  // ============================================================================

  describe('getDocument', () => {
    it('sollte ein einzelnes Marken-DNA Dokument laden', async () => {
      const mockDoc = createMockDocument('briefing');
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        id: 'briefing',
        data: () => mockDoc,
        exists: () => true,
      });

      const result = await markenDNAService.getDocument('company-1', 'briefing');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('briefing');
      expect(result?.title).toBe('Briefing-Check');
      expect(firestore.doc).toHaveBeenCalled();
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it('sollte null zurückgeben wenn Dokument nicht existiert', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await markenDNAService.getDocument('company-1', 'briefing');

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.getDocument('company-1', 'briefing');

      expect(result).toBeNull();
    });
  });

  describe('getDocuments', () => {
    it('sollte alle Marken-DNA Dokumente eines Kunden laden', async () => {
      const mockDocs = [
        createMockDocument('briefing'),
        createMockDocument('swot'),
        createMockDocument('audience'),
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.getDocuments('company-1');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('briefing');
      expect(result[1].type).toBe('swot');
      expect(result[2].type).toBe('audience');
    });

    it('sollte leeres Array zurückgeben wenn keine Dokumente vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const result = await markenDNAService.getDocuments('company-1');

      expect(result).toEqual([]);
    });

    it('sollte leeres Array zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.getDocuments('company-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // CREATE/UPDATE/DELETE OPERATIONS
  // ============================================================================

  describe('createDocument', () => {
    it('sollte ein neues Marken-DNA Dokument erstellen', async () => {
      const firestore = require('firebase/firestore');
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: MarkenDNACreateData = {
        companyId: 'company-1',
        companyName: 'Test Company GmbH',
        type: 'briefing',
        content: '<h1>Briefing-Check</h1><p>Test content</p>',
        plainText: 'Briefing-Check\n\nTest content',
        status: 'draft',
        completeness: 50,
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      const result = await markenDNAService.createDocument(createData, context);

      expect(result).toBe('briefing');
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('sollte plainText automatisch aus content generieren wenn nicht gesetzt', async () => {
      const firestore = require('firebase/firestore');
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: MarkenDNACreateData = {
        companyId: 'company-1',
        companyName: 'Test Company GmbH',
        type: 'briefing',
        content: '<h1>Briefing-Check</h1><p>Test content</p>',
        // plainText nicht gesetzt
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await markenDNAService.createDocument(createData, context);

      expect(firestore.setDoc).toHaveBeenCalled();
      const callArgs = firestore.setDoc.mock.calls[0];
      const documentData = callArgs[1];
      expect(documentData.plainText).toBe('Briefing-CheckTest content');
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.setDoc.mockRejectedValue(new Error('Firestore error'));

      const createData: MarkenDNACreateData = {
        companyId: 'company-1',
        companyName: 'Test Company GmbH',
        type: 'briefing',
        content: 'Test content',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await expect(
        markenDNAService.createDocument(createData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('updateDocument', () => {
    it('sollte ein Marken-DNA Dokument aktualisieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      const updateData = {
        content: '<h1>Updated</h1>',
        status: 'completed' as const,
        completeness: 100,
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await markenDNAService.updateDocument('company-1', 'briefing', updateData, context);

      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it('sollte plainText aus content generieren wenn content aktualisiert wird', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      const updateData = {
        content: '<h1>Updated</h1><p>New content</p>',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await markenDNAService.updateDocument('company-1', 'briefing', updateData, context);

      const callArgs = firestore.updateDoc.mock.calls[0];
      const updatePayload = callArgs[1];
      expect(updatePayload.plainText).toBe('UpdatedNew content');
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockRejectedValue(new Error('Firestore error'));

      const updateData = { content: 'Updated' };
      const context = { organizationId: 'org-1', userId: 'user-1' };

      await expect(
        markenDNAService.updateDocument('company-1', 'briefing', updateData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteDocument', () => {
    it('sollte ein Marken-DNA Dokument löschen', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockResolvedValue(undefined);

      await markenDNAService.deleteDocument('company-1', 'briefing');

      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        markenDNAService.deleteDocument('company-1', 'briefing')
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteAllDocuments', () => {
    it('sollte alle Marken-DNA Dokumente eines Kunden löschen', async () => {
      const firestore = require('firebase/firestore');
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      firestore.writeBatch.mockReturnValue(mockBatch);

      await markenDNAService.deleteAllDocuments('company-1');

      expect(mockBatch.delete).toHaveBeenCalledTimes(6); // Alle 6 Dokumenttypen
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Batch error')),
      };
      firestore.writeBatch.mockReturnValue(mockBatch);

      await expect(
        markenDNAService.deleteAllDocuments('company-1')
      ).rejects.toThrow('Batch error');
    });
  });

  // ============================================================================
  // STATUS OPERATIONS
  // ============================================================================

  describe('getCompanyStatus', () => {
    it('sollte den korrekten Status für einen Kunden berechnen', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.getCompanyStatus('company-1');

      expect(result.companyId).toBe('company-1');
      expect(result.companyName).toBe('Test Company GmbH');
      expect(result.documents.briefing).toBe('completed');
      expect(result.documents.swot).toBe('completed');
      expect(result.documents.audience).toBe('missing');
      expect(result.completeness).toBe(100); // (100 + 100) / 2 = 100
      expect(result.isComplete).toBe(false);
    });

    it('sollte isComplete true zurückgeben wenn alle 6 Dokumente vorhanden', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
        createMockDocument('audience', 'company-1', 100),
        createMockDocument('positioning', 'company-1', 100),
        createMockDocument('goals', 'company-1', 100),
        createMockDocument('messages', 'company-1', 100),
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.getCompanyStatus('company-1');

      expect(result.isComplete).toBe(true);
      expect(result.completeness).toBe(100);
    });

    it('sollte lastUpdated korrekt setzen', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
      ];
      mockDocs[0].updatedAt = { seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 } as any;
      mockDocs[1].updatedAt = { seconds: 2000, nanoseconds: 0, toMillis: () => 2000000 } as any;

      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.getCompanyStatus('company-1');

      expect(result.lastUpdated?.seconds).toBe(2000); // Neuestes Dokument
    });
  });

  describe('getAllCustomersStatus', () => {
    it('sollte Status für alle Kunden einer Organisation laden', async () => {
      const firestore = require('firebase/firestore');

      // Mock für getDocs (Kunden-Liste)
      firestore.getDocs
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'company-1',
              data: () => ({ name: 'Company 1', type: 'customer', organizationId: 'org-1' }),
            },
            {
              id: 'company-2',
              data: () => ({ name: 'Company 2', type: 'customer', organizationId: 'org-1' }),
            },
          ],
        })
        // Mock für getDocs (Marken-DNA Dokumente Company 1)
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'briefing',
              data: () => createMockDocument('briefing', 'company-1', 100),
            },
          ],
        })
        // Mock für getDocs (Marken-DNA Dokumente Company 2)
        .mockResolvedValueOnce({
          docs: [],
        });

      const result = await markenDNAService.getAllCustomersStatus('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].companyId).toBe('company-1');
      expect(result[1].companyId).toBe('company-2');
    });

    it('sollte leeres Array zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.getAllCustomersStatus('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('isComplete', () => {
    it('sollte true zurückgeben wenn alle 6 Dokumente vorhanden', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
        createMockDocument('audience', 'company-1', 100),
        createMockDocument('positioning', 'company-1', 100),
        createMockDocument('goals', 'company-1', 100),
        createMockDocument('messages', 'company-1', 100),
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.isComplete('company-1');

      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn nicht alle Dokumente vorhanden', async () => {
      const mockDocs = [createMockDocument('briefing', 'company-1', 100)];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.isComplete('company-1');

      expect(result).toBe(false);
    });

    it('sollte false zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.isComplete('company-1');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  describe('exportForAI', () => {
    it('sollte alle Dokumente als Plain-Text exportieren', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
        createMockDocument('audience', 'company-1', 100),
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.exportForAI('company-1');

      expect(result).toContain('Briefing-Check');
      expect(result).toContain('SWOT-Analyse');
      expect(result).toContain('Zielgruppen-Radar');
      expect(result).toContain('Test content for briefing');
      expect(result).toContain('---'); // Separator
    });

    it('sollte Dokumente nach Reihenfolge sortieren', async () => {
      const mockDocs = [
        createMockDocument('goals', 'company-1', 100), // Order: 5
        createMockDocument('briefing', 'company-1', 100), // Order: 1
        createMockDocument('swot', 'company-1', 100), // Order: 2
      ];
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.exportForAI('company-1');

      // Briefing sollte vor SWOT und Goals kommen
      const briefingIndex = result.indexOf('Briefing-Check');
      const swotIndex = result.indexOf('SWOT-Analyse');
      const goalsIndex = result.indexOf('Ziele-Setzer');

      expect(briefingIndex).toBeLessThan(swotIndex);
      expect(swotIndex).toBeLessThan(goalsIndex);
    });

    it('sollte leeren String zurückgeben wenn keine Dokumente vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const result = await markenDNAService.exportForAI('company-1');

      expect(result).toBe('');
    });

    it('sollte leeren String zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.exportForAI('company-1');

      expect(result).toBe('');
    });
  });

  describe('computeMarkenDNAHash', () => {
    it('sollte einen Hash über alle Marken-DNA Dokumente berechnen', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
      ];
      mockDocs[0].updatedAt = { seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 } as any;
      mockDocs[1].updatedAt = { seconds: 2000, nanoseconds: 0, toMillis: () => 2000000 } as any;

      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const result = await markenDNAService.computeMarkenDNAHash('company-1');

      expect(result).toBe('abcdef1234567890'); // Erste 16 Zeichen
      expect(result).toHaveLength(16);
    });

    it('sollte konsistente Hashes für gleiche Dokumente erzeugen', async () => {
      const mockDocs = [
        createMockDocument('briefing', 'company-1', 100),
        createMockDocument('swot', 'company-1', 100),
      ];
      mockDocs[0].updatedAt = { seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 } as any;
      mockDocs[1].updatedAt = { seconds: 2000, nanoseconds: 0, toMillis: () => 2000000 } as any;

      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      });

      const hash1 = await markenDNAService.computeMarkenDNAHash('company-1');
      const hash2 = await markenDNAService.computeMarkenDNAHash('company-1');

      expect(hash1).toBe(hash2);
    });

    it('sollte leeren String zurückgeben wenn keine Dokumente vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const result = await markenDNAService.computeMarkenDNAHash('company-1');

      expect(result).toBe('');
    });

    it('sollte leeren String zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await markenDNAService.computeMarkenDNAHash('company-1');

      expect(result).toBe('');
    });
  });
});
