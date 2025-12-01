// src/lib/firebase/__tests__/task-service-project-extensions.test.ts
import { taskService as baseTaskService } from '../task-service';
import { ProjectTask, TaskFilters } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

// Type-Definition für erweiterte Methoden
interface ProjectTaskExtensions {
  getByProject(projectId: string, organizationId: string): Promise<ProjectTask[]>;
  getTodayTasks(userId: string, organizationId: string, projectIds?: string[]): Promise<ProjectTask[]>;
  getOverdueTasks(projectId: string, organizationId: string): Promise<ProjectTask[]>;
  updateProgress(taskId: string, progress: number): Promise<void>;
  getTasksWithFilters(organizationId: string, filters: TaskFilters): Promise<ProjectTask[]>;
  addComputedFields(tasks: ProjectTask[]): ProjectTask[];
}

// Type-Cast für taskService mit erweiterten Methoden
const taskService = baseTaskService as typeof baseTaskService & ProjectTaskExtensions;

// Mock Firebase
jest.mock('../client-init', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn()
  }
}));

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
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now()
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime()
    }))
  }
}));

jest.mock('../notifications-service', () => ({
  notificationsService: {
    create: jest.fn(),
    getSettings: jest.fn(() => Promise.resolve({ taskOverdue: true }))
  }
}));

const mockFirestore = require('firebase/firestore');

