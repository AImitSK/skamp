/**
 * Tests für useProjectTasks Hook
 *
 * Testet React Query Integration, Progress-Berechnung,
 * Error Handling und enabled/disabled Logik
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectTasks } from '../useProjectTasks';
import { taskService } from '@/lib/firebase/task-service';
import { Timestamp } from 'firebase/firestore';

// ========================================
// MOCKS
// ========================================

jest.mock('@/lib/firebase/task-service');

// Mock Timestamp
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-15T10:00:00Z') })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
  },
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockTasks = [
  {
    id: 'task-1',
    title: 'Task 1 - Urgent',
    projectId: 'project-1',
    organizationId: 'org-1',
    status: 'pending' as const,
    priority: 'urgent' as const,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'task-2',
    title: 'Task 2 - High',
    projectId: 'project-1',
    organizationId: 'org-1',
    status: 'in_progress' as const,
    priority: 'high' as const,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'task-3',
    title: 'Task 3 - Medium',
    projectId: 'project-1',
    organizationId: 'org-1',
    status: 'completed' as const,
    priority: 'medium' as const,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'task-4',
    title: 'Task 4 - Low',
    projectId: 'project-1',
    organizationId: 'org-1',
    status: 'completed' as const,
    priority: 'low' as const,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ========================================
// TESTS
// ========================================

describe('useProjectTasks', () => {
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // SUCCESSFUL QUERY TESTS
  // ========================================

  describe('Successful Query', () => {
    it('sollte Tasks erfolgreich laden', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      // Assert - Initial Loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.tasks).toEqual([]);
      expect(result.current.progress.totalTasks).toBe(0);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.error).toBeNull();
      expect(mockTaskService.getByProjectId).toHaveBeenCalledWith('org-1', 'project-1');
    });

    it('sollte Progress korrekt berechnen', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.progress).toEqual({
        totalTasks: 4,
        completedTasks: 2, // task-3 und task-4
        taskCompletion: 50, // 2/4 = 50%
        criticalTasksRemaining: 2, // task-1 (urgent) und task-2 (high) nicht completed
      });
    });

    it('sollte kritische Tasks korrekt zählen (urgent/high priority)', async () => {
      // Arrange
      const tasksWithCritical = [
        { ...mockTasks[0], status: 'pending' as const, priority: 'urgent' as const }, // Critical
        { ...mockTasks[1], status: 'in_progress' as const, priority: 'high' as const }, // Critical
        { ...mockTasks[2], status: 'pending' as const, priority: 'medium' as const }, // Not critical
        { ...mockTasks[3], status: 'completed' as const, priority: 'urgent' as const }, // Completed, nicht gezählt
      ];

      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(tasksWithCritical);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.progress.criticalTasksRemaining).toBe(2);
    });

    it('sollte 100% taskCompletion bei 0 Tasks zurückgeben', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue([]);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.progress).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        taskCompletion: 100, // 0 Tasks = 100% Completion (keine offenen Tasks)
        criticalTasksRemaining: 0,
      });
    });
  });

  // ========================================
  // ENABLED/DISABLED LOGIC TESTS
  // ========================================

  describe('Enabled/Disabled Logic', () => {
    it('sollte Query disablen wenn projectId fehlt', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks(undefined, 'org-1'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(mockTaskService.getByProjectId).not.toHaveBeenCalled();
    });

    it('sollte Query disablen wenn organizationId fehlt', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', undefined),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(mockTaskService.getByProjectId).not.toHaveBeenCalled();
    });

    it('sollte Query disablen wenn beide IDs fehlen', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks(undefined, undefined),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(mockTaskService.getByProjectId).not.toHaveBeenCalled();
    });

    it('sollte Query enablen wenn beide IDs vorhanden sind', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTaskService.getByProjectId).toHaveBeenCalledWith('org-1', 'project-1');
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('sollte Fehler korrekt handhaben', async () => {
      // Arrange
      const errorMessage = 'Firestore permission denied';
      mockTaskService.getByProjectId = jest.fn().mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.tasks).toEqual([]);
      expect(result.current.progress.totalTasks).toBe(0);
    });

    it('sollte bei Fehler Default-Progress zurückgeben', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockRejectedValue(new Error('Error'));

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Progress sollte safe defaults haben
      expect(result.current.progress).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        taskCompletion: 100,
        criticalTasksRemaining: 0,
      });
    });
  });

  // ========================================
  // REACT QUERY CACHING TESTS
  // ========================================

  describe('React Query Caching', () => {
    it('sollte Cache nutzen bei zweitem Render', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);
      const wrapper = createWrapper();

      // Act - First render
      const { result: result1 } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      expect(mockTaskService.getByProjectId).toHaveBeenCalledTimes(1);

      // Act - Second render (should use cache within staleTime)
      const { result: result2 } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper }
      );

      // Assert - Should immediately return cached data
      expect(result2.current.tasks).toEqual(mockTasks);
      expect(mockTaskService.getByProjectId).toHaveBeenCalledTimes(1); // Nicht nochmal aufgerufen
    });

    it('sollte korrekte QueryKey verwenden', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-123', 'org-456'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - QueryKey sollte beide IDs enthalten
      expect(mockTaskService.getByProjectId).toHaveBeenCalledWith('org-456', 'project-123');
    });
  });

  // ========================================
  // PROGRESS CALCULATION EDGE CASES
  // ========================================

  describe('Progress Calculation Edge Cases', () => {
    it('sollte taskCompletion korrekt runden', async () => {
      // Arrange - 1 von 3 Tasks completed = 33.33...%
      const tasks = [
        { ...mockTasks[0], status: 'completed' as const },
        { ...mockTasks[1], status: 'pending' as const },
        { ...mockTasks[2], status: 'pending' as const },
      ];
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(tasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Sollte auf 33% runden
      expect(result.current.progress.taskCompletion).toBe(33);
    });

    it('sollte nur completed Tasks als kritisch ignorieren', async () => {
      // Arrange
      const tasks = [
        { ...mockTasks[0], status: 'pending' as const, priority: 'urgent' as const }, // Kritisch
        { ...mockTasks[1], status: 'completed' as const, priority: 'urgent' as const }, // Nicht kritisch (completed)
        { ...mockTasks[2], status: 'cancelled' as const, priority: 'high' as const }, // Kritisch (cancelled != completed)
      ];
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(tasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - 2 kritische Tasks (pending urgent + cancelled high)
      expect(result.current.progress.criticalTasksRemaining).toBe(2);
    });

    it('sollte useMemo optimieren (keine Re-Calculation bei gleichen Tasks)', async () => {
      // Arrange
      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(mockTasks);

      // Act
      const { result, rerender } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstProgress = result.current.progress;

      // Re-render ohne Datenänderung
      rerender();

      // Assert - Progress-Objekt sollte gleiche Referenz haben (useMemo)
      expect(result.current.progress).toBe(firstProgress);
    });
  });

  // ========================================
  // DATA INTEGRITY TESTS
  // ========================================

  describe('Data Integrity', () => {
    it('sollte mit malformed Tasks umgehen', async () => {
      // Arrange - Tasks ohne status/priority
      const malformedTasks = [
        { id: 'task-1', title: 'Task 1', projectId: 'project-1', organizationId: 'org-1' },
      ] as any;

      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(malformedTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Sollte nicht crashen
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.progress.totalTasks).toBe(1);
      expect(result.current.progress.completedTasks).toBe(0); // status undefined != 'completed'
      expect(result.current.progress.criticalTasksRemaining).toBe(0); // priority undefined
    });

    it('sollte mit vollständig leeren Tasks-Array umgehen', async () => {
      // Arrange
      const emptyTasks: any[] = [];

      mockTaskService.getByProjectId = jest.fn().mockResolvedValue(emptyTasks);

      // Act
      const { result } = renderHook(
        () => useProjectTasks('project-1', 'org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Leeres Array sollte sicher gehandhabt werden
      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.progress.totalTasks).toBe(0);
      expect(result.current.progress.taskCompletion).toBe(100);
    });
  });
});
