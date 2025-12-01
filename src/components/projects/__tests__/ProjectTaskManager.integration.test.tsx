// src/components/projects/__tests__/ProjectTaskManager.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTaskManager } from '../ProjectTaskManager';
import { taskService } from '@/lib/firebase/task-service';
import { useAuth } from '@/context/AuthContext';
import { ProjectTask } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';
import {
  mockTasksDataSet,
  mockTeamMembersDataSet,
  createMockTask,
  createDateRelativeToToday,
  createTimestampRelativeToToday
} from './test-utils';

// Mock Firebase
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    getByProject: jest.fn(),
    markAsCompleted: jest.fn(),
    delete: jest.fn(),
    updateProgress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getByProjectId: jest.fn(),
    getById: jest.fn(),
    getAll: jest.fn(),
    getByDateRange: jest.fn(),
    getByClientId: jest.fn(),
    getByCampaignId: jest.fn(),
    getStats: jest.fn(),
    checkAndNotifyOverdueTasks: jest.fn(),
    getByProjectStage: jest.fn(),
    getCriticalTasksForStage: jest.fn(),
    checkStageCompletionRequirements: jest.fn(),
    createTasksFromTemplates: jest.fn(),
    handleTaskCompletion: jest.fn(),
    updateTaskDependencies: jest.fn(),
    validateTaskIntegrity: jest.fn(),
    getTodayTasks: jest.fn(),
    getOverdueTasks: jest.fn(),
    getTasksWithFilters: jest.fn(),
    addComputedFields: jest.fn()
  }
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Real-like Modal Components für Integration Tests
jest.mock('../TaskCreateModal', () => ({
  TaskCreateModal: ({ isOpen, onClose, onSuccess, projectId, organizationId }: any) => {
    const [loading, setLoading] = React.useState(false);
    const [title, setTitle] = React.useState('');

    const handleSubmit = async () => {
      if (!title.trim()) return;
      setLoading(true);

      try {
        await taskService.create({
          userId: 'user-123',
          organizationId,
          projectId,
          assignedUserId: 'user-123',
          title: title.trim(),
          status: 'pending',
          priority: 'medium',
          progress: 0
        });

        onSuccess();
        onClose();
        setTitle('');
      } catch (error) {
        console.error('Failed to create task');
      } finally {
        setLoading(false);
      }
    };

    return isOpen ? (
      <div data-testid="task-create-modal">
        <h2>Neue Task erstellen</h2>
        <input
          data-testid="task-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Titel"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          data-testid="create-task-button"
        >
          {loading ? 'Wird erstellt...' : 'Task erstellen'}
        </button>
        <button onClick={onClose} data-testid="cancel-button">
          Abbrechen
        </button>
      </div>
    ) : null;
  }
}));

