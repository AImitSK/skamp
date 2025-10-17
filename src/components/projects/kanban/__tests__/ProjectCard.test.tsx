// src/components/projects/kanban/__tests__/ProjectCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { Project } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// Mock Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard/projects',
  }),
}));

// Mock React Query Hooks
jest.mock('@/lib/hooks/useProjectData', () => ({
  useDeleteProject: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
  }),
  useArchiveProject: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
  }),
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      ownerId: 'user-1',
    },
  }),
}));

// Mock Firebase Organization Service
jest.mock('@/lib/firebase/organization-service', () => ({
  teamMemberService: {
    getByOrganization: jest.fn().mockResolvedValue([]),
  },
}));

// Mock ProjectQuickActionsMenu
jest.mock('../ProjectQuickActionsMenu', () => ({
  ProjectQuickActionsMenu: () => <div data-testid="quick-actions-menu" />,
}));

// Mock ProjectEditWizard
jest.mock('@/components/projects/edit/ProjectEditWizard', () => ({
  ProjectEditWizard: () => <div data-testid="edit-wizard" />,
}));

// Mock Avatar
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ alt }: any) => <div data-testid="avatar">{alt}</div>,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => 'in 7 Tagen',
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ClockIcon: ({ className }: any) => <div data-testid="clock-icon" className={className} />,
  UserIcon: ({ className }: any) => <div data-testid="user-icon" className={className} />,
  ExclamationTriangleIcon: ({ className }: any) => <div data-testid="warning-icon" className={className} />,
  EllipsisHorizontalIcon: ({ className }: any) => <div data-testid="menu-icon" className={className} />,
  TrashIcon: ({ className }: any) => <div data-testid="trash-icon" className={className} />,
  XMarkIcon: ({ className }: any) => <div data-testid="x-mark-icon" className={className} />,
}));

const mockTimestamp = Timestamp.now();

const baseProject: Project = {
  id: 'project-1',
  title: 'Test Projekt',
  currentStage: 'creation',
  status: 'active',
  organizationId: 'org-1',
  userId: 'user-1',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
};

const mockUseDraggableProject = jest.fn().mockReturnValue({
  isDragging: false,
  drag: jest.fn()
});

describe('ProjectCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraggableProject.mockReturnValue({
      isDragging: false,
      drag: jest.fn()
    });
  });

  it('sollte Projekt-Titel rendern', () => {
    render(<ProjectCard project={baseProject} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('Test Projekt')).toBeInTheDocument();
  });

  it('sollte Kunden-Namen anzeigen wenn vorhanden', () => {
    const projectWithCustomer = {
      ...baseProject,
      customer: {
        id: 'customer-1',
        name: 'Test Kunde GmbH',
        companyName: 'Test Kunde GmbH'
      }
    };

    render(<ProjectCard project={projectWithCustomer} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('Test Kunde GmbH')).toBeInTheDocument();
  });

  it('sollte Quick-Actions-Button rendern', () => {
    render(<ProjectCard project={baseProject} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  it('sollte Tags anzeigen wenn vorhanden', () => {
    const projectWithTags = {
      ...baseProject,
      tags: ['frontend', 'react', 'typescript']
    } as any;

    render(<ProjectCard project={projectWithTags} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('sollte Progress Bar anzeigen wenn Progress vorhanden', () => {
    const projectWithProgress = {
      ...baseProject,
      progress: { overallPercent: 75 }
    } as any;

    render(<ProjectCard project={projectWithProgress} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('Fortschritt')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('sollte Status Badge anzeigen', () => {
    render(<ProjectCard project={baseProject} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('sollte Priority Badge anzeigen wenn vorhanden', () => {
    const projectWithPriority = {
      ...baseProject,
      priority: 'high'
    } as any;

    render(<ProjectCard project={projectWithPriority} useDraggableProject={mockUseDraggableProject} />);

    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('sollte Drag Hook korrekt initialisieren', () => {
    render(<ProjectCard project={baseProject} useDraggableProject={mockUseDraggableProject} />);

    expect(mockUseDraggableProject).toHaveBeenCalledWith(baseProject);
  });
});
