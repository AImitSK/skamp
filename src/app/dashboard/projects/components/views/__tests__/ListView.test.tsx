import { render, screen } from '@testing-library/react';
import ListView from '../ListView';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';

// Mock child components
jest.mock('../../tables/ProjectTable', () => {
  return function MockProjectTable() {
    return <div data-testid="project-table">Project Table</div>;
  };
});

jest.mock('../../empty-states/NoActiveProjectsState', () => {
  return function MockNoActiveProjectsState() {
    return <div data-testid="no-active-projects">Keine aktiven Projekte</div>;
  };
});

jest.mock('../../empty-states/NoArchivedProjectsState', () => {
  return function MockNoArchivedProjectsState() {
    return <div data-testid="no-archived-projects">Keine archivierten Projekte</div>;
  };
});

jest.mock('../../empty-states/NoFiltersSelectedState', () => {
  return function MockNoFiltersSelectedState() {
    return <div data-testid="no-filters-selected">Keine Filter ausgewählt</div>;
  };
});

jest.mock('../../empty-states/NoProjectsAtAllState', () => {
  return function MockNoProjectsAtAllState() {
    return <div data-testid="no-projects-at-all">Keine Projekte vorhanden</div>;
  };
});

// Mock Data
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member1',
    userId: 'user1',
    displayName: 'John Doe',
    email: 'john@example.com',
    organizationId: 'org1',
    role: 'member',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockProjects: Project[] = [
  {
    id: 'proj1',
    title: 'Test Project 1',
    status: 'active',
    currentStage: 'creation',
    organizationId: 'org1',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-20T10:00:00.000Z',
  },
  {
    id: 'proj2',
    title: 'Test Project 2',
    status: 'active',
    currentStage: 'planning',
    organizationId: 'org1',
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-18T10:00:00.000Z',
  },
];

const defaultProps = {
  loading: false,
  projects: mockProjects,
  allProjects: mockProjects,
  searchTerm: '',
  showActive: true,
  showArchived: false,
  teamMembers: mockTeamMembers,
  loadingTeam: false,
  currentOrganizationId: 'org1',
  userId: 'currentUser',
  onEdit: jest.fn(),
  onArchive: jest.fn(),
  onUnarchive: jest.fn(),
  onDelete: jest.fn(),
};

