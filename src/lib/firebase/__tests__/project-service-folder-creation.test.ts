// src/lib/firebase/__tests__/project-service-folder-creation.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
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

import { projectService } from '../project-service';
import type { Project } from '../../../types/project';

// ========================================
// MOCKS
// ========================================

// Firebase Mocks
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    now: jest.fn(),
    fromDate: jest.fn()
  }
}));

jest.mock('../client-init', () => ({
  db: {}
}));

// Media Service Mock
const mockMediaService = {
  createFolder: jest.fn(),
  getFolders: jest.fn(),
} as {
  createFolder: jest.MockedFunction<(folder: any, context: any) => Promise<string>>;
  getFolders: jest.MockedFunction<(organizationId: string, parentFolderId?: string) => Promise<any[]>>;
};

jest.mock('../media-service', () => ({
  mediaService: mockMediaService
}));

// Company Service Mock
const mockCompanyServiceEnhanced = {
  getById: jest.fn() as jest.MockedFunction<(companyId: string, organizationId: string) => Promise<any | null>>,
};

jest.mock('../company-service-enhanced', () => ({
  companyServiceEnhanced: mockCompanyServiceEnhanced
}));

// Mock Functions
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockTimestampNow = Timestamp.now as jest.MockedFunction<typeof Timestamp.now>;

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

const mockProject: Project = {
  id: 'project-123',
  title: 'Test Projekt für Ordner',
  description: 'Ein Testprojekt für automatische Ordner-Erstellung',
  status: 'active',
  priority: 'medium',
  currentStage: 'ideas_planning',
  organizationId: 'test-org-123',
  userId: 'test-user-456',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp
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
  mockTimestampNow.mockReturnValue(mockTimestamp);
  mockCollection.mockReturnValue('collection-ref' as any);
  mockDoc.mockReturnValue('doc-ref' as any);
  mockAddDoc.mockResolvedValue({ id: 'new-project-123' } as any);
  mockUpdateDoc.mockResolvedValue(undefined);
  // Default Mock für getFolders (kann in Tests überschrieben werden)
  mockMediaService.getFolders.mockResolvedValue([]);
  // Default Mock für companyServiceEnhanced (kann in Tests überschrieben werden)
  mockCompanyServiceEnhanced.getById.mockResolvedValue(null);
}

// ========================================
// TEST SUITE
// ========================================

