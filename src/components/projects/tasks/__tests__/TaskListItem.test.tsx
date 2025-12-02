// src/components/projects/tasks/__tests__/TaskListItem.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskListItem } from '../TaskListItem';
import { ProjectTask } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

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

describe('TaskListItem Component', () => {
  const defaultProps = {
    task: createMockTask(),
    assignedMember: {
      id: 'user-123',
      displayName: 'John Doe',
      email: 'john@example.com',
      photoUrl: 'https://example.com/john.jpg'
    },
    onEdit: jest.fn(),
    onComplete: jest.fn(),
    onDelete: jest.fn(),
    onProgressClick: jest.fn(),
    formatDate: jest.fn((date) => '2025-12-31')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Icons', () => {
    it('should render completed icon for completed tasks', () => {
      const completedTask = createMockTask({ status: 'completed' });
      render(<TaskListItem {...defaultProps} task={completedTask} />);

      const icon = document.querySelector('.text-green-600');
      expect(icon).toBeInTheDocument();
    });

    it('should render overdue icon for overdue tasks', () => {
      const overdueTask = createMockTask({ isOverdue: true });
      render(<TaskListItem {...defaultProps} task={overdueTask} />);

      const icon = document.querySelector('.text-red-600');
      expect(icon).toBeInTheDocument();
    });

    it('should render clock icon for normal tasks', () => {
      const normalTask = createMockTask({ isOverdue: false, status: 'pending' });
      render(<TaskListItem {...defaultProps} task={normalTask} />);

      const icon = document.querySelector('.text-gray-400');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Task Title', () => {
    it('should render task title', () => {
      const task = createMockTask({ title: 'My Custom Task' });
      render(<TaskListItem {...defaultProps} task={task} />);

      expect(screen.getByText('My Custom Task')).toBeInTheDocument();
    });

    it('should truncate long task titles', () => {
      const task = createMockTask({ title: 'Very Long Task Title That Should Be Truncated' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const titleElement = screen.getByText('Very Long Task Title That Should Be Truncated');
      expect(titleElement).toHaveClass('truncate');
    });

    it('should render task title inside tooltip wrapper', () => {
      const task = createMockTask({ title: 'Full Title' });
      render(<TaskListItem {...defaultProps} task={task} />);

      // Text wird gerendert (innerhalb des Tooltip-Wrappers)
      const titleElement = screen.getByText('Full Title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('truncate');
    });
  });

  describe('Assigned Member', () => {
    it('should render avatar for assigned member', () => {
      render(<TaskListItem {...defaultProps} />);

      const avatar = screen.getByTitle('John Doe');
      expect(avatar).toBeInTheDocument();
    });

    it('should render displayName for assigned member', () => {
      render(<TaskListItem {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render dash when no assigned member', () => {
      render(<TaskListItem {...defaultProps} assignedMember={undefined} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct percentage', () => {
      const task = createMockTask({ progress: 75 });
      render(<TaskListItem {...defaultProps} task={task} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should apply green color for 90%+ progress', () => {
      const task = createMockTask({ progress: 95 });
      render(<TaskListItem {...defaultProps} task={task} />);

      const progressBar = document.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should apply blue color for 70-89% progress', () => {
      const task = createMockTask({ progress: 75 });
      render(<TaskListItem {...defaultProps} task={task} />);

      const progressBar = document.querySelector('.bg-blue-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should apply yellow color for 50-69% progress', () => {
      const task = createMockTask({ progress: 60 });
      render(<TaskListItem {...defaultProps} task={task} />);

      const progressBar = document.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should apply red color for <50% progress', () => {
      const task = createMockTask({ progress: 25 });
      render(<TaskListItem {...defaultProps} task={task} />);

      const progressBar = document.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should call onProgressClick when progress bar is clicked', async () => {
      const user = userEvent.setup();
      const task = createMockTask();
      render(<TaskListItem {...defaultProps} task={task} />);

      const progressBar = screen.getByTitle(/Klicken um Fortschritt/i);
      await user.click(progressBar);

      expect(defaultProps.onProgressClick).toHaveBeenCalledWith(task, expect.any(Object));
    });

    it('should show in-progress animation for in_progress status', () => {
      const task = createMockTask({ status: 'in_progress' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const animation = document.querySelector('.animate-pulse.bg-primary');
      expect(animation).toBeInTheDocument();
    });
  });

  describe('Actions Dropdown', () => {
    it('should render edit action', async () => {
      const user = userEvent.setup();
      render(<TaskListItem {...defaultProps} />);

      // Open dropdown
      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    });

    it('should call onEdit when edit is clicked', async () => {
      const user = userEvent.setup();
      const task = createMockTask();
      render(<TaskListItem {...defaultProps} task={task} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      const editButton = screen.getByText('Bearbeiten');
      await user.click(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(task);
    });

    it('should show complete action for non-completed tasks', async () => {
      const user = userEvent.setup();
      const task = createMockTask({ status: 'pending' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      expect(screen.getByText('Als erledigt markieren')).toBeInTheDocument();
    });

    it('should NOT show complete action for completed tasks', async () => {
      const user = userEvent.setup();
      const task = createMockTask({ status: 'completed' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      expect(screen.queryByText('Als erledigt markieren')).not.toBeInTheDocument();
    });

    it('should call onComplete when complete is clicked', async () => {
      const user = userEvent.setup();
      const task = createMockTask({ id: 'task-123', title: 'My Task', status: 'pending' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      const completeButton = screen.getByText('Als erledigt markieren');
      await user.click(completeButton);

      expect(defaultProps.onComplete).toHaveBeenCalledWith('task-123', 'My Task');
    });

    it('should render delete action', async () => {
      const user = userEvent.setup();
      render(<TaskListItem {...defaultProps} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      expect(screen.getByText(/schen/i)).toBeInTheDocument();
    });

    it('should call onDelete when delete is clicked', async () => {
      const user = userEvent.setup();
      const task = createMockTask({ id: 'task-456', title: 'Delete Me' });
      render(<TaskListItem {...defaultProps} task={task} />);

      const dropdownButton = screen.getByRole('button');
      await user.click(dropdownButton);

      const deleteButton = screen.getByText(/schen/i);
      await user.click(deleteButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith('task-456', 'Delete Me');
    });
  });

  describe('Due Date', () => {
    it('should render formatted due date', () => {
      render(<TaskListItem {...defaultProps} />);

      expect(screen.getByText('2025-12-31')).toBeInTheDocument();
      expect(defaultProps.formatDate).toHaveBeenCalled();
    });
  });
});
