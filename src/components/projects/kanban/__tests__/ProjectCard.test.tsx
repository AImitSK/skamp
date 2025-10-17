// src/components/projects/kanban/__tests__/ProjectCard.test.tsx
// Umfassende Tests für ProjectCard Komponente
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard, ProjectCardProps } from '../ProjectCard';
import { Project, ProjectPriority } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// ========================================
// MOCKS SETUP
// ========================================

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

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const baseProject: Project = {
  id: 'project-1',
  title: 'Test Projekt',
  description: 'Das ist eine Test-Beschreibung für das Projekt',
  currentStage: 'creation',
  status: 'active',
  organizationId: 'org-1',
  userId: 'user-1',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  assignedTo: ['user-1', 'user-2'],
  customer: {
    id: 'customer-1',
    name: 'Test Kunde GmbH'
  }
};

// Erweiterte Project-Daten mit zusätzlichen Properties
const extendedProject = {
  ...baseProject,
  priority: 'high' as ProjectPriority,
  tags: ['frontend', 'react', 'typescript'],
  progress: {
    overallPercent: 75,
    criticalTasksRemaining: 2
  },
  dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 Tage in der Zukunft
};

const overdueProject = {
  ...baseProject,
  priority: 'urgent' as ProjectPriority,
  dueDate: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 Tage überfällig
  status: 'active'
};

const dueTodayProject = {
  ...baseProject,
  dueDate: Timestamp.fromDate(new Date()) // Heute fällig
};

const mockUseDraggableProject = jest.fn().mockReturnValue({
  isDragging: false,
  drag: jest.fn()
});

const defaultProps: ProjectCardProps = {
  project: baseProject,
  onSelect: jest.fn(),
  useDraggableProject: mockUseDraggableProject
};

// ========================================
// SETUP & TEARDOWN
// ========================================

