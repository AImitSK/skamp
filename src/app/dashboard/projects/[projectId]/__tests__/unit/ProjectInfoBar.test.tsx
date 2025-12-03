// src/app/dashboard/projects/[projectId]/__tests__/unit/ProjectInfoBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectInfoBar } from '../../components/header/ProjectInfoBar';
import { ProjectProvider } from '../../context/ProjectContext';
import { Project } from '@/types/project';
import { Tag } from '@/types/crm';
import { Timestamp } from 'firebase/firestore';
import { createMockTimestamp } from '../helpers/mock-data';

const mockProject: Project = {
  id: 'project-123',
  userId: 'user-123',
  title: 'Test Project',
  description: 'Test Description',
  status: 'active',
  currentStage: 'creation',
  priority: 'high',
  organizationId: 'org-123',
  createdAt: createMockTimestamp(new Date()) as any,
  updatedAt: createMockTimestamp(new Date()) as any,
  customer: {
    id: 'customer-123',
    name: 'Acme Corporation',
  },
  deadline: createMockTimestamp(new Date('2025-12-31')) as any,
};

const mockTags: Tag[] = [
  {
    id: 'tag-1',
    userId: 'user-123',
    name: 'VIP',
    color: 'red',
  },
  {
    id: 'tag-2',
    userId: 'user-123',
    name: 'Urgent',
    color: 'yellow',
  },
];

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('ProjectInfoBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (project: Project | null, tags: Tag[] = []) => {
    return render(
      <ProjectProvider
        projectId="project-123"
        organizationId="org-123"
        initialProject={project}
      >
        <ProjectInfoBar projectTags={tags} />
      </ProjectProvider>
    );
  };

  it('should render phase, customer and deadline', () => {
    renderWithProvider(mockProject, mockTags);

    expect(screen.getByText('Phase:')).toBeInTheDocument();
    expect(screen.getByText('Content und Materialien')).toBeInTheDocument();

    expect(screen.getByText('Kunde:')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();

    expect(screen.getByText('Deadline:')).toBeInTheDocument();
    expect(screen.getByText(/31\. Dez\. 2025/)).toBeInTheDocument();
  });

  it('should render tags correctly', () => {
    renderWithProvider(mockProject, mockTags);

    expect(screen.getByText('Tags:')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('should show overflow indicator when more than 3 tags', () => {
    const manyTags: Tag[] = [
      ...mockTags,
      {
        id: 'tag-3',
        userId: 'user-123',
        name: 'Important',
        color: 'blue',
      },
      {
        id: 'tag-4',
        userId: 'user-123',
        name: 'Follow-up',
        color: 'green',
      },
    ];

    renderWithProvider(mockProject, manyTags);

    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('Follow-up')).not.toBeInTheDocument();
  });

  it('should navigate to customer detail when customer name is clicked', () => {
    renderWithProvider(mockProject, mockTags);

    const customerButton = screen.getByText('Acme Corporation');
    fireEvent.click(customerButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/contacts/crm/companies/customer-123');
  });

  it('should not render deadline section when deadline is not set', () => {
    const projectWithoutDeadline = { ...mockProject, deadline: undefined };
    renderWithProvider(projectWithoutDeadline, []);

    expect(screen.queryByText('Deadline:')).not.toBeInTheDocument();
  });

  it('should not render tags section when no tags are provided', () => {
    renderWithProvider(mockProject, []);

    expect(screen.queryByText('Tags:')).not.toBeInTheDocument();
  });

  it('should not render customer section when customer is not set', () => {
    const projectWithoutCustomer = { ...mockProject, customer: undefined };
    renderWithProvider(projectWithoutCustomer, []);

    expect(screen.queryByText('Kunde:')).not.toBeInTheDocument();
  });

  it('should return null when project is null', () => {
    const { container } = renderWithProvider(null, []);

    expect(container.firstChild).toBeNull();
  });

  it('should display correct stage labels for all stages', () => {
    const stages = [
      { stage: 'ideas_planning', label: 'Ideen & Planung' },
      { stage: 'creation', label: 'Content und Materialien' },
      { stage: 'approval', label: 'Freigabe' },
      { stage: 'distribution', label: 'Verteilung' },
      { stage: 'monitoring', label: 'Monitoring' },
      { stage: 'completed', label: 'Abgeschlossen' },
    ];

    stages.forEach(({ stage, label }) => {
      const projectWithStage = { ...mockProject, currentStage: stage } as Project;
      const { rerender } = renderWithProvider(projectWithStage, []);

      expect(screen.getByText(label)).toBeInTheDocument();

      rerender(
        <ProjectProvider
          projectId="project-123"
          organizationId="org-123"
          initialProject={projectWithStage}
        >
          <ProjectInfoBar projectTags={[]} />
        </ProjectProvider>
      );
    });
  });
});
