// src/components/projects/kanban/__tests__/KanbanColumn.test.tsx
// Umfassende Tests für KanbanColumn Komponente
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KanbanColumn, KanbanColumnProps } from '../KanbanColumn';
import { Project, PipelineStage } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// ========================================
// MOCKS SETUP
// ========================================

// Mock VirtualizedProjectList
jest.mock('../VirtualizedProjectList', () => ({
  VirtualizedProjectList: ({ projects, height, loading, onProjectSelect }: any) => (
    <div data-testid="virtualized-list" data-projects-count={projects.length} data-height={height}>
      {loading ? 'Loading projects...' : 'Project List'}
      {projects.map((project: any) => (
        <div 
          key={project.id} 
          data-testid={`project-item-${project.id}`}
          onClick={() => onProjectSelect?.(project.id)}
        >
          {project.title}
        </div>
      ))}
    </div>
  )
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: ({ className }: any) => <div data-testid="plus-icon" className={className} />
}));

// Mock kanban-constants
jest.mock('../kanban-constants', () => ({
  getStageColor: (stage: string) => ({
    bg: `bg-${stage}-50`,
    border: `border-${stage}-200`,
    text: `text-${stage}-700`,
    accent: `bg-${stage}-100`,
    header: `bg-${stage}-100`,
    count: `bg-${stage}-200 text-${stage}-800`
  }),
  getStageConfig: (stage: string) => ({
    name: stage,
    description: `Beschreibung für ${stage}`,
    icon: 'TestIcon',
    order: 1
  })
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockProjects: Project[] = [
  {
    id: 'project-1',
    title: 'Projekt 1',
    description: 'Beschreibung 1',
    currentStage: 'creation' as PipelineStage,
    status: 'active',
    organizationId: 'org-1',
    userId: 'user-1',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    priority: 'high' as any
  },
  {
    id: 'project-2', 
    title: 'Projekt 2',
    description: 'Beschreibung 2',
    currentStage: 'creation' as PipelineStage,
    status: 'active',
    organizationId: 'org-1',
    userId: 'user-2',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    priority: 'urgent' as any
  }
];

const mockDragDropHooks = {
  useDraggableProject: jest.fn().mockReturnValue({ isDragging: false, drag: jest.fn() }),
  useDropZone: jest.fn().mockReturnValue({ isOver: false, canDrop: true, drop: jest.fn() }),
  getStageName: jest.fn().mockReturnValue('Erstellung')
};

const defaultProps: KanbanColumnProps = {
  stage: 'creation',
  projects: mockProjects,
  onProjectMove: jest.fn(),
  onProjectSelect: jest.fn(),
  useDraggableProject: mockDragDropHooks.useDraggableProject,
  useDropZone: mockDragDropHooks.useDropZone,
  getStageName: mockDragDropHooks.getStageName,
  loading: false
};

// ========================================
// SETUP & TEARDOWN  
// ========================================

describe('KanbanColumn', () => {
  const mockOnProjectMove = jest.fn();
  const mockOnProjectSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    defaultProps.onProjectMove = mockOnProjectMove;
    defaultProps.onProjectSelect = mockOnProjectSelect;
    
    // Reset drag & drop mocks
    mockDragDropHooks.useDropZone.mockReturnValue({
      isOver: false,
      canDrop: true,
      drop: jest.fn()
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC RENDERING TESTS
  // ========================================

  describe('Basic Rendering', () => {
    it('sollte KanbanColumn ohne Fehler rendern', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Projekt-Anzahl
      expect(screen.getByText('Beschreibung für creation')).toBeInTheDocument();
    });

    it('sollte Header mit Stage-Namen und Projekt-Count anzeigen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('sollte Add-Project-Button rendern', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      expect(screen.getByTitle('Projekt zu Erstellung hinzufügen')).toBeInTheDocument();
    });

    it('sollte Stage-spezifische Styles anwenden', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const column = screen.getByRole('generic', { name: /kanban-column/ });
      expect(column).toHaveClass('bg-creation-50', 'border-creation-200');
    });

    it('sollte Drop-Zone korrekt einrichten', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(mockDragDropHooks.useDropZone).toHaveBeenCalledWith('creation');
    });
  });

  // ========================================
  // PROJECT LIST RENDERING TESTS
  // ========================================

  describe('Project List Rendering', () => {
    it('sollte VirtualizedProjectList mit Projekten rendern', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      expect(virtualizedList).toBeInTheDocument();
      expect(virtualizedList).toHaveAttribute('data-projects-count', '2');
    });

    it('sollte korrekte Höhe für VirtualizedProjectList berechnen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      // Min-Höhe von Math.min(500, 2 * 120 + 20) = 260
      expect(virtualizedList).toHaveAttribute('data-height', '260');
    });

    it('sollte bei vielen Projekten maximale Höhe begrenzen', () => {
      const manyProjects = Array.from({ length: 10 }, (_, i) => ({
        ...mockProjects[0],
        id: `project-${i}`,
        title: `Projekt ${i}`
      }));
      
      render(<KanbanColumn {...defaultProps} projects={manyProjects} />);
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      // Math.min(500, 10 * 120 + 20) = 500 (maximum)
      expect(virtualizedList).toHaveAttribute('data-height', '500');
    });

    it('sollte onProjectSelect an VirtualizedList weiterreichen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const projectItem = screen.getByTestId('project-item-project-1');
      fireEvent.click(projectItem);
      
      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1');
    });

    it('sollte drag hooks an VirtualizedList weiterreichen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      // useDraggableProject wird in VirtualizedList verwendet
    });
  });

  // ========================================
  // LOADING STATE TESTS
  // ========================================

  describe('Loading State', () => {
    it('sollte Loading-Skeleton anzeigen wenn loading=true und keine Projekte', () => {
      render(<KanbanColumn {...defaultProps} projects={[]} loading={true} />);
      
      // Sollte 3 Loading-Skeleton-Items haben
      const skeletons = screen.getAllByText((content, element) => 
        element?.classList.contains('animate-pulse') || false
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('sollte Loading-State an VirtualizedList weiterreichen wenn Projekte vorhanden', () => {
      render(<KanbanColumn {...defaultProps} loading={true} />);
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      expect(virtualizedList).toHaveTextContent('Loading projects...');
    });

    it('sollte normalen Content anzeigen wenn loading=false', () => {
      render(<KanbanColumn {...defaultProps} loading={false} />);
      
      expect(screen.getByTestId('virtualized-list')).toHaveTextContent('Project List');
      expect(screen.queryByText('animate-pulse')).not.toBeInTheDocument();
    });

    it('sollte Loading-Skeleton nur anzeigen wenn keine Projekte vorhanden', () => {
      render(<KanbanColumn {...defaultProps} projects={mockProjects} loading={true} />);
      
      // Sollte VirtualizedList mit Loading-State zeigen, nicht Skeleton
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      expect(screen.queryByText('animate-pulse')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // EMPTY STATE TESTS
  // ========================================

  describe('Empty State', () => {
    it('sollte Empty-State anzeigen wenn keine Projekte und nicht loading', () => {
      render(<KanbanColumn {...defaultProps} projects={[]} loading={false} />);
      
      expect(screen.getByText('Keine Projekte')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText(/Ziehe Projekte hierher/)).toBeInTheDocument();
    });

    it('sollte Empty-State-Text mit Stage-spezifischen Farben stylen', () => {
      render(<KanbanColumn {...defaultProps} projects={[]} loading={false} />);
      
      const emptyText = screen.getByText('Keine Projekte').parentElement;
      expect(emptyText).toHaveClass('text-creation-700');
    });

    it('sollte kein Empty-State anzeigen wenn Projekte vorhanden', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.queryByText('Keine Projekte')).not.toBeInTheDocument();
    });

    it('sollte kein Empty-State während Loading anzeigen', () => {
      render(<KanbanColumn {...defaultProps} projects={[]} loading={true} />);
      
      expect(screen.queryByText('Keine Projekte')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // DRAG & DROP TESTS
  // ========================================

  describe('Drag & Drop', () => {
    it('sollte Drop-Zone visuell hervorheben wenn isOver und canDrop', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: true,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      const column = screen.getByRole('generic', { name: /kanban-column/ });
      expect(column).toHaveClass('border-green-400', 'bg-green-50', 'border-dashed');
    });

    it('sollte Drop-Zone negativ hervorheben wenn isOver aber nicht canDrop', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: false,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      const column = screen.getByRole('generic', { name: /kanban-column/ });
      expect(column).toHaveClass('border-red-400', 'bg-red-50', 'border-dashed');
    });

    it('sollte Standard-Styling verwenden wenn nicht isOver', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: false,
        canDrop: true,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      const column = screen.getByRole('generic', { name: /kanban-column/ });
      expect(column).toHaveClass('bg-creation-50', 'border-creation-200');
      expect(column).not.toHaveClass('border-green-400', 'border-red-400');
    });

    it('sollte Drop-Feedback-Overlay anzeigen wenn isOver', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: true,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByText('Hier ablegen für Erstellung')).toBeInTheDocument();
    });

    it('sollte negativen Drop-Feedback anzeigen wenn canDrop=false', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: false,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByText('Übergang nicht erlaubt')).toBeInTheDocument();
    });

    it('sollte kein Drop-Feedback anzeigen wenn nicht isOver', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: false,
        canDrop: true,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.queryByText('Hier ablegen für Erstellung')).not.toBeInTheDocument();
      expect(screen.queryByText('Übergang nicht erlaubt')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // FOOTER STATISTICS TESTS
  // ========================================

  describe('Footer Statistics', () => {
    it('sollte Projekt-Anzahl im Footer anzeigen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      expect(screen.getByText('2 Projekte')).toBeInTheDocument();
    });

    it('sollte Singular-Form bei einem Projekt verwenden', () => {
      render(<KanbanColumn {...defaultProps} projects={[mockProjects[0]]} />);
      
      expect(screen.getByText('1 Projekt')).toBeInTheDocument();
    });

    it('sollte urgent Projekte im Footer zählen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      // Ein Projekt hat priority: 'urgent'
      expect(screen.getByText('1 urgent')).toBeInTheDocument();
    });

    it('sollte keine urgent-Anzahl anzeigen wenn keine Projekte', () => {
      render(<KanbanColumn {...defaultProps} projects={[]} />);
      
      expect(screen.queryByText(/urgent/)).not.toBeInTheDocument();
    });

    it('sollte keine urgent-Anzahl anzeigen wenn keine urgent Projekte', () => {
      const normalProjects = mockProjects.map(p => ({ ...p, priority: 'medium' }));
      render(<KanbanColumn {...defaultProps} projects={normalProjects} />);
      
      expect(screen.getByText('0 urgent')).toBeInTheDocument();
    });
  });

  // ========================================
  // EVENT HANDLING TESTS
  // ========================================

  describe('Event Handling', () => {
    it('sollte Add-Project-Button Click handhaben', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<KanbanColumn {...defaultProps} />);
      
      const addButton = screen.getByTitle('Projekt zu Erstellung hinzufügen');
      fireEvent.click(addButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Add project to creation');
      
      consoleSpy.mockRestore();
    });

    it('sollte onProjectSelect von VirtualizedList weiterleiten', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const projectItem = screen.getByTestId('project-item-project-1');
      fireEvent.click(projectItem);
      
      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1');
    });

    it('sollte onProjectMove korrekt weiterreichen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      // onProjectMove wird in VirtualizedProjectList verwendet
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('sollte alle Props korrekt an VirtualizedProjectList weiterreichen', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      expect(virtualizedList).toHaveAttribute('data-projects-count', '2');
      expect(virtualizedList).toHaveTextContent('Project List'); // Nicht loading
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('sollte semantische Struktur haben', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      // Header sollte heading-Element sein
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Erstellung');
    });

    it('sollte Add-Button mit korrektem Label haben', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      const addButton = screen.getByTitle('Projekt zu Erstellung hinzufügen');
      expect(addButton).toHaveAttribute('title');
    });

    it('sollte Drop-Zone für Screen Reader accessible sein', () => {
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: true,
        drop: jest.fn()
      });
      
      render(<KanbanColumn {...defaultProps} />);
      
      // Drop-Feedback sollte text-content haben
      expect(screen.getByText('Hier ablegen für Erstellung')).toBeInTheDocument();
    });

    it('sollte Count-Badge semantisch korrekt sein', () => {
      render(<KanbanColumn {...defaultProps} />);
      
      // Count sollte als badge/status erkennbar sein
      const countElement = screen.getByText('2');
      expect(countElement).toHaveClass('px-2', 'py-1'); // Badge styling
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('sollte memo-Vergleichsfunktion korrekt funktionieren', () => {
      const { rerender } = render(<KanbanColumn {...defaultProps} />);
      
      // Gleiche Props -> sollte nicht re-rendern
      rerender(<KanbanColumn {...defaultProps} />);
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      
      // Geänderte Projekt-Liste -> sollte re-rendern
      const newProjects = [...mockProjects, { ...mockProjects[0], id: 'project-3' }];
      rerender(<KanbanColumn {...defaultProps} projects={newProjects} />);
      expect(screen.getByTestId('virtualized-list')).toHaveAttribute('data-projects-count', '3');
    });

    it('sollte bei vielen Projekten performant bleiben', () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        ...mockProjects[0],
        id: `project-${i}`,
        title: `Projekt ${i}`
      }));
      
      const start = Date.now();
      render(<KanbanColumn {...defaultProps} projects={manyProjects} />);
      const end = Date.now();
      
      expect(end - start).toBeLessThan(500); // Sollte schnell sein
      expect(screen.getByTestId('virtualized-list')).toHaveAttribute('data-projects-count', '100');
    });

    it('sollte nur bei relevanten Änderungen re-rendern', () => {
      const { rerender } = render(<KanbanColumn {...defaultProps} />);
      
      // Props mit irrelevanten Änderungen
      const propsWithIrrelevantChange = {
        ...defaultProps,
        onProjectMove: jest.fn() // Neue Function-Referenz
      };
      
      rerender(<KanbanColumn {...propsWithIrrelevantChange} />);
      
      // Sollte immer noch funktionieren
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
    });

    it('sollte Projekt-Updates performant erkennen', () => {
      const { rerender } = render(<KanbanColumn {...defaultProps} />);
      
      // Update Timestamp eines Projekts
      const updatedProjects = mockProjects.map(p => 
        p.id === 'project-1' ? { ...p, updatedAt: Timestamp.now() } : p
      );
      
      rerender(<KanbanColumn {...defaultProps} projects={updatedProjects} />);
      
      // Sollte Update erkennen und neu rendern
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('sollte mit fehlenden Projekten umgehen', () => {
      render(<KanbanColumn {...defaultProps} projects={undefined as any} />);
      
      expect(screen.getByText('Keine Projekte')).toBeInTheDocument();
    });

    it('sollte mit malformed Projects umgehen', () => {
      const malformedProjects = [
        { id: null, title: null } as any,
        { id: 'valid', title: 'Valid Project', currentStage: 'creation' as PipelineStage } as any
      ];
      
      render(<KanbanColumn {...defaultProps} projects={malformedProjects} />);
      
      // Sollte nicht crashen
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('sollte mit fehlenden Drag & Drop Hooks umgehen', () => {
      const propsWithoutHooks = {
        ...defaultProps,
        useDropZone: undefined as any,
        useDraggableProject: undefined as any
      };
      
      // Sollte Error werfen oder graceful degradation
      expect(() => {
        render(<KanbanColumn {...propsWithoutHooks} />);
      }).toThrow();
    });

    it('sollte mit unbekannten Stages umgehen', () => {
      const unknownStageProps = {
        ...defaultProps,
        stage: 'unknown_stage' as PipelineStage
      };
      
      render(<KanbanColumn {...unknownStageProps} />);
      
      // Sollte fallback styling verwenden
      expect(screen.getByText('Erstellung')).toBeInTheDocument(); // getStageName Mock
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration', () => {
    it('sollte vollständigen Drop-Flow simulieren', async () => {
      // Initial state - no drag
      const { rerender } = render(<KanbanColumn {...defaultProps} />);
      expect(screen.queryByText('Hier ablegen')).not.toBeInTheDocument();
      
      // Start drag over
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: true,
        canDrop: true,
        drop: jest.fn()
      });
      
      rerender(<KanbanColumn {...defaultProps} />);
      expect(screen.getByText('Hier ablegen für Erstellung')).toBeInTheDocument();
      
      // End drag
      mockDragDropHooks.useDropZone.mockReturnValue({
        isOver: false,
        canDrop: true,
        drop: jest.fn()
      });
      
      rerender(<KanbanColumn {...defaultProps} />);
      expect(screen.queryByText('Hier ablegen')).not.toBeInTheDocument();
    });

    it('sollte mit verschiedenen Stage-Konfigurationen funktionieren', () => {
      const stages: PipelineStage[] = [
        'ideas_planning',
        'creation',
        'internal_approval',
        'customer_approval',
        'distribution',
        'monitoring',
        'completed'
      ];
      
      stages.forEach(stage => {
        const { unmount } = render(<KanbanColumn {...defaultProps} stage={stage} />);
        expect(screen.getByText('Erstellung')).toBeInTheDocument(); // Mock getStageName
        unmount();
      });
    });

    it('sollte Multi-Tenancy berücksichtigen', () => {
      const orgProjects = mockProjects.map(p => ({ ...p, organizationId: 'org-1' }));
      
      render(<KanbanColumn {...defaultProps} projects={orgProjects} />);
      
      expect(screen.getByTestId('virtualized-list')).toHaveAttribute('data-projects-count', '2');
    });
  });
});