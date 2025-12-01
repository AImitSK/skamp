// src/components/projects/__tests__/ProjectTaskManager.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTaskManager } from '../ProjectTaskManager';
import { taskService } from '@/lib/firebase/task-service';
import { useAuth } from '@/context/AuthContext';
import { ProjectTask, TaskStatus, TaskPriority } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('@/lib/firebase/task-service', () => ({
  taskService: {
    getByProject: jest.fn(), // (projectId, organizationId) => Promise<ProjectTask[]>
    markAsCompleted: jest.fn(),
    delete: jest.fn(),
    updateProgress: jest.fn(), // (taskId, progress) => Promise<void>
    create: jest.fn(),
    update: jest.fn()
  }
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock Firebase User type
const createMockUser = (overrides = {}) => ({
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
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
  providerId: 'firebase',
  ...overrides
});

// Mock Child Components
jest.mock('../TaskCreateModal', () => ({
  TaskCreateModal: ({ isOpen, onClose, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="task-create-modal">
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <button onClick={onSuccess} data-testid="modal-success">Success</button>
      </div>
    ) : null
  )
}));

jest.mock('../TaskEditModal', () => ({
  TaskEditModal: ({ isOpen, onClose, onSuccess, task }: any) => (
    isOpen ? (
      <div data-testid="task-edit-modal">
        <div data-testid="editing-task-id">{task?.id}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <button onClick={onSuccess} data-testid="modal-success">Success</button>
      </div>
    ) : null
  )
}));

// Type-safe mock mit expliziten Methoden
const mockTaskService = taskService as jest.Mocked<typeof taskService> & {
  getByProject: jest.MockedFunction<(projectId: string, organizationId: string) => Promise<ProjectTask[]>>;
  updateProgress: jest.MockedFunction<(taskId: string, progress: number) => Promise<void>>;
};
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProjectTaskManager', () => {
  const mockUser = createMockUser();

  const mockTeamMembers: TeamMember[] = [
    {
      id: 'member-1',
      userId: 'user-123',
      organizationId: 'org-123',
      displayName: 'John Doe',
      email: 'john@example.com',
      photoUrl: 'https://example.com/john.jpg',
      role: 'member',
      status: 'active',
      invitedAt: Timestamp.fromDate(new Date('2024-01-01')),
      invitedBy: 'user-admin',
      customPermissions: []
    },
    {
      id: 'member-2',
      userId: 'user-456',
      organizationId: 'org-123',
      displayName: 'Jane Smith',
      email: 'jane@example.com',
      photoUrl: 'https://example.com/jane.jpg',
      role: 'admin',
      status: 'active',
      invitedAt: Timestamp.fromDate(new Date('2024-01-01')),
      invitedBy: 'user-owner',
      customPermissions: []
    }
  ];

  const mockTasks: ProjectTask[] = [
    {
      id: 'task-1',
      userId: 'user-123',
      organizationId: 'org-123',
      projectId: 'project-123',
      assignedUserId: 'user-123',
      title: 'Test Task 1',
      description: 'First test task',
      status: 'pending',
      priority: 'high',
      progress: 25,
      dueDate: Timestamp.fromDate(new Date('2024-12-25')),
      isOverdue: false,
      daysUntilDue: 5,
      overdueBy: 0
    },
    {
      id: 'task-2',
      userId: 'user-456',
      organizationId: 'org-123',
      projectId: 'project-123',
      assignedUserId: 'user-456',
      title: 'Test Task 2',
      description: 'Second test task',
      status: 'completed',
      priority: 'medium',
      progress: 100,
      dueDate: Timestamp.fromDate(new Date('2024-12-20')),
      isOverdue: false,
      daysUntilDue: 0,
      overdueBy: 0
    },
    {
      id: 'task-3',
      userId: 'user-123',
      organizationId: 'org-123',
      projectId: 'project-123',
      assignedUserId: 'user-123',
      title: 'Overdue Task',
      description: 'This task is overdue',
      status: 'pending',
      priority: 'urgent',
      progress: 50,
      dueDate: Timestamp.fromDate(new Date('2024-12-01')),
      isOverdue: true,
      daysUntilDue: 0,
      overdueBy: 3
    }
  ];

  const defaultProps = {
    projectId: 'project-123',
    organizationId: 'org-123',
    projectManagerId: 'user-456',
    teamMembers: mockTeamMembers,
    projectTitle: 'Test Project'
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

    mockTaskService.getByProject.mockResolvedValue(mockTasks);
  });

  describe('Rendering', () => {
    it('sollte Loading-State anzeigen', async () => {
      mockTaskService.getByProject.mockImplementation(() => new Promise(() => {}));

      render(<ProjectTaskManager {...defaultProps} />);

      expect(screen.getByText('Projekt-Tasks')).toBeInTheDocument();
      // Loading state überprüfen
      const loadingElements = screen.getAllByText('Projekt-Tasks');
      expect(loadingElements[0]).toBeInTheDocument();
    });

    it('sollte Tasks korrekt anzeigen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        expect(screen.getByText('Overdue Task')).toBeInTheDocument();
      });

      // Check task count
      expect(screen.getByText('3 Tasks')).toBeInTheDocument();
    });

    it('sollte Team-Member Avatare korrekt anzeigen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        const johnAvatar = screen.getByTitle('John Doe');
        const janeAvatar = screen.getByTitle('Jane Smith');

        expect(johnAvatar).toBeInTheDocument();
        expect(janeAvatar).toBeInTheDocument();
      });
    });

    it('sollte Priority Badges korrekt anzeigen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hoch')).toBeInTheDocument();
        expect(screen.getByText('Mittel')).toBeInTheDocument();
        expect(screen.getByText('Dringend')).toBeInTheDocument();
      });
    });

    it('sollte Status Badges korrekt anzeigen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Erledigt')).toBeInTheDocument();
        expect(screen.getByText('3 Tage überfällig')).toBeInTheDocument();
        expect(screen.getByText('In 5 Tagen')).toBeInTheDocument();
      });
    });

    it('sollte Progress Bars korrekt anzeigen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });

    it('sollte Empty State anzeigen wenn keine Tasks vorhanden', async () => {
      mockTaskService.getByProject.mockResolvedValue([]);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Keine Tasks gefunden')).toBeInTheDocument();
        expect(screen.getByText('Erstelle die erste Task für dieses Projekt.')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('sollte "Alle Team-Tasks" Filter standardmäßig aktiviert haben', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        const teamTasksButton = screen.getByText('Alle Team-Tasks');
        expect(teamTasksButton).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('sollte auf "Meine Tasks" Filter umschalten', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 Tasks')).toBeInTheDocument();
      });

      const myTasksButton = screen.getByText('Meine Tasks');
      await user.click(myTasksButton);

      await waitFor(() => {
        expect(screen.getByText('2 Tasks (Meine Tasks)')).toBeInTheDocument();
        expect(myTasksButton).toHaveClass('bg-green-100', 'text-green-700');
      });
    });

    it('sollte "Heute fällig" Filter anwenden', async () => {
      const user = userEvent.setup();

      // Mock task mit heutigem Datum
      const todayTask = {
        ...mockTasks[0],
        dueDate: Timestamp.fromDate(new Date())
      };
      mockTaskService.getByProject.mockResolvedValue([todayTask]);

      render(<ProjectTaskManager {...defaultProps} />);

      const todayButton = screen.getByText('Heute fällig');
      await user.click(todayButton);

      await waitFor(() => {
        expect(screen.getByText('1 Task (Heute fällig)')).toBeInTheDocument();
        expect(todayButton).toHaveClass('bg-orange-100', 'text-orange-700');
      });
    });

    it('sollte "Überfällig" Filter anwenden', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      const overdueButton = screen.getByText('Überfällig');
      await user.click(overdueButton);

      await waitFor(() => {
        expect(screen.getByText('1 Task (Überfällig)')).toBeInTheDocument();
        expect(overdueButton).toHaveClass('bg-red-100', 'text-red-700');
        expect(screen.getByText('Overdue Task')).toBeInTheDocument();
      });
    });

    it('sollte Filter kombinieren können', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      // Aktiviere "Meine Tasks" und "Überfällig"
      await user.click(screen.getByText('Meine Tasks'));
      await user.click(screen.getByText('Überfällig'));

      await waitFor(() => {
        expect(screen.getByText('1 Task (Meine Tasks) (Überfällig)')).toBeInTheDocument();
      });
    });

    it('sollte Filter deaktivieren können', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      const overdueButton = screen.getByText('Überfällig');

      // Aktivieren
      await user.click(overdueButton);
      await waitFor(() => {
        expect(overdueButton).toHaveClass('bg-red-100', 'text-red-700');
      });

      // Deaktivieren
      await user.click(overdueButton);
      await waitFor(() => {
        expect(overdueButton).not.toHaveClass('bg-red-100', 'text-red-700');
      });
    });
  });

  describe('Interactions', () => {
    it('sollte Task Create Modal öffnen', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      const createButton = screen.getByText('Task erstellen');
      await user.click(createButton);

      expect(screen.getByTestId('task-create-modal')).toBeInTheDocument();
    });

    it('sollte Task Edit Modal öffnen', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Finde das erste Dropdown und öffne es
      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);

      const editButton = screen.getByText('Bearbeiten');
      await user.click(editButton);

      expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();
      expect(screen.getByTestId('editing-task-id')).toHaveTextContent('task-1');
    });

    it('sollte Task als erledigt markieren', async () => {
      const user = userEvent.setup();
      mockTaskService.markAsCompleted.mockResolvedValue();

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Finde das Dropdown für eine nicht-erledigte Task
      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);

      const completeButton = screen.getByText('Als erledigt markieren');
      await user.click(completeButton);

      expect(mockTaskService.markAsCompleted).toHaveBeenCalledWith('task-1');
      expect(mockTaskService.getByProject).toHaveBeenCalledTimes(2); // Initial load + reload after completion
    });

    it('sollte Task löschen mit Bestätigung', async () => {
      const user = userEvent.setup();
      mockTaskService.delete.mockResolvedValue();

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith(
        'Task wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      );
      expect(mockTaskService.delete).toHaveBeenCalledWith('task-1');

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('sollte Task-Löschung abbrechen können', async () => {
      const user = userEvent.setup();

      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);

      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockTaskService.delete).not.toHaveBeenCalled();

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('sollte Progress durch Klick aktualisieren', async () => {
      const user = userEvent.setup();
      mockTaskService.updateProgress.mockResolvedValue();

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Finde Progress Bar und klicke darauf
      const progressBars = screen.getAllByTitle('Klicken um Fortschritt zu ändern');

      // Simuliere Klick in die Mitte der Progress Bar (50%)
      const mockBoundingClientRect = {
        left: 0,
        width: 100
      };

      Object.defineProperty(progressBars[0], 'getBoundingClientRect', {
        value: () => mockBoundingClientRect
      });

      const clickEvent = new MouseEvent('click', {
        clientX: 50 // Mitte der Progress Bar
      });

      fireEvent(progressBars[0], clickEvent);

      expect(mockTaskService.updateProgress).toHaveBeenCalledWith('task-1', 50);
    });
  });

  describe('Modal Interactions', () => {
    it('sollte Create Modal schließen und Tasks neu laden', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      // Öffne Modal
      await user.click(screen.getByText('Task erstellen'));
      expect(screen.getByTestId('task-create-modal')).toBeInTheDocument();

      // Simuliere Success-Callback
      await user.click(screen.getByTestId('modal-success'));

      expect(mockTaskService.getByProject).toHaveBeenCalledTimes(2); // Initial + reload
    });

    it('sollte Edit Modal schließen und Tasks neu laden', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Öffne Edit Modal
      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Bearbeiten'));

      expect(screen.getByTestId('task-edit-modal')).toBeInTheDocument();

      // Simuliere Success-Callback
      await user.click(screen.getByTestId('modal-success'));

      expect(mockTaskService.getByProject).toHaveBeenCalledTimes(2); // Initial + reload
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler beim Laden von Tasks behandeln', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockTaskService.getByProject.mockRejectedValue(new Error('Network error'));

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error loading project tasks:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('sollte Fehler beim Task-Completion behandeln', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockTaskService.markAsCompleted.mockRejectedValue(new Error('Update error'));

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Als erledigt markieren'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error completing task:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('sollte Fehler beim Task-Löschen behandeln', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockTaskService.delete.mockRejectedValue(new Error('Delete error'));

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[0]);
      await user.click(screen.getByText('Löschen'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error deleting task:', expect.any(Error));
      });

      window.confirm = originalConfirm;
      consoleError.mockRestore();
    });

    it('sollte Fehler beim Progress-Update behandeln', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockTaskService.updateProgress.mockRejectedValue(new Error('Progress update error'));

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const progressBars = screen.getAllByTitle('Klicken um Fortschritt zu ändern');

      const mockBoundingClientRect = {
        left: 0,
        width: 100
      };

      Object.defineProperty(progressBars[0], 'getBoundingClientRect', {
        value: () => mockBoundingClientRect
      });

      const clickEvent = new MouseEvent('click', {
        clientX: 50
      });

      fireEvent(progressBars[0], clickEvent);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error updating progress:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('sollte Tasks ohne Team-Member korrekt anzeigen', async () => {
      const tasksWithUnknownUser = [{
        ...mockTasks[0],
        assignedUserId: 'unknown-user-123'
      }];

      mockTaskService.getByProject.mockResolvedValue(tasksWithUnknownUser);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Unbekannt')).toBeInTheDocument();
      });
    });

    it('sollte Tasks ohne Beschreibung korrekt anzeigen', async () => {
      const tasksWithoutDescription = [{
        ...mockTasks[0],
        description: undefined
      }];

      mockTaskService.getByProject.mockResolvedValue(tasksWithoutDescription);

      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        // Beschreibung sollte nicht vorhanden sein
        expect(screen.queryByText('First test task')).not.toBeInTheDocument();
      });
    });

    it('sollte erledigte Tasks ohne "Als erledigt markieren" Option anzeigen', async () => {
      const user = userEvent.setup();
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      // Finde das Dropdown für die erledigte Task (Task 2)
      const dropdownButtons = screen.getAllByRole('button', { name: /more options/i });
      await user.click(dropdownButtons[1]); // Task 2 ist die zweite Task

      // "Als erledigt markieren" sollte nicht vorhanden sein
      expect(screen.queryByText('Als erledigt markieren')).not.toBeInTheDocument();
      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
      expect(screen.getByText('Löschen')).toBeInTheDocument();
    });

    it('sollte mit leeren Team-Members umgehen', async () => {
      const propsWithoutTeam = {
        ...defaultProps,
        teamMembers: []
      };

      render(<ProjectTaskManager {...propsWithoutTeam} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Alle Tasks sollten "Unbekannt" als Zuständigen anzeigen
      expect(screen.getAllByText('Unbekannt')).toHaveLength(mockTasks.length);
    });

    it('sollte ohne projectTitle funktionieren', async () => {
      const propsWithoutTitle = {
        ...defaultProps,
        projectTitle: undefined
      };

      render(<ProjectTaskManager {...propsWithoutTitle} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Progress Bars sollten Title haben
      const progressBars = screen.getAllByTitle('Klicken um Fortschritt zu ändern');
      expect(progressBars.length).toBeGreaterThan(0);

      // Buttons sollten accessible sein
      expect(screen.getByText('Task erstellen')).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      render(<ProjectTaskManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Tab-Navigation zu Buttons
      const createButton = screen.getByText('Task erstellen');
      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });
  });
});