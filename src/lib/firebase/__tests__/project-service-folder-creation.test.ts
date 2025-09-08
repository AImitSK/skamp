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
import type { Project } from '@/types/project';

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
};

jest.mock('../media-service', () => ({
  mediaService: mockMediaService
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
  status: 'draft',
  priority: 'medium',
  currentStage: 'briefing',
  organizationId: 'test-org-123',
  userId: 'test-user-456',
  clientId: 'client-789',
  teamMemberIds: ['user-1', 'user-2'],
  tags: ['test', 'automation'],
  budget: { amount: 50000, currency: 'EUR' },
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  isDeleted: false
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
        id: 'new-project-456'
      });
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für MediaService Folder Creation
      mockMediaService.createFolder
        .mockResolvedValueOnce('main-folder-123') // Hauptordner
        .mockResolvedValueOnce('subfolder-1') // Strategiedokumente
        .mockResolvedValueOnce('subfolder-2') // Bildideen
        .mockResolvedValueOnce('subfolder-3') // Recherche
        .mockResolvedValueOnce('subfolder-4') // Entwürfe
        .mockResolvedValueOnce('subfolder-5'); // Externe Dokumente
      
      const projectData = {
        title: 'Neues Projekt mit Ordnern',
        description: 'Test für automatische Ordner-Erstellung',
        status: 'draft' as const,
        priority: 'medium' as const,
        currentStage: 'briefing' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456',
        clientId: 'client-789',
        teamMemberIds: [],
        tags: [],
        isDeleted: false
      };
      
      const result = await projectService.create(projectData);
      
      expect(result).toBe('new-project-456');
      
      // Prüfe Projekt-Erstellung
      expect(mockAddDoc).toHaveBeenCalledWith(
        'collection-ref',
        expect.objectContaining({
          ...projectData,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        })
      );
      
      // Prüfe Hauptordner-Erstellung
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        {
          userId: 'test-user-456',
          name: 'Projekt: Neues Projekt mit Ordnern',
          parentFolderId: undefined,
          description: 'Automatisch erstellter Ordner für Projekt "Neues Projekt mit Ordnern"'
        },
        testContext
      );
      
      // Prüfe Unterordner-Erstellung (5 Standard-Ordner)
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(6); // 1 Haupt + 5 Sub
      
      // Prüfe spezifische Unterordner
      const subfolderCalls = mockMediaService.createFolder.mock.calls.slice(1);
      const expectedSubfolders = [
        'Strategiedokumente',
        'Bildideen & Inspiration', 
        'Recherche & Briefings',
        'Entwürfe & Notizen',
        'Externe Dokumente'
      ];
      
      expectedSubfolders.forEach((folderName, index) => {
        expect(subfolderCalls[index][0]).toMatchObject({
          userId: 'test-user-456',
          name: folderName,
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
      mockMediaService.createFolder.mockRejectedValueOnce(new Error('Ordner-Fehler'));
      
      // Console Error Mock
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const projectData = {
        title: 'Projekt mit Ordner-Fehler',
        description: 'Test für Fehlerbehandlung',
        status: 'draft' as const,
        priority: 'medium' as const,
        currentStage: 'briefing' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456',
        clientId: 'client-789',
        teamMemberIds: [],
        tags: [],
        isDeleted: false
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
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockProject);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für MediaService Folder Creation
      mockMediaService.createFolder
        .mockResolvedValueOnce('main-folder-999')
        .mockResolvedValueOnce('subfolder-1')
        .mockResolvedValueOnce('subfolder-2')
        .mockResolvedValueOnce('subfolder-3')
        .mockResolvedValueOnce('subfolder-4')
        .mockResolvedValueOnce('subfolder-5');
      
      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );
      
      // Prüfe Hauptordner
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        {
          userId: 'test-user-456',
          name: 'Projekt: Test Projekt für Ordner',
          parentFolderId: undefined,
          description: 'Automatisch erstellter Ordner für Projekt "Test Projekt für Ordner"'
        },
        testContext
      );
      
      // Prüfe alle 5 Unterordner
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
      // Mock für getById
      const mockDocSnap = createMockDocSnapshot(mockProject);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für MediaService
      mockMediaService.createFolder.mockImplementation(async (folderData) => {
        return `folder-${folderData.name.replace(/\s+/g, '-').toLowerCase()}`;
      });
      
      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );
      
      const calls = mockMediaService.createFolder.mock.calls;
      
      // Erwartete Unterordner-Daten
      const expectedSubfolders = [
        {
          name: 'Strategiedokumente',
          description: 'Projektbriefings, Strategiepapiere und Analysedokumente',
          color: '#3B82F6'
        },
        {
          name: 'Bildideen & Inspiration',
          description: 'Mood Boards, Referenz-Bilder und kreative Inspiration',
          color: '#8B5CF6'
        },
        {
          name: 'Recherche & Briefings',
          description: 'Marktanalysen, Kundenbriefings und Hintergrundinformationen',
          color: '#10B981'
        },
        {
          name: 'Entwürfe & Notizen',
          description: 'Erste Entwürfe, Skizzen und interne Arbeitsnotizen',
          color: '#F59E0B'
        },
        {
          name: 'Externe Dokumente',
          description: 'Kundendokumente, Freigaben und externe Materialien',
          color: '#EF4444'
        }
      ];
      
      // Prüfe jeden Unterordner (skip Index 0 = Hauptordner)
      expectedSubfolders.forEach((expected, index) => {
        const call = calls[index + 1]; // +1 wegen Hauptordner
        expect(call[0]).toMatchObject({
          userId: 'test-user-456',
          name: expected.name,
          description: expected.description,
          color: expected.color,
          parentFolderId: expect.any(String)
        });
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
        title: longTitle
      };
      
      // Mock Setup
      const mockDocSnap = createMockDocSnapshot(projectWithLongTitle);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      mockMediaService.createFolder.mockResolvedValue('folder-id');
      
      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );
      
      // Hauptordner sollte den langen Titel enthalten
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `Projekt: ${longTitle}`,
          description: `Automatisch erstellter Ordner für Projekt "${longTitle}"`
        }),
        testContext
      );
    });
    
    test('sollte mit Sonderzeichen im Projekt-Titel korrekt umgehen', async () => {
      const specialTitle = 'Projekt "Spezial" & Test <> | ? * \\';
      
      const projectWithSpecialChars = {
        ...mockProject,
        title: specialTitle
      };
      
      // Mock Setup
      const mockDocSnap = createMockDocSnapshot(projectWithSpecialChars);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      mockMediaService.createFolder.mockResolvedValue('folder-id');
      
      await projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      );
      
      // Sonderzeichen sollten im Namen erhalten bleiben
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `Projekt: ${specialTitle}`
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
      const mockDocSnap = createMockDocSnapshot(mockProject);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock für MediaService - Hauptordner OK, Unterordner fail
      mockMediaService.createFolder
        .mockResolvedValueOnce('main-folder-id') // Hauptordner erfolgreich
        .mockRejectedValueOnce(new Error('Subfolder error 1'))
        .mockRejectedValueOnce(new Error('Subfolder error 2'));
      
      // Sollte Fehler propagieren bei Unterordner-Erstellung
      await expect(projectService.createProjectFolderStructure(
        'project-123',
        'test-org-123',
        testContext
      )).rejects.toThrow('Subfolder error 1');
      
      // Hauptordner sollte trotzdem erstellt worden sein
      expect(mockMediaService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Projekt: Test Projekt für Ordner'
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
        id: 'integration-test-project',
        title: 'Integration Test Projekt',
        organizationId: 'test-org-123',
        userId: 'test-user-456'
      };
      
      const mockDocSnap = createMockDocSnapshot(createdProject);
      mockGetDoc.mockResolvedValueOnce(mockDocSnap as any);
      
      // Mock alle Ordner-Erstellungen
      mockMediaService.createFolder
        .mockResolvedValueOnce('main-folder')
        .mockResolvedValueOnce('sub-1')
        .mockResolvedValueOnce('sub-2')
        .mockResolvedValueOnce('sub-3')
        .mockResolvedValueOnce('sub-4')
        .mockResolvedValueOnce('sub-5');
      
      const projectData = {
        title: 'Integration Test Projekt',
        description: 'Vollständiger Test',
        status: 'draft' as const,
        priority: 'high' as const,
        currentStage: 'briefing' as const,
        organizationId: 'test-org-123',
        userId: 'test-user-456',
        clientId: 'client-integration',
        teamMemberIds: ['user-1'],
        tags: ['integration'],
        isDeleted: false
      };
      
      const result = await projectService.create(projectData);
      
      // Prüfe Projekt-Erstellung
      expect(result).toBe('integration-test-project');
      expect(mockAddDoc).toHaveBeenCalledOnce();
      
      // Prüfe Ordner-Struktur-Erstellung
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(6);
      
      // Prüfe dass Hauptordner korrekt benannt wurde
      const mainFolderCall = mockMediaService.createFolder.mock.calls[0];
      expect(mainFolderCall[0].name).toBe('Projekt: Integration Test Projekt');
      
      // Prüfe dass alle Unterordner mit korrektem Parent erstellt wurden
      const subfolderCalls = mockMediaService.createFolder.mock.calls.slice(1);
      subfolderCalls.forEach(call => {
        expect(call[0].parentFolderId).toBe('main-folder');
      });
    });
    
    test('sollte Race Conditions bei parallelen Projekt-Erstellungen handhaben', async () => {
      // Setup für parallele Projekte
      const project1Data = { ...mockProject, title: 'Projekt 1', userId: 'user-1' };
      const project2Data = { ...mockProject, title: 'Projekt 2', userId: 'user-2' };
      
      mockAddDoc
        .mockResolvedValueOnce({ id: 'project-1' } as any)
        .mockResolvedValueOnce({ id: 'project-2' } as any);
      
      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnapshot({ ...project1Data, id: 'project-1' }) as any)
        .mockResolvedValueOnce(createMockDocSnapshot({ ...project2Data, id: 'project-2' }) as any);
      
      // Mock Ordner-Erstellungen für beide Projekte
      mockMediaService.createFolder.mockResolvedValue('folder-id');
      
      // Parallele Erstellung
      const results = await Promise.all([
        projectService.create(project1Data),
        projectService.create(project2Data)
      ]);
      
      expect(results).toEqual(['project-1', 'project-2']);
      
      // Beide Projekte sollten ihre Ordner-Strukturen erhalten haben
      expect(mockMediaService.createFolder).toHaveBeenCalledTimes(12); // 6 pro Projekt
    });

  });

});