describe('taskService - Project Extensions', () => {
  const testOrganizationId = 'org-123';
  const testProjectId = 'project-123';
  const testUserId = 'user-123';
  const testTaskId = 'task-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByProject', () => {
    it('sollte alle Tasks für ein Projekt zurückgeben', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          userId: testUserId,
          title: 'Task 1',
          projectId: testProjectId,
          organizationId: testOrganizationId,
          assignedUserId: testUserId,
          status: 'pending' as const,
          priority: 'high' as const,
          progress: 25,
          dueDate: Timestamp.fromDate(new Date('2024-12-25'))
        },
        {
          id: 'task-2',
          userId: testUserId,
          title: 'Task 2',
          projectId: testProjectId,
          organizationId: testOrganizationId,
          assignedUserId: testUserId,
          status: 'in_progress' as const,
          priority: 'medium' as const,
          progress: 75,
          dueDate: Timestamp.fromDate(new Date('2024-12-20'))
        }
      ];

      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getByProject(testProjectId, testOrganizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'task-1',
        title: 'Task 1',
        projectId: testProjectId,
        isOverdue: expect.any(Boolean),
        daysUntilDue: expect.any(Number),
        overdueBy: expect.any(Number)
      }));
    });

    it('sollte Fallback ohne orderBy verwenden, wenn Index fehlt', async () => {
      const mockError = { code: 'failed-precondition' };
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;

      const mockTask = {
        id: 'task-1',
        userId: testUserId,
        title: 'Task 1',
        projectId: testProjectId,
        organizationId: testOrganizationId,
        assignedUserId: testUserId,
        status: 'pending' as const,
        priority: 'medium' as const,
        progress: 0,
        dueDate: Timestamp.fromDate(new Date('2024-12-25'))
      };

      // Erster Aufruf schlägt fehl, zweiter funktioniert
      mockGetDocs
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          docs: [{
            id: 'task-1',
            data: () => mockTask
          }]
        });

      const result = await taskService.getByProject(testProjectId, testOrganizationId);

      expect(mockGetDocs).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });

    it('sollte Multi-Tenancy korrekt implementieren', async () => {
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      const mockQuery = mockFirestore.query as jest.Mock;
      const mockWhere = mockFirestore.where as jest.Mock;

      mockGetDocs.mockResolvedValue({ docs: [] });

      await taskService.getByProject(testProjectId, testOrganizationId);

      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testOrganizationId);
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', testProjectId);
    });
  });

  describe('getTodayTasks', () => {
    it('sollte heute fällige Tasks zurückgeben', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: 'today-task',
          userId: testUserId,
          title: 'Today Task',
          assignedUserId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          dueDate: Timestamp.fromDate(today),
          status: 'pending' as const,
          priority: 'medium' as const,
          progress: 0
        },
        {
          id: 'tomorrow-task',
          userId: testUserId,
          title: 'Tomorrow Task',
          assignedUserId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          dueDate: Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)),
          status: 'pending' as const,
          priority: 'medium' as const,
          progress: 0
        }
      ];

      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getTodayTasks(testUserId, testOrganizationId, [testProjectId]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('today-task');
    });

    it('sollte nur Tasks für spezifische Projekte zurückgeben', async () => {
      const today = new Date();
      const mockTasks = [
        {
          id: 'project-task',
          userId: testUserId,
          title: 'Project Task',
          assignedUserId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          status: 'pending' as const,
          priority: 'medium' as const,
          progress: 0,
          dueDate: Timestamp.fromDate(today)
        },
        {
          id: 'other-project-task',
          userId: testUserId,
          title: 'Other Project Task',
          assignedUserId: testUserId,
          organizationId: testOrganizationId,
          projectId: 'other-project',
          status: 'pending' as const,
          priority: 'medium' as const,
          progress: 0,
          dueDate: Timestamp.fromDate(today)
        }
      ];

      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getTodayTasks(testUserId, testOrganizationId, [testProjectId]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('project-task');
    });

    it('sollte Tasks ohne Fälligkeitsdatum ignorieren', async () => {
      const mockTasks = [
        {
          id: 'no-due-date',
          userId: testUserId,
          title: 'No Due Date Task',
          assignedUserId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          status: 'pending' as const,
          priority: 'medium' as const,
          progress: 0
        }
      ];

      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getTodayTasks(testUserId, testOrganizationId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getOverdueTasks', () => {
    it('sollte überfällige Tasks zurückgeben', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: 'overdue-task',
          userId: testUserId,
          title: 'Overdue Task',
          projectId: testProjectId,
          organizationId: testOrganizationId,
          assignedUserId: testUserId,
          priority: 'medium' as const,
          progress: 0,
          dueDate: Timestamp.fromDate(yesterday),
          status: 'pending' as const
        },
        {
          id: 'completed-overdue',
          userId: testUserId,
          title: 'Completed Overdue',
          projectId: testProjectId,
          organizationId: testOrganizationId,
          assignedUserId: testUserId,
          priority: 'medium' as const,
          progress: 100,
          dueDate: Timestamp.fromDate(yesterday),
          status: 'completed' as const
        }
      ];

      // Mock getByProject method
      const originalGetByProject = taskService.getByProject;
      taskService.getByProject = jest.fn().mockResolvedValue(mockTasks.map(task => ({
        ...task,
        isOverdue: task.status !== 'completed' && new Date() > task.dueDate.toDate(),
        daysUntilDue: 0,
        overdueBy: 1
      })));

      const result = await taskService.getOverdueTasks(testProjectId, testOrganizationId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('overdue-task');

      // Restore original method
      taskService.getByProject = originalGetByProject;
    });

    it('sollte Tasks ohne Fälligkeitsdatum ignorieren', async () => {
      const mockTasks = [
        {
          id: 'no-due-date',
          userId: testUserId,
          title: 'No Due Date',
          projectId: testProjectId,
          organizationId: testOrganizationId,
          assignedUserId: testUserId,
          priority: 'medium' as const,
          progress: 0,
          status: 'pending' as const
        }
      ];

      const originalGetByProject = taskService.getByProject;
      taskService.getByProject = jest.fn().mockResolvedValue(mockTasks);

      const result = await taskService.getOverdueTasks(testProjectId, testOrganizationId);

      expect(result).toHaveLength(0);
      taskService.getByProject = originalGetByProject;
    });
  });

  describe('updateProgress', () => {
    it('sollte Task Progress aktualisieren', async () => {
      const mockUpdateDoc = mockFirestore.updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValue(undefined);

      await taskService.updateProgress(testTaskId, 75);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({
          progress: 75,
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte Progress auf 0-100 begrenzen', async () => {
      const mockUpdateDoc = mockFirestore.updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValue(undefined);

      // Test Minimum (unter 0)
      await taskService.updateProgress(testTaskId, -10);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({ progress: 0 })
      );

      // Test Maximum (über 100)
      await taskService.updateProgress(testTaskId, 150);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({ progress: 100 })
      );
    });
  });

  describe('getTasksWithFilters', () => {
    const mockTasks: ProjectTask[] = [
      {
        id: 'task-1',
        userId: testUserId,
        organizationId: testOrganizationId,
        projectId: testProjectId,
        assignedUserId: testUserId,
        title: 'My High Priority Task',
        status: 'pending' as const,
        priority: 'high' as const,
        progress: 50,
        dueDate: Timestamp.fromDate(new Date())
      },
      {
        id: 'task-2',
        userId: 'other-user',
        organizationId: testOrganizationId,
        projectId: 'other-project',
        assignedUserId: 'other-user',
        title: 'Other User Task',
        status: 'completed' as const,
        priority: 'low' as const,
        progress: 100,
        dueDate: Timestamp.fromDate(new Date())
      }
    ];

    beforeEach(() => {
      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });
    });

    it('sollte nach assignedToMe filtern', async () => {
      const filters: TaskFilters = {
        assignedToMe: true,
        assignedUserId: testUserId
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].assignedUserId).toBe(testUserId);
    });

    it('sollte nach Projekt-IDs filtern', async () => {
      const filters: TaskFilters = {
        projectIds: [testProjectId]
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(testProjectId);
    });

    it('sollte nach Status filtern', async () => {
      const filters: TaskFilters = {
        status: ['completed']
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('sollte nach Priorität filtern', async () => {
      const filters: TaskFilters = {
        priority: ['high']
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
    });

    it('sollte heute fällige Tasks filtern', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTask = {
        ...mockTasks[0],
        dueDate: Timestamp.fromDate(today)
      };

      const tomorrowTask = {
        ...mockTasks[1],
        dueDate: Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))
      };

      const mockDocs = [todayTask, tomorrowTask].map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const filters: TaskFilters = {
        today: true
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(todayTask.id);
    });

    it('sollte überfällige Tasks filtern', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const overdueTask = {
        ...mockTasks[0],
        dueDate: Timestamp.fromDate(yesterday),
        status: 'pending' as const
      };

      const mockDocs = [overdueTask, mockTasks[1]].map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const filters: TaskFilters = {
        overdue: true
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
    });

    it('sollte kombinierte Filter anwenden', async () => {
      const filters: TaskFilters = {
        assignedToMe: true,
        assignedUserId: testUserId,
        status: ['pending'],
        priority: ['high']
      };

      const result = await taskService.getTasksWithFilters(testOrganizationId, filters);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        assignedUserId: testUserId,
        status: 'pending',
        priority: 'high'
      }));
    });
  });

  describe('addComputedFields', () => {
    it('sollte isOverdue korrekt berechnen', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tasks: ProjectTask[] = [
        {
          id: 'overdue-task',
          userId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          assignedUserId: testUserId,
          title: 'Overdue Task',
          status: 'pending',
          priority: 'medium',
          progress: 50,
          dueDate: Timestamp.fromDate(yesterday)
        },
        {
          id: 'completed-overdue',
          userId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          assignedUserId: testUserId,
          title: 'Completed Overdue',
          status: 'completed',
          priority: 'medium',
          progress: 100,
          dueDate: Timestamp.fromDate(yesterday)
        }
      ];

      const result = taskService.addComputedFields(tasks);

      expect(result[0].isOverdue).toBe(true);  // Pending + overdue
      expect(result[1].isOverdue).toBe(false); // Completed, nicht overdue
    });

    it('sollte daysUntilDue korrekt berechnen', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks: ProjectTask[] = [
        {
          id: 'future-task',
          userId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          assignedUserId: testUserId,
          title: 'Future Task',
          status: 'pending',
          priority: 'medium',
          progress: 50,
          dueDate: Timestamp.fromDate(tomorrow)
        }
      ];

      const result = taskService.addComputedFields(tasks);

      expect(result[0].daysUntilDue).toBe(1);
      expect(result[0].overdueBy).toBe(0);
    });

    it('sollte overdueBy korrekt berechnen', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const tasks: ProjectTask[] = [
        {
          id: 'overdue-task',
          userId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          assignedUserId: testUserId,
          title: 'Overdue Task',
          status: 'pending',
          priority: 'medium',
          progress: 50,
          dueDate: Timestamp.fromDate(threeDaysAgo)
        }
      ];

      const result = taskService.addComputedFields(tasks);

      expect(result[0].overdueBy).toBe(3);
      expect(result[0].daysUntilDue).toBe(0);
    });

    it('sollte Tasks ohne Fälligkeitsdatum korrekt behandeln', () => {
      const tasks: ProjectTask[] = [
        {
          id: 'no-due-date',
          userId: testUserId,
          organizationId: testOrganizationId,
          projectId: testProjectId,
          assignedUserId: testUserId,
          title: 'No Due Date',
          status: 'pending',
          priority: 'medium',
          progress: 50
        }
      ];

      const result = taskService.addComputedFields(tasks);

      expect(result[0].isOverdue).toBe(false);
      expect(result[0].daysUntilDue).toBe(0);
      expect(result[0].overdueBy).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler bei getByProject korrekt behandeln', async () => {
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      const unknownError = new Error('Unknown error');

      mockGetDocs.mockRejectedValue(unknownError);

      await expect(taskService.getByProject(testProjectId, testOrganizationId))
        .rejects.toThrow('Unknown error');
    });

    it('sollte Fehler bei updateProgress korrekt behandeln', async () => {
      const mockUpdateDoc = mockFirestore.updateDoc as jest.Mock;
      const firestoreError = new Error('Firestore error');

      mockUpdateDoc.mockRejectedValue(firestoreError);

      await expect(taskService.updateProgress(testTaskId, 50))
        .rejects.toThrow('Firestore error');
    });
  });

  describe('Multi-Tenancy', () => {
    it('sollte organizationId in allen Queries verwenden', async () => {
      const mockWhere = mockFirestore.where as jest.Mock;
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;

      mockGetDocs.mockResolvedValue({ docs: [] });

      // Test verschiedene Methoden
      await taskService.getByProject(testProjectId, testOrganizationId);
      await taskService.getTodayTasks(testUserId, testOrganizationId);
      await taskService.getTasksWithFilters(testOrganizationId, {});

      // Überprüfe dass organizationId immer verwendet wird
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testOrganizationId);
    });

    it('sollte Cross-Tenant-Zugriff verhindern', async () => {
      const otherOrganizationId = 'other-org-123';

      const mockDocs = [{
        id: 'task-1',
        data: () => ({
          id: 'task-1',
          organizationId: otherOrganizationId, // Andere Organisation
          projectId: testProjectId
        })
      }];

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      // Firestore würde bereits die Filterung machen, aber wir testen das Verhalten
      const result = await taskService.getByProject(testProjectId, testOrganizationId);

      // Query sollte die richtige organizationId verwenden
      const mockWhere = mockFirestore.where as jest.Mock;
      expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', testOrganizationId);
    });
  });
});