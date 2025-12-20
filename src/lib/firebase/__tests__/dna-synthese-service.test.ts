// src/lib/firebase/__tests__/dna-synthese-service.test.ts
import { dnaSyntheseService } from '../dna-synthese-service';
import { markenDNAService } from '../marken-dna-service';
import { DNASynthese, DNASyntheseCreateData } from '@/types/dna-synthese';
import { Timestamp } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock db
jest.mock('../client-init', () => ({
  db: {},
}));

// Mock markenDNAService
jest.mock('../marken-dna-service', () => ({
  markenDNAService: {
    exportForAI: jest.fn(),
    computeMarkenDNAHash: jest.fn(),
  },
}));

// Mock-Daten Helper
const createMockSynthese = (
  companyId: string = 'company-1',
  markenDNAVersion: string = 'abc123'
): DNASynthese => ({
  id: 'synthesis',
  companyId,
  organizationId: 'org-1',
  content: '<h1>DNA Synthese</h1><p>Kompakte Zusammenfassung der Marken-DNA</p>',
  plainText: 'DNA Synthese\n\nKompakte Zusammenfassung der Marken-DNA',
  synthesizedAt: { seconds: 1000, nanoseconds: 0 } as Timestamp,
  synthesizedFrom: ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'],
  markenDNAVersion,
  manuallyEdited: false,
  createdAt: { seconds: 1000, nanoseconds: 0 } as Timestamp,
  updatedAt: { seconds: 2000, nanoseconds: 0 } as Timestamp,
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

describe('DNASyntheseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET OPERATIONS
  // ============================================================================

  describe('getSynthese', () => {
    it('sollte die DNA Synthese eines Kunden laden', async () => {
      const mockSynthese = createMockSynthese();
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        id: 'synthesis',
        data: () => mockSynthese,
        exists: () => true,
      });

      const result = await dnaSyntheseService.getSynthese('company-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('synthesis');
      expect(result?.companyId).toBe('company-1');
      expect(result?.synthesizedFrom).toHaveLength(6);
      expect(firestore.doc).toHaveBeenCalled();
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it('sollte null zurückgeben wenn Synthese nicht existiert', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await dnaSyntheseService.getSynthese('company-1');

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await dnaSyntheseService.getSynthese('company-1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE/UPDATE/DELETE OPERATIONS
  // ============================================================================

  describe('createSynthese', () => {
    it('sollte eine neue DNA Synthese erstellen', async () => {
      const firestore = require('firebase/firestore');
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: DNASyntheseCreateData = {
        companyId: 'company-1',
        content: '<h1>DNA Synthese</h1>',
        plainText: 'DNA Synthese',
        synthesizedFrom: ['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages'],
        markenDNAVersion: 'abc123',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      const result = await dnaSyntheseService.createSynthese(createData, context);

      expect(result).toBe('synthesis');
      expect(firestore.setDoc).toHaveBeenCalled();

      const callArgs = firestore.setDoc.mock.calls[0];
      const syntheseData = callArgs[1];
      expect(syntheseData.manuallyEdited).toBe(false);
      expect(syntheseData.companyId).toBe('company-1');
      expect(syntheseData.markenDNAVersion).toBe('abc123');
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.setDoc.mockRejectedValue(new Error('Firestore error'));

      const createData: DNASyntheseCreateData = {
        companyId: 'company-1',
        content: 'Test',
        plainText: 'Test',
        synthesizedFrom: ['briefing'],
        markenDNAVersion: 'abc123',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await expect(
        dnaSyntheseService.createSynthese(createData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('updateSynthese', () => {
    it('sollte eine DNA Synthese aktualisieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      const updateData = {
        content: '<h1>Updated</h1>',
        plainText: 'Updated',
        manuallyEdited: true,
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await dnaSyntheseService.updateSynthese('company-1', updateData, context);

      expect(firestore.updateDoc).toHaveBeenCalled();

      const callArgs = firestore.updateDoc.mock.calls[0];
      const updatePayload = callArgs[1];
      expect(updatePayload.manuallyEdited).toBe(true);
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockRejectedValue(new Error('Firestore error'));

      const updateData = { content: 'Updated' };
      const context = { organizationId: 'org-1', userId: 'user-1' };

      await expect(
        dnaSyntheseService.updateSynthese('company-1', updateData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteSynthese', () => {
    it('sollte die DNA Synthese löschen', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockResolvedValue(undefined);

      await dnaSyntheseService.deleteSynthese('company-1');

      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        dnaSyntheseService.deleteSynthese('company-1')
      ).rejects.toThrow('Firestore error');
    });
  });

  // ============================================================================
  // SYNTHESIZE OPERATION
  // ============================================================================

  describe('synthesize', () => {
    it('sollte eine DNA Synthese aus Marken-DNA Dokumenten erstellen', async () => {
      const firestore = require('firebase/firestore');
      const mockMarkenDNAService = markenDNAService as jest.Mocked<typeof markenDNAService>;

      // Mock exportForAI
      mockMarkenDNAService.exportForAI.mockResolvedValue(
        '# Briefing-Check\n\nTest content\n\n---\n\n# SWOT-Analyse\n\nTest content'
      );

      // Mock computeMarkenDNAHash
      mockMarkenDNAService.computeMarkenDNAHash.mockResolvedValue('abc123');

      // Mock setDoc
      firestore.setDoc.mockResolvedValue(undefined);

      // Mock getDoc (für die Rückgabe nach dem Erstellen)
      const mockSynthese = createMockSynthese('company-1', 'abc123');
      firestore.getDoc.mockResolvedValue({
        id: 'synthesis',
        data: () => mockSynthese,
        exists: () => true,
      });

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      const result = await dnaSyntheseService.synthesize('company-1', context);

      expect(result).not.toBeNull();
      expect(result.companyId).toBe('company-1');
      expect(result.markenDNAVersion).toBe('abc123');
      expect(result.synthesizedFrom).toHaveLength(6);

      // Prüfen dass exportForAI aufgerufen wurde
      expect(mockMarkenDNAService.exportForAI).toHaveBeenCalledWith('company-1');

      // Prüfen dass computeMarkenDNAHash aufgerufen wurde
      expect(mockMarkenDNAService.computeMarkenDNAHash).toHaveBeenCalledWith('company-1');

      // Prüfen dass setDoc aufgerufen wurde
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen wenn keine Marken-DNA Dokumente vorhanden', async () => {
      const mockMarkenDNAService = markenDNAService as jest.Mocked<typeof markenDNAService>;

      // Mock exportForAI - leerer String
      mockMarkenDNAService.exportForAI.mockResolvedValue('');

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await expect(
        dnaSyntheseService.synthesize('company-1', context)
      ).rejects.toThrow('Keine Marken-DNA Dokumente gefunden');
    });

    it('sollte Fehler werfen wenn Synthese nicht geladen werden kann', async () => {
      const firestore = require('firebase/firestore');
      const mockMarkenDNAService = markenDNAService as jest.Mocked<typeof markenDNAService>;

      // Mock exportForAI
      mockMarkenDNAService.exportForAI.mockResolvedValue('Test content');

      // Mock computeMarkenDNAHash
      mockMarkenDNAService.computeMarkenDNAHash.mockResolvedValue('abc123');

      // Mock setDoc
      firestore.setDoc.mockResolvedValue(undefined);

      // Mock getDoc - Synthese nicht gefunden
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await expect(
        dnaSyntheseService.synthesize('company-1', context)
      ).rejects.toThrow('DNA Synthese konnte nicht geladen werden');
    });
  });

  // ============================================================================
  // OUTDATED CHECK
  // ============================================================================

  describe('isOutdated', () => {
    it('sollte false zurückgeben wenn Synthese aktuell ist', async () => {
      const firestore = require('firebase/firestore');
      const mockMarkenDNAService = markenDNAService as jest.Mocked<typeof markenDNAService>;

      const mockSynthese = createMockSynthese('company-1', 'abc123');
      firestore.getDoc.mockResolvedValue({
        id: 'synthesis',
        data: () => mockSynthese,
        exists: () => true,
      });

      // Mock computeMarkenDNAHash - gleicher Hash wie in Synthese
      mockMarkenDNAService.computeMarkenDNAHash.mockResolvedValue('abc123');

      const result = await dnaSyntheseService.isOutdated('company-1');

      expect(result).toBe(false);
    });

    it('sollte true zurückgeben wenn Marken-DNA geändert wurde', async () => {
      const firestore = require('firebase/firestore');
      const mockMarkenDNAService = markenDNAService as jest.Mocked<typeof markenDNAService>;

      const mockSynthese = createMockSynthese('company-1', 'abc123');
      firestore.getDoc.mockResolvedValue({
        id: 'synthesis',
        data: () => mockSynthese,
        exists: () => true,
      });

      // Mock computeMarkenDNAHash - anderer Hash (Marken-DNA wurde geändert)
      mockMarkenDNAService.computeMarkenDNAHash.mockResolvedValue('xyz789');

      const result = await dnaSyntheseService.isOutdated('company-1');

      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn keine Synthese vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await dnaSyntheseService.isOutdated('company-1');

      expect(result).toBe(false); // Nicht veraltet, aber auch nicht vorhanden
    });

    it('sollte false zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await dnaSyntheseService.isOutdated('company-1');

      expect(result).toBe(false);
    });
  });
});
