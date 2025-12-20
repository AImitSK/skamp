// src/lib/firebase/__tests__/kernbotschaft-service.test.ts
import { kernbotschaftService } from '../kernbotschaft-service';
import { Kernbotschaft, KernbotschaftCreateData } from '@/types/kernbotschaft';
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
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock db
jest.mock('../client-init', () => ({
  db: {},
}));

// Mock-Daten Helper
const createMockKernbotschaft = (
  projectId: string = 'project-1',
  companyId: string = 'company-1'
): Kernbotschaft => ({
  id: 'kernbotschaft-1',
  projectId,
  companyId,
  organizationId: 'org-1',
  occasion: 'Produktlaunch des neuen Maschinensystems XY-3000',
  goal: 'Technologieführerschaft kommunizieren und Vertrauen bei Entscheidern aufbauen',
  keyMessage: 'Innovation trifft Präzision: Das XY-3000 setzt neue Maßstäbe in der Wickeltechnik',
  content: '<h1>Kernbotschaft</h1><p>Detaillierte Ausarbeitung der Kernbotschaft...</p>',
  plainText: 'Kernbotschaft\n\nDetaillierte Ausarbeitung der Kernbotschaft...',
  status: 'completed',
  chatHistory: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Wir launchen ein neues Produkt',
      timestamp: { seconds: 1000, nanoseconds: 0 } as Timestamp,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Verstanden. Erzählen Sie mir mehr über das Produkt...',
      timestamp: { seconds: 1001, nanoseconds: 0 } as Timestamp,
    },
  ],
  createdAt: { seconds: 1000, nanoseconds: 0 } as Timestamp,
  updatedAt: { seconds: 2000, nanoseconds: 0 } as Timestamp,
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

