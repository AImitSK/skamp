// src/app/dashboard/projects/[projectId]/__tests__/integration/project-detail-page-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectProvider } from '../../context/ProjectContext';
import { ProjectHeader } from '../../components/header/ProjectHeader';
import { ProjectInfoBar } from '../../components/header/ProjectInfoBar';
import { TabNavigation } from '../../components/tabs/TabNavigation';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { Tag } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { createMockTimestamp } from '../helpers/mock-data';

const mockProject: Project = {
  id: 'project-123',
  userId: 'user-123',
  title: 'Integration Test Project',
  description: 'Test Description',
  status: 'active',
  currentStage: 'ideas_planning',
  priority: 'high',
  organizationId: 'org-123',
  createdAt: createMockTimestamp(new Date('2025-01-15')) as any,
  updatedAt: createMockTimestamp(new Date()) as any,
  assignedTo: ['user-123'],
  customer: {
    id: 'customer-123',
    name: 'Integration Corp',
  },
  deadline: createMockTimestamp(new Date('2025-12-31')) as any,
};

const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    userId: 'user-123',
    displayName: 'Test User',
    email: 'test@test.com',
    organizationId: 'org-123',
    role: 'member',
    status: 'active',
    invitedAt: createMockTimestamp(new Date()) as any,
    invitedBy: 'admin-123',
  },
];

const mockTags: Tag[] = [
  {
    id: 'tag-1',
    userId: 'user-123',
    name: 'Test Tag',
    color: 'blue',
  },
];

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({
    projectId: 'project-123',
  }),
  usePathname: () => '/dashboard/projects/project-123',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Project Detail Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Page Load Flow', () => {
    it('should render loading state initially', () => {
      render(<LoadingState />);

      expect(screen.getByText('Projekt wird geladen...')).toBeInTheDocument();
    });

    it('should render error state when project fails to load', () => {
      render(<ErrorState message="Projekt konnte nicht geladen werden" />);

      expect(screen.getByText('Projekt konnte nicht geladen werden')).toBeInTheDocument();
      expect(screen.getByText('Zurück zur Projektübersicht')).toBeInTheDocument();
    });

    it('should render complete page structure when project loads successfully', () => {
      const TestComponent = () => {
        const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'>('overview');

        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <ProjectHeader
              teamMembers={mockTeamMembers}
              onEditClick={jest.fn()}
              onTeamManageClick={jest.fn()}
              onDeleteClick={jest.fn()}
            />
            <ProjectInfoBar projectTags={mockTags} />
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('Integration Test Project')).toBeInTheDocument();
      expect(screen.getByText('Aktiv')).toBeInTheDocument();
      expect(screen.getByText('Integration Corp')).toBeInTheDocument();
      expect(screen.getByText('Test Tag')).toBeInTheDocument();
      expect(screen.getByText('Übersicht')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation Flow', () => {
    it('should switch tabs correctly and maintain state', async () => {
      const TestComponent = () => {
        const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'>('overview');

        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <div>
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
              <div data-testid="tab-content">
                {activeTab === 'overview' && <div>Overview Content</div>}
                {activeTab === 'tasks' && <div>Tasks Content</div>}
                {activeTab === 'strategie' && <div>Strategie Content</div>}
                {activeTab === 'daten' && <div>Daten Content</div>}
              </div>
            </div>
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('Overview Content')).toBeInTheDocument();
      expect(screen.queryByText('Tasks Content')).not.toBeInTheDocument();

      const tasksTab = screen.getByText('Tasks');
      fireEvent.click(tasksTab);

      await waitFor(() => {
        expect(screen.getByText('Tasks Content')).toBeInTheDocument();
        expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
      });

      const strategieTab = screen.getByText('Strategie');
      fireEvent.click(strategieTab);

      await waitFor(() => {
        expect(screen.getByText('Strategie Content')).toBeInTheDocument();
        expect(screen.queryByText('Tasks Content')).not.toBeInTheDocument();
      });
    });

    it('should highlight the active tab correctly when switching', () => {
      const TestComponent = () => {
        const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'>('overview');

        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      const overviewTab = screen.getByText('Übersicht').closest('button');
      expect(overviewTab).toHaveClass('text-primary');

      const tasksTab = screen.getByText('Tasks');
      fireEvent.click(tasksTab);

      const tasksTabButton = screen.getByText('Tasks').closest('button');
      expect(tasksTabButton).toHaveClass('text-primary');

      const overviewTabAfter = screen.getByText('Übersicht').closest('button');
      expect(overviewTabAfter).not.toHaveClass('text-primary');
    });
  });

  describe('User Interaction Flow', () => {
    it('should handle complete user workflow: view project, change tab, edit, navigate back', async () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();

      const TestComponent = () => {
        const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring'>('overview');

        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <ProjectHeader
              teamMembers={mockTeamMembers}
              onEditClick={mockOnEdit}
              onTeamManageClick={jest.fn()}
              onDeleteClick={mockOnDelete}
            />
            <ProjectInfoBar projectTags={mockTags} />
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('Integration Test Project')).toBeInTheDocument();

      const tasksTab = screen.getByText('Tasks');
      fireEvent.click(tasksTab);

      await waitFor(() => {
        const tasksTabButton = screen.getByText('Tasks').closest('button');
        expect(tasksTabButton).toHaveClass('text-primary');
      });

      const editButton = screen.getByRole('button', { name: /Bearbeiten/i });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);

      const backLink = screen.getByRole('link');
      expect(backLink).toHaveAttribute('href', '/dashboard/projects');
    });

    it('should navigate to customer detail when customer is clicked', () => {
      const TestComponent = () => {
        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <ProjectInfoBar projectTags={mockTags} />
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      const customerButton = screen.getByText('Integration Corp');
      fireEvent.click(customerButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/contacts/crm/companies/customer-123');
    });

    it('should handle dropdown menu interactions', () => {
      const mockOnDelete = jest.fn();

      const TestComponent = () => {
        return (
          <ProjectProvider
            projectId="project-123"
            organizationId="org-123"
            initialProject={mockProject}
          >
            <ProjectHeader
              teamMembers={mockTeamMembers}
              onEditClick={jest.fn()}
              onTeamManageClick={jest.fn()}
              onDeleteClick={mockOnDelete}
            />
          </ProjectProvider>
        );
      };

      render(<TestComponent />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn =>
        btn.querySelector('svg[data-slot="icon"]') &&
        btn.className.includes('bg-transparent')
      );

      expect(moreButton).toBeDefined();
      expect(moreButton?.tagName).toBe('BUTTON');
    });
  });
});