jest.mock('../TaskEditModal', () => ({
  TaskEditModal: ({ isOpen, onClose, onSuccess, task }: any) => {
    const [loading, setLoading] = React.useState(false);
    const [title, setTitle] = React.useState(task?.title || '');
    const [status, setStatus] = React.useState(task?.status || 'pending');

    React.useEffect(() => {
      if (task && isOpen) {
        setTitle(task.title || '');
        setStatus(task.status || 'pending');
      }
    }, [task, isOpen]);

    const handleSubmit = async () => {
      if (!title.trim()) return;
      setLoading(true);

      try {
        await taskService.update(task.id, {
          title: title.trim(),
          status
        });

        onSuccess();
        onClose();
      } catch (error) {
        console.error('Failed to update task');
      } finally {
        setLoading(false);
      }
    };

    return isOpen ? (
      <div data-testid="task-edit-modal">
        <h2>Task bearbeiten</h2>
        <input
          data-testid="edit-task-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Titel"
        />
        <select
          data-testid="edit-task-status-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">Ausstehend</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Erledigt</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={loading}
          data-testid="save-task-button"
        >
          {loading ? 'Wird gespeichert...' : 'Speichern'}
        </button>
        <button onClick={onClose} data-testid="cancel-edit-button">
          Abbrechen
        </button>
      </div>
    ) : null;
  }
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService> & {
  getByProject: jest.Mock;
  updateProgress: jest.Mock;
};
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProjectTaskManager - Integration Tests', () => {
  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: false,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase'
  } as any;

  const teamMembers: TeamMember[] = Object.values(mockTeamMembersDataSet);

  const defaultProps = {
    projectId: 'project-123',
    organizationId: 'org-123',
    projectManagerId: 'pm-user-123',
    teamMembers,
    projectTitle: 'Integration Test Project'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      uploadProfileImage: jest.fn(),
      deleteProfileImage: jest.fn(),
      getAvatarUrl: jest.fn(),
      getInitials: jest.fn(),
      updateUserProfile: jest.fn(),
      sendVerificationEmail: jest.fn()
    });
  });

  describe('Complete Task Lifecycle', () => {
    it('sollte vollständigen Task-Lifecycle durchlaufen können', async () => {
      const user = userEvent.setup();

      // Setup: Start mit leerer Task-Liste
      mockTaskService.getByProject.mockResolvedValue([]);
      mockTaskService.create.mockResolvedValue('new-task-123');
      mockTaskService.update.mockResolvedValue();
      mockTaskService.markAsCompleted.mockResolvedValue();

      render(<ProjectTaskManager {...defaultProps} />);

      // Schritt 1: Warte auf Initial Load
      await waitFor(() => {
        expect(screen.getByText('Keine Tasks gefunden')).toBeInTheDocument();
      });

      // Schritt 2: Neue Task erstellen
      await user.click(screen.getByText('Task erstellen'));
      expect(screen.getByTestId('task-create-modal')).toBeInTheDocument();

      await user.type(screen.getByTestId('task-title-input'), 'Integration Test Task');
      await user.click(screen.getByTestId('create-task-button'));

      await waitFor(() => {
        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Integration Test Task',
            status: 'pending'
          })
        );
      });

      // Schritt 3: Mock Task-Liste mit neuer Task
      const newTask = createMockTask({
        id: 'new-task-123',
        title: 'Integration Test Task',
        status: 'pending',
        progress: 0
      });

      mockTaskService.getByProject.mockResolvedValue([newTask]);

      // Modal sollte geschlossen werden und Tasks neu geladen
      await waitFor(() => {
        expect(screen.queryByTestId('task-create-modal')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Integration Test Task')).toBeInTheDocument();
        expect(screen.getByText('1 Task')).toBeInTheDocument();
      });

      // Schritt 4: Task bearbeiten
      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Bearbeiten'));

      expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();

      await user.clear(screen.getByTestId('edit-task-title-input'));
      await user.type(screen.getByTestId('edit-task-title-input'), 'Updated Integration Task');
      await user.selectOptions(screen.getByTestId('edit-task-status-select'), 'in_progress');
      await user.click(screen.getByTestId('save-task-button'));

      await waitFor(() => {
        expect(mockTaskService.update).toHaveBeenCalledWith(
          'new-task-123',
          expect.objectContaining({
            title: 'Updated Integration Task',
            status: 'in_progress'
          })
        );
      });

      // Schritt 5: Task als erledigt markieren
      const updatedTask = { ...newTask, title: 'Updated Integration Task', status: 'in_progress' as const };
      mockTaskService.getByProject.mockResolvedValue([updatedTask]);

      await waitFor(() => {
        expect(screen.getByText('Updated Integration Task')).toBeInTheDocument();
      });

      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Als erledigt markieren'));

      expect(mockTaskService.markAsCompleted).toHaveBeenCalledWith('new-task-123');

      // Schritt 6: Finale Validation
      const completedTask = { ...updatedTask, status: 'completed' as const, progress: 100 };
      mockTaskService.getByProject.mockResolvedValue([completedTask]);

      await waitFor(() => {
        expect(mockTaskService.getByProject).toHaveBeenCalledTimes(4); // Initial + 3 reloads
      });
    });
  });

  describe('Real-World Filtering Scenarios', () => {
    const realWorldTasks: ProjectTask[] = [
      // User's tasks
      createMockTask({
        id: 'my-pending',
        title: 'My Pending Task',
        assignedUserId: 'user-123',
        status: 'pending',
        dueDate: createTimestampRelativeToToday(0), // Today
        isOverdue: false,
        daysUntilDue: 0
      }),
      createMockTask({
        id: 'my-overdue',
        title: 'My Overdue Task',
        assignedUserId: 'user-123',
        status: 'pending',
        dueDate: createTimestampRelativeToToday(-2), // 2 days ago
        isOverdue: true,
        overdueBy: 2
      }),
      // Other user's tasks
      createMockTask({
        id: 'other-pending',
        title: 'Other User Task',
        assignedUserId: 'other-user-456',
        status: 'pending',
        dueDate: createTimestampRelativeToToday(1), // Tomorrow
        isOverdue: false,
        daysUntilDue: 1
      }),
      createMockTask({
        id: 'completed-task',
        title: 'Completed Task',
        assignedUserId: 'user-123',
        status: 'completed',
        progress: 100
      })
    ];

    beforeEach(() => {
      mockTaskService.getByProject.mockResolvedValue(realWorldTasks);
    });

    it('sollte komplexe Filter-Kombinationen korrekt anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('4 Tasks')).toBeInTheDocument();
      });

      // Filter: Nur meine Tasks
      await user.click(screen.getByText('Meine Tasks'));
      await waitFor(() => {
        expect(screen.getByText('3 Tasks (Meine Tasks)')).toBeInTheDocument();
        expect(screen.getByText('My Pending Task')).toBeInTheDocument();
        expect(screen.getByText('My Overdue Task')).toBeInTheDocument();
        expect(screen.getByText('Completed Task')).toBeInTheDocument();
        expect(screen.queryByText('Other User Task')).not.toBeInTheDocument();
      });

      // Zusätzlicher Filter: Nur überfällige
      await user.click(screen.getByText('Überfällig'));
      await waitFor(() => {
        expect(screen.getByText('1 Task (Meine Tasks) (Überfällig)')).toBeInTheDocument();
        expect(screen.getByText('My Overdue Task')).toBeInTheDocument();
        expect(screen.queryByText('My Pending Task')).not.toBeInTheDocument();
        expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
      });

      // Filter zurücksetzen
      await user.click(screen.getByText('Alle Team-Tasks'));
      await waitFor(() => {
        expect(screen.getByText('4 Tasks')).toBeInTheDocument();
      });

      // Filter: Heute fällig
      await user.click(screen.getByText('Heute fällig'));
      await waitFor(() => {
        expect(screen.getByText('1 Task (Heute fällig)')).toBeInTheDocument();
        expect(screen.getByText('My Pending Task')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('sollte von Netzwerk-Fehlern erholen können', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Initial load failure
      mockTaskService.getByProject.mockRejectedValueOnce(new Error('Network error'));

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error loading project tasks:', expect.any(Error));
      });

      // Recovery: successful reload durch Filter-Klick
      mockTaskService.getByProject.mockResolvedValue([mockTasksDataSet.pending]);

      await user.click(screen.getByText('Meine Tasks'));

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('sollte von Task-Aktions-Fehlern erholen können', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockTaskService.getByProject.mockResolvedValue([mockTasksDataSet.pending]);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Failure beim Task completion
      mockTaskService.markAsCompleted.mockRejectedValueOnce(new Error('Completion failed'));

      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Als erledigt markieren'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error completing task:', expect.any(Error));
      });

      // Recovery: successful retry
      mockTaskService.markAsCompleted.mockResolvedValue();
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Als erledigt markieren'));

      expect(mockTaskService.markAsCompleted).toHaveBeenCalledTimes(2);

      consoleError.mockRestore();
    });
  });

  describe('Progress Interaction Scenarios', () => {
    it('sollte Progress-Updates korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      const task = createMockTask({ progress: 25 });

      mockTaskService.getByProject.mockResolvedValue([task]);
      mockTaskService.updateProgress.mockResolvedValue(undefined);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
      });

      // Simuliere Progress-Bar Click
      const progressBars = screen.getAllByTitle('Klicken um Fortschritt zu ändern');
      const progressBar = progressBars[0];

      // Mock getBoundingClientRect
      const mockBoundingClientRect = {
        left: 0,
        width: 200
      };

      Object.defineProperty(progressBar, 'getBoundingClientRect', {
        value: () => mockBoundingClientRect
      });

      // Klick bei 75% Position
      const clickEvent = new MouseEvent('click', {
        clientX: 150 // 150/200 = 75%
      });

      fireEvent(progressBar, clickEvent);

      expect(mockTaskService.updateProgress).toHaveBeenCalledWith(task.id, 75);

      // Nach erfolgreichem Update sollten Tasks neu geladen werden
      const updatedTask = { ...task, progress: 75 };
      mockTaskService.getByProject.mockResolvedValue([updatedTask]);

      await waitFor(() => {
        expect(mockTaskService.getByProject).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance und Memory Management', () => {
    it('sollte mehrfache Modal-Öffnungen korrekt verarbeiten', async () => {
      const user = userEvent.setup();
      mockTaskService.getByProject.mockResolvedValue([mockTasksDataSet.pending]);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Öffne und schließe Create Modal mehrmals
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText('Task erstellen'));
        expect(screen.getByTestId('task-create-modal')).toBeInTheDocument();

        await user.click(screen.getByTestId('cancel-button'));
        await waitFor(() => {
          expect(screen.queryByTestId('task-create-modal')).not.toBeInTheDocument();
        });
      }

      // Öffne und schließe Edit Modal mehrmals
      for (let i = 0; i < 3; i++) {
        const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
        await user.click(dropdownButtons[0]);
        await user.click(screen.getByText('Bearbeiten'));

        expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();

        await user.click(screen.getByTestId('cancel-edit-button'));
        await waitFor(() => {
          expect(screen.queryByTestId('task-edit-modal')).not.toBeInTheDocument();
        });
      }

      // Component sollte stabil bleiben
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('sollte große Task-Listen korrekt verarbeiten', async () => {
      // Erstelle 50 Tasks
      const largeTasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          title: `Task ${i + 1}`,
          assignedUserId: i % 2 === 0 ? 'user-123' : 'other-user'
        })
      );

      mockTaskService.getByProject.mockResolvedValue(largeTasks);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('50 Tasks')).toBeInTheDocument();
      });

      // Alle Tasks sollten sichtbar sein
      for (let i = 0; i < 10; i++) { // Test erste 10
        expect(screen.getByText(`Task ${i + 1}`)).toBeInTheDocument();
      }

      // Filter sollte funktionieren
      const user = userEvent.setup();
      await user.click(screen.getByText('Meine Tasks'));

      await waitFor(() => {
        expect(screen.getByText('25 Tasks (Meine Tasks)')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('sollte Keyboard-Navigation durch kompletten Workflow unterstützen', async () => {
      mockTaskService.getByProject.mockResolvedValue([mockTasksDataSet.pending]);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Tab zu Create Button
      const createButton = screen.getByText('Task erstellen');
      createButton.focus();
      expect(document.activeElement).toBe(createButton);

      // Enter drücken um Modal zu öffnen
      fireEvent.keyDown(createButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('task-create-modal')).toBeInTheDocument();
      });

      // Tab zur ersten Eingabe im Modal
      const titleInput = screen.getByTestId('task-title-input');
      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);
    });

    it('sollte Screen Reader freundlich sein', () => {
      mockTaskService.getByProject.mockResolvedValue([mockTasksDataSet.pending]);

      render(<ProjectTaskManager {...defaultProps} />);

      // Überprüfe ARIA-Labels und semantische Struktur
      expect(screen.getByRole('button', { name: /task erstellen/i })).toBeInTheDocument();

      // Table-ähnliche Struktur sollte semantisch korrekt sein
      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Zuständig')).toBeInTheDocument();
      expect(screen.getByText('Fortschritt')).toBeInTheDocument();
      expect(screen.getByText('Fälligkeit')).toBeInTheDocument();
      expect(screen.getByText('Priorität')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
});