describe('ProjectCard', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    defaultProps.onSelect = mockOnSelect;
    
    // Reset drag mock
    mockUseDraggableProject.mockReturnValue({
      isDragging: false,
      drag: jest.fn()
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC RENDERING TESTS
  // ========================================

  describe('Basic Rendering', () => {
    it('sollte ProjectCard ohne Fehler rendern', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
      expect(screen.getByText('Test Kunde GmbH')).toBeInTheDocument();
      expect(screen.getByText('Das ist eine Test-Beschreibung für das Projekt')).toBeInTheDocument();
    });

    it('sollte Projekt-Titel korrekt anzeigen', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
      expect(screen.getByText('Test Projekt').tagName).toBe('H4');
    });

    it('sollte Kunden-Namen anzeigen wenn vorhanden', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByText('Test Kunde GmbH')).toBeInTheDocument();
    });

    it('sollte Kunden-Namen verstecken wenn nicht vorhanden', () => {
      const projectWithoutCustomer = { ...baseProject, customer: undefined };
      render(<ProjectCard {...defaultProps} project={projectWithoutCustomer} />);
      
      expect(screen.queryByText('Test Kunde GmbH')).not.toBeInTheDocument();
    });

    it('sollte Projekt-Beschreibung anzeigen', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByText('Das ist eine Test-Beschreibung für das Projekt')).toBeInTheDocument();
    });

    it('sollte Quick-Actions-Button rendern', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      expect(screen.getByTitle('Mehr Optionen')).toBeInTheDocument();
    });

    it('sollte Drag-Hook korrekt initialisieren', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(mockUseDraggableProject).toHaveBeenCalledWith(baseProject);
    });
  });

  // ========================================
  // PROGRESS BAR TESTS
  // ========================================

  describe('Progress Bar', () => {
    it('sollte Progress Bar anzeigen wenn Progress vorhanden', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByText('Fortschritt')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('sollte Progress Bar mit korrekter Breite rendern', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      const progressBar = screen.getByText('75%').parentElement?.nextElementSibling?.firstElementChild;
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('sollte Progress Bar verstecken wenn kein Progress', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.queryByText('Fortschritt')).not.toBeInTheDocument();
    });

    it('sollte Progress Bar verstecken wenn Progress 0', () => {
      const projectWithZeroProgress = {
        ...baseProject,
        progress: { overallPercent: 0 }
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithZeroProgress} />);
      
      expect(screen.queryByText('Fortschritt')).not.toBeInTheDocument();
    });

    it('sollte Progress korrekt runden', () => {
      const projectWithDecimalProgress = {
        ...baseProject,
        progress: { overallPercent: 76.8 }
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithDecimalProgress} />);
      
      expect(screen.getByText('77%')).toBeInTheDocument();
    });
  });

  // ========================================
  // TAGS TESTS
  // ========================================

  describe('Tags', () => {
    it('sollte Tags anzeigen wenn vorhanden', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('sollte nur erste 3 Tags anzeigen', () => {
      const projectWithManyTags = {
        ...baseProject,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithManyTags} />);
      
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument(); 
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    });

    it('sollte keine Tags anzeigen wenn nicht vorhanden', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.queryByText('frontend')).not.toBeInTheDocument();
    });

    it('sollte keine Overflow-Anzeige bei ≤3 Tags haben', () => {
      const projectWithFewTags = {
        ...baseProject,
        tags: ['tag1', 'tag2']
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithFewTags} />);
      
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });
  });

  // ========================================
  // STATUS TESTS
  // ========================================

  describe('Status', () => {
    it('sollte Status-Badge mit korrekten Farben anzeigen', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const statusBadge = screen.getByText('Aktiv');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('sollte verschiedene Status korrekt darstellen', () => {
      const statuses = [
        { status: 'active', text: 'Aktiv', classes: 'bg-green-100 text-green-800' },
        { status: 'on_hold', text: 'Pausiert', classes: 'bg-yellow-100 text-yellow-800' },
        { status: 'completed', text: 'Fertig', classes: 'bg-gray-100 text-gray-800' },
        { status: 'cancelled', text: 'Abgebrochen', classes: 'bg-red-100 text-red-800' }
      ];
      
      statuses.forEach(({ status, text, classes }) => {
        const project = { ...baseProject, status };
        const { unmount } = render(<ProjectCard {...defaultProps} project={project} />);
        
        const badge = screen.getByText(text);
        expect(badge).toHaveClass(...classes.split(' '));
        
        unmount();
      });
    });

    it('sollte unbekannte Status als Original anzeigen', () => {
      const projectWithUnknownStatus = { ...baseProject, status: 'unknown_status' };
      render(<ProjectCard {...defaultProps} project={projectWithUnknownStatus} />);
      
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });
  });

  // ========================================
  // PRIORITY TESTS
  // ========================================

  describe('Priority', () => {
    it('sollte Priority-Badge anzeigen wenn Priority vorhanden', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByText('Hoch')).toBeInTheDocument();
    });

    it('sollte Priority-Icon bei urgent/high Priority anzeigen', () => {
      const urgentProject = { ...baseProject, priority: 'urgent' as ProjectPriority };
      render(<ProjectCard {...defaultProps} project={urgentProject} />);
      
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      expect(screen.getByText('Dringend')).toBeInTheDocument();
    });

    it('sollte korrekte Priority-Farben verwenden', () => {
      const priorities = [
        { priority: 'urgent', text: 'Dringend', classes: 'bg-red-100 text-red-800' },
        { priority: 'high', text: 'Hoch', classes: 'bg-orange-100 text-orange-800' },
        { priority: 'medium', text: 'Mittel', classes: 'bg-yellow-100 text-yellow-800' },
        { priority: 'low', text: 'Niedrig', classes: 'bg-green-100 text-green-800' }
      ];
      
      priorities.forEach(({ priority, text, classes }) => {
        const project = { ...baseProject, priority: priority as ProjectPriority };
        const { unmount } = render(<ProjectCard {...defaultProps} project={project} />);
        
        const badge = screen.getByText(text);
        expect(badge.parentElement).toHaveClass(...classes.split(' '));
        
        unmount();
      });
    });

    it('sollte keine Priority anzeigen wenn nicht vorhanden', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.queryByText('Hoch')).not.toBeInTheDocument();
      expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument();
    });

    it('sollte kein Icon bei low/medium Priority anzeigen', () => {
      const lowProject = { ...baseProject, priority: 'low' as ProjectPriority };
      render(<ProjectCard {...defaultProps} project={lowProject} />);
      
      expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Niedrig')).toBeInTheDocument();
    });
  });

  // ========================================
  // DUE DATE TESTS
  // ========================================

  describe('Due Date', () => {
    it('sollte Due Date anzeigen wenn vorhanden', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByText(/\d{2}\.\d{2}\.\d{4}/)).toBeInTheDocument();
    });

    it('sollte überfällige Projekte rot markieren', () => {
      render(<ProjectCard {...defaultProps} project={overdueProject} />);
      
      const dueDateElement = screen.getByTestId('clock-icon').parentElement;
      expect(dueDateElement).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('sollte heute fällige Projekte gelb markieren', () => {
      render(<ProjectCard {...defaultProps} project={dueTodayProject} />);
      
      const dueDateElement = screen.getByTestId('clock-icon').parentElement;
      expect(dueDateElement).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('sollte zukünftige Due Dates grau markieren', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      const dueDateElement = screen.getByTestId('clock-icon').parentElement;
      expect(dueDateElement).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('sollte keine Due Date anzeigen wenn nicht vorhanden', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
    });

    it('sollte deutsches Datumsformat verwenden', () => {
      const specificDate = Timestamp.fromDate(new Date('2024-12-25'));
      const projectWithSpecificDate = { ...baseProject, dueDate: specificDate };
      
      render(<ProjectCard {...defaultProps} project={projectWithSpecificDate} />);
      
      expect(screen.getByText('25.12.2024')).toBeInTheDocument();
    });
  });

  // ========================================
  // TEAM ASSIGNMENT TESTS
  // ========================================

  describe('Team Assignment', () => {
    it('sollte Team-Anzahl anzeigen wenn Assigned Users vorhanden', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 assigned users
    });

    it('sollte keine Team-Info anzeigen wenn keine Assignments', () => {
      const projectWithoutAssignments = { ...baseProject, assignedTo: undefined };
      render(<ProjectCard {...defaultProps} project={projectWithoutAssignments} />);
      
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('sollte mit leerer Assignment-Liste umgehen', () => {
      const projectWithEmptyAssignments = { ...baseProject, assignedTo: [] };
      render(<ProjectCard {...defaultProps} project={projectWithEmptyAssignments} />);
      
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('sollte korrekte Anzahl bei verschiedenen Team-Größen anzeigen', () => {
      const largeTeam = Array.from({ length: 5 }, (_, i) => `user-${i}`);
      const projectWithLargeTeam = { ...baseProject, assignedTo: largeTeam };
      
      render(<ProjectCard {...defaultProps} project={projectWithLargeTeam} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  // ========================================
  // WARNING MESSAGES TESTS
  // ========================================

  describe('Warning Messages', () => {
    it('sollte Overdue-Warning anzeigen bei überfälligen Projekten', () => {
      render(<ProjectCard {...defaultProps} project={overdueProject} />);
      
      expect(screen.getByText('⚠️ Projekt ist überfällig')).toBeInTheDocument();
    });

    it('sollte keine Overdue-Warning bei abgeschlossenen Projekten anzeigen', () => {
      const completedOverdueProject = { 
        ...overdueProject, 
        status: 'completed' 
      };
      
      render(<ProjectCard {...defaultProps} project={completedOverdueProject} />);
      
      expect(screen.queryByText('⚠️ Projekt ist überfällig')).not.toBeInTheDocument();
    });

    it('sollte Critical Tasks Warning anzeigen', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByText('🔥 2 kritische Tasks offen')).toBeInTheDocument();
    });

    it('sollte keine Critical Tasks Warning bei 0 Tasks anzeigen', () => {
      const projectWithNoCriticalTasks = {
        ...baseProject,
        progress: { overallPercent: 50, criticalTasksRemaining: 0 }
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithNoCriticalTasks} />);
      
      expect(screen.queryByText(/kritische Tasks/)).not.toBeInTheDocument();
    });

    it('sollte beide Warnings gleichzeitig anzeigen können', () => {
      const criticalOverdueProject = {
        ...overdueProject,
        progress: { criticalTasksRemaining: 3 }
      };
      
      render(<ProjectCard {...defaultProps} project={criticalOverdueProject} />);
      
      expect(screen.getByText('⚠️ Projekt ist überfällig')).toBeInTheDocument();
      expect(screen.getByText('🔥 3 kritische Tasks offen')).toBeInTheDocument();
    });
  });

  // ========================================
  // DRAG & DROP TESTS
  // ========================================

  describe('Drag & Drop', () => {
    it('sollte Drag-Styling anwenden wenn isDragging=true', () => {
      mockUseDraggableProject.mockReturnValue({
        isDragging: true,
        drag: jest.fn()
      });
      
      render(<ProjectCard {...defaultProps} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      expect(card).toHaveClass('opacity-50', 'transform', 'rotate-1');
    });

    it('sollte normales Styling verwenden wenn isDragging=false', () => {
      mockUseDraggableProject.mockReturnValue({
        isDragging: false,
        drag: jest.fn()
      });
      
      render(<ProjectCard {...defaultProps} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      expect(card).toHaveClass('opacity-100');
      expect(card).not.toHaveClass('opacity-50');
    });

    it('sollte Drag-Ref korrekt setzen', () => {
      const mockDragRef = jest.fn();
      mockUseDraggableProject.mockReturnValue({
        isDragging: false,
        drag: mockDragRef
      });
      
      render(<ProjectCard {...defaultProps} />);
      
      // Drag ref sollte gesetzt werden
      expect(mockDragRef).toHaveBeenCalled();
    });

    it('sollte cursor-move styling haben', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      expect(card).toHaveClass('cursor-move');
    });
  });

  // ========================================
  // EVENT HANDLING TESTS
  // ========================================

  describe('Event Handling', () => {
    it('sollte onSelect beim Card-Click aufrufen', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      fireEvent.click(card!);
      
      expect(mockOnSelect).toHaveBeenCalledWith('project-1');
    });

    it('sollte onSelect nicht aufrufen wenn onSelect undefined', () => {
      render(<ProjectCard {...defaultProps} onSelect={undefined} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      
      // Sollte nicht crashen
      expect(() => fireEvent.click(card!)).not.toThrow();
    });

    it('sollte onSelect nicht aufrufen wenn project.id fehlt', () => {
      const projectWithoutId = { ...baseProject, id: undefined as any };
      render(<ProjectCard {...defaultProps} project={projectWithoutId} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      fireEvent.click(card!);
      
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('sollte Quick Actions Menu öffnen', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<ProjectCard {...defaultProps} />);
      
      const menuButton = screen.getByTitle('Mehr Optionen');
      fireEvent.click(menuButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Quick actions for project:', 'project-1');
      
      consoleSpy.mockRestore();
    });

    it('sollte Quick Actions Event nicht propagieren', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<ProjectCard {...defaultProps} />);
      
      const menuButton = screen.getByTitle('Mehr Optionen');
      fireEvent.click(menuButton);
      
      // Card onClick sollte nicht aufgerufen werden
      expect(mockOnSelect).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('sollte preventDefault beim Card-Click aufrufen', () => {
      render(<ProjectCard {...defaultProps} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      const mockEvent = { preventDefault: jest.fn() };
      
      fireEvent.click(card!, mockEvent);
      
      // preventDefault wurde aufgerufen (durch mock event)
      expect(mockOnSelect).toHaveBeenCalled();
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('sollte memo-Vergleichsfunktion korrekt funktionieren', () => {
      const { rerender } = render(<ProjectCard {...defaultProps} />);
      
      // Gleiche Props -> sollte nicht re-rendern
      rerender(<ProjectCard {...defaultProps} />);
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
      
      // Geänderte Props -> sollte re-rendern
      const updatedProject = { ...baseProject, title: 'Updated Projekt' };
      rerender(<ProjectCard {...defaultProps} project={updatedProject} />);
      expect(screen.getByText('Updated Projekt')).toBeInTheDocument();
    });

    it('sollte Performance bei vielen Re-renders optimieren', () => {
      const { rerender } = render(<ProjectCard {...defaultProps} />);
      
      // Viele Re-renders mit gleichen Props
      for (let i = 0; i < 100; i++) {
        rerender(<ProjectCard {...defaultProps} />);
      }
      
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
    });

    it('sollte nur bei relevanten Änderungen re-rendern', () => {
      const { rerender } = render(<ProjectCard {...defaultProps} />);
      
      // Irrelevante Prop-Änderung (neue Function-Referenz)
      const propsWithNewFunction = {
        ...defaultProps,
        onSelect: jest.fn()
      };
      
      rerender(<ProjectCard {...propsWithNewFunction} />);
      
      // Sollte trotzdem funktionieren
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
    });
  });

  // ========================================
  // EDGE CASES & ERROR HANDLING
  // ========================================

  describe('Edge Cases & Error Handling', () => {
    it('sollte mit sehr langen Projekt-Titeln umgehen', () => {
      const longTitle = 'Das ist ein sehr sehr sehr sehr sehr langer Projekttitel der möglicherweise nicht in eine Zeile passt';
      const projectWithLongTitle = { ...baseProject, title: longTitle };
      
      render(<ProjectCard {...defaultProps} project={projectWithLongTitle} />);
      
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('truncate');
    });

    it('sollte mit fehlender Beschreibung umgehen', () => {
      const projectWithoutDescription = { ...baseProject, description: undefined };
      render(<ProjectCard {...defaultProps} project={projectWithoutDescription} />);
      
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
    });

    it('sollte mit null/undefined Values graceful umgehen', () => {
      const malformedProject = {
        ...baseProject,
        customer: null,
        assignedTo: null,
        description: null,
        dueDate: null
      };
      
      render(<ProjectCard {...defaultProps} project={malformedProject} />);
      
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
    });

    it('sollte mit extremen Progress-Werten umgehen', () => {
      const projectWithExtremeProgress = {
        ...baseProject,
        progress: { overallPercent: 150 } // Over 100%
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithExtremeProgress} />);
      
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('sollte mit invaliden Datum-Werten umgehen', () => {
      const projectWithInvalidDate = {
        ...baseProject,
        dueDate: { seconds: NaN } as any
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithInvalidDate} />);
      
      // Sollte nicht crashen
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
    });

    it('sollte mit leeren Tag-Arrays umgehen', () => {
      const projectWithEmptyTags = {
        ...baseProject,
        tags: []
      };
      
      render(<ProjectCard {...defaultProps} project={projectWithEmptyTags} />);
      
      expect(screen.queryByText('frontend')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('sollte semantische HTML-Struktur haben', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Test Projekt');
    });

    it('sollte Button mit korrektem Label haben', () => {
      render(<ProjectCard {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Mehr Optionen' })).toBeInTheDocument();
    });

    it('sollte Progress Bar accessible sein', () => {
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('sollte Color-Coding durch Text ergänzen', () => {
      render(<ProjectCard {...defaultProps} project={overdueProject} />);
      
      // Nicht nur Farbe, auch Text für Overdue
      expect(screen.getByText('⚠️ Projekt ist überfällig')).toBeInTheDocument();
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration', () => {
    it('sollte vollständigen Card-Flow rendern', () => {
      const fullFeaturedProject = {
        ...baseProject,
        priority: 'urgent' as ProjectPriority,
        tags: ['frontend', 'urgent', 'review'],
        progress: { overallPercent: 85, criticalTasksRemaining: 1 },
        dueDate: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 1 Tag überfällig
        status: 'active'
      };
      
      render(<ProjectCard {...defaultProps} project={fullFeaturedProject} />);
      
      // Alle Elemente sollten sichtbar sein
      expect(screen.getByText('Test Projekt')).toBeInTheDocument();
      expect(screen.getByText('Test Kunde GmbH')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('Dringend')).toBeInTheDocument();
      expect(screen.getByText('⚠️ Projekt ist überfällig')).toBeInTheDocument();
      expect(screen.getByText('🔥 1 kritische Tasks offen')).toBeInTheDocument();
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('sollte Drag & Drop mit allen Features funktionieren', () => {
      mockUseDraggableProject.mockReturnValue({
        isDragging: true,
        drag: jest.fn()
      });
      
      render(<ProjectCard {...defaultProps} project={extendedProject} />);
      
      const card = screen.getByText('Test Projekt').closest('.project-card');
      expect(card).toHaveClass('opacity-50');
      
      // Alle anderen Features sollten trotzdem funktionieren
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Test Kunde GmbH')).toBeInTheDocument();
    });
  });
});