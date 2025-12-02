// src/hooks/__tests__/useBoardRealtime.test.ts
// Umfassende Tests für useBoardRealtime Hook
import { renderHook, waitFor } from '@testing-library/react';
import { useBoardRealtime } from '../useBoardRealtime';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { Project, PipelineStage } from '@/types/project';
import { ActiveUser, ProjectUpdate } from '@/lib/kanban/kanban-board-service';

// ========================================
// MOCKS SETUP
// ========================================

// Firebase Mock
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-15T10:00:00Z') })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date }))
  }
}));

// Firebase Client Mock
jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockProjects: Project[] = [
  {
    id: 'project-1',
    title: 'Test Projekt 1',
    description: 'Beschreibung 1',
    currentStage: 'ideas_planning' as PipelineStage,
    status: 'active',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  },
  {
    id: 'project-2',
    title: 'Test Projekt 2',
    description: 'Beschreibung 2',
    currentStage: 'creation' as PipelineStage,
    status: 'active',
    organizationId: 'org-1',
    userId: 'user-2',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  },
  {
    id: 'project-3',
    title: 'Test Projekt 3',
    description: 'Beschreibung 3',
    currentStage: 'approval' as PipelineStage,
    status: 'active',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
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
    projectTitle: 'Test Projekt 1',
    action: 'moved',
    fromStage: 'ideas_planning',
    toStage: 'creation',
    userId: 'user-1',
    userName: 'Test User 1',
    timestamp: mockTimestamp
  }
];

// ========================================
// MOCK IMPLEMENTATIONS
// ========================================

const createMockSnapshot = (data: any[]) => ({
  forEach: (callback: (doc: any) => void) => {
    data.forEach(item => {
      callback({
        id: item.id,
        data: () => item
      });
    });
  }
});

const createMockUnsubscribe = () => jest.fn();

// ========================================
// TESTS
// ========================================

