// src/lib/kanban/__tests__/kanban-board-service.test.ts
// Umfassende Tests für KanbanBoardService - 100% Coverage
import { 
  kanbanBoardService, 
  BoardFilters, 
  DragLock, 
  ActiveUser, 
  ProjectUpdate, 
  MoveResult 
} from '../kanban-board-service';
import { projectService } from '@/lib/firebase/project-service';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Timestamp,
  limit
} from 'firebase/firestore';
import { Project, PipelineStage, ProjectPriority } from '@/types/project';

// ========================================
// MOCKS SETUP
// ========================================

// Firebase Mock
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-15T10:00:00Z') })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date }))
  },
  serverTimestamp: jest.fn(),
  limit: jest.fn()
}));

// Firebase Client Mock
jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

// Project Service Mock
jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn()
  }
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockProject: Project = {
  id: 'project-1',
  title: 'Test Projekt',
  description: 'Test Beschreibung',
  currentStage: 'creation' as PipelineStage,
  status: 'active',
  organizationId: 'org-1',
  userId: 'user-1',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  customer: {
    id: 'customer-1',
    name: 'Test Customer'
  },
  assignedTo: ['user-1', 'user-2']
};

const mockProjects: Project[] = [
  {
    ...mockProject,
    id: 'project-1',
    currentStage: 'ideas_planning' as PipelineStage
  },
  {
    ...mockProject,
    id: 'project-2',
    title: 'Zweites Projekt',
    currentStage: 'creation' as PipelineStage
  },
  {
    ...mockProject,
    id: 'project-3',
    title: 'Drittes Projekt',
    currentStage: 'approval' as PipelineStage
  }
];

const mockActiveUsers: ActiveUser[] = [
  {
    id: 'user-1',
    name: 'Test User 1',
    avatar: 'avatar1.jpg',
    currentProject: 'project-1',
    lastSeen: mockTimestamp
  },
  {
    id: 'user-2', 
    name: 'Test User 2',
    lastSeen: mockTimestamp
  }
];

const mockProjectUpdates: ProjectUpdate[] = [
  {
    id: 'update-1',
    projectId: 'project-1',
    projectTitle: 'Test Projekt',
    action: 'moved',
    fromStage: 'creation' as PipelineStage,
    toStage: 'approval' as PipelineStage,
    userId: 'user-1',
    userName: 'Test User',
    timestamp: mockTimestamp
  }
];

const mockDragLock: DragLock = {
  id: 'lock-1',
  projectId: 'project-1',
  userId: 'user-1',
  userName: 'Test User',
  lockedAt: mockTimestamp,
  expiresAt: Timestamp.fromDate(new Date(Date.now() + 30000))
};

// ========================================
// SETUP & TEARDOWN
// ========================================

