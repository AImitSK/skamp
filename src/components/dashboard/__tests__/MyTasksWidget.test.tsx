// src/components/dashboard/__tests__/MyTasksWidget.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyTasksWidget } from '../MyTasksWidget';
import { useMyTasks } from '@/lib/hooks/useMyTasks';
import { ProjectTask } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

// Mock useMyTasks hook
jest.mock('@/lib/hooks/useMyTasks', () => ({
  useMyTasks: jest.fn()
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

const mockUseMyTasks = useMyTasks as jest.MockedFunction<typeof useMyTasks>;

// Helper: Create mock task
const createMockTask = (overrides: Partial<ProjectTask> = {}): ProjectTask => {
  return {
    id: 'task-1',
    userId: 'user-123',
    organizationId: 'org-123',
    projectId: 'project-123',
    projectTitle: 'Test Project',
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

describe('MyTasksWidget Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading state', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText('Tasks werden geladen...')).toBeInTheDocument();
    });

    it('should show spinner during loading', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no tasks', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText('Keine offenen Tasks')).toBeInTheDocument();
    });

    it('should show success icon in empty state', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      // Prüfe ob das CheckCircle Icon angezeigt wird
      const icon = document.querySelector('.text-zinc-300');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Filter Tabs', () => {
    it('should render "Heute" filter button', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText('Heute')).toBeInTheDocument();
    });

    it('should render "�berf�llig" filter button', () => {
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText(/berf/i)).toBeInTheDocument();
    });

    it('should switch to "today" filter when clicked', async () => {
      const user = userEvent.setup();

      // First call with 'all' filter
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      const { rerender } = render(<MyTasksWidget />);

      const todayButton = screen.getByText('Heute');
      await user.click(todayButton);

      // Re-render with 'today' filter
      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      rerender(<MyTasksWidget />);

      expect(todayButton).toHaveClass('bg-blue-100');
    });

    it('should switch to "overdue" filter when clicked', async () => {
      const user = userEvent.setup();

      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      const { rerender } = render(<MyTasksWidget />);

      const overdueButton = screen.getByText(/berf/i);
      await user.click(overdueButton);

      mockUseMyTasks.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      rerender(<MyTasksWidget />);

      expect(overdueButton).toHaveClass('bg-red-100');
    });
  });

  describe('Task Display', () => {
    it('should render tasks when data is available', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task 1' }),
        createMockTask({ id: 'task-2', title: 'Task 2' })
      ];

      mockUseMyTasks.mockReturnValue({
        data: tasks,
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('should render status icons for tasks', () => {
      const completedTask = createMockTask({ id: 'task-completed', status: 'completed' });
      const overdueTask = createMockTask({ id: 'task-overdue', isOverdue: true });

      mockUseMyTasks.mockReturnValue({
        data: [completedTask, overdueTask],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      const greenIcon = document.querySelector('.text-green-600');
      const redIcon = document.querySelector('.text-red-600');

      expect(greenIcon).toBeInTheDocument();
      expect(redIcon).toBeInTheDocument();
    });

    it('should render project links', () => {
      const task = createMockTask({
        id: 'task-1',
        projectId: 'project-123',
        projectTitle: 'My Project'
      });

      mockUseMyTasks.mockReturnValue({
        data: [task],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      const link = screen.getByText('My Project');
      expect(link).toHaveAttribute('href', '/dashboard/projects/project-123');
    });

    it('should render progress bars', () => {
      const task = createMockTask({ id: 'task-1', progress: 75 });

      mockUseMyTasks.mockReturnValue({
        data: [task],
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should paginate tasks (5 per page)', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `task-${i}`, title: `Task ${i}` })
      );

      mockUseMyTasks.mockReturnValue({
        data: tasks,
        isLoading: false,
        isError: false,
        error: null
      } as any);

      render(<MyTasksWidget />);

      // First 5 tasks should be visible
      expect(screen.getByText('Task 0')).toBeInTheDocument();
      expect(screen.getByText('Task 4')).toBeInTheDocument();

      // Task 5 should NOT be visible on page 1
      expect(screen.queryByText('Task 5')).not.toBeInTheDocument();
    });
  });
});