describe('KernbotschaftService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET OPERATIONS
  // ============================================================================

  describe('getKernbotschaft', () => {
    it('sollte eine einzelne Kernbotschaft laden', async () => {
      const mockKernbotschaft = createMockKernbotschaft();
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        id: 'kernbotschaft-1',
        data: () => mockKernbotschaft,
        exists: () => true,
      });

      const result = await kernbotschaftService.getKernbotschaft('project-1', 'kernbotschaft-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('kernbotschaft-1');
      expect(result?.projectId).toBe('project-1');
      expect(result?.occasion).toBe('Produktlaunch des neuen Maschinensystems XY-3000');
      expect(firestore.doc).toHaveBeenCalled();
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it('sollte null zurückgeben wenn Kernbotschaft nicht existiert', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await kernbotschaftService.getKernbotschaft('project-1', 'kernbotschaft-1');

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await kernbotschaftService.getKernbotschaft('project-1', 'kernbotschaft-1');

      expect(result).toBeNull();
    });
  });

  describe('getKernbotschaftByProject', () => {
    it('sollte die Kernbotschaft eines Projekts laden', async () => {
      const mockKernbotschaft = createMockKernbotschaft();
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'kernbotschaft-1',
            data: () => mockKernbotschaft,
          },
        ],
      });

      const result = await kernbotschaftService.getKernbotschaftByProject('project-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('kernbotschaft-1');
      expect(result?.projectId).toBe('project-1');
    });

    it('sollte null zurückgeben wenn keine Kernbotschaft vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await kernbotschaftService.getKernbotschaftByProject('project-1');

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await kernbotschaftService.getKernbotschaftByProject('project-1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE/UPDATE/DELETE OPERATIONS
  // ============================================================================

  describe('createKernbotschaft', () => {
    it('sollte eine neue Kernbotschaft erstellen', async () => {
      const firestore = require('firebase/firestore');
      const mockDocRef = { id: 'new-kernbotschaft-id' };

      firestore.doc.mockReturnValue(mockDocRef);
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: KernbotschaftCreateData = {
        projectId: 'project-1',
        companyId: 'company-1',
        occasion: 'Produktlaunch',
        goal: 'Bekanntheit steigern',
        keyMessage: 'Innovation trifft Qualität',
        content: '<h1>Kernbotschaft</h1>',
        plainText: 'Kernbotschaft',
        status: 'draft',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      const result = await kernbotschaftService.createKernbotschaft(createData, context);

      expect(result).toBe('new-kernbotschaft-id');
      expect(firestore.setDoc).toHaveBeenCalled();

      const callArgs = firestore.setDoc.mock.calls[0];
      const kernbotschaftData = callArgs[1];
      expect(kernbotschaftData.occasion).toBe('Produktlaunch');
      expect(kernbotschaftData.goal).toBe('Bekanntheit steigern');
      expect(kernbotschaftData.keyMessage).toBe('Innovation trifft Qualität');
    });

    it('sollte plainText automatisch aus content generieren wenn nicht gesetzt', async () => {
      const firestore = require('firebase/firestore');
      const mockDocRef = { id: 'new-kernbotschaft-id' };

      firestore.doc.mockReturnValue(mockDocRef);
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: KernbotschaftCreateData = {
        projectId: 'project-1',
        companyId: 'company-1',
        occasion: 'Produktlaunch',
        goal: 'Bekanntheit steigern',
        keyMessage: 'Innovation trifft Qualität',
        content: '<h1>Kernbotschaft</h1><p>Test content</p>',
        // plainText nicht gesetzt
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await kernbotschaftService.createKernbotschaft(createData, context);

      const callArgs = firestore.setDoc.mock.calls[0];
      const kernbotschaftData = callArgs[1];
      expect(kernbotschaftData.plainText).toBe('KernbotschaftTest content');
    });

    it('sollte chatHistory als leeres Array setzen wenn nicht angegeben', async () => {
      const firestore = require('firebase/firestore');
      const mockDocRef = { id: 'new-kernbotschaft-id' };

      firestore.doc.mockReturnValue(mockDocRef);
      firestore.setDoc.mockResolvedValue(undefined);

      const createData: KernbotschaftCreateData = {
        projectId: 'project-1',
        companyId: 'company-1',
        occasion: 'Produktlaunch',
        goal: 'Bekanntheit steigern',
        keyMessage: 'Innovation',
        content: 'Test',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await kernbotschaftService.createKernbotschaft(createData, context);

      const callArgs = firestore.setDoc.mock.calls[0];
      const kernbotschaftData = callArgs[1];
      expect(kernbotschaftData.chatHistory).toEqual([]);
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      const mockDocRef = { id: 'new-kernbotschaft-id' };

      firestore.doc.mockReturnValue(mockDocRef);
      firestore.setDoc.mockRejectedValue(new Error('Firestore error'));

      const createData: KernbotschaftCreateData = {
        projectId: 'project-1',
        companyId: 'company-1',
        occasion: 'Test',
        goal: 'Test',
        keyMessage: 'Test',
        content: 'Test',
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await expect(
        kernbotschaftService.createKernbotschaft(createData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('updateKernbotschaft', () => {
    it('sollte eine Kernbotschaft aktualisieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      const updateData = {
        occasion: 'Updated occasion',
        goal: 'Updated goal',
        status: 'completed' as const,
      };

      const context = {
        organizationId: 'org-1',
        userId: 'user-1',
      };

      await kernbotschaftService.updateKernbotschaft('project-1', 'kernbotschaft-1', updateData, context);

      expect(firestore.updateDoc).toHaveBeenCalled();

      const callArgs = firestore.updateDoc.mock.calls[0];
      const updatePayload = callArgs[1];
      expect(updatePayload.occasion).toBe('Updated occasion');
      expect(updatePayload.goal).toBe('Updated goal');
      expect(updatePayload.status).toBe('completed');
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

      await kernbotschaftService.updateKernbotschaft('project-1', 'kernbotschaft-1', updateData, context);

      const callArgs = firestore.updateDoc.mock.calls[0];
      const updatePayload = callArgs[1];
      expect(updatePayload.plainText).toBe('UpdatedNew content');
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockRejectedValue(new Error('Firestore error'));

      const updateData = { occasion: 'Updated' };
      const context = { organizationId: 'org-1', userId: 'user-1' };

      await expect(
        kernbotschaftService.updateKernbotschaft('project-1', 'kernbotschaft-1', updateData, context)
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('deleteKernbotschaft', () => {
    it('sollte eine Kernbotschaft löschen', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockResolvedValue(undefined);

      await kernbotschaftService.deleteKernbotschaft('project-1', 'kernbotschaft-1');

      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        kernbotschaftService.deleteKernbotschaft('project-1', 'kernbotschaft-1')
      ).rejects.toThrow('Firestore error');
    });
  });

  // ============================================================================
  // EXPORT OPERATION
  // ============================================================================

  describe('exportForAI', () => {
    it('sollte Kernbotschaft als Plain-Text für KI exportieren', async () => {
      const mockKernbotschaft = createMockKernbotschaft();
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'kernbotschaft-1',
            data: () => mockKernbotschaft,
          },
        ],
      });

      const result = await kernbotschaftService.exportForAI('project-1');

      expect(result).toContain('ANLASS');
      expect(result).toContain('Produktlaunch des neuen Maschinensystems XY-3000');
      expect(result).toContain('ZIEL');
      expect(result).toContain('Technologieführerschaft kommunizieren');
      expect(result).toContain('TEILBOTSCHAFT');
      expect(result).toContain('Innovation trifft Präzision');
      expect(result).toContain('DOKUMENT');
      expect(result).toContain('---'); // Separator
    });

    it('sollte nur vorhandene Felder exportieren', async () => {
      const mockKernbotschaft = createMockKernbotschaft();
      // Occasion entfernen
      mockKernbotschaft.occasion = '';

      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'kernbotschaft-1',
            data: () => mockKernbotschaft,
          },
        ],
      });

      const result = await kernbotschaftService.exportForAI('project-1');

      expect(result).not.toContain('ANLASS');
      expect(result).toContain('ZIEL');
      expect(result).toContain('TEILBOTSCHAFT');
      expect(result).toContain('DOKUMENT');
    });

    it('sollte leeren String zurückgeben wenn keine Kernbotschaft vorhanden', async () => {
      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await kernbotschaftService.exportForAI('project-1');

      expect(result).toBe('');
    });

    it('sollte leeren String zurückgeben bei Firestore-Fehler', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await kernbotschaftService.exportForAI('project-1');

      expect(result).toBe('');
    });

    it('sollte alle Abschnitte korrekt formatieren', async () => {
      const mockKernbotschaft: Kernbotschaft = {
        id: 'kernbotschaft-1',
        projectId: 'project-1',
        companyId: 'company-1',
        organizationId: 'org-1',
        occasion: 'Test Occasion',
        goal: 'Test Goal',
        keyMessage: 'Test Key Message',
        content: '<p>Full content</p>',
        plainText: 'Full content',
        status: 'completed',
        createdAt: { seconds: 1000, nanoseconds: 0 } as Timestamp,
        updatedAt: { seconds: 2000, nanoseconds: 0 } as Timestamp,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      const firestore = require('firebase/firestore');

      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'kernbotschaft-1',
            data: () => mockKernbotschaft,
          },
        ],
      });

      const result = await kernbotschaftService.exportForAI('project-1');

      // Prüfen dass alle Sektionen vorhanden sind
      expect(result).toContain('ANLASS\nTest Occasion');
      expect(result).toContain('ZIEL\nTest Goal');
      expect(result).toContain('TEILBOTSCHAFT\nTest Key Message');
      expect(result).toContain('DOKUMENT\nFull content');

      // Prüfen dass Separatoren korrekt sind
      const separators = result.match(/\n\n---\n\n/g);
      expect(separators).toHaveLength(3); // 4 Sektionen = 3 Separatoren
    });
  });
});
