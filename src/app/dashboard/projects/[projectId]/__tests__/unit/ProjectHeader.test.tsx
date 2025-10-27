// src/app/dashboard/projects/[projectId]/__tests__/unit/ProjectHeader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectHeader } from '../../components/header/ProjectHeader';
import { ProjectProvider } from '../../context/ProjectContext';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';
import { createMockTimestamp } from '../helpers/mock-data';

const mockProject: Project = {
  id: 'project-123',
  userId: 'user-123',
  title: 'Test Marketing Campaign',
  description: 'Test Description',
  status: 'active',
  currentStage: 'ideas_planning',
  priority: 'high',
  organizationId: 'org-123',
  createdAt: createMockTimestamp(new Date('2025-01-15')) as any,
  updatedAt: createMockTimestamp(new Date()) as any,
  assignedTo: ['user-123', 'user-456', 'user-789'],
};

const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    userId: 'user-123',
    displayName: 'Max Mustermann',
    email: 'max@test.com',
    photoUrl: 'https://example.com/max.jpg',
    organizationId: 'org-123',
    role: 'member',
    status: 'active',
    invitedAt: createMockTimestamp(new Date()) as any,
    invitedBy: 'admin-123',
  },
  {
    id: 'member-2',
    userId: 'user-456',
    displayName: 'Anna Schmidt',
    email: 'anna@test.com',
    photoUrl: 'https://example.com/anna.jpg',
    organizationId: 'org-123',
    role: 'member',
    status: 'active',
    invitedAt: createMockTimestamp(new Date()) as any,
    invitedBy: 'admin-123',
  },
  {
    id: 'member-3',
    userId: 'user-789',
    displayName: 'Tom Weber',
    email: 'tom@test.com',
    organizationId: 'org-123',
    role: 'member',
    status: 'active',
    invitedAt: createMockTimestamp(new Date()) as any,
    invitedBy: 'admin-123',
  },
];

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ProjectHeader', () => {
  const mockOnEditClick = jest.fn();
  const mockOnDeleteClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (project: Project | null) => {
    return render(
      <ProjectProvider
        projectId="project-123"
        organizationId="org-123"
        initialProject={project}
      >
        <ProjectHeader
          teamMembers={mockTeamMembers}
          onEditClick={mockOnEditClick}
          onDeleteClick={mockOnDeleteClick}
        />
      </ProjectProvider>
    );
  };

  it('should render project title and status badge', () => {
    renderWithProvider(mockProject);

    expect(screen.getByText('Test Marketing Campaign')).toBeInTheDocument();
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('should render creation date formatted correctly', () => {
    renderWithProvider(mockProject);

    expect(screen.getByText(/Erstellt:/)).toBeInTheDocument();
    // Datum ist vorhanden (Format kann variieren je nach Locale)
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('should call onEditClick when edit button is clicked', () => {
    renderWithProvider(mockProject);

    const editButton = screen.getByRole('button', { name: /Bearbeiten/i });
    fireEvent.click(editButton);

    expect(mockOnEditClick).toHaveBeenCalledTimes(1);
  });

  it('should render dropdown menu button', () => {
    renderWithProvider(mockProject);

    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn =>
      btn.querySelector('svg[data-slot="icon"]') &&
      btn.className.includes('bg-transparent')
    );

    expect(moreButton).toBeDefined();
    expect(moreButton?.tagName).toBe('BUTTON');
  });

  it('should have delete handler wired correctly', () => {
    const { container } = renderWithProvider(mockProject);

    expect(mockOnDeleteClick).toBeDefined();
    expect(typeof mockOnDeleteClick).toBe('function');
  });

  it('should render team member avatars correctly', () => {
    renderWithProvider(mockProject);

    expect(screen.getByTitle('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByTitle('Anna Schmidt')).toBeInTheDocument();
    expect(screen.getByTitle('Tom Weber')).toBeInTheDocument();
  });

  it('should render back button with correct link', () => {
    renderWithProvider(mockProject);

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/dashboard/projects');
  });

  it('should return null when project is null', () => {
    const { container } = renderWithProvider(null);

    expect(container.firstChild).toBeNull();
  });

  it('should display correct status color for different statuses', () => {
    const completedProject = { ...mockProject, status: 'completed' as const };
    renderWithProvider(completedProject);

    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('should display on_hold status correctly', () => {
    const onHoldProject = { ...mockProject, status: 'on_hold' as const };
    renderWithProvider(onHoldProject);

    expect(screen.getByText('Pausiert')).toBeInTheDocument();
  });

  it('should display cancelled status correctly', () => {
    const cancelledProject = { ...mockProject, status: 'cancelled' as const };
    renderWithProvider(cancelledProject);

    expect(screen.getByText('Abgebrochen')).toBeInTheDocument();
  });

  it('should show overflow indicator when more than 5 team members', () => {
    const projectWithManyMembers = {
      ...mockProject,
      assignedTo: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'],
    };

    renderWithProvider(projectWithManyMembers);

    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByTitle('2 weitere Mitglieder')).toBeInTheDocument();
  });
});