describe('KanbanBoardService', () => {
  const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
  const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
  const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
  const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
  const mockProjectService = projectService as jest.Mocked<typeof projectService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock-Responses
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [],
      size: 0
    } as any);

    mockProjectService.getAll.mockResolvedValue(mockProjects);
    mockProjectService.getById.mockResolvedValue(mockProject);
    mockProjectService.update.mockResolvedValue();
    
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (query as jest.Mock).mockReturnValue({});
    (where as jest.Mock).mockReturnValue({});
    (orderBy as jest.Mock).mockReturnValue({});
    (limit as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // GETBOARDDATA TESTS
  // ========================================

  describe('getBoardData', () => {
    it('sollte erfolgreich Board-Daten für eine Organisation laden', async () => {
      // Arrange
      const organizationId = 'org-1';
      const mockActiveUsersSnapshot = {
        empty: false,
        docs: mockActiveUsers.map(user => ({
          id: user.id,
          data: () => user
        }))
      };
      const mockUpdatesSnapshot = {
        empty: false,
        docs: mockProjectUpdates.map(update => ({
          id: update.id,
          data: () => update
        }))
      };

      mockGetDocs
        .mockResolvedValueOnce(mockActiveUsersSnapshot as any)
        .mockResolvedValueOnce(mockUpdatesSnapshot as any);

      // Act
      const result = await kanbanBoardService.getBoardData(organizationId);

      // Assert
      expect(result).toBeDefined();
      expect(result.totalProjects).toBe(3);
      expect(result.projectsByStage).toHaveProperty('ideas_planning');
      expect(result.projectsByStage).toHaveProperty('creation');
      expect(result.projectsByStage).toHaveProperty('approval');
      expect(result.projectsByStage['ideas_planning']).toHaveLength(1);
      expect(result.projectsByStage['creation']).toHaveLength(1);
      expect(result.projectsByStage['approval']).toHaveLength(1);
      expect(result.activeUsers).toEqual(mockActiveUsers);
      expect(result.recentUpdates).toEqual(mockProjectUpdates);
      
      expect(mockProjectService.getAll).toHaveBeenCalledWith({ 
        organizationId, 
        filters: {} 
      });
    });

    it('sollte Filter auf Board-Daten anwenden', async () => {
      // Arrange
      const organizationId = 'org-1';
      const filters: BoardFilters = {
        search: 'Test',
        priority: ['high' as ProjectPriority]
      };
      
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] } as any)
        .mockResolvedValueOnce({ empty: true, docs: [] } as any);

      // Act
      const result = await kanbanBoardService.getBoardData(organizationId, filters);

      // Assert
      expect(result).toBeDefined();
      expect(mockProjectService.getAll).toHaveBeenCalledWith({ 
        organizationId, 
        filters: {} 
      });
    });

    it('sollte bei Fehlern leere Struktur zurückgeben', async () => {
      // Arrange
      const organizationId = 'org-1';
      mockProjectService.getAll.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await kanbanBoardService.getBoardData(organizationId);

      // Assert
      expect(result.totalProjects).toBe(0);
      expect(result.projectsByStage['ideas_planning']).toEqual([]);
      expect(result.activeUsers).toEqual([]);
      expect(result.recentUpdates).toEqual([]);
    });

    it('sollte mit leerer organizationId umgehen', async () => {
      // Arrange
      const organizationId = '';

      // Bei leerer organizationId sollte projectService.getAll keine Projekte zurückgeben
      mockProjectService.getAll.mockResolvedValueOnce([]);

      // Act
      const result = await kanbanBoardService.getBoardData(organizationId);

      // Assert
      expect(result.totalProjects).toBe(0);
    });
  });

  // ========================================
  // MOVEPROJECT TESTS
  // ========================================

  describe('moveProject', () => {
    it('sollte Projekt erfolgreich zwischen Stages verschieben', async () => {
      // Arrange
      const projectId = 'project-1';
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;
      const userId = 'user-1';
      const organizationId = 'org-1';

      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] } as any);
      mockAddDoc.mockResolvedValue({ id: 'update-id' } as any);
      mockProjectService.getById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce({...mockProject, currentStage: toStage});

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.project.currentStage).toBe(toStage);
      expect(result.validationMessages).toContain(
        `Projekt erfolgreich von ${fromStage} zu ${toStage} verschoben`
      );
      expect(mockProjectService.update).toHaveBeenCalledWith(
        projectId, 
        expect.objectContaining({ currentStage: toStage }),
        { organizationId, userId }
      );
    });

    it('sollte ungültige Stage-Übergänge ablehnen', async () => {
      // Arrange
      const projectId = 'project-1';
      const fromStage = 'ideas_planning' as PipelineStage;
      const toStage = 'completed' as PipelineStage; // Ungültiger Übergang
      const userId = 'user-1';
      const organizationId = 'org-1';

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Übergang von ${fromStage} zu ${toStage} ist nicht erlaubt`);
      expect(mockProjectService.update).not.toHaveBeenCalled();
    });

    it('sollte bestehenden Drag-Lock von anderem User respektieren', async () => {
      // Arrange
      const projectId = 'project-1';
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;
      const userId = 'user-2';
      const organizationId = 'org-1';

      const existingLock = { ...mockDragLock, userId: 'user-1', userName: 'Other User' };
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'lock-1',
          data: () => existingLock
        }]
      } as any);

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Projekt wird bereits von Other User bearbeitet');
      expect(mockProjectService.update).not.toHaveBeenCalled();
    });

    it('sollte eigenen Drag-Lock erneuern und weitermachen', async () => {
      // Arrange
      const projectId = 'project-1';
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;
      const userId = 'user-1';
      const organizationId = 'org-1';

      const existingLock = { ...mockDragLock, userId: 'user-1' };
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'lock-1',
          data: () => existingLock
        }]
      } as any);

      mockAddDoc.mockResolvedValue({ id: 'update-id' } as any);
      mockProjectService.getById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce({...mockProject, currentStage: toStage});

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeleteDoc).toHaveBeenCalled(); // Lock freigegeben
    });

    it('sollte bei nicht existierendem Projekt fehlschlagen', async () => {
      // Arrange
      const projectId = 'nonexistent';
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;
      const userId = 'user-1';
      const organizationId = 'org-1';

      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] } as any);
      mockProjectService.getById.mockResolvedValue(null);

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Projekt nicht gefunden');
    });

    it('sollte Database-Fehler behandeln', async () => {
      // Arrange
      const projectId = 'project-1';
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;
      const userId = 'user-1';
      const organizationId = 'org-1';

      // Mock getDocs für Drag-Lock Check (erfolgreich, kein Lock)
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] } as any);
      // Mock projectService.getById für Validierung (erfolgreich)
      mockProjectService.getById.mockResolvedValueOnce(mockProject);
      // Mock projectService.update wirft Fehler
      mockProjectService.update.mockRejectedValueOnce(new Error('Database connection error'));

      // Act
      const result = await kanbanBoardService.moveProject(
        projectId, fromStage, toStage, userId, organizationId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('Database connection error');
    });
  });

  // ========================================
  // APPLYFILTERS TESTS
  // ========================================

  describe('applyFilters', () => {
    const testProjects: Project[] = [
      {
        ...mockProject,
        id: 'project-1',
        title: 'React Dashboard',
        description: 'Ein modernes Dashboard'
      },
      {
        ...mockProject,
        id: 'project-2',
        title: 'Vue.js App',
        description: 'Mobile-first Application',
        customer: { id: 'customer-2', name: 'Other Customer' }
      },
      {
        ...mockProject,
        id: 'project-3',
        title: 'Angular CRM',
        assignedTo: ['user-3']
      }
    ];

    it('sollte nach Suchbegriff in Titel filtern', async () => {
      // Arrange
      const filters: BoardFilters = { search: 'React' };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('React Dashboard');
    });

    it('sollte nach Suchbegriff in Beschreibung filtern', async () => {
      // Arrange
      const filters: BoardFilters = { search: 'modern' };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('modernes');
    });

    it('sollte nach Suchbegriff in Kunden-Namen filtern', async () => {
      // Arrange
      const filters: BoardFilters = { search: 'Other' };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].customer?.name).toBe('Other Customer');
    });

    it('sollte nach Kunden filtern', async () => {
      // Arrange
      const filters: BoardFilters = { customers: ['customer-2'] };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].customer?.id).toBe('customer-2');
    });

    it('sollte nach Team-Mitgliedern filtern', async () => {
      // Arrange
      const filters: BoardFilters = { teamMembers: ['user-3'] };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].assignedTo).toContain('user-3');
    });

    it('sollte nach Priorität filtern', async () => {
      // Arrange
      const projectsWithPriority = testProjects.map(p => ({
        ...p,
        priority: 'high' as ProjectPriority
      }));
      const filters: BoardFilters = { priority: ['high' as ProjectPriority] };

      // Act
      const result = await kanbanBoardService.applyFilters(projectsWithPriority, filters);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('sollte nach Datum filtern', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const filters: BoardFilters = { dateRange: [startDate, endDate] };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(3); // Alle Projekte im Zeitraum
    });

    it('sollte überfällige Projekte filtern', async () => {
      // Arrange
      const overdueDate = new Date('2023-01-01'); // Vergangenes Datum
      // Mock Timestamp mit toDate Methode
      const mockOverdueTimestamp = {
        toDate: () => overdueDate,
        seconds: Math.floor(overdueDate.getTime() / 1000),
        nanoseconds: 0
      };
      const projectsWithDueDate = testProjects.map(p => ({
        ...p,
        dueDate: mockOverdueTimestamp as any,
        status: 'active' as const
      })) as Project[];
      const filters: BoardFilters = { overdue: true };

      // Act
      const result = await kanbanBoardService.applyFilters(projectsWithDueDate, filters);

      // Assert
      expect(result).toHaveLength(3); // Alle überfällig
    });

    it('sollte kritische Projekte filtern', async () => {
      // Arrange
      const criticalProjects = testProjects.map(p => ({
        ...p,
        priority: 'urgent' as ProjectPriority
      }));
      const filters: BoardFilters = { critical: true };

      // Act
      const result = await kanbanBoardService.applyFilters(criticalProjects, filters);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('sollte mehrere Filter kombinieren', async () => {
      // Arrange
      const filters: BoardFilters = { 
        search: 'React',
        customers: ['customer-1'] 
      };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('React Dashboard');
    });

    it('sollte leere Ergebnisse bei nicht-passenden Filtern zurückgeben', async () => {
      // Arrange
      const filters: BoardFilters = { search: 'NonExistent' };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('sollte alle Projekte ohne Filter zurückgeben', async () => {
      // Arrange
      const filters: BoardFilters = {};

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(testProjects);
    });

    it('sollte mit leeren Eingaben umgehen', async () => {
      // Arrange
      const filters: BoardFilters = { search: '   ' };

      // Act
      const result = await kanbanBoardService.applyFilters(testProjects, filters);

      // Assert
      expect(result).toHaveLength(3); // Leer-String wird ignoriert
    });
  });

  // ========================================
  // SEARCHPROJECTS TESTS
  // ========================================

  describe('searchProjects', () => {
    it('sollte nach Projekttitel suchen', async () => {
      // Arrange
      const query = 'Test';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.title.includes('Test'))).toBe(true);
    });

    it('sollte nach Beschreibung suchen', async () => {
      // Arrange
      const query = 'Beschreibung';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.description?.includes('Beschreibung'))).toBe(true);
    });

    it('sollte nach Kunden-Namen suchen', async () => {
      // Arrange
      const query = 'Customer';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.customer?.name.includes('Customer'))).toBe(true);
    });

    it('sollte bei leerem Query alle Projekte zurückgeben', async () => {
      // Arrange
      const query = '';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result).toEqual(mockProjects);
    });

    it('sollte case-insensitive suchen', async () => {
      // Arrange
      const query = 'TEST';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result.length).toBeGreaterThan(0);
    });

    it('sollte nach Tags suchen', async () => {
      // Arrange
      const projectsWithTags = mockProjects.map(p => ({
        ...p,
        tags: ['javascript', 'frontend']
      }));
      const query = 'javascript';

      // Act
      const result = await kanbanBoardService.searchProjects(query, projectsWithTags);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('sollte bei nicht gefundenen Ergebnissen leeres Array zurückgeben', async () => {
      // Arrange
      const query = 'NonExistentTerm';

      // Act
      const result = await kanbanBoardService.searchProjects(query, mockProjects);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // DRAG LOCK TESTS
  // ========================================

  describe('lockProjectForDrag', () => {
    it('sollte neuen Lock erfolgreich erstellen', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const userName = 'Test User';

      mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
      mockAddDoc.mockResolvedValue({ id: 'new-lock-id' } as any);

      // Act
      const result = await kanbanBoardService.lockProjectForDrag(projectId, userId, userName);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.projectId).toBe(projectId);
      expect(result?.userId).toBe(userId);
      expect(result?.userName).toBe(userName);
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('sollte bestehenden eigenen Lock erneuern', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const userName = 'Test User';

      const existingLock = { ...mockDragLock, userId: 'user-1' };
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-lock',
          data: () => existingLock
        }]
      } as any);

      // Act
      const result = await kanbanBoardService.lockProjectForDrag(projectId, userId, userName);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('sollte Lock von anderem User ablehnen', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-2';
      const userName = 'Other User';

      const existingLock = { ...mockDragLock, userId: 'user-1' };
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'existing-lock',
          data: () => existingLock
        }]
      } as any);

      // Act
      const result = await kanbanBoardService.lockProjectForDrag(projectId, userId, userName);

      // Assert
      expect(result).toBeNull();
      expect(mockAddDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('sollte Database-Fehler behandeln', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const userName = 'Test User';

      mockGetDocs.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await kanbanBoardService.lockProjectForDrag(projectId, userId, userName);

      // Assert
      expect(result).toBeNull();
    });

    it('sollte mit Standard-Username funktionieren', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';

      mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
      mockAddDoc.mockResolvedValue({ id: 'new-lock-id' } as any);

      // Act
      const result = await kanbanBoardService.lockProjectForDrag(projectId, userId);

      // Assert
      expect(result?.userName).toBe('Unknown User');
    });
  });

  describe('releaseDragLock', () => {
    it('sollte Lock erfolgreich freigeben', async () => {
      // Arrange
      const lockId = 'lock-1';

      // Act
      await kanbanBoardService.releaseDragLock(lockId);

      // Assert
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler beim Freigeben behandeln', async () => {
      // Arrange
      const lockId = 'lock-1';
      mockDeleteDoc.mockRejectedValue(new Error('Delete error'));

      // Act & Assert - sollte nicht werfen
      await expect(kanbanBoardService.releaseDragLock(lockId)).resolves.toBeUndefined();
    });
  });

  // ========================================
  // GETACTIVEUSERS TESTS
  // ========================================

  describe('getActiveUsers', () => {
    it('sollte aktive User erfolgreich laden', async () => {
      // Arrange
      const organizationId = 'org-1';
      const mockSnapshot = {
        docs: mockActiveUsers.map(user => ({
          id: user.id,
          data: () => user
        }))
      };
      
      mockGetDocs.mockResolvedValue(mockSnapshot as any);

      // Act
      const result = await kanbanBoardService.getActiveUsers(organizationId);

      // Assert
      expect(result).toEqual(mockActiveUsers);
      expect(query).toHaveBeenCalledWith(
        expect.anything(), // collection
        expect.anything(), // where organizationId
        expect.anything(), // where lastSeen
        expect.anything(), // orderBy
        expect.anything()  // limit
      );
    });

    it('sollte bei Fehlern leeres Array zurückgeben', async () => {
      // Arrange
      const organizationId = 'org-1';
      mockGetDocs.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await kanbanBoardService.getActiveUsers(organizationId);

      // Assert
      expect(result).toEqual([]);
    });

    it('sollte Multi-Tenancy sicherstellen', async () => {
      // Arrange
      const organizationId = 'org-1';
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      // Act
      await kanbanBoardService.getActiveUsers(organizationId);

      // Assert
      expect(where).toHaveBeenCalledWith('organizationId', '==', organizationId);
    });

    it('sollte nur User der letzten 5 Minuten laden', async () => {
      // Arrange
      const organizationId = 'org-1';
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      // Act
      await kanbanBoardService.getActiveUsers(organizationId);

      // Assert
      // Prüfe dass where mit organizationId aufgerufen wurde
      expect(where).toHaveBeenCalledWith('organizationId', '==', organizationId);
      // Prüfe dass where mindestens 2x aufgerufen wurde (einmal für organizationId, einmal für lastSeen)
      expect((where as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
      // Prüfe dass orderBy mit lastSeen aufgerufen wurde
      expect(orderBy).toHaveBeenCalledWith('lastSeen', 'desc');
      // Prüfe dass limit mit 20 aufgerufen wurde
      expect(limit).toHaveBeenCalledWith(20);
    });
  });

  // ========================================
  // EDGE CASES & ERROR HANDLING
  // ========================================

  describe('Edge Cases und Error Handling', () => {
    it('sollte mit null/undefined Werten umgehen', async () => {
      // Arrange
      const projectsWithNulls: Project[] = [
        {
          ...mockProject,
          description: null as any,
          customer: null as any,
          assignedTo: null as any
        }
      ];
      const filters: BoardFilters = { search: 'test' };

      // Act
      const result = await kanbanBoardService.applyFilters(projectsWithNulls, filters);

      // Assert - sollte nicht crashen
      expect(result).toBeDefined();
    });

    it('sollte mit leeren Arrays umgehen', async () => {
      // Arrange
      const emptyProjects: Project[] = [];
      const filters: BoardFilters = { search: 'test' };

      // Act
      const result = await kanbanBoardService.applyFilters(emptyProjects, filters);

      // Assert
      expect(result).toEqual([]);
    });

    it('sollte mit extremen Datumswerten umgehen', async () => {
      // Arrange
      const extremeDate = new Date('1970-01-01');
      // Mock Timestamp mit toDate Methode
      const mockExtremeTimestamp = {
        toDate: () => extremeDate,
        seconds: Math.floor(extremeDate.getTime() / 1000),
        nanoseconds: 0
      };
      const projects = [{
        ...mockProject,
        createdAt: mockExtremeTimestamp as any
      }];
      const filters: BoardFilters = {
        dateRange: [new Date('1969-01-01'), new Date('1971-01-01')]
      };

      // Act
      const result = await kanbanBoardService.applyFilters(projects, filters);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('sollte Speicher-effizient mit großen Datensätzen umgehen', async () => {
      // Arrange
      const largeProjectSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockProject,
        id: `project-${i}`,
        title: `Projekt ${i}`
      }));

      // Act & Assert - sollte nicht crashen oder zu lange dauern
      const start = Date.now();
      const result = await kanbanBoardService.applyFilters(largeProjectSet, {});
      const duration = Date.now() - start;
      
      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Weniger als 1 Sekunde
    });

    it('sollte Unicode und Sonderzeichen in Suche handhaben', async () => {
      // Arrange
      const unicodeProjects: Project[] = [
        {
          ...mockProject,
          title: 'Müller & Sön GmbH 🚀',
          description: 'Spéciälchärs tëst'
        }
      ];

      // Act
      const result1 = await kanbanBoardService.searchProjects('Müller', unicodeProjects);
      const result2 = await kanbanBoardService.searchProjects('🚀', unicodeProjects);

      // Assert
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
    });

    it('sollte Concurrent Access auf Drag-Locks handhaben', async () => {
      // Arrange
      const projectId = 'project-1';
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 bekommt Lock
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] } as any)
        .mockResolvedValueOnce({
          empty: false,
          docs: [{ id: 'lock-1', data: () => ({ ...mockDragLock, userId: user1 }) }]
        } as any);

      mockAddDoc.mockResolvedValue({ id: 'lock-1' } as any);

      // Act
      const lock1 = await kanbanBoardService.lockProjectForDrag(projectId, user1);
      const lock2 = await kanbanBoardService.lockProjectForDrag(projectId, user2);

      // Assert
      expect(lock1).not.toBeNull();
      expect(lock2).toBeNull(); // User 2 wird abgelehnt
    });
  });
});