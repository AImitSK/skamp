// src/lib/firebase/__tests__/task-service.test.ts
import { taskService } from '../task-service';
import { Task, TaskPriority, TaskStatus } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

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
    now: jest.fn(() => ({ toDate: () => new Date() })),
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

describe('taskService', () => {
  const testOrganizationId = 'org-123';
  const testUserId = 'user-123';
  const testTaskId = 'task-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('sollte eine neue Task erstellen', async () => {
      const mockAddDoc = mockFirestore.addDoc as jest.Mock;
      mockAddDoc.mockResolvedValue({ id: testTaskId });

      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: testUserId,
        organizationId: testOrganizationId,
        title: 'Test Task',
        description: 'Test Beschreibung',
        status: 'pending' as TaskStatus,
        priority: 'medium' as TaskPriority,
        dueDate: Timestamp.fromDate(new Date('2024-12-25'))
      };

      const result = await taskService.create(taskData);

      expect(result).toBe(testTaskId);
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mocked-collection',
        expect.objectContaining({
          ...taskData,
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });
  });

  describe('getById', () => {
    it('sollte eine Task anhand der ID zurückgeben', async () => {
      const mockTask = {
        id: testTaskId,
        title: 'Test Task',
        userId: testUserId,
        organizationId: testOrganizationId,
        status: 'pending',
        priority: 'medium'
      };

      const mockDocSnap = {
        exists: () => true,
        id: testTaskId,
        data: () => mockTask
      };

      const mockGetDoc = mockFirestore.getDoc as jest.Mock;
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await taskService.getById(testTaskId);

      expect(result).toEqual({ ...mockTask, id: testTaskId });
    });

    it('sollte null zurückgeben, wenn Task nicht existiert', async () => {
      const mockDocSnap = { exists: () => false };
      const mockGetDoc = mockFirestore.getDoc as jest.Mock;
      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await taskService.getById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('sollte alle Tasks einer Organisation zurückgeben', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          userId: testUserId,
          organizationId: testOrganizationId,
          status: 'pending',
          priority: 'high'
        },
        {
          id: 'task-2',
          title: 'Task 2',
          userId: testUserId,
          organizationId: testOrganizationId,
          status: 'completed',
          priority: 'low'
        }
      ];

      const mockDocs = mockTasks.map(task => ({
        id: task.id,
        data: () => task
      }));

      const mockSnapshot = { docs: mockDocs };
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await taskService.getAll(testOrganizationId, testUserId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockTasks[0]);
      expect(result[1]).toEqual(mockTasks[1]);
    });

    it('sollte Fallback ohne orderBy verwenden, wenn Index fehlt', async () => {
      const mockError = { code: 'failed-precondition' };
      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      
      // Erster Aufruf schlägt fehl, zweiter funktioniert
      mockGetDocs
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'task-1',
              data: () => ({
                id: 'task-1',
                title: 'Task 1',
                dueDate: Timestamp.fromDate(new Date('2024-12-25'))
              })
            }
          ]
        });

      const result = await taskService.getAll(testOrganizationId, testUserId);

      expect(mockGetDocs).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByDateRange', () => {
    it('sollte Tasks im angegebenen Zeitraum zurückgeben', async () => {
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');
      const dueDate = new Date('2024-12-15');

      const mockTasks = [
        {
          id: 'task-in-range',
          title: 'Task in Range',
          dueDate: Timestamp.fromDate(dueDate)
        },
        {
          id: 'task-out-of-range',
          title: 'Task out of Range',
          dueDate: Timestamp.fromDate(new Date('2023-11-15'))
        },
        {
          id: 'task-no-date',
          title: 'Task without date'
        }
      ];

      // Mock getAll method
      const originalGetAll = taskService.getAll;
      taskService.getAll = jest.fn().mockResolvedValue(mockTasks);

      const result = await taskService.getByDateRange(
        testOrganizationId,
        startDate,
        endDate,
        testUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-in-range');

      // Restore original method
      taskService.getAll = originalGetAll;
    });
  });

  describe('getByClientId', () => {
    it('sollte Tasks eines Kunden zurückgeben', async () => {
      const clientId = 'client-123';
      const mockDocs = [{
        id: 'task-1',
        data: () => ({
          id: 'task-1',
          linkedClientId: clientId
        })
      }];

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getByClientId(
        testOrganizationId,
        clientId,
        testUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0].linkedClientId).toBe(clientId);
    });
  });

  describe('getByCampaignId', () => {
    it('sollte Tasks einer Kampagne zurückgeben', async () => {
      const campaignId = 'campaign-123';
      const mockDocs = [{
        id: 'task-1',
        data: () => ({
          id: 'task-1',
          linkedCampaignId: campaignId
        })
      }];

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const result = await taskService.getByCampaignId(
        testOrganizationId,
        campaignId,
        testUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0].linkedCampaignId).toBe(campaignId);
    });
  });

  describe('update', () => {
    it('sollte eine Task aktualisieren', async () => {
      const mockUpdateDoc = mockFirestore.updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValue(undefined);

      // Mock getById to return existing task
      const mockGetById = jest.spyOn(taskService, 'getById');
      mockGetById.mockResolvedValue({
        id: testTaskId,
        userId: testUserId,
        organizationId: testOrganizationId,
        title: 'Existing Task',
        status: 'pending',
        priority: 'medium'
      } as Task);

      const updateData = {
        title: 'Updated Task',
        priority: 'high' as TaskPriority
      };

      await taskService.update(testTaskId, updateData);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mocked-doc',
        expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Object)
        })
      );

      mockGetById.mockRestore();
    });
  });

  describe('markAsCompleted', () => {
    it('sollte eine Task als erledigt markieren', async () => {
      const mockUpdate = jest.spyOn(taskService, 'update');
      mockUpdate.mockResolvedValue(undefined);

      await taskService.markAsCompleted(testTaskId);

      expect(mockUpdate).toHaveBeenCalledWith(testTaskId, {
        status: 'completed',
        completedAt: expect.any(Object)
      });

      mockUpdate.mockRestore();
    });
  });

  describe('delete', () => {
    it('sollte eine Task löschen', async () => {
      const mockDeleteDoc = mockFirestore.deleteDoc as jest.Mock;
      mockDeleteDoc.mockResolvedValue(undefined);

      await taskService.delete(testTaskId);

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('sollte Task-Statistiken berechnen', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockTasks: Task[] = [
        {
          id: '1',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Completed Task',
          status: 'completed',
          priority: 'medium'
        },
        {
          id: '2',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Overdue Task',
          status: 'pending',
          priority: 'high',
          dueDate: Timestamp.fromDate(yesterday)
        },
        {
          id: '3',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Due Today',
          status: 'pending',
          priority: 'medium',
          dueDate: Timestamp.fromDate(today)
        },
        {
          id: '4',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Due Tomorrow',
          status: 'pending',
          priority: 'low',
          dueDate: Timestamp.fromDate(tomorrow)
        }
      ];

      // Mock getAll method
      const originalGetAll = taskService.getAll;
      taskService.getAll = jest.fn().mockResolvedValue(mockTasks);

      const stats = await taskService.getStats(testOrganizationId, testUserId);

      expect(stats).toEqual({
        total: 4,
        pending: 3,
        completed: 1,
        overdue: 1,
        dueToday: 1,
        dueThisWeek: 1
      });

      // Restore original method
      taskService.getAll = originalGetAll;
    });
  });

  describe('checkAndNotifyOverdueTasks', () => {
    it('sollte Benachrichtigungen für überfällige Tasks senden', async () => {
      const mockTasks: Task[] = [
        {
          id: 'overdue-task',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Overdue Task',
          status: 'pending',
          priority: 'high',
          dueDate: Timestamp.fromDate(new Date('2024-01-01'))
        }
      ];

      // Mock dependencies
      const originalGetAll = taskService.getAll;
      taskService.getAll = jest.fn().mockResolvedValue(mockTasks);

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ empty: true });

      const mockNotificationsService = require('../notifications-service').notificationsService;
      mockNotificationsService.create.mockResolvedValue(undefined);

      await taskService.checkAndNotifyOverdueTasks(testOrganizationId, testUserId);

      expect(mockNotificationsService.create).toHaveBeenCalledWith({
        userId: testUserId,
        type: 'TASK_OVERDUE',
        title: 'Überfälliger Task',
        message: 'Dein Task "Overdue Task" ist überfällig.',
        linkUrl: '/dashboard/tasks/overdue-task',
        linkType: 'task',
        linkId: 'overdue-task',
        isRead: false,
        metadata: {
          taskName: 'Overdue Task'
        }
      });

      // Restore original method
      taskService.getAll = originalGetAll;
    });

    it('sollte keine Benachrichtigung senden, wenn userId fehlt', async () => {
      await taskService.checkAndNotifyOverdueTasks(testOrganizationId);

      const mockNotificationsService = require('../notifications-service').notificationsService;
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('sollte keine Benachrichtigung senden, wenn bereits heute gesendet', async () => {
      const mockTasks: Task[] = [
        {
          id: 'overdue-task',
          userId: testUserId,
          organizationId: testOrganizationId,
          title: 'Overdue Task',
          status: 'pending',
          priority: 'high',
          dueDate: Timestamp.fromDate(new Date('2024-01-01'))
        }
      ];

      // Mock dependencies
      const originalGetAll = taskService.getAll;
      taskService.getAll = jest.fn().mockResolvedValue(mockTasks);

      const mockGetDocs = mockFirestore.getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({ empty: false }); // Existing notification

      const mockNotificationsService = require('../notifications-service').notificationsService;

      await taskService.checkAndNotifyOverdueTasks(testOrganizationId, testUserId);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();

      // Restore original method
      taskService.getAll = originalGetAll;
    });
  });
});