describe('Project Service - Automatic Folder Creation (Plan 11/11)', () => {
  
  beforeEach(() => {
    setupFirestoreMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // PROJECT CREATION WITH FOLDER STRUCTURE
  // ========================================
  
  describe('create with automatic folder structure', () => {
    
    test('sollte Projekt mit automatischer Ordner-Erstellung erfolgreich erstellen', async () => {
      // Mock für Project Creation
      const mockProjectRef = { id: 'new-project-456' };
      mockAddDoc.mockResolvedValueOnce(mockProjectRef as any);

      // Mock für getById (für Ordner-Erstellung)
      const mockDocSnap = createMockDocSnapshot({
        ...mockProject,
        id: 'new-project-456',
        title: 'Neues Projekt mit Ordnern'
      });
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);

      // Mock für getFolders (prüft ob "Projekte" Ordner existiert)
      mockMediaService.getFolders.mockResolvedValue([]);

      // Mock für MediaService Folder Creation
      mockMediaService.createFolder.mockResolvedValue('main-folder-123');
      mockMediaService.createFolder
        .mockResolvedValueOnce('projects-root-folder') // "Projekte" Hauptordner
        .mockResolvedValueOnce('main-folder-123') // Projektordner
        .mockResolvedValueOnce('subfolder-1') // Medien
        .mockResolvedValueOnce('subfolder-2') // Dokumente
        .mockResolvedValueOnce('subfolder-3') // Pressemeldungen
        .mockResolvedValueOnce('subfolder-4'); // Analysen

      const projectData = {
        title: 'Neues Projekt mit Ordnern',
        description: 'Test für automatische Ordner-Erstellung',
        status: 'active' as const,
        priority: 'medium' as const,
        currentStage: 'ideas_planning' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456'
      };

      const result = await projectService.create(projectData);

      expect(result).toBe('new-project-456');

      // Prüfe Projekt-Erstellung
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...projectData,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        })
      );

      // Prüfe "Projekte" Root-Ordner-Erstellung
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-456',
          name: 'Projekte',
          parentFolderId: undefined,
          description: 'Alle Projektordner',
          color: '#005fab'
        }),
        testContext
      );

      // Prüfe Projektordner-Erstellung mit neuem Format: P-{Datum}-{Company}-{Titel}
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-456',
          name: `P-${dateStr}-Unbekannt-Neues Projekt mit Ordnern`,
          parentFolderId: 'projects-root-folder',
          description: 'Projektordner für "Neues Projekt mit Ordnern" - Unbekannt'
        }),
        testContext
      );

      // Prüfe Unterordner-Erstellung (1 Projekte + 1 Projektordner + 4 Unterordner = 6)
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(6);

      // Prüfe spezifische Unterordner (neue Struktur)
      const subfolderCalls = mockMediaService.createFolder.mock.calls.slice(2); // Skip "Projekte" und Projektordner
      const expectedSubfolders = [
        { name: 'Medien', color: '#3B82F6' },
        { name: 'Dokumente', color: '#10B981' },
        { name: 'Pressemeldungen', color: '#8B5CF6' },
        { name: 'Analysen', color: '#F59E0B' }
      ];

      expectedSubfolders.forEach((folderInfo, index) => {
        expect(subfolderCalls[index][0]).toMatchObject({
          userId: 'test-user-456',
          name: folderInfo.name,
          color: folderInfo.color,
          parentFolderId: 'main-folder-123'
        });
      });
    });
    
    test('sollte Projekt-Erstellung nicht scheitern lassen wenn Ordner-Erstellung fehlschlägt', async () => {
      // Mock für Project Creation
      const mockProjectRef = { id: 'new-project-789' };
      mockAddDoc.mockResolvedValueOnce(mockProjectRef as any);
      
      // Mock für getById (für Ordner-Erstellung)
      const mockDocSnap = createMockDocSnapshot({
        ...mockProject,
        id: 'new-project-789'
      });
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für MediaService Folder Creation - Fehler
      mockMediaService.createFolder.mockRejectedValue(new Error('Ordner-Fehler'));
      
      // Console Error Mock
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const projectData = {
        title: 'Projekt mit Ordner-Fehler',
        description: 'Test für Fehlerbehandlung',
        status: 'active' as const,
        priority: 'medium' as const,
        currentStage: 'ideas_planning' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456'
      };
      
      // Sollte nicht scheitern trotz Ordner-Fehler
      const result = await projectService.create(projectData);
      
      expect(result).toBe('new-project-789');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Fehler bei automatischer Ordner-Erstellung:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

  });

  // ========================================
  // STANDALONE FOLDER STRUCTURE CREATION
  // ========================================
  
  describe('createProjectFolderStructure', () => {
    
    test('sollte Ordner-Struktur für bestehendes Projekt erstellen', async () => {
      // Mock für getById mit customer
      const projectWithCustomer = {
        ...mockProject,
        customer: { id: 'company-123', name: 'Test Firma' }
      };

      // Direkt projectService.getById mocken
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(projectWithCustomer as any);

      // Mock für companyServiceEnhanced
      mockCompanyServiceEnhanced.getById.mockResolvedValueOnce({ id: 'company-123', name: 'Test Firma' } as any);

      // Mock für getFolders (prüft ob "Projekte" Ordner existiert)
      mockMediaService.getFolders.mockResolvedValueOnce([]);

      // Mock für MediaService Folder Creation
      mockMediaService.createFolder
        .mockResolvedValueOnce('projects-root-folder') // "Projekte" Hauptordner
        .mockResolvedValueOnce('main-folder-999') // Projektordner
        .mockResolvedValueOnce('subfolder-1') // Medien
        .mockResolvedValueOnce('subfolder-2') // Dokumente
        .mockResolvedValueOnce('subfolder-3') // Pressemeldungen
        .mockResolvedValueOnce('subfolder-4'); // Analysen

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      // Prüfe "Projekte" Hauptordner
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-456',
          name: 'Projekte',
          parentFolderId: undefined,
          description: 'Alle Projektordner',
          color: '#005fab'
        }),
        testContext
      );

      // Prüfe Projektordner mit korrektem Format: P-{Datum}-{Company}-{Projekt}
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-456',
          name: `P-${dateStr}-Test Firma-Test Projekt für Ordner`,
          parentFolderId: 'projects-root-folder', // Jetzt unter "Projekte"
          clientId: 'company-123'
        }),
        testContext
      );

      // Prüfe dass 1 Hauptordner + 1 Projektordner + 4 Unterordner erstellt werden
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(6);
    });
    
    test('sollte Fehler werfen wenn Projekt nicht gefunden', async () => {
      // Mock für getById - Projekt nicht gefunden
      const mockDocSnap = createMockDocSnapshot(null, false);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      await expect(projectService.createProjectFolderStructure(
        'non-existent-project',
        'test-org-123',
        testContext
      )).rejects.toThrow('Projekt nicht gefunden für Ordner-Erstellung');
      
      expect(mockMediaService.createFolder).not.toHaveBeenCalled();
    });
    
    test('sollte existierenden Projekte-Ordner verwenden wenn vorhanden', async () => {
      // Mock für getById mit customer
      const projectWithCustomer = {
        ...mockProject,
        customer: { id: 'company-789', name: 'Existing Company' }
      };

      // Direkt projectService.getById mocken
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(projectWithCustomer as any);

      // Mock für companyServiceEnhanced
      mockCompanyServiceEnhanced.getById.mockResolvedValueOnce({ id: 'company-789', name: 'Existing Company' } as any);

      // Mock für getFolders - "Projekte" Ordner existiert bereits
      mockMediaService.getFolders.mockResolvedValue([
        { id: 'existing-projects-folder', name: 'Projekte', userId: 'test-user-456' }
      ]);

      // Mock für MediaService Folder Creation (nur Projektordner + 4 Unterordner)
      mockMediaService.createFolder.mockResolvedValue('folder-id');
      mockMediaService.createFolder
        .mockResolvedValueOnce('project-folder-123') // Projektordner
        .mockResolvedValueOnce('subfolder-1') // Medien
        .mockResolvedValueOnce('subfolder-2') // Dokumente
        .mockResolvedValueOnce('subfolder-3') // Pressemeldungen
        .mockResolvedValueOnce('subfolder-4'); // Analysen

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      // Prüfe dass kein neuer "Projekte" Ordner erstellt wurde
      expect(mockMediaService.createFolder).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Projekte',
          parentFolderId: undefined
        }),
        testContext
      );

      // Prüfe dass Projektordner unter existierendem "Projekte" Ordner erstellt wurde
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `P-${dateStr}-Existing Company-Test Projekt für Ordner`,
          parentFolderId: 'existing-projects-folder',
          clientId: 'company-789'
        }),
        testContext
      );

      // Nur 1 Projektordner + 4 Unterordner (kein "Projekte" Hauptordner)
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(5);
    });
    
    test('sollte Multi-Tenancy bei Projekt-Zugriff respektieren', async () => {
      // Mock für getById - Falscher Tenant
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'project-123',
        data: () => ({ ...mockProject, organizationId: 'wrong-org-999' })
      } as any);
      
      await expect(projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      )).rejects.toThrow('Projekt nicht gefunden für Ordner-Erstellung');
      
      expect(mockMediaService.createFolder).not.toHaveBeenCalled();
    });
    
    test('sollte alle Standard-Unterordner mit korrekten Eigenschaften erstellen', async () => {
      // Mock für getById mit customer
      const projectWithCustomer = {
        ...mockProject,
        customer: { id: 'company-456', name: 'Test Company' }
      };

      // Direkt projectService.getById mocken
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(projectWithCustomer as any);

      // Mock für companyServiceEnhanced
      mockCompanyServiceEnhanced.getById.mockResolvedValueOnce({ id: 'company-456', name: 'Test Company' } as any);

      // Mock für getFolders
      mockMediaService.getFolders.mockResolvedValue([]);

      // Mock für MediaService
      mockMediaService.createFolder.mockImplementation((folderData: any) => {
        return Promise.resolve(`folder-${folderData.name.replace(/\s+/g, '-').toLowerCase()}`);
      });

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      const calls = mockMediaService.createFolder.mock.calls;

      // Erwartete Unterordner-Daten (neue Struktur mit 4 Ordnern)
      const expectedSubfolders = [
        {
          name: 'Medien',
          description: 'Bilder, Videos und andere Medien-Assets für das Projekt',
          color: '#3B82F6'
        },
        {
          name: 'Dokumente',
          description: 'Projektdokumente, Briefings und Konzepte',
          color: '#10B981'
        },
        {
          name: 'Pressemeldungen',
          description: 'Pressemitteilungen und PR-Texte',
          color: '#8B5CF6'
        },
        {
          name: 'Analysen',
          description: 'Monitoring-Reports und Analytics-PDFs',
          color: '#F59E0B'
        }
      ];

      // Prüfe jeden Unterordner (skip Index 0 = "Projekte" Root, Index 1 = Projektordner)
      expectedSubfolders.forEach((expected, index) => {
        const call = calls[index + 2]; // +2 wegen "Projekte" Root und Projektordner
        if (call && call[0]) {
          expect(call[0]).toMatchObject({
            userId: 'test-user-456',
            name: expected.name,
            description: expected.description,
            color: expected.color,
            parentFolderId: expect.any(String)
          });
        }
      });
    });

  });

  // ========================================
  // ERROR HANDLING & EDGE CASES
  // ========================================
  
  describe('Error Handling & Edge Cases', () => {
    
    test('sollte mit sehr langen Projekt-Titeln korrekt umgehen', async () => {
      const longTitle = 'A'.repeat(200); // 200 Zeichen langer Titel

      const projectWithLongTitle = {
        ...mockProject,
        title: longTitle,
        customer: { id: 'company-999', name: 'LongName Inc' }
      };

      // Direkt projectService.getById mocken
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(projectWithLongTitle as any);

      // Mock für companyServiceEnhanced
      mockCompanyServiceEnhanced.getById.mockResolvedValueOnce({ id: 'company-999', name: 'LongName Inc' } as any);

      // Mock für getFolders
      mockMediaService.getFolders.mockResolvedValue([]);

      mockMediaService.createFolder.mockResolvedValue('folder-id');

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      // Projektordner sollte den langen Titel mit Format P-{Datum}-{Company}-{Titel} enthalten
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `P-${dateStr}-LongName Inc-${longTitle}`,
          clientId: 'company-999'
        }),
        testContext
      );
    });
    
    test('sollte mit Sonderzeichen im Projekt-Titel korrekt umgehen', async () => {
      const specialTitle = 'Projekt "Spezial" & Test <> | ? * \\';

      const projectWithSpecialChars = {
        ...mockProject,
        title: specialTitle,
        customer: { id: 'company-888', name: 'Special & Co.' }
      };

      // Direkt projectService.getById mocken
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(projectWithSpecialChars as any);

      // Mock für companyServiceEnhanced
      mockCompanyServiceEnhanced.getById.mockResolvedValueOnce({ id: 'company-888', name: 'Special & Co.' } as any);

      // Mock für getFolders
      mockMediaService.getFolders.mockResolvedValue([]);

      mockMediaService.createFolder.mockResolvedValue('folder-id');

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      // Sonderzeichen sollten im Namen erhalten bleiben
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `P-${dateStr}-Special & Co.-${specialTitle}`,
          clientId: 'company-888'
        }),
        testContext
      );
    });
    
    test('sollte MediaService Import-Fehler korrekt behandeln', async () => {
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockProject);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock Import-Fehler
      jest.doMock('../media-service', () => {
        throw new Error('Import failed');
      });
      
      // Neue Instanz für Test mit fehlerhaftem Import
      const testContext = { organizationId: 'test-org-123', userId: 'test-user-456' };
      
      // Sollte Fehler propagieren
      await expect(projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      )).rejects.toThrow();
    });
    
    test('sollte partielle Ordner-Erstellung handhaben (Hauptordner erstellt, Unterordner fehlschlagen)', async () => {
      // Mock für getById
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(mockProject as any);

      // Mock für getFolders
      mockMediaService.getFolders.mockResolvedValue([]);

      // Mock für MediaService - "Projekte" und Projektordner OK, dann Unterordner fail
      mockMediaService.createFolder
        .mockResolvedValueOnce('projects-folder-id') // "Projekte" Ordner erfolgreich
        .mockResolvedValueOnce('main-folder-id') // Projektordner erfolgreich
        .mockRejectedValueOnce(new Error('Subfolder error 1')); // Erster Unterordner fehlgeschlagen

      // Mock für update - wird aufgerufen selbst wenn einige Unterordner fehlschlagen
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      // Der Code sollte NICHT fehlschlagen, da Unterordner-Fehler in try-catch gefangen werden
      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );

      // "Projekte" Ordner sollte erstellt worden sein
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Projekte'
        }),
        testContext
      );

      // Projektordner sollte auch erstellt worden sein
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          parentFolderId: 'projects-folder-id'
        }),
        testContext
      );
    });

  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================
  
  describe('Integration Tests', () => {
    
    test('sollte kompletten Projekt-Erstellungs-Workflow mit Ordnern durchführen', async () => {
      // Mock vollständigen Workflow
      const mockProjectRef = { id: 'integration-test-project' };
      mockAddDoc.mockResolvedValueOnce(mockProjectRef as any);

      const createdProject = {
        ...mockProject,
        id: 'integration-test-project',
        title: 'Integration Test Projekt',
        organizationId: 'test-org-123',
        userId: 'test-user-456'
      };

      // Mock getById für die Ordner-Erstellung
      jest.spyOn(projectService, 'getById').mockResolvedValueOnce(createdProject as any);

      // Mock für getFolders
      mockMediaService.getFolders.mockResolvedValue([]);

      // Mock alle Ordner-Erstellungen (1 Projekte + 1 Projektordner + 4 Unterordner = 6)
      mockMediaService.createFolder.mockResolvedValue('folder-id');
      mockMediaService.createFolder
        .mockResolvedValueOnce('projects-root') // "Projekte" Root-Ordner
        .mockResolvedValueOnce('main-folder') // Projektordner
        .mockResolvedValueOnce('sub-1') // Medien
        .mockResolvedValueOnce('sub-2') // Dokumente
        .mockResolvedValueOnce('sub-3') // Pressemeldungen
        .mockResolvedValueOnce('sub-4'); // Analysen

      // Mock für update (wird am Ende aufgerufen)
      jest.spyOn(projectService, 'update').mockResolvedValueOnce(undefined as any);

      const projectData = {
        title: 'Integration Test Projekt',
        description: 'Vollständiger Test',
        status: 'active' as const,
        priority: 'high' as const,
        currentStage: 'ideas_planning' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456'
      };

      const result = await projectService.create(projectData);

      // Prüfe Projekt-Erstellung
      expect(result).toBe('integration-test-project');
      expect(mockAddDoc).toHaveBeenCalled();

      // Prüfe Ordner-Struktur-Erstellung (1 "Projekte" + 1 Projektordner + 4 Unterordner)
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(6);

      // Prüfe dass "Projekte" Root-Ordner erstellt wurde
      const projectsRootCall = mockMediaService.createFolder.mock.calls[0];
      expect(projectsRootCall[0]).toMatchObject({
        name: 'Projekte',
        parentFolderId: undefined
      });

      // Prüfe dass Projektordner erstellt wurde
      const mainFolderCall = mockMediaService.createFolder.mock.calls[1];
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(mainFolderCall[0]).toMatchObject({
        name: `P-${dateStr}-Unbekannt-Integration Test Projekt`,
        parentFolderId: 'projects-root'
      });

      // Prüfe dass alle Unterordner mit korrektem Parent erstellt wurden
      const subfolderCalls = mockMediaService.createFolder.mock.calls.slice(2);
      subfolderCalls.forEach(call => {
        expect(call[0]).toMatchObject({
          parentFolderId: 'main-folder'
        });
      });
    });
    
    test('sollte Race Conditions bei parallelen Projekt-Erstellungen handhaben', async () => {
      // Setup für parallele Projekte
      const project1Data = { ...mockProject, title: 'Projekt 1', userId: 'user-1', status: 'active' as const, priority: 'medium' as const, currentStage: 'ideas_planning' as const };
      const project2Data = { ...mockProject, title: 'Projekt 2', userId: 'user-2', status: 'active' as const, priority: 'medium' as const, currentStage: 'ideas_planning' as const };

      mockAddDoc
        .mockResolvedValueOnce({ id: 'project-1' } as any)
        .mockResolvedValueOnce({ id: 'project-2' } as any);

      // Mock getById für beide Projekte
      jest.spyOn(projectService, 'getById')
        .mockResolvedValueOnce({ ...project1Data, id: 'project-1' } as any)
        .mockResolvedValueOnce({ ...project2Data, id: 'project-2' } as any);

      // Mock für getFolders - beide Male leer (oder "Projekte" Ordner wird beim ersten Mal erstellt)
      mockMediaService.getFolders
        .mockResolvedValueOnce([]) // Erstes Projekt - kein "Projekte" Ordner
        .mockResolvedValueOnce([{ id: 'projects-root', name: 'Projekte' }]); // Zweites Projekt - "Projekte" existiert

      // Mock Ordner-Erstellungen für beide Projekte
      mockMediaService.createFolder.mockResolvedValue('folder-id');

      // Mock für update (zwei Mal aufgerufen)
      jest.spyOn(projectService, 'update')
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce(undefined as any);

      // Parallele Erstellung
      const results = await Promise.all([
        projectService.create(project1Data),
        projectService.create(project2Data)
      ]);

      expect(results).toEqual(['project-1', 'project-2']);

      // Erstes Projekt: 1 "Projekte" + 1 Projektordner + 4 Unterordner = 6
      // Zweites Projekt: 1 Projektordner + 4 Unterordner = 5 (kein neuer "Projekte" Ordner)
      // Gesamt: 11 Ordner-Erstellungen
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(11);
    });

  });

});