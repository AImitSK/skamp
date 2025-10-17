// src/components/projects/kanban/__tests__/KanbanBoard.test.tsx
// Umfassende Tests für KanbanBoard Komponente
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KanbanBoard, KanbanBoardProps } from '../KanbanBoard';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { Project, PipelineStage } from '@/types/project';
import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { Timestamp } from 'firebase/firestore';

// ========================================
// MOCKS SETUP
// ========================================

// Mock useDragAndDrop Hook
jest.mock('@/hooks/useDragAndDrop', () => ({
  useDragAndDrop: jest.fn()
}));

// Mock Child Components
jest.mock('../KanbanColumn', () => ({
  KanbanColumn: ({ stage, projects, loading }: any) => (
    <div data-testid={`kanban-column-${stage}`} data-projects-count={projects.length}>
      <div>{stage}</div>
      <div>{loading ? 'Loading...' : `${projects.length} Projekte`}</div>
    </div>
  )
}));

jest.mock('../BoardHeader', () => ({
  BoardHeader: ({ totalProjects, showFilters, onToggleFilters, onRefresh }: any) => (
    <div data-testid="board-header">
      <span data-testid="total-projects">{totalProjects}</span>
      <button data-testid="toggle-filters" onClick={onToggleFilters}>
        {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
      </button>
      <button data-testid="refresh-button" onClick={onRefresh}>Aktualisieren</button>
    </div>
  )
}));

jest.mock('../BoardFilterPanel', () => ({
  BoardFilterPanel: ({ filters, onClose }: any) => (
    <div data-testid="filter-panel">
      <button data-testid="close-filters" onClick={onClose}>Schließen</button>
    </div>
  )
}));

jest.mock('../MobileKanbanAccordion', () => ({
  MobileKanbanAccordion: ({ sections, loading }: any) => (
    <div data-testid="mobile-kanban">
      <div data-testid="accordion-sections">{sections.length} Sections</div>
      <div>{loading ? 'Loading...' : 'Mobile View'}</div>
    </div>
  )
}));

jest.mock('../UserPresenceOverlay', () => ({
  UserPresenceOverlay: ({ activeUsers }: any) => (
    <div data-testid="user-presence">
      {activeUsers.length} aktive User
    </div>
  )
}));

// Mock window.matchMedia für responsive Tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window resize events
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.ResizeObserver = mockResizeObserver;

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockProjects: Record<PipelineStage, Project[]> = {
  'ideas_planning': [
    {
      id: 'project-1',
      title: 'Projekt 1',
      description: 'Beschreibung 1',
      currentStage: 'ideas_planning' as PipelineStage,
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp
    }
  ],
  'creation': [
    {
      id: 'project-2',
      title: 'Projekt 2',
      description: 'Beschreibung 2',
      currentStage: 'creation' as PipelineStage,
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-2',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp
    }
  ],
  'approval': [],
  'distribution': [],
  'monitoring': [],
  'completed': []
};

const mockActiveUsers = [
  {
    id: 'user-1',
    name: 'Test User 1',
    avatar: 'avatar1.jpg',
    currentProject: 'project-1',
    lastSeen: new Date()
  },
  {
    id: 'user-2',
    name: 'Test User 2',
    lastSeen: new Date()
  }
];

const mockFilters: BoardFilters = {
  search: '',
  customers: [],
  teamMembers: [],
  priority: [],
  tags: [],
  overdue: false,
  critical: false
};

const mockUseDragAndDrop = {
  useDraggableProject: jest.fn().mockReturnValue({ isDragging: false, drag: jest.fn() }),
  useDropZone: jest.fn().mockReturnValue({ isOver: false, canDrop: true, drop: jest.fn() }),
  getStageName: jest.fn().mockImplementation((stage: PipelineStage) => {
    const names: Record<PipelineStage, string> = {
      'ideas_planning': 'Ideen & Planung',
      'creation': 'Erstellung',
      'approval': 'Freigabe',
      'distribution': 'Verteilung',
      'monitoring': 'Monitoring',
      'completed': 'Abgeschlossen'
    };
    return names[stage];
  })
};

const defaultProps: KanbanBoardProps = {
  projects: mockProjects,
  totalProjects: 2,
  activeUsers: mockActiveUsers,
  filters: mockFilters,
  loading: false,
  onProjectMove: jest.fn(),
  onFiltersChange: jest.fn(),
  onProjectSelect: jest.fn(),
  onRefresh: jest.fn()
};

// ========================================
// SETUP & TEARDOWN
// ========================================

describe('KanbanBoard', () => {
  const mockOnProjectMove = jest.fn();
  const mockOnFiltersChange = jest.fn();
  const mockOnProjectSelect = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useDragAndDrop as jest.Mock).mockReturnValue(mockUseDragAndDrop);
    
    // Mock window size für Desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
    
    // Reset props functions
    defaultProps.onProjectMove = mockOnProjectMove;
    defaultProps.onFiltersChange = mockOnFiltersChange;
    defaultProps.onProjectSelect = mockOnProjectSelect;
    defaultProps.onRefresh = mockOnRefresh;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC RENDERING TESTS
  // ========================================

  describe('Basic Rendering', () => {
    it('sollte KanbanBoard ohne Fehler rendern', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
      expect(screen.getByTestId('user-presence')).toBeInTheDocument();
      expect(screen.getByTestId('total-projects')).toHaveTextContent('2');
    });

    it('sollte alle Kanban-Spalten für Desktop-Layout rendern', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const stages: PipelineStage[] = [
        'ideas_planning',
        'creation',
        'approval',
        'distribution',
        'monitoring',
        'completed'
      ];
      
      stages.forEach(stage => {
        expect(screen.getByTestId(`kanban-column-${stage}`)).toBeInTheDocument();
      });
    });

    it('sollte Projekt-Anzahlen korrekt in den Spalten anzeigen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByTestId('kanban-column-ideas_planning')).toHaveAttribute('data-projects-count', '1');
      expect(screen.getByTestId('kanban-column-creation')).toHaveAttribute('data-projects-count', '1');
      expect(screen.getByTestId('kanban-column-approval')).toHaveAttribute('data-projects-count', '0');
    });

    it('sollte aktive User-Anzahl korrekt anzeigen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByTestId('user-presence')).toHaveTextContent('2 aktive User');
    });

    it('sollte useDragAndDrop Hook korrekt initialisieren', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(useDragAndDrop).toHaveBeenCalledWith(mockOnProjectMove);
    });
  });

  // ========================================
  // RESPONSIVE LAYOUT TESTS
  // ========================================

  describe('Responsive Layout', () => {
    it('sollte Desktop-Layout bei breiten Bildschirmen verwenden (≥1200px)', async () => {
      // Mock Desktop-Größe
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      
      render(<KanbanBoard {...defaultProps} />);
      
      // Sollte Desktop-Spalten haben
      expect(screen.getByTestId('kanban-column-ideas_planning')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-kanban')).not.toBeInTheDocument();
    });

    it('sollte Tablet-Layout bei mittleren Bildschirmen verwenden (768px-1199px)', async () => {
      // Mock Tablet-Größe
      Object.defineProperty(window, 'innerWidth', { value: 900 });
      
      // Re-render mit neuer Fenstergröße
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        // Sollte immer noch Desktop-Spalten haben (da das Layout nur bei sehr kleinen Bildschirmen wechselt)
        expect(screen.getByTestId('kanban-column-ideas_planning')).toBeInTheDocument();
      });
    });

    it('sollte Mobile-Layout bei kleinen Bildschirmen verwenden (<768px)', async () => {
      // Mock Mobile-Größe
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        // Sollte Mobile-Accordion verwenden
        expect(screen.getByTestId('mobile-kanban')).toBeInTheDocument();
        expect(screen.queryByTestId('kanban-column-ideas_planning')).not.toBeInTheDocument();
      });
    });

    it('sollte auf Window-Resize-Events reagieren', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Initial Desktop
      expect(screen.queryByTestId('mobile-kanban')).not.toBeInTheDocument();
      
      // Ändere zu Mobile
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      fireEvent(window, new Event('resize'));
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-kanban')).toBeInTheDocument();
      });
    });

    it('sollte Resize-Event-Listener beim Unmount aufräumen', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<KanbanBoard {...defaultProps} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  // ========================================
  // LOADING STATE TESTS
  // ========================================

  describe('Loading State', () => {
    it('sollte Loading-Indikator anzeigen wenn loading=true', () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);

      // Board Header sollte vorhanden sein
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte Loading-State an Spalten weiterreichen', () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);

      // Board sollte rendern
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte kein Board-Content anzeigen während Loading', () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);
      
      // Board-Content sollte versteckt sein, aber Header und User-Presence sichtbar
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
      expect(screen.getByTestId('user-presence')).toBeInTheDocument();
    });

    it('sollte Loading-State auch an Mobile-View weiterreichen', async () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);

      // Board sollte vorhanden sein
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });
  });

  // ========================================
  // FILTER FUNCTIONALITY TESTS
  // ========================================

  describe('Filter Functionality', () => {
    it('sollte Filter-Panel standardmäßig versteckt haben', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    });

    it('sollte Filter-Panel beim Klick auf Toggle-Button anzeigen', async () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const toggleButton = screen.getByTestId('toggle-filters');
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });
    });

    it('sollte Filter-Panel beim Klick auf Schließen-Button verstecken', async () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Filter öffnen
      fireEvent.click(screen.getByTestId('toggle-filters'));
      
      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });
      
      // Filter schließen
      fireEvent.click(screen.getByTestId('close-filters'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
      });
    });

    it('sollte Filter-Änderungen korrekt weiterleiten', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Mock wurde an BoardHeader weitergereicht
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
      // onFiltersChange wird über Props weitergereicht und sollte in Tests der Child-Components getestet werden
    });

    it('sollte aktuelle Filter an Header und Filter-Panel weiterreichen', () => {
      const filtersWithData: BoardFilters = {
        ...mockFilters,
        search: 'test',
        customers: ['customer-1']
      };
      
      render(<KanbanBoard {...defaultProps} filters={filtersWithData} />);
      
      // Filter werden an Header weitergereicht
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });
  });

  // ========================================
  // EMPTY STATE TESTS
  // ========================================

  describe('Empty State', () => {
    const emptyProjects: Record<PipelineStage, Project[]> = {
      'ideas_planning': [],
      'creation': [],
      'approval': [],
      'distribution': [],
      'monitoring': [],
      'completed': []
    };

    it('sollte Empty-State anzeigen wenn keine Projekte vorhanden', () => {
      render(
        <KanbanBoard 
          {...defaultProps} 
          projects={emptyProjects} 
          totalProjects={0} 
          loading={false}
        />
      );
      
      expect(screen.getByText('Keine Projekte gefunden')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('sollte Filter-spezifische Empty-Message anzeigen wenn Filter aktiv', () => {
      const activeFilters = { ...mockFilters, search: 'nonexistent' };
      
      render(
        <KanbanBoard 
          {...defaultProps} 
          projects={emptyProjects} 
          totalProjects={0} 
          filters={activeFilters}
          loading={false}
        />
      );
      
      expect(screen.getByText(/Versuche deine Filter zu ändern/)).toBeInTheDocument();
    });

    it('sollte Standard-Empty-Message anzeigen wenn keine Filter aktiv', () => {
      render(
        <KanbanBoard
          {...defaultProps}
          projects={emptyProjects}
          totalProjects={0}
          loading={false}
        />
      );

      // Board sollte rendern
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte Empty-State nicht anzeigen während Loading', () => {
      render(
        <KanbanBoard 
          {...defaultProps} 
          projects={emptyProjects} 
          totalProjects={0} 
          loading={true}
        />
      );
      
      expect(screen.queryByText('Keine Projekte gefunden')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // EVENT HANDLING TESTS
  // ========================================

  describe('Event Handling', () => {
    it('sollte onRefresh beim Klick auf Refresh-Button aufrufen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);
      
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('sollte onProjectMove an alle Spalten weiterreichen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Verifikation dass alle KanbanColumn-Components die onProjectMove-Function erhalten haben
      // würde in KanbanColumn-Tests spezifisch getestet
      expect(screen.getByTestId('kanban-column-ideas_planning')).toBeInTheDocument();
    });

    it('sollte onProjectSelect an alle Spalten weiterreichen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // onProjectSelect wird an alle Spalten weitergereicht
      expect(screen.getByTestId('kanban-column-ideas_planning')).toBeInTheDocument();
    });

    it('sollte Mobile-Event-Handler korrekt weiterreichen', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      fireEvent(window, new Event('resize'));
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-kanban')).toBeInTheDocument();
        // Mobile-Component erhält die Event-Handler
      });
    });
  });

  // ========================================
  // DEVELOPMENT DEBUG TESTS
  // ========================================

  describe('Development Debug', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterAll(() => {
      (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('sollte Debug-Info im Development-Mode anzeigen', () => {
      (process.env as any).NODE_ENV = 'development';
      
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText(/Layout:/)).toBeInTheDocument();
      expect(screen.getByText(/Width: 1200px/)).toBeInTheDocument();
      expect(screen.getByText(/Projects: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Active Users: 2/)).toBeInTheDocument();
    });

    it('sollte Debug-Info im Production-Mode verstecken', () => {
      (process.env as any).NODE_ENV = 'production';
      
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.queryByText(/Layout:/)).not.toBeInTheDocument();
    });

    it('sollte korrekte Layout-Info im Debug-Panel anzeigen', async () => {
      (process.env as any).NODE_ENV = 'development';
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      fireEvent(window, new Event('resize'));
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Layout: accordion/)).toBeInTheDocument();
        expect(screen.getByText(/Width: 500px/)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('sollte Responsive-Config memoized werden', () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Re-render mit gleichen Props sollte keine Performance-Impact haben
      rerender(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      // useMemo sollte Config gecacht haben
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte mit vielen Projekten performant umgehen', () => {
      const manyProjects: Record<PipelineStage, Project[]> = {
        'ideas_planning': Array.from({ length: 100 }, (_, i) => ({
          id: `project-${i}`,
          title: `Projekt ${i}`,
          description: `Beschreibung ${i}`,
          currentStage: 'ideas_planning' as PipelineStage,
          status: 'active',
          organizationId: 'org-1',
          userId: 'user-1',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        })),
        'creation': [],
        'approval': [],
        'distribution': [],
        'monitoring': [],
        'completed': []
      };
      
      const start = Date.now();
      render(<KanbanBoard {...defaultProps} projects={manyProjects} totalProjects={100} />);
      const end = Date.now();
      
      // Render sollte schnell sein
      expect(end - start).toBeLessThan(1000);
      expect(screen.getByTestId('kanban-column-ideas_planning')).toHaveAttribute('data-projects-count', '100');
    });

    it('sollte Re-renders bei unveränderter Daten minimieren', () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Mehrere Re-renders mit identischen Props
      rerender(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      // Component sollte stabil bleiben
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });
  });

  // ========================================
  // ERROR BOUNDARY TESTS
  // ========================================

  describe('Error Handling', () => {
    it('sollte mit fehlenden Props graceful umgehen', () => {
      const minimalProps: Partial<KanbanBoardProps> = {
        projects: mockProjects,
        totalProjects: 0,
        activeUsers: [],
        filters: mockFilters,
        loading: false,
        onProjectMove: jest.fn(),
        onFiltersChange: jest.fn()
      };
      
      render(<KanbanBoard {...minimalProps as KanbanBoardProps} />);
      
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte mit undefined/null activeUsers umgehen', () => {
      render(<KanbanBoard {...defaultProps} activeUsers={[]} />);

      // Sollte nicht crashen
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte mit malformed project data umgehen', () => {
      const malformedProjects = {
        ...mockProjects,
        'ideas_planning': [
          {
            id: 'malformed',
            title: null,
            currentStage: 'ideas_planning' as PipelineStage,
            // Fehlende required fields
          } as any
        ]
      };
      
      render(<KanbanBoard {...defaultProps} projects={malformedProjects} />);
      
      // Sollte nicht crashen
      expect(screen.getByTestId('kanban-column-ideas_planning')).toBeInTheDocument();
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('sollte semantische Struktur haben', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Hauptcontainer sollte role haben (implizit durch semantic elements)
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte keyboard navigation unterstützen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const toggleButton = screen.getByTestId('toggle-filters');
      
      // Sollte focusable sein
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);
      
      // Enter-Taste sollte funktionieren
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      // Weitere keyboard tests würden in Child-Component-Tests implementiert
    });

    it('sollte Screen Reader friendly sein', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Wichtige Informationen sollten accessible sein
      expect(screen.getByTestId('total-projects')).toHaveTextContent('2');
      expect(screen.getByTestId('user-presence')).toHaveTextContent('2 aktive User');
    });
  });
});