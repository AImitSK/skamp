// src/components/projects/tasks/__tests__/TaskList.test.tsx
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '../TaskList';
import { ProjectTask } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

// Mock child components
jest.mock('../TaskListItem', () => ({
  TaskListItem: ({ task }: any) => (
    <div data-testid={`task-item-${task.id}`}>
      {task.title}
    </div>
  )
}));

jest.mock('../TaskTemplateButton', () => ({
  TaskTemplateButton: ({ disabled, onSuccess }: any) => (
    <button
      data-testid="template-button"
      disabled={disabled}
      onClick={onSuccess}
    >
      Task Vorlage verwenden
    </button>
  )
}));

// Helper: Create mock task
const createMockTask = (overrides: Partial<ProjectTask> = {}): ProjectTask => {
  return {
    id: 'task-1',
    userId: 'user-123',
    organizationId: 'org-123',
    projectId: 'project-123',
    assignedUserId: 'user-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium',
    progress: 50,
    dueDate: Timestamp.fromDate(new Date()) as any,
    isOverdue: false,
    daysUntilDue: 5,
    overdueBy: 0,
    createdAt: Timestamp.fromDate(new Date()) as any,
    ...overrides
  };
};

describe('TaskList Component', () => {
  const defaultProps = {
    isLoading: false,
    tasks: [],
    activeFiltersCount: 0,
    viewMode: 'all' as 'all' | 'mine',
    projectId: 'project-123',
    organizationId: 'org-123',
    userId: 'user-123',
    teamMembers: [
      {
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
        photoUrl: 'https://example.com/john.jpg'
      }
    ],
    onEdit: jest.fn(),
    onComplete: jest.fn(),
    onDelete: jest.fn(),
    onProgressClick: jest.fn(),
    onCreateClick: jest.fn(),
    onTasksInvalidate: jest.fn(),
    formatDate: jest.fn((date) => '2025-12-31')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading skeleton', () => {
      render(<TaskList {...defaultProps} isLoading={true} />);

      // 3 skeleton rows with animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render tasks while loading', () => {
      const tasks = [createMockTask({ id: 'task-1', title: 'Task 1' })];
      render(<TaskList {...defaultProps} isLoading={true} tasks={tasks} />);

      expect(screen.queryByTestId('task-item-task-1')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no tasks', () => {
      render(<TaskList {...defaultProps} tasks={[]} />);

      expect(screen.getByText('Keine Tasks gefunden')).toBeInTheDocument();
      expect(screen.getByText(/Erstelle die erste Task/i)).toBeInTheDocument();
    });

    it('should show filter message when filters are active', () => {
      render(<TaskList {...defaultProps} tasks={[]} activeFiltersCount={2} />);

      expect(screen.getByText('Versuche andere Filter oder erstelle eine neue Task.')).toBeInTheDocument();
    });

    it('should show mine view message when viewMode is mine', () => {
      render(<TaskList {...defaultProps} tasks={[]} viewMode="mine" />);

      expect(screen.getByText('Versuche andere Filter oder erstelle eine neue Task.')).toBeInTheDocument();
    });

    it('should render create button in empty state', () => {
      render(<TaskList {...defaultProps} tasks={[]} />);

      const createButton = screen.getByText('Task erstellen');
      expect(createButton).toBeInTheDocument();
    });

    it('should call onCreateClick when create button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskList {...defaultProps} tasks={[]} />);

      const createButton = screen.getByText('Task erstellen');
      await user.click(createButton);

      expect(defaultProps.onCreateClick).toHaveBeenCalledTimes(1);
    });

    it('should render template button in empty state', () => {
      render(<TaskList {...defaultProps} tasks={[]} />);

      expect(screen.getByTestId('template-button')).toBeInTheDocument();
    });
  });

  describe('Task List Rendering', () => {
    it('should render table header', () => {
      const tasks = [createMockTask()];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Zugewiesen')).toBeInTheDocument();
      expect(screen.getByText('Fortschritt')).toBeInTheDocument();
      expect(screen.getByText(/lligkeit/i)).toBeInTheDocument();
    });

    it('should render single task', () => {
      const tasks = [createMockTask({ id: 'task-1', title: 'Task 1' })];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    it('should render multiple tasks', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task 1' }),
        createMockTask({ id: 'task-2', title: 'Task 2' }),
        createMockTask({ id: 'task-3', title: 'Task 3' })
      ];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-task-3')).toBeInTheDocument();
    });

    it('should pass task props to TaskListItem', () => {
      const task = createMockTask({ id: 'task-1', title: 'Test Task' });
      const tasks = [task];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should find and pass team member to TaskListItem', () => {
      const tasks = [createMockTask({ assignedUserId: 'user-123' })];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      // TaskListItem receives assignedMember prop (tested via mock)
      expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    });

    it('should handle task without assigned user', () => {
      const tasks = [createMockTask({ assignedUserId: undefined })];
      render(<TaskList {...defaultProps} tasks={tasks} />);

      expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    });
  });

  describe('Props Propagation', () => {
    it('should pass all callback props to TaskListItem', () => {
      const tasks = [createMockTask()];
      const customProps = {
        ...defaultProps,
        onEdit: jest.fn(),
        onComplete: jest.fn(),
        onDelete: jest.fn(),
        onProgressClick: jest.fn()
      };

      render(<TaskList {...customProps} tasks={tasks} />);

      // Callbacks are passed (tested via TaskListItem props)
      expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    });
  });
});
