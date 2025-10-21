// src/app/dashboard/projects/[projectId]/__tests__/unit/TabNavigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from '../../components/tabs/TabNavigation';

describe('TabNavigation', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all tabs', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    expect(screen.getByText('Übersicht')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Strategie')).toBeInTheDocument();
    expect(screen.getByText('Daten')).toBeInTheDocument();
    expect(screen.getByText('Verteiler')).toBeInTheDocument();
    expect(screen.getByText('Pressemeldung')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('should highlight the active tab', () => {
    render(<TabNavigation activeTab="tasks" onTabChange={mockOnTabChange} />);

    const tasksTab = screen.getByText('Tasks').closest('button');
    const overviewTab = screen.getByText('Übersicht').closest('button');

    expect(tasksTab).toHaveClass('text-primary');
    expect(tasksTab).toHaveClass('border-primary');

    expect(overviewTab).not.toHaveClass('text-primary');
    expect(overviewTab).toHaveClass('text-gray-500');
  });

  it('should call onTabChange when a tab is clicked', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const tasksTab = screen.getByText('Tasks');
    fireEvent.click(tasksTab);

    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    expect(mockOnTabChange).toHaveBeenCalledWith('tasks');
  });

  it('should handle switching between all tabs', () => {
    const { rerender } = render(
      <TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />
    );

    const tabs = [
      { label: 'Tasks', id: 'tasks' },
      { label: 'Strategie', id: 'strategie' },
      { label: 'Daten', id: 'daten' },
      { label: 'Verteiler', id: 'verteiler' },
      { label: 'Pressemeldung', id: 'pressemeldung' },
      { label: 'Monitoring', id: 'monitoring' },
    ];

    tabs.forEach(({ label, id }) => {
      const tab = screen.getByText(label);
      fireEvent.click(tab);

      expect(mockOnTabChange).toHaveBeenCalledWith(id);
    });

    expect(mockOnTabChange).toHaveBeenCalledTimes(tabs.length);
  });

  it('should render icons for all tabs', () => {
    const { container } = render(
      <TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />
    );

    const buttons = container.querySelectorAll('button');

    buttons.forEach(button => {
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4');
      expect(svg).toHaveClass('h-4');
    });
  });

  it('should not call onTabChange when clicking on already active tab', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const overviewTab = screen.getByText('Übersicht');
    fireEvent.click(overviewTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('overview');
    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
  });

  it('should apply hover styles to inactive tabs', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const tasksTab = screen.getByText('Tasks').closest('button');

    expect(tasksTab).toHaveClass('hover:text-gray-700');
  });

  it('should render all tabs with correct order', () => {
    const { container } = render(
      <TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const labels = buttons.map(btn => btn.textContent);

    expect(labels).toEqual([
      'Übersicht',
      'Tasks',
      'Strategie',
      'Daten',
      'Verteiler',
      'Pressemeldung',
      'Monitoring',
    ]);
  });
});
