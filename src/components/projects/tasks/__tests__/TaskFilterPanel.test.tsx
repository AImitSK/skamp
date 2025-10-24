// src/components/projects/tasks/__tests__/TaskFilterPanel.test.tsx
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFilterPanel } from '../TaskFilterPanel';

describe('TaskFilterPanel Component', () => {
  const defaultProps = {
    viewMode: 'all' as 'all' | 'mine',
    selectedDueDateFilters: [],
    selectedStatusFilters: [],
    selectedAssigneeIds: [],
    sortBy: 'dueDate' as 'dueDate' | 'createdAt' | 'title',
    activeFiltersCount: 0,
    teamMembers: [
      { id: 'user-1', userId: 'user-1', displayName: 'John Doe' },
      { id: 'user-2', userId: 'user-2', displayName: 'Jane Smith' }
    ],
    onViewModeChange: jest.fn(),
    onDueDateFiltersChange: jest.fn(),
    onStatusFiltersChange: jest.fn(),
    onAssigneeIdsChange: jest.fn(),
    onSortByChange: jest.fn(),
    onResetFilters: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('View Mode Select', () => {
    it('should render view mode select', () => {
      render(<TaskFilterPanel {...defaultProps} />);
      expect(screen.getByDisplayValue('Alle Tasks')).toBeInTheDocument();
    });

    it('should call onViewModeChange when selecting mine', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const select = screen.getByDisplayValue('Alle Tasks');
      await user.selectOptions(select, 'mine');

      expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('mine');
    });

    it('should show "Meine Tasks" when viewMode is mine', () => {
      render(<TaskFilterPanel {...defaultProps} viewMode="mine" />);
      expect(screen.getByDisplayValue('Meine Tasks')).toBeInTheDocument();
    });
  });

  describe('Quick Filter: Heute f�llig', () => {
    it('should render "Heute f�llig" button', () => {
      render(<TaskFilterPanel {...defaultProps} />);
      expect(screen.getByText(/Heute f/i)).toBeInTheDocument();
    });

    it('should toggle today filter when clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const todayButton = screen.getByText(/Heute f/i);
      await user.click(todayButton);

      expect(defaultProps.onDueDateFiltersChange).toHaveBeenCalledWith(['today']);
    });

    it('should deactivate today filter when clicked again', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} selectedDueDateFilters={['today']} />);

      const todayButton = screen.getByText(/Heute f/i);
      await user.click(todayButton);

      expect(defaultProps.onDueDateFiltersChange).toHaveBeenCalledWith([]);
    });

    it('should highlight today button when active', () => {
      render(<TaskFilterPanel {...defaultProps} selectedDueDateFilters={['today']} />);

      const todayButton = screen.getByText(/Heute f/i);
      expect(todayButton).toHaveClass('bg-[#005fab]');
    });
  });

  describe('Quick Filter: �berf�llig', () => {
    it('should render "�berf�llig" button', () => {
      render(<TaskFilterPanel {...defaultProps} />);
      expect(screen.getByText(/berf/i)).toBeInTheDocument();
    });

    it('should toggle overdue filter when clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const overdueButton = screen.getByText(/berf/i);
      await user.click(overdueButton);

      expect(defaultProps.onDueDateFiltersChange).toHaveBeenCalledWith(['overdue']);
    });

    it('should highlight overdue button when active', () => {
      render(<TaskFilterPanel {...defaultProps} selectedDueDateFilters={['overdue']} />);

      const overdueButton = screen.getByText(/berf/i);
      expect(overdueButton).toHaveClass('bg-[#005fab]');
    });
  });

  describe('Filter Popover', () => {
    it('should render filter button', () => {
      render(<TaskFilterPanel {...defaultProps} />);
      const filterButton = screen.getByLabelText('Filter');
      expect(filterButton).toBeInTheDocument();
    });

    it('should show badge with active filter count', () => {
      render(<TaskFilterPanel {...defaultProps} activeFiltersCount={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should open popover when filter button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByLabelText(/Heute f/i)).toBeInTheDocument();
    });

    it('should render all dueDate filter options in popover', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByLabelText(/Heute f/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/berf/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Alle zuk/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Kein Datum/i)).toBeInTheDocument();
    });

    it('should render all status filter options in popover', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByLabelText('Offen')).toBeInTheDocument();
      expect(screen.getByLabelText('In Bearbeitung')).toBeInTheDocument();
      expect(screen.getByLabelText('Erledigt')).toBeInTheDocument();
    });

    it('should render sortBy options in popover', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByLabelText(/Nach F/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nach Erstellung/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Alphabetisch/i)).toBeInTheDocument();
    });

    it('should render team members in popover', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByLabelText('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Jane Smith')).toBeInTheDocument();
    });

    it('should call onStatusFiltersChange when status checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      const openCheckbox = screen.getByLabelText('Offen');
      await user.click(openCheckbox);

      expect(defaultProps.onStatusFiltersChange).toHaveBeenCalledWith(['pending']);
    });

    it('should call onSortByChange when sortBy radio is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      const alphabeticRadio = screen.getByLabelText(/Alphabetisch/i);
      await user.click(alphabeticRadio);

      expect(defaultProps.onSortByChange).toHaveBeenCalledWith('title');
    });

    it('should call onAssigneeIdsChange when team member checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      const johnCheckbox = screen.getByLabelText('John Doe');
      await user.click(johnCheckbox);

      expect(defaultProps.onAssigneeIdsChange).toHaveBeenCalledWith(['user-1']);
    });
  });

  describe('Reset Button', () => {
    it('should show reset button when filters are active', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} activeFiltersCount={2} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.getByText(/cksetzen/i)).toBeInTheDocument();
    });

    it('should NOT show reset button when no filters are active', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} activeFiltersCount={0} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      expect(screen.queryByText(/cksetzen/i)).not.toBeInTheDocument();
    });

    it('should call onResetFilters when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskFilterPanel {...defaultProps} activeFiltersCount={2} />);

      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      const resetButton = screen.getByText(/cksetzen/i);
      await user.click(resetButton);

      expect(defaultProps.onResetFilters).toHaveBeenCalled();
    });
  });
});
