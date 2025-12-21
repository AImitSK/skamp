import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectTable from '../ProjectTable';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { toastService } from '@/lib/utils/toast';

// Mock toastService
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
global.confirm = mockConfirm;

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Data
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member1',
    userId: 'user1',
    displayName: 'John Doe',
    photoUrl: 'https://example.com/john.jpg',
    email: 'john@example.com',
    organizationId: 'org1',
    role: 'member',
    status: 'active',
    invitedAt: new Date('2024-01-01') as any,
    invitedBy: 'owner1',
  },
  {
    id: 'member2',
    userId: 'user2',
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    organizationId: 'org1',
    role: 'member',
    status: 'active',
    invitedAt: new Date('2024-01-01') as any,
    invitedBy: 'owner1',
  },
];

const mockProjects: Project[] = [
  {
    id: 'proj1',
    userId: 'currentUser',
    title: 'Test Project 1',
    status: 'active',
    currentStage: 'creation',
    customer: { id: 'c1', name: 'Customer A' },
    assignedTo: ['user1', 'user2'],
    organizationId: 'org1',
    createdAt: '2024-01-15T10:00:00.000Z' as any,
    updatedAt: '2024-01-20T10:00:00.000Z' as any,
  },
  {
    id: 'proj2',
    userId: 'currentUser',
    title: 'Archived Project',
    status: 'archived',
    currentStage: 'completed',
    organizationId: 'org1',
    createdAt: '2024-01-10T10:00:00.000Z' as any,
    updatedAt: '2024-01-18T10:00:00.000Z' as any,
  },
];

const defaultProps = {
  projects: mockProjects,
  teamMembers: mockTeamMembers,
  loadingTeam: false,
  currentOrganizationId: 'org1',
  userId: 'currentUser',
  onEdit: jest.fn(),
  onArchive: jest.fn(),
  onUnarchive: jest.fn(),
  onDelete: jest.fn(),
};

