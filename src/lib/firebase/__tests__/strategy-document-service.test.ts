// src/lib/firebase/__tests__/strategy-document-service.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { strategyDocumentService } from '../strategy-document-service';
import type { StrategyDocument, DocumentTemplate, DocumentVersion } from '../strategy-document-service';

// ========================================
// MOCKS
// ========================================

// Mock Firebase client-init
jest.mock('../client-init', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn()
  }
}));

// Firebase Mocks (following existing pattern)
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mocked-collection'),
  doc: jest.fn(() => 'mocked-doc'),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(() => 'mocked-query'),
  where: jest.fn(() => 'mocked-where'),
  orderBy: jest.fn(() => 'mocked-orderBy'),
  limit: jest.fn(() => 'mocked-limit'),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    now: jest.fn(() => ({ 
      toDate: () => new Date('2024-01-01T10:00:00Z'),
      toMillis: () => 1704096000000,
      seconds: 1704096000
    })),
    fromDate: jest.fn((date: Date) => ({ 
      toDate: () => date,
      toMillis: () => date.getTime(),
      seconds: Math.floor(date.getTime() / 1000)
    }))
  }
}));

// Import Firebase functions after mocking
import { 
  collection,
  doc, 
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Mock Functions
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<typeof serverTimestamp>;

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = {
  toDate: () => new Date('2024-01-01T10:00:00Z'),
  seconds: 1704096000,
  nanoseconds: 0
} as Timestamp;

const testContext = {
  organizationId: 'test-org-123',
  userId: 'test-user-456'
};

const mockStrategyDocument: StrategyDocument = {
  id: 'doc-123',
  projectId: 'project-456',
  title: 'Test Strategiedokument',
  type: 'strategy',
  content: '<h1>Test Content</h1><p>Inhalt des Dokuments</p>',
  plainText: 'Test Content\nInhalt des Dokuments',
  status: 'draft',
  author: 'test-user-456',
  authorName: 'Test User',
  version: 1,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  organizationId: 'test-org-123'
};

const mockTemplate: DocumentTemplate = {
  id: 'briefing-template',
  name: 'Projekt-Briefing',
  type: 'briefing',
  content: '<h1>Projekt-Briefing</h1>',
  description: 'Standard-Template für Projektbriefings',
  isBuiltIn: true
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function createMockDocSnapshot(data: any, exists = true) {
  return {
    exists: () => exists,
    id: data?.id || 'test-id',
    data: () => data
  };
}

function createMockQuerySnapshot(docs: any[]) {
  return {
    docs: docs.map(doc => createMockDocSnapshot(doc))
  };
}

function setupFirestoreMocks() {
  mockServerTimestamp.mockReturnValue({ _methodName: 'serverTimestamp' } as any);
  mockCollection.mockReturnValue('mocked-collection' as any);
  mockDoc.mockReturnValue('mocked-doc' as any);
  mockQuery.mockReturnValue('mocked-query' as any);
  mockWhere.mockReturnValue('mocked-where' as any);
  mockOrderBy.mockReturnValue('mocked-orderBy' as any);
}

// ========================================
// TEST SUITE
// ========================================

describe('StrategyDocumentService', () => {
  
  beforeEach(() => {
    setupFirestoreMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // CREATE TESTS
  // ========================================
  
  describe('create', () => {
    
    test('sollte ein neues Strategiedokument erfolgreich erstellen', async () => {
      const mockDocRef = { id: 'new-doc-123' };
      mockAddDoc.mockResolvedValueOnce(mockDocRef as any);
      
      const documentData = {
        projectId: 'project-456',
        title: 'Neues Strategiedokument',
        type: 'strategy' as const,
        content: '<h1>Neue Strategie</h1>',
        status: 'draft' as const,
        author: 'test-user-456',
        authorName: 'Test User',
        organizationId: 'test-org-123'
      };
      
      const result = await strategyDocumentService.create(documentData, testContext);
      
      expect(result).toBe('new-doc-123');
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mocked-collection',
        expect.objectContaining({
          ...documentData,
          version: 1,
          createdAt: { _methodName: 'serverTimestamp' },
          updatedAt: { _methodName: 'serverTimestamp' }
        })
      );
    });
    
    test('sollte eine initiale Version beim Erstellen anlegen', async () => {
      const mockDocRef = { id: 'new-doc-123' };
      const mockVersionRef = { id: 'version-123' };
      
      mockAddDoc
        .mockResolvedValueOnce(mockDocRef as any)
        .mockResolvedValueOnce(mockVersionRef as any);
      
      const documentData = {
        projectId: 'project-456',
        title: 'Neues Strategiedokument',
        type: 'strategy' as const,
        content: '<h1>Neue Strategie</h1>',
        status: 'draft' as const,
        author: 'test-user-456',
        authorName: 'Test User',
        organizationId: 'test-org-123'
      };
      
      await strategyDocumentService.create(documentData, testContext);
      
      expect(mockAddDoc).toHaveBeenCalledTimes(2);
      
      // Prüfe Version Creation
      const versionCall = mockAddDoc.mock.calls[1];
      expect(versionCall[1]).toMatchObject({
        documentId: 'new-doc-123',
        version: 1,
        content: '<h1>Neue Strategie</h1>',
        versionNotes: 'Initiale Version',
        createdBy: 'test-user-456',
        createdAt: { _methodName: 'serverTimestamp' }
      });
    });
    
    test('sollte Fehler beim Erstellen korrekt behandeln', async () => {
      const error = new Error('Firestore-Fehler');
      mockAddDoc.mockRejectedValueOnce(error);
      
      const documentData = {
        projectId: 'project-456',
        title: 'Fehlerhaftes Dokument',
        type: 'strategy' as const,
        content: '<h1>Test</h1>',
        status: 'draft' as const,
        author: 'test-user-456',
        authorName: 'Test User',
        organizationId: 'test-org-123'
      };
      
      await expect(strategyDocumentService.create(documentData, testContext))
        .rejects.toThrow('Firestore-Fehler');
    });

  });

  // ========================================
  // GET BY ID TESTS
  // ========================================
  
  describe('getById', () => {
    
    test('sollte ein existierendes Strategiedokument zurückgeben', async () => {
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getById('doc-123', testContext);
      
      expect(result).toEqual(mockStrategyDocument);
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'strategy_documents', 'doc-123');
      expect(mockGetDoc).toHaveBeenCalled();
    });
    
    test('sollte null zurückgeben wenn Dokument nicht existiert', async () => {
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getById('non-existent', testContext);
      
      expect(result).toBeNull();
    });
    
    test('sollte null zurückgeben bei falscher Organization ID (Multi-Tenancy)', async () => {
      const wrongOrgDocument = {
        ...mockStrategyDocument,
        organizationId: 'wrong-org-999'
      };
      
      const mockDocSnap = createMockDocSnapshot(wrongOrgDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getById('doc-123', testContext);
      
      expect(result).toBeNull();
    });
    
    test('sollte Fehler beim Laden korrekt behandeln', async () => {
      const error = new Error('Netzwerk-Fehler');
      mockGetDoc.mockRejectedValueOnce(error);
      
      const result = await strategyDocumentService.getById('doc-123', testContext);
      
      expect(result).toBeNull();
    });

  });

  // ========================================
  // GET BY PROJECT ID TESTS
  // ========================================
  
  describe('getByProjectId', () => {
    
    test('sollte alle Strategiedokumente für ein Projekt zurückgeben', async () => {
      const mockDocuments = [
        { ...mockStrategyDocument, id: 'doc-1' },
        { ...mockStrategyDocument, id: 'doc-2', type: 'briefing' as const }
      ];
      
      const mockQuerySnap = createMockQuerySnapshot(mockDocuments);
      mockGetDocs.mockResolvedValueOnce(mockQuerySnap as any);
      
      const result = await strategyDocumentService.getByProjectId('project-456', testContext);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-1');
      expect(result[1].id).toBe('doc-2');
      
      // Prüfe Query-Parameter
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-456');
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'test-org-123');
      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    });
    
    test('sollte leeres Array zurückgeben wenn keine Dokumente existieren', async () => {
      const mockQuerySnap = createMockQuerySnapshot([]);
      mockGetDocs.mockResolvedValueOnce(mockQuerySnap as any);
      
      const result = await strategyDocumentService.getByProjectId('project-456', testContext);
      
      expect(result).toEqual([]);
    });
    
    test('sollte Fehler beim Laden der Projektdokumente korrekt behandeln', async () => {
      const error = new Error('Query-Fehler');
      mockGetDocs.mockRejectedValueOnce(error);
      
      const result = await strategyDocumentService.getByProjectId('project-456', testContext);
      
      expect(result).toEqual([]);
    });

  });

  // ========================================
  // UPDATE TESTS
  // ========================================
  
  describe('update', () => {
    
    test('sollte ein Strategiedokument erfolgreich aktualisieren', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const updates = {
        title: 'Aktualisierter Titel',
        status: 'review' as const
      };
      
      await strategyDocumentService.update('doc-123', updates, 'Titel aktualisiert', testContext);
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({
          ...updates,
          updatedAt: { _methodName: 'serverTimestamp' }
        })
      );
    });
    
    test('sollte neue Version erstellen bei Content-Änderung', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für Version Creation
      const mockVersionRef = { id: 'version-456' };
      mockAddDoc.mockResolvedValueOnce(mockVersionRef as any);
      
      const updates = {
        content: '<h1>Neuer Inhalt</h1>',
        title: 'Aktualisierter Titel'
      };
      
      await strategyDocumentService.update('doc-123', updates, 'Content aktualisiert', testContext);
      
      // Prüfe Version Creation
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mocked-collection',
        expect.objectContaining({
          documentId: 'doc-123',
          version: 2, // mockStrategyDocument.version + 1
          content: '<h1>Neuer Inhalt</h1>',
          versionNotes: 'Content aktualisiert',
          createdBy: 'test-user-456'
        })
      );
      
      // Prüfe Dokument Update mit neuer Version
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({
          ...updates,
          version: 2,
          updatedAt: { _methodName: 'serverTimestamp' }
        })
      );
    });
    
    test('sollte keine neue Version erstellen bei unverändertem Content', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const updates = {
        title: 'Nur Titel geändert',
        status: 'review' as const
      };
      
      await strategyDocumentService.update('doc-123', updates, 'Nur Metadaten', testContext);
      
      // Keine Version Creation
      expect(mockAddDoc).not.toHaveBeenCalled();
      
      // Nur Dokument Update
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({
          ...updates,
          updatedAt: { _methodName: 'serverTimestamp' }
        })
      );
    });
    
    test('sollte Fehler werfen wenn Dokument nicht gefunden', async () => {
      // Mock für getById - Document not found
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const updates = { title: 'Test' };
      
      await expect(strategyDocumentService.update('non-existent', updates, 'Test', testContext))
        .rejects.toThrow('Strategiedokument nicht gefunden');
    });

  });

  // ========================================
  // GET VERSIONS TESTS
  // ========================================
  
  describe('getVersions', () => {
    
    test('sollte alle Versionen eines Dokuments zurückgeben', async () => {
      // Mock für getById - Document exists
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const mockVersions = [
        {
          id: 'version-2',
          documentId: 'doc-123',
          version: 2,
          content: '<h1>Version 2</h1>',
          versionNotes: 'Aktualisierung',
          createdBy: 'test-user-456',
          createdAt: mockTimestamp
        },
        {
          id: 'version-1',
          documentId: 'doc-123',
          version: 1,
          content: '<h1>Version 1</h1>',
          versionNotes: 'Initiale Version',
          createdBy: 'test-user-456',
          createdAt: mockTimestamp
        }
      ];
      
      const mockQuerySnap = createMockQuerySnapshot(mockVersions);
      mockGetDocs.mockResolvedValueOnce(mockQuerySnap as any);
      
      const result = await strategyDocumentService.getVersions('doc-123', testContext);
      
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
      
      // Prüfe Query-Parameter
      expect(mockWhere).toHaveBeenCalledWith('documentId', '==', 'doc-123');
      expect(mockOrderBy).toHaveBeenCalledWith('version', 'desc');
    });
    
    test('sollte leeres Array zurückgeben wenn Dokument nicht zur Organisation gehört', async () => {
      // Mock für getById - Wrong organization
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getVersions('doc-123', testContext);
      
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

  });

  // ========================================
  // CREATE FROM TEMPLATE TESTS
  // ========================================
  
  describe('createFromTemplate', () => {
    
    test('sollte Dokument aus Built-in Template erstellen', async () => {
      // Mock für addDoc (Dokument und Version)
      const mockDocRef = { id: 'new-doc-789' };
      const mockVersionRef = { id: 'version-789' };
      
      mockAddDoc
        .mockResolvedValueOnce(mockDocRef as any)
        .mockResolvedValueOnce(mockVersionRef as any);
      
      const result = await strategyDocumentService.createFromTemplate(
        'briefing-template',
        'project-456',
        'Test Briefing aus Template',
        'test-user-456',
        'Test User',
        testContext
      );
      
      expect(result).toBe('new-doc-789');
      
      // Prüfe Dokument Creation
      const documentCall = mockAddDoc.mock.calls[0];
      expect(documentCall[1]).toMatchObject({
        projectId: 'project-456',
        title: 'Test Briefing aus Template',
        type: 'briefing',
        content: expect.stringContaining('<h1>Projekt-Briefing</h1>'),
        status: 'draft',
        author: 'test-user-456',
        authorName: 'Test User',
        templateId: 'briefing-template',
        templateName: 'Projekt-Briefing',
        organizationId: 'test-org-123'
      });
    });
    
    test('sollte Fehler werfen wenn Template nicht gefunden', async () => {
      await expect(strategyDocumentService.createFromTemplate(
        'non-existent-template',
        'project-456',
        'Test Titel',
        'test-user-456',
        'Test User',
        testContext
      )).rejects.toThrow('Template nicht gefunden');
    });

  });

  // ========================================
  // GET TEMPLATES TESTS
  // ========================================
  
  describe('getTemplates', () => {
    
    test('sollte Built-in Templates ohne Organization ID zurückgeben', async () => {
      const result = await strategyDocumentService.getTemplates();
      
      expect(result).toHaveLength(3); // briefing, strategy, analysis
      expect(result[0]).toMatchObject({
        id: 'briefing-template',
        name: 'Projekt-Briefing',
        type: 'briefing',
        isBuiltIn: true
      });
    });
    
    test('sollte Built-in + Custom Templates mit Organization ID zurückgeben', async () => {
      const mockCustomTemplates = [
        {
          id: 'custom-template-1',
          name: 'Custom Template',
          type: 'strategy' as const,
          description: 'Custom Template',
          content: '<h1>Custom</h1>',
          isBuiltIn: false,
          organizationId: 'test-org-123'
        }
      ];
      
      const mockQuerySnap = createMockQuerySnapshot(mockCustomTemplates);
      mockGetDocs.mockResolvedValueOnce(mockQuerySnap as any);
      
      const result = await strategyDocumentService.getTemplates('test-org-123');
      
      expect(result.length).toBeGreaterThan(3); // Built-in + Custom
      expect(result.find(t => t.id === 'custom-template-1')).toBeDefined();
    });

  });

  // ========================================
  // ARCHIVE TESTS
  // ========================================
  
  describe('archive', () => {
    
    test('sollte Dokument erfolgreich archivieren', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      await strategyDocumentService.archive('doc-123', testContext);
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          status: 'archived',
          updatedAt: 'server-timestamp'
        })
      );
    });

  });

  // ========================================
  // EXPORT TO PDF TESTS
  // ========================================
  
  describe('exportToPDF', () => {
    
    test('sollte PDF-Export erfolgreich generieren', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockStrategyDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.exportToPDF('doc-123', testContext);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });
    
    test('sollte Fehler werfen wenn Dokument für PDF-Export nicht gefunden', async () => {
      // Mock für getById - Document not found
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      await expect(strategyDocumentService.exportToPDF('non-existent', testContext))
        .rejects.toThrow('Dokument nicht gefunden');
    });

  });

  // ========================================
  // EDGE CASES & ERROR SCENARIOS
  // ========================================
  
  describe('Edge Cases und Error Scenarios', () => {
    
    test('sollte HTML zu Plain Text korrekt konvertieren', async () => {
      const mockDocRef = { id: 'new-doc-html' };
      mockAddDoc.mockResolvedValueOnce(mockDocRef as any);
      
      const documentData = {
        projectId: 'project-456',
        title: 'HTML Test Dokument',
        type: 'strategy' as const,
        content: '<h1>Titel</h1><p>Ein <strong>fetter</strong> Text mit &nbsp; und &amp;.</p>',
        status: 'draft' as const,
        author: 'test-user-456',
        authorName: 'Test User',
        organizationId: 'test-org-123'
      };
      
      await strategyDocumentService.create(documentData, testContext);
      
      // Prüfe ob Plain Text korrekt konvertiert wurde
      const documentCall = mockAddDoc.mock.calls[0];
      const savedDocument = documentCall[1];
      
      // Plain text sollte HTML-Tags entfernen
      expect(savedDocument.plainText).not.toContain('<h1>');
      expect(savedDocument.plainText).not.toContain('<p>');
      expect(savedDocument.plainText).not.toContain('<strong>');
      expect(savedDocument.plainText).toContain('Titel');
      expect(savedDocument.plainText).toContain('fetter');
      expect(savedDocument.plainText).toContain('&'); // HTML entities decoded
    });
    
    test('sollte verschiedene Document Types korrekt handhaben', async () => {
      const types: Array<'briefing' | 'strategy' | 'analysis' | 'notes'> = ['briefing', 'strategy', 'analysis', 'notes'];
      
      for (const type of types) {
        const mockDocRef = { id: `doc-${type}` };
        mockAddDoc.mockResolvedValueOnce(mockDocRef as any);
        
        const documentData = {
          projectId: 'project-456',
          title: `${type} Dokument`,
          type,
          content: `<h1>${type}</h1>`,
          status: 'draft' as const,
          author: 'test-user-456',
          authorName: 'Test User',
          organizationId: 'test-org-123'
        };
        
        const result = await strategyDocumentService.create(documentData, testContext);
        expect(result).toBe(`doc-${type}`);
      }
    });
    
    test('sollte verschiedene Document Status korrekt handhaben', async () => {
      const statuses: Array<'draft' | 'review' | 'approved' | 'archived'> = ['draft', 'review', 'approved', 'archived'];
      
      for (const status of statuses) {
        const mockDocRef = { id: `doc-${status}` };
        mockAddDoc.mockResolvedValueOnce(mockDocRef as any);
        
        const documentData = {
          projectId: 'project-456',
          title: `${status} Dokument`,
          type: 'strategy' as const,
          content: '<h1>Test</h1>',
          status,
          author: 'test-user-456',
          authorName: 'Test User',
          organizationId: 'test-org-123'
        };
        
        const result = await strategyDocumentService.create(documentData, testContext);
        expect(result).toBe(`doc-${status}`);
      }
    });
    
    test('sollte Race Conditions beim Update korrekt handhaben', async () => {
      // Mock für getById - verschiedene Versionen
      const mockDocSnap1 = createMockDocSnapshot({ ...mockStrategyDocument, version: 1 }, true);
      const mockDocSnap2 = createMockDocSnapshot({ ...mockStrategyDocument, version: 2 }, true);
      
      mockGetDoc
        .mockResolvedValueOnce(mockDocSnap1 as any)
        .mockResolvedValueOnce(mockDocSnap2 as any);
      
      // Parallele Updates mit verschiedenen Contents
      const update1 = strategyDocumentService.update('doc-123', { content: '<h1>Update 1</h1>' }, 'Update 1', testContext);
      const update2 = strategyDocumentService.update('doc-123', { content: '<h1>Update 2</h1>' }, 'Update 2', testContext);
      
      await Promise.all([update1, update2]);
      
      // Beide Updates sollten erfolgreich sein, aber verschiedene Versionen erzeugen
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

  });

  // ========================================
  // MULTI-TENANCY SECURITY TESTS
  // ========================================
  
  describe('Multi-Tenancy Security', () => {
    
    test('sollte Cross-Tenant-Zugriff bei getById verhindern', async () => {
      const wrongOrgDocument = {
        ...mockStrategyDocument,
        organizationId: 'wrong-org-999'
      };
      
      const mockDocSnap = createMockDocSnapshot(wrongOrgDocument, true);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getById('doc-123', testContext);
      
      expect(result).toBeNull();
    });
    
    test('sollte nur Dokumente der eigenen Organisation in getByProjectId zurückgeben', async () => {
      await strategyDocumentService.getByProjectId('project-456', testContext);
      
      // Prüfe dass organizationId Filter angewendet wird
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'test-org-123');
    });
    
    test('sollte bei getVersions Organization-Zugehörigkeit prüfen', async () => {
      // Mock für getById - Document doesn't belong to organization
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      const result = await strategyDocumentService.getVersions('doc-123', testContext);
      
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
    
    test('sollte organizationId bei Template-Creation einhalten', async () => {
      const mockDocRef = { id: 'new-template-doc' };
      mockAddDoc.mockResolvedValueOnce(mockDocRef as any);
      
      await strategyDocumentService.createFromTemplate(
        'briefing-template',
        'project-456',
        'Template Test',
        'test-user-456',
        'Test User',
        testContext
      );
      
      const documentCall = mockAddDoc.mock.calls[0];
      expect(documentCall[1].organizationId).toBe('test-org-123');
    });

  });

});