describe('useBoardRealtime', () => {
  const mockOnSnapshot = onSnapshot as jest.MockedFunction<any>;
  const mockCollection = collection as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockOrderBy = orderBy as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Standard Mock Setup
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});

    // Standard onSnapshot Mock - erfolgreicher Fall
    mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
      // Simulate successful snapshot
      setTimeout(() => {
        onNext(createMockSnapshot(mockProjects));
      }, 0);
      return createMockUnsubscribe();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // SUCCESSFUL INITIALIZATION TESTS
  // ========================================

  describe('Successful Initialization', () => {
    it('sollte initial laden und korrekte Board-Daten liefern', async () => {
      // Arrange
      const organizationId = 'org-1';

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert - Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.boardData).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.boardData).not.toBeNull();
      expect(result.current.boardData?.totalProjects).toBe(3);
      expect(result.current.boardData?.projectsByStage).toBeDefined();
      expect(result.current.boardData?.projectsByStage['ideas_planning']).toHaveLength(1);
      expect(result.current.boardData?.projectsByStage['creation']).toHaveLength(1);
      expect(result.current.boardData?.projectsByStage['approval']).toHaveLength(1);
    });

    it('sollte Projekte korrekt nach Stages gruppieren', async () => {
      // Arrange
      const organizationId = 'org-1';

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      const { projectsByStage } = result.current.boardData!;
      expect(projectsByStage['ideas_planning'][0].id).toBe('project-1');
      expect(projectsByStage['creation'][0].id).toBe('project-2');
      expect(projectsByStage['approval'][0].id).toBe('project-3');

      // Leere Stages sollten existieren
      expect(projectsByStage['distribution']).toEqual([]);
      expect(projectsByStage['monitoring']).toEqual([]);
      expect(projectsByStage['completed']).toEqual([]);
    });

    it('sollte alle Real-time Listener korrekt einrichten', async () => {
      // Arrange
      const organizationId = 'org-1';
      const mockUnsubscribeProjects = jest.fn();
      const mockUnsubscribeUsers = jest.fn();
      const mockUnsubscribeUpdates = jest.fn();

      mockOnSnapshot
        .mockReturnValueOnce(mockUnsubscribeProjects)
        .mockReturnValueOnce(mockUnsubscribeUsers) 
        .mockReturnValueOnce(mockUnsubscribeUpdates);

      // Act
      const { unmount } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      expect(mockOnSnapshot).toHaveBeenCalledTimes(3);
      
      // Verify correct queries were set up
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', organizationId);

      // Cleanup should call all unsubscribe functions
      unmount();
      expect(mockUnsubscribeProjects).toHaveBeenCalled();
      expect(mockUnsubscribeUsers).toHaveBeenCalled();
      expect(mockUnsubscribeUpdates).toHaveBeenCalled();
    });
  });

  // ========================================
  // REAL-TIME UPDATES TESTS
  // ========================================

  describe('Real-time Updates', () => {
    it('sollte auf Projekt-Updates reagieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      let projectsCallback: any;

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        if (!projectsCallback) {
          projectsCallback = onNext;
          // Initial data
          setTimeout(() => onNext(createMockSnapshot(mockProjects)), 0);
        }
        return createMockUnsubscribe();
      });

      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act - Simulate new project added
      const newProject: Project = {
        ...mockProjects[0],
        id: 'project-4',
        title: 'Neues Projekt',
        currentStage: 'creation' as PipelineStage
      };

      const updatedProjects = [...mockProjects, newProject];
      projectsCallback(createMockSnapshot(updatedProjects));

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.totalProjects).toBe(4);
        expect(result.current.boardData?.projectsByStage['creation']).toHaveLength(2);
      });
    });

    it('sollte auf Active Users Updates reagieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      let usersCallback: any;
      let callCount = 0;

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        callCount++;
        if (callCount === 1) {
          // Projects listener
          setTimeout(() => onNext(createMockSnapshot(mockProjects)), 0);
        } else if (callCount === 2) {
          // Users listener
          usersCallback = onNext;
          setTimeout(() => onNext(createMockSnapshot(mockActiveUsers)), 0);
        }
        return createMockUnsubscribe();
      });

      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.boardData?.activeUsers).toHaveLength(2);
      });

      // Act - Add new active user
      const newUser: ActiveUser = {
        id: 'user-3',
        name: 'New User',
        lastSeen: mockTimestamp
      };

      usersCallback(createMockSnapshot([...mockActiveUsers, newUser]));

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.activeUsers).toHaveLength(3);
        expect(result.current.boardData?.activeUsers.some(u => u.id === 'user-3')).toBe(true);
      });
    });

    it('sollte auf Project Updates reagieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      let updatesCallback: any;
      let callCount = 0;

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => onNext(createMockSnapshot(mockProjects)), 0);
        } else if (callCount === 2) {
          setTimeout(() => onNext(createMockSnapshot(mockActiveUsers)), 0);
        } else if (callCount === 3) {
          updatesCallback = onNext;
          setTimeout(() => onNext(createMockSnapshot(mockProjectUpdates)), 0);
        }
        return createMockUnsubscribe();
      });

      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.boardData?.recentUpdates).toHaveLength(1);
      });

      // Act - Add new update
      const newUpdate: ProjectUpdate = {
        id: 'update-2',
        projectId: 'project-2',
        projectTitle: 'Test Projekt 2',
        action: 'updated',
        userId: 'user-2',
        userName: 'Test User 2',
        timestamp: mockTimestamp
      };

      updatesCallback(createMockSnapshot([newUpdate, ...mockProjectUpdates]));

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.recentUpdates).toHaveLength(2);
        expect(result.current.boardData?.recentUpdates[0].id).toBe('update-2');
      });
    });

    it('sollte Updates-Limit von 20 respektieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      const manyUpdates = Array.from({ length: 25 }, (_, i) => ({
        ...mockProjectUpdates[0],
        id: `update-${i}`,
        projectId: `project-${i}`
      }));

      let updatesCallback: any;
      let callCount = 0;

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        callCount++;
        if (callCount === 3) {
          updatesCallback = onNext;
          setTimeout(() => onNext(createMockSnapshot(manyUpdates)), 0);
        } else {
          setTimeout(() => onNext(createMockSnapshot(callCount === 1 ? mockProjects : mockActiveUsers)), 0);
        }
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.recentUpdates).toHaveLength(20);
      });
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('sollte bei leerem organizationId Error setzen', async () => {
      // Arrange
      const organizationId = '';

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Organization ID ist erforderlich');
      });
    });

    it('sollte Snapshot-Fehler behandeln', async () => {
      // Arrange
      const organizationId = 'org-1';
      const errorMessage = 'Firestore permission denied';

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        setTimeout(() => onError(new Error(errorMessage)), 0);
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain(errorMessage);
      });
    });

    it('sollte Parsing-Fehler in onNext behandeln', async () => {
      // Arrange
      const organizationId = 'org-1';

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        setTimeout(() => {
          const malformedSnapshot = {
            forEach: () => {
              throw new Error('Malformed data');
            }
          };
          onNext(malformedSnapshot);
        }, 0);
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Malformed data');
      });
    });

    it('sollte bei Active Users Fehler robust weitermachen', async () => {
      // Arrange
      const organizationId = 'org-1';
      let callCount = 0;

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        callCount++;
        if (callCount === 1) {
          // Projects - successful
          setTimeout(() => onNext(createMockSnapshot(mockProjects)), 0);
        } else if (callCount === 2) {
          // Users - error
          setTimeout(() => onError(new Error('Users query failed')), 0);
        } else if (callCount === 3) {
          // Updates - successful
          setTimeout(() => onNext(createMockSnapshot(mockProjectUpdates)), 0);
        }
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert - Projects sollten trotzdem geladen werden
      await waitFor(() => {
        expect(result.current.boardData?.totalProjects).toBe(3);
        expect(result.current.boardData?.activeUsers).toEqual([]);
      });
    });
  });

  // ========================================
  // UTILITY FUNCTIONS TESTS
  // ========================================

  describe('Utility Functions', () => {
    it('sollte refresh korrekt funktionieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act
      result.current.refresh();

      // Assert - refresh() setzt loading auf true und error auf null
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
      expect(result.current.error).toBeNull();
    });

    it('sollte updateProjectsWithFilters korrekt funktionieren', async () => {
      // Arrange
      const organizationId = 'org-1';
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const filteredProjectsByStage = {
        'ideas_planning': [mockProjects[0]],
        'creation': [],
        'approval': [],
        'distribution': [],
        'monitoring': [],
        'completed': []
      } as Record<PipelineStage, Project[]>;

      // Act
      result.current.updateProjectsWithFilters(filteredProjectsByStage);

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.totalProjects).toBe(1);
        expect(result.current.boardData?.projectsByStage['creation']).toEqual([]);
        expect(result.current.boardData?.projectsByStage['ideas_planning']).toHaveLength(1);
      });
    });
  });

  // ========================================
  // DATA INTEGRITY TESTS
  // ========================================

  describe('Data Integrity', () => {
    it('sollte mit fehlenden Timestamps umgehen', async () => {
      // Arrange
      const organizationId = 'org-1';
      // Entferne createdAt und updatedAt komplett aus den Objekten
      const projectsWithoutTimestamps = mockProjects.map(p => {
        const { createdAt, updatedAt, ...rest } = p;
        return rest;
      });

      // Clear previous mock und setze neuen für diesen Test
      mockOnSnapshot.mockReset();
      mockCollection.mockReturnValue({});
      mockQuery.mockReturnValue({});
      mockWhere.mockReturnValue({});
      mockOrderBy.mockReturnValue({});

      // Mock für alle drei Listener (projects, activeUsers, recentUpdates)
      // Verwende mockImplementationOnce für bessere Isolation
      mockOnSnapshot
        .mockImplementationOnce((queryRef: any, onNext: any, onError?: any) => {
          // Projects listener
          setTimeout(() => onNext(createMockSnapshot(projectsWithoutTimestamps)), 0);
          return createMockUnsubscribe();
        })
        .mockImplementationOnce((queryRef: any, onNext: any, onError?: any) => {
          // Active users listener
          setTimeout(() => onNext({ forEach: (cb: any) => {} }), 0);
          return createMockUnsubscribe();
        })
        .mockImplementationOnce((queryRef: any, onNext: any, onError?: any) => {
          // Updates listener
          setTimeout(() => onNext({ forEach: (cb: any) => {} }), 0);
          return createMockUnsubscribe();
        });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.boardData?.totalProjects).toBe(3);
        // Timestamps sollten automatisch gesetzt werden
        result.current.boardData?.projectsByStage['ideas_planning'].forEach(project => {
          expect(project.createdAt).toBeDefined();
          expect(project.updatedAt).toBeDefined();
        });
      });
    });

    it('sollte mit unbekannten Stages umgehen', async () => {
      // Arrange
      const organizationId = 'org-1';
      const projectsWithInvalidStage = [
        {
          ...mockProjects[0],
          currentStage: 'unknown_stage' as PipelineStage
        }
      ];

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        setTimeout(() => onNext(createMockSnapshot(projectsWithInvalidStage)), 0);
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        // Hook zaehlt alle Projekte, gruppiert sie aber nicht wenn Stage unbekannt ist
        expect(result.current.boardData?.totalProjects).toBe(1);
        // Sollte in keiner bekannten Stage sein
        expect(result.current.boardData?.projectsByStage['ideas_planning']).toEqual([]);
        expect(result.current.boardData?.projectsByStage['creation']).toEqual([]);
        expect(result.current.boardData?.projectsByStage['approval']).toEqual([]);
      });
    });

    it('sollte User-Präsenz mit fehlenden Namen handhaben', async () => {
      // Arrange
      const organizationId = 'org-1';
      const usersWithoutNames = [
        {
          id: 'user-1',
          displayName: 'Display User',
          lastSeen: mockTimestamp
        },
        {
          id: 'user-2',
          // Weder name noch displayName
          lastSeen: mockTimestamp
        }
      ];

      let callCount = 0;
      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => onNext(createMockSnapshot(mockProjects)), 0);
        } else if (callCount === 2) {
          setTimeout(() => onNext(createMockSnapshot(usersWithoutNames)), 0);
        } else {
          setTimeout(() => onNext(createMockSnapshot([])), 0);
        }
        return createMockUnsubscribe();
      });

      // Act
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      // Assert
      await waitFor(() => {
        expect(result.current.boardData?.activeUsers).toHaveLength(2);
        expect(result.current.boardData?.activeUsers[0].name).toBe('Display User');
        expect(result.current.boardData?.activeUsers[1].name).toBe('Unknown User');
      });
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('sollte mehrfache organizationId Änderungen effizient handhaben', async () => {
      // Arrange
      let currentOrgId = 'org-1';
      const { result, rerender } = renderHook(() => useBoardRealtime(currentOrgId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act - Ändere organizationId mehrmals
      currentOrgId = 'org-2';
      rerender();
      
      currentOrgId = 'org-3';
      rerender();

      // Assert - Alte Listener sollten sauber aufgeräumt werden
      expect(mockOnSnapshot).toHaveBeenCalledTimes(9); // 3 orgs × 3 listeners
    });

    it('sollte mit leeren Snapshots effizient umgehen', async () => {
      // Arrange
      const organizationId = 'org-1';

      mockOnSnapshot.mockImplementation((queryRef: any, onNext: any, onError?: any) => {
        setTimeout(() => onNext({ forEach: (cb: any) => {} }), 0);
        return createMockUnsubscribe();
      });

      // Act
      const startTime = Date.now();
      const { result } = renderHook(() => useBoardRealtime(organizationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(500); // Sollte schnell sein
      expect(result.current.boardData?.totalProjects).toBe(0);
    });
  });

  // ========================================
  // MEMORY LEAK TESTS
  // ========================================

  describe('Memory Management', () => {
    it('sollte alle Listener beim Unmount aufräumen', () => {
      // Arrange
      const organizationId = 'org-1';
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      const mockUnsubscribe3 = jest.fn();

      mockOnSnapshot
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)
        .mockReturnValueOnce(mockUnsubscribe3);

      // Act
      const { unmount } = renderHook(() => useBoardRealtime(organizationId));
      unmount();

      // Assert
      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
      expect(mockUnsubscribe3).toHaveBeenCalled();
    });

    it('sollte bei organizationId Änderung alte Listener aufräumen', async () => {
      // Arrange
      let currentOrgId = 'org-1';
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();

      mockOnSnapshot
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)
        .mockReturnValueOnce(mockUnsubscribe2)
        .mockReturnValueOnce(mockUnsubscribe2);

      // Act
      const { rerender } = renderHook(() => useBoardRealtime(currentOrgId));
      
      currentOrgId = 'org-2';
      rerender();

      // Assert - Alte Listener wurden aufgeräumt
      expect(mockUnsubscribe1).toHaveBeenCalledTimes(3);
    });
  });
});