describe('ProjectTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      render(<ProjectTable {...defaultProps} />);
      expect(screen.getByText('Projekt')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Projekt')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Projektphase')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Aktualisiert')).toBeInTheDocument();
    });

    it('should render all projects', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Archived Project')).toBeInTheDocument();
    });

    it('should render project titles as links', () => {
      render(<ProjectTable {...defaultProps} />);

      const link = screen.getByText('Test Project 1');
      expect(link.closest('a')).toHaveAttribute('href', '/dashboard/projects/proj1');
    });

    it('should render customer name when available', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Customer A')).toBeInTheDocument();
    });

    it('should not render customer section when customer is missing', () => {
      render(<ProjectTable {...defaultProps} />);

      // "Archived Project" has no customer
      const archivedRow = screen.getByText('Archived Project').closest('div');
      expect(archivedRow?.querySelector('.text-xs.text-zinc-500.truncate')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display correct status label for active project', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Aktiv')).toBeInTheDocument();
    });

    it('should display different status labels correctly', () => {
      const projectsWithDifferentStatuses: Project[] = [
        { ...mockProjects[0], id: 'p1', status: 'active' },
        { ...mockProjects[0], id: 'p2', title: 'On Hold', status: 'on_hold' },
        { ...mockProjects[0], id: 'p3', title: 'Completed', status: 'completed' },
        { ...mockProjects[0], id: 'p4', title: 'Cancelled', status: 'cancelled' },
      ];

      render(<ProjectTable {...defaultProps} projects={projectsWithDifferentStatuses} />);

      expect(screen.getByText('Aktiv')).toBeInTheDocument();
      expect(screen.getByText('Pausiert')).toBeInTheDocument();
      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
      expect(screen.getByText('Abgebrochen')).toBeInTheDocument();
    });
  });

  describe('Project Stage Display', () => {
    it('should display current stage label', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
    });

    it('should display different stage labels correctly', () => {
      const projectsWithDifferentStages: Project[] = [
        { ...mockProjects[0], id: 'p1', currentStage: 'ideas_planning' },
        { ...mockProjects[0], id: 'p2', currentStage: 'approval' },
        { ...mockProjects[0], id: 'p3', currentStage: 'distribution' },
        { ...mockProjects[0], id: 'p4', currentStage: 'monitoring' },
      ];

      render(<ProjectTable {...defaultProps} projects={projectsWithDifferentStages} />);

      expect(screen.getByText('Planung')).toBeInTheDocument();
      expect(screen.getByText('Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Verteilung')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });
  });

  describe('Team Display', () => {
    it('should display team member avatars when assignedTo exists', () => {
      render(<ProjectTable {...defaultProps} />);

      // Should show team member names in title attributes
      const avatars = screen.getAllByTitle(/John Doe|Jane Smith/i);
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('should display "Kein Team" when no assignedTo', () => {
      render(<ProjectTable {...defaultProps} />);

      expect(screen.getByText('Kein Team')).toBeInTheDocument();
    });

    it('should display loading state for team members', () => {
      render(<ProjectTable {...defaultProps} loadingTeam={true} />);

      // Should show "..." for loading members
      const loadingIndicators = screen.getAllByTitle('Lädt Mitgliederdaten...');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    it('should display fallback for unknown team members', () => {
      const projectWithUnknownMember: Project[] = [
        {
          ...mockProjects[0],
          assignedTo: ['unknownUser'],
        },
      ];

      render(<ProjectTable {...defaultProps} projects={projectWithUnknownMember} />);

      expect(screen.getByTitle('Unbekanntes Mitglied')).toBeInTheDocument();
    });

    it('should limit displayed avatars to 3 and show +count', () => {
      const projectWithManyMembers: Project[] = [
        {
          ...mockProjects[0],
          assignedTo: ['user1', 'user2', 'user3', 'user4', 'user5'],
        },
      ];

      const manyMembers: TeamMember[] = [
        ...mockTeamMembers,
        {
          id: 'member3',
          userId: 'user3',
          displayName: 'Bob Johnson',
          email: 'bob@example.com',
          organizationId: 'org1',
          role: 'member',
          status: 'active',
          invitedAt: new Date('2024-01-01') as any,
          invitedBy: 'owner1',
        },
        {
          id: 'member4',
          userId: 'user4',
          displayName: 'Alice Williams',
          email: 'alice@example.com',
          organizationId: 'org1',
          role: 'member',
          status: 'active',
          invitedAt: new Date('2024-01-01') as any,
          invitedBy: 'owner1',
        },
        {
          id: 'member5',
          userId: 'user5',
          displayName: 'Charlie Brown',
          email: 'charlie@example.com',
          organizationId: 'org1',
          role: 'member',
          status: 'active',
          invitedAt: new Date('2024-01-01') as any,
          invitedBy: 'owner1',
        },
      ];

      render(<ProjectTable {...defaultProps} projects={projectWithManyMembers} teamMembers={manyMembers} />);

      // Should show +2 (5 members - 3 displayed = 2)
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      render(<ProjectTable {...defaultProps} />);

      // Should display dates in DD.MM.YYYY format
      expect(screen.getByText('20.01.2024')).toBeInTheDocument();
      expect(screen.getByText('18.01.2024')).toBeInTheDocument();
    });
  });

  describe('Actions Menu', () => {
    it('should call onEdit when edit is clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectTable {...defaultProps} />);

      // Open dropdown (click on ellipsis icon)
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click edit
      const editButton = screen.getByText('Bearbeiten');
      await user.click(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('should call onArchive when archive is clicked', async () => {
      const user = userEvent.setup();
      defaultProps.onArchive.mockResolvedValue(undefined);

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown for active project
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click archive
      const archiveButton = screen.getByText('Archivieren');
      await user.click(archiveButton);

      await waitFor(() => {
        expect(defaultProps.onArchive).toHaveBeenCalledWith('proj1');
        expect(toastService.success).toHaveBeenCalledWith('Projekt "Test Project 1" archiviert');
      });
    });

    it('should call onUnarchive when unarchive is clicked on archived project', async () => {
      const user = userEvent.setup();
      defaultProps.onUnarchive.mockResolvedValue(undefined);

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown for archived project
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[1]); // Second project is archived

      // Click reaktivieren
      const unarchiveButton = screen.getByText('Reaktivieren');
      await user.click(unarchiveButton);

      await waitFor(() => {
        expect(defaultProps.onUnarchive).toHaveBeenCalledWith('proj2');
        expect(toastService.success).toHaveBeenCalledWith('Projekt "Archived Project" reaktiviert');
      });
    });

    it('should call onDelete when delete is confirmed', async () => {
      const user = userEvent.setup();
      defaultProps.onDelete.mockResolvedValue(undefined);
      mockConfirm.mockReturnValue(true);

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click delete
      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
        expect(defaultProps.onDelete).toHaveBeenCalledWith('proj1');
        expect(toastService.success).toHaveBeenCalledWith('Projekt "Test Project 1" erfolgreich gelöscht');
      });
    });

    it('should not call onDelete when delete is cancelled', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click delete
      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
        expect(defaultProps.onDelete).not.toHaveBeenCalled();
      });
    });

    it('should show error toast when archive fails', async () => {
      const user = userEvent.setup();
      defaultProps.onArchive.mockRejectedValue(new Error('Archive failed'));

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click archive
      const archiveButton = screen.getByText('Archivieren');
      await user.click(archiveButton);

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Projekt konnte nicht archiviert werden');
      });
    });

    it('should show error toast when unarchive fails', async () => {
      const user = userEvent.setup();
      defaultProps.onUnarchive.mockRejectedValue(new Error('Unarchive failed'));

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown for archived project
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[1]);

      // Click reaktivieren
      const unarchiveButton = screen.getByText('Reaktivieren');
      await user.click(unarchiveButton);

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Projekt konnte nicht reaktiviert werden');
      });
    });

    it('should show error toast when delete fails', async () => {
      const user = userEvent.setup();
      defaultProps.onDelete.mockRejectedValue(new Error('Delete failed'));
      mockConfirm.mockReturnValue(true);

      render(<ProjectTable {...defaultProps} />);

      // Open dropdown
      const dropdownButtons = screen.getAllByRole('button');
      await user.click(dropdownButtons[0]);

      // Click delete
      const deleteButton = screen.getByText('Löschen');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Projekt konnte nicht gelöscht werden');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects array', () => {
      render(<ProjectTable {...defaultProps} projects={[]} />);

      // Should still render headers
      expect(screen.getByText('Projekt')).toBeInTheDocument();

      // Should not render any project rows
      expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
    });

    it('should handle projects without updatedAt', () => {
      const projectsWithoutDate: Project[] = [
        { ...mockProjects[0], updatedAt: null as any },
      ];

      render(<ProjectTable {...defaultProps} projects={projectsWithoutDate} />);

      // Should render without errors (formatDate returns empty string for null)
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    it('should handle Firestore timestamp format', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2024-02-15T10:00:00.000Z'),
      };

      const projectsWithFirestoreTimestamp: Project[] = [
        { ...mockProjects[0], updatedAt: firestoreTimestamp as any },
      ];

      render(<ProjectTable {...defaultProps} projects={projectsWithFirestoreTimestamp} />);

      expect(screen.getByText('15.02.2024')).toBeInTheDocument();
    });
  });
});
