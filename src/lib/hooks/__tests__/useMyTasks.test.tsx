/**
 * Tests für useMyTasks Hook
 *
 * Testet React Query Integration, Filter-Logik,
 * Error Handling und enabled/disabled Logik
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyTasks } from '../useMyTasks';
import { taskService } from '@/lib/firebase/task-service';
import { Timestamp } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';

// ========================================
// MOCKS
// ========================================

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-15T10:00:00Z'), toMillis: () => 1705315200000 })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date, toMillis: () => date.getTime() })),
  },
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'user-123', email: 'test@example.com' }
  }))
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: jest.fn(() => ({
    currentOrganization: { id: 'org-123', name: 'Test Org' }
  }))
}));

// Mock taskService
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    addComputedFields: jest.fn((tasks) => tasks.map(task => ({
      ...task,
      isOverdue: false,
      daysUntilDue: 0,
      overdueBy: 0
    })))
  }
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  return {
    toDate: () => date,
    toMillis: () => date.getTime()
  } as Timestamp;
};

const createMockTask = (overrides: any = {}) => ({
  id: 'task-1',
  title: 'Test Task',
  projectId: 'project-1',
  organizationId: 'org-123',
  assignedUserId: 'user-123',
  status: 'pending' as const,
  priority: 'medium' as const,
  progress: 0,
  createdAt: mockTimestamp('2024-01-10T10:00:00Z'),
  updatedAt: mockTimestamp('2024-01-10T10:00:00Z'),
  isOverdue: false,
  daysUntilDue: 0,
  overdueBy: 0,
  ...overrides
});

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

describe('useMyTasks', () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // FILTER TESTS
  // ========================================

  describe('Filter: all', () => {
    it('sollte alle Tasks des Users laden', async () => {
      // Arrange
      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'Task 1' }),
        createMockTask({ id: 'task-2', title: 'Task 2' }),
        createMockTask({ id: 'task-3', title: 'Task 3' }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      // Assert - Initial Loading
      expect(result.current.isLoading).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(3);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Filter: today', () => {
    it('sollte nur heute fällige Tasks zurückgeben', async () => {
      // Arrange
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'Due Today', dueDate: mockTimestamp(today.toISOString()) }),
        createMockTask({ id: 'task-2', title: 'Due Tomorrow', dueDate: mockTimestamp(tomorrow.toISOString()) }),
        createMockTask({ id: 'task-3', title: 'No Due Date', dueDate: null }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('today'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Nur Tasks mit dueDate = heute
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].title).toBe('Due Today');
    });
  });

  describe('Filter: overdue', () => {
    it('sollte nur überfällige Tasks zurückgeben', async () => {
      // Arrange
      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'Overdue Task', isOverdue: true }),
        createMockTask({ id: 'task-2', title: 'Not Overdue', isOverdue: false }),
        createMockTask({ id: 'task-3', title: 'Also Overdue', isOverdue: true }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('overdue'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Nur überfällige Tasks
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data!.every(task => task.isOverdue)).toBe(true);
    });
  });

  // ========================================
  // SORTING TESTS
  // ========================================

  describe('Sortierung', () => {
    it('sollte erledigte Tasks ans Ende sortieren', async () => {
      // Arrange
      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'Pending', status: 'pending' }),
        createMockTask({ id: 'task-2', title: 'Completed', status: 'completed' }),
        createMockTask({ id: 'task-3', title: 'In Progress', status: 'in_progress' }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Completed sollte am Ende sein
      const titles = result.current.data!.map(t => t.title);
      expect(titles[titles.length - 1]).toBe('Completed');
    });

    it('sollte Tasks mit dueDate vor Tasks ohne dueDate sortieren', async () => {
      // Arrange
      const today = new Date();
      const mockTasks = [
        createMockTask({ id: 'task-1', title: 'No Date', dueDate: null }),
        createMockTask({ id: 'task-2', title: 'With Date', dueDate: mockTimestamp(today.toISOString()) }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Tasks mit dueDate zuerst
      expect(result.current.data![0].title).toBe('With Date');
      expect(result.current.data![1].title).toBe('No Date');
    });
  });

  // ========================================
  // ENABLED/DISABLED LOGIC TESTS
  // ========================================

  describe('Enabled/Disabled Logic', () => {
    it('sollte Query disablen wenn User fehlt', async () => {
      // Arrange
      const { useAuth } = require('@/context/AuthContext');
      useAuth.mockReturnValue({ user: null });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('sollte Query disablen wenn Organization fehlt', async () => {
      // Arrange
      const { useOrganization } = require('@/context/OrganizationContext');
      useOrganization.mockReturnValue({ currentOrganization: null });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('sollte Fehler korrekt handhaben', async () => {
      // Arrange
      mockGetDocs.mockRejectedValue(new Error('Firestore permission denied'));

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });
  });

  // ========================================
  // COMPUTED FIELDS INTEGRATION
  // ========================================

  describe('Computed Fields', () => {
    it('sollte taskService.addComputedFields aufrufen', async () => {
      // Arrange
      const mockTasks = [
        createMockTask({ id: 'task-1' }),
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockTasks.map(task => ({
          id: task.id,
          data: () => task
        }))
      });

      // Act
      const { result } = renderHook(
        () => useMyTasks('all'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(taskService.addComputedFields).toHaveBeenCalled();
    });
  });
});