describe('ListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(<ListView {...defaultProps} loading={true} />);

      expect(screen.getByText('Projekte werden geladen...')).toBeInTheDocument();
    });

    it('should not display content when loading', () => {
      render(<ListView {...defaultProps} loading={true} />);

      expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();
    });
  });

  describe('Results Info', () => {
    it('should display singular form for one project', () => {
      render(<ListView {...defaultProps} projects={[mockProjects[0]]} />);

      expect(screen.getByText(/1 Projekt/)).toBeInTheDocument();
    });

    it('should display plural form for multiple projects', () => {
      render(<ListView {...defaultProps} />);

      expect(screen.getByText(/2 Projekte/)).toBeInTheDocument();
    });

    it('should display filter info when searchTerm is present', () => {
      render(
        <ListView
          {...defaultProps}
          searchTerm="test"
          projects={[mockProjects[0]]}
          allProjects={mockProjects}
        />
      );

      expect(screen.getByText(/1 Projekt/)).toBeInTheDocument();
      expect(screen.getByText(/· gefiltert von 2 gesamt/)).toBeInTheDocument();
    });

    it('should not display filter info when searchTerm is empty', () => {
      render(<ListView {...defaultProps} searchTerm="" />);

      expect(screen.queryByText(/gefiltert von/)).not.toBeInTheDocument();
    });
  });

  describe('Archive Banner', () => {
    it('should display archive banner when only archived filter is active', () => {
      render(<ListView {...defaultProps} showActive={false} showArchived={true} />);

      expect(screen.getByText('Archivansicht aktiv')).toBeInTheDocument();
      expect(screen.getByText(/Archivierte Projekte können über das 3-Punkte-Menü reaktiviert werden/)).toBeInTheDocument();
    });

    it('should not display archive banner when both filters are active', () => {
      render(<ListView {...defaultProps} showActive={true} showArchived={true} />);

      expect(screen.queryByText('Archivansicht aktiv')).not.toBeInTheDocument();
    });

    it('should not display archive banner when only active filter is active', () => {
      render(<ListView {...defaultProps} showActive={true} showArchived={false} />);

      expect(screen.queryByText('Archivansicht aktiv')).not.toBeInTheDocument();
    });

    it('should not display archive banner when no filters are active', () => {
      render(<ListView {...defaultProps} showActive={false} showArchived={false} />);

      expect(screen.queryByText('Archivansicht aktiv')).not.toBeInTheDocument();
    });
  });

  describe('ProjectTable Rendering', () => {
    it('should render ProjectTable when projects exist', () => {
      render(<ListView {...defaultProps} />);

      expect(screen.getByTestId('project-table')).toBeInTheDocument();
    });

    it('should not render ProjectTable when projects array is empty', () => {
      render(<ListView {...defaultProps} projects={[]} />);

      expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should display NoActiveProjectsState when showActive=true, showArchived=false, and no projects', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          showActive={true}
          showArchived={false}
        />
      );

      expect(screen.getByTestId('no-active-projects')).toBeInTheDocument();
      expect(screen.queryByTestId('no-archived-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-filters-selected')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-projects-at-all')).not.toBeInTheDocument();
    });

    it('should display NoArchivedProjectsState when showActive=false, showArchived=true, and no projects', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          showActive={false}
          showArchived={true}
        />
      );

      expect(screen.queryByTestId('no-active-projects')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-archived-projects')).toBeInTheDocument();
      expect(screen.queryByTestId('no-filters-selected')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-projects-at-all')).not.toBeInTheDocument();
    });

    it('should display NoFiltersSelectedState when showActive=false, showArchived=false, and no projects', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          showActive={false}
          showArchived={false}
        />
      );

      expect(screen.queryByTestId('no-active-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-archived-projects')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-filters-selected')).toBeInTheDocument();
      expect(screen.queryByTestId('no-projects-at-all')).not.toBeInTheDocument();
    });

    it('should display NoProjectsAtAllState when showActive=true, showArchived=true, and no projects', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          showActive={true}
          showArchived={true}
        />
      );

      expect(screen.queryByTestId('no-active-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-archived-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-filters-selected')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-projects-at-all')).toBeInTheDocument();
    });

    it('should not display any empty state when projects exist', () => {
      render(<ListView {...defaultProps} />);

      expect(screen.queryByTestId('no-active-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-archived-projects')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-filters-selected')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-projects-at-all')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should render complete view with all elements when projects exist', () => {
      render(<ListView {...defaultProps} />);

      // Results info
      expect(screen.getByText(/2 Projekte/)).toBeInTheDocument();

      // ProjectTable
      expect(screen.getByTestId('project-table')).toBeInTheDocument();

      // No empty states
      expect(screen.queryByTestId('no-active-projects')).not.toBeInTheDocument();
    });

    it('should render complete empty view when no projects', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          showActive={true}
          showArchived={false}
        />
      );

      // Results info
      expect(screen.getByText(/0 Projekte/)).toBeInTheDocument();

      // No ProjectTable
      expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();

      // Empty state
      expect(screen.getByTestId('no-active-projects')).toBeInTheDocument();
    });

    it('should render archive view with banner when showing only archived projects', () => {
      const archivedProjects: Project[] = [
        {
          ...mockProjects[0],
          status: 'archived',
        },
      ];

      render(
        <ListView
          {...defaultProps}
          projects={archivedProjects}
          showActive={false}
          showArchived={true}
        />
      );

      // Results info
      expect(screen.getByText(/1 Projekt/)).toBeInTheDocument();

      // Archive banner
      expect(screen.getByText('Archivansicht aktiv')).toBeInTheDocument();

      // ProjectTable
      expect(screen.getByTestId('project-table')).toBeInTheDocument();
    });

    it('should handle search with filtered results', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[mockProjects[0]]}
          allProjects={mockProjects}
          searchTerm="Test Project 1"
        />
      );

      // Results info with filter
      expect(screen.getByText(/1 Projekt/)).toBeInTheDocument();
      expect(screen.getByText(/· gefiltert von 2 gesamt/)).toBeInTheDocument();

      // ProjectTable
      expect(screen.getByTestId('project-table')).toBeInTheDocument();
    });

    it('should handle search with no results', () => {
      render(
        <ListView
          {...defaultProps}
          projects={[]}
          allProjects={mockProjects}
          searchTerm="Nonexistent"
          showActive={true}
          showArchived={false}
        />
      );

      // Results info with filter
      expect(screen.getByText(/0 Projekte/)).toBeInTheDocument();
      expect(screen.getByText(/· gefiltert von 2 gesamt/)).toBeInTheDocument();

      // Empty state
      expect(screen.getByTestId('no-active-projects')).toBeInTheDocument();

      // No ProjectTable
      expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();
    });
  });
});
