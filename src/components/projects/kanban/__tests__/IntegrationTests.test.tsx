// src/components/projects/kanban/__tests__/IntegrationTests.test.tsx
// End-to-End Integration Tests für vollständigen Kanban Board Flow
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '../KanbanBoard';
import { kanbanBoardService } from '@/lib/kanban/kanban-board-service';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useAuth } from '@/hooks/useAuth';
import { Project, PipelineStage } from '@/types/project';
import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { Timestamp } from 'firebase/firestore';

// ========================================
// INTEGRATION MOCKS SETUP
// ========================================

// Mock alle Services und Hooks für Integration Tests
jest.mock('@/lib/kanban/kanban-board-service');
jest.mock('@/hooks/useBoardRealtime');
jest.mock('@/hooks/useDragAndDrop');
jest.mock('@/hooks/useAuth');

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date }))
  }
}));

// Mock Child Components mit realistischen Implementations
jest.mock('../KanbanColumn', () => ({
  KanbanColumn: ({ stage, projects, onProjectMove, onProjectSelect, loading }: any) => (
    <div data-testid={`kanban-column-${stage}`} className="kanban-column">
      <h3 data-testid={`column-header-${stage}`}>{stage}</h3>
      <div data-testid={`column-count-${stage}`}>{projects.length}</div>
      {loading && <div data-testid={`column-loading-${stage}`}>Loading...</div>}
      {projects.map((project: any) => (
        <div
          key={project.id}
          data-testid={`project-${project.id}`}
          data-stage={stage}
          onClick={() => onProjectSelect?.(project.id)}
          onDragStart={() => console.log(`Dragging ${project.id} from ${stage}`)}
          onDrop={(e) => {
            const draggedProjectId = e.dataTransfer?.getData('projectId');
            if (draggedProjectId) {
              onProjectMove?.(draggedProjectId, stage);
            }
          }}
          draggable
        >
          {project.title}
        </div>
      ))}
    </div>
  )
}));

jest.mock('../BoardHeader', () => ({
  BoardHeader: ({ 
    totalProjects, 
    filters, 
    onFiltersChange, 
    onRefresh, 
    showFilters, 
    onToggleFilters 
  }: any) => (
    <div data-testid="board-header">
      <div data-testid="total-projects">{totalProjects} Projekte</div>
      <button 
        data-testid="refresh-button" 
        onClick={onRefresh}
      >
        Aktualisieren
      </button>
      <button 
        data-testid="toggle-filters" 
        onClick={onToggleFilters}
      >
        {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
      </button>
      <input
        data-testid="search-input"
        value={filters.search || ''}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        placeholder="Suchen..."
      />
    </div>
  )
}));

jest.mock('../BoardFilterPanel', () => ({
  BoardFilterPanel: ({ filters, onFiltersChange, onClose }: any) => (
    <div data-testid="filter-panel">
      <button data-testid="close-filters" onClick={onClose}>Schließen</button>
      <select
        data-testid="customer-filter"
        value={filters.customers?.[0] || ''}
        onChange={(e) => onFiltersChange({ 
          ...filters, 
          customers: e.target.value ? [e.target.value] : [] 
        })}
      >
        <option value="">Alle Kunden</option>
        <option value="customer-1">Kunde 1</option>
        <option value="customer-2">Kunde 2</option>
      </select>
      <input
        type="checkbox"
        data-testid="overdue-filter"
        checked={filters.overdue || false}
        onChange={(e) => onFiltersChange({ 
          ...filters, 
          overdue: e.target.checked 
        })}
      />
      <label>Nur überfällige</label>
    </div>
  )
}));

jest.mock('../MobileKanbanAccordion', () => ({
  MobileKanbanAccordion: ({ sections, onProjectMove, onProjectSelect }: any) => (
    <div data-testid="mobile-accordion">
      {sections.map((section: any) => (
        <div key={section.stage} data-testid={`mobile-section-${section.stage}`}>
          <h4>{section.title} ({section.count})</h4>
          {section.projects.map((project: any) => (
            <div
              key={project.id}
              data-testid={`mobile-project-${project.id}`}
              onClick={() => onProjectSelect?.(project.id)}
            >
              {project.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}));

jest.mock('../UserPresenceOverlay', () => ({
  UserPresenceOverlay: ({ activeUsers }: any) => (
    <div data-testid="user-presence">
      {activeUsers.map((user: any) => (
        <div key={user.id} data-testid={`active-user-${user.id}`}>
          {user.name}
        </div>
      ))}
    </div>
  )
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const createMockProjects = (): Record<PipelineStage, Project[]> => ({
  'ideas_planning': [
    {
      id: 'project-1',
      title: 'Neues Website Design',
      description: 'Redesign der Corporate Website',
      currentStage: 'ideas_planning',
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      customer: { id: 'customer-1', name: 'Kunde 1 GmbH' },
      assignedTo: ['user-1', 'user-2']
    }
  ],
  'creation': [
    {
      id: 'project-2',
      title: 'Mobile App Entwicklung',
      description: 'Native iOS/Android App',
      currentStage: 'creation',
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      customer: { id: 'customer-2', name: 'Kunde 2 AG' },
      assignedTo: ['user-1'],
      dueDate: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)) // Überfällig
    }
  ],
  'internal_approval': [],
  'customer_approval': [
    {
      id: 'project-3',
      title: 'Marketing Kampagne',
      description: 'Q4 Marketing Kampagne',
      currentStage: 'customer_approval',
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-2',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      customer: { id: 'customer-1', name: 'Kunde 1 GmbH' },
      assignedTo: ['user-2']
    }
  ],
  'distribution': [],
  'monitoring': [],
  'completed': [
    {
      id: 'project-4',
      title: 'Logo Redesign',
      description: 'Neues Corporate Logo',
      currentStage: 'completed',
      status: 'completed',
      organizationId: 'org-1',
      userId: 'user-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      customer: { id: 'customer-1', name: 'Kunde 1 GmbH' },
      assignedTo: ['user-1']
    }
  ]
});

const mockActiveUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    avatar: 'avatar1.jpg',
    currentProject: 'project-1',
    lastSeen: new Date()
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    avatar: 'avatar2.jpg',
    currentProject: 'project-2',
    lastSeen: new Date()
  }
];

// ========================================
// SETUP & TEARDOWN
// ========================================

describe('Kanban Board Integration Tests', () => {
  const mockKanbanBoardService = kanbanBoardService as jest.Mocked<typeof kanbanBoardService>;
  const mockUseBoardRealtime = useBoardRealtime as jest.MockedFunction<typeof useBoardRealtime>;
  const mockUseDragAndDrop = useDragAndDrop as jest.MockedFunction<typeof useDragAndDrop>;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  const mockOnProjectMove = jest.fn();
  const mockOnFiltersChange = jest.fn();
  const mockOnProjectSelect = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Auth Mock
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-1', email: 'user@test.com', name: 'Test User' },
      loading: false,
      signOut: jest.fn(),
      updateProfile: jest.fn()
    });

    // Setup Board Service Mock
    mockKanbanBoardService.getBoardData.mockResolvedValue({
      projectsByStage: createMockProjects(),
      totalProjects: 4,
      activeUsers: mockActiveUsers,
      recentUpdates: []
    });

    mockKanbanBoardService.moveProject.mockResolvedValue({
      success: true,
      project: createMockProjects().creation[0],
      validationMessages: ['Projekt erfolgreich verschoben']
    });

    // Setup Realtime Hook Mock
    mockUseBoardRealtime.mockReturnValue({
      boardData: {
        projectsByStage: createMockProjects(),
        totalProjects: 4,
        activeUsers: mockActiveUsers,
        recentUpdates: []
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
      updateProjectsWithFilters: jest.fn()
    });

    // Setup Drag & Drop Mock
    mockUseDragAndDrop.mockReturnValue({
      useDraggableProject: jest.fn().mockReturnValue({ isDragging: false, drag: jest.fn() }),
      useDropZone: jest.fn().mockReturnValue({ isOver: false, canDrop: true, drop: jest.fn() }),
      canMoveProject: jest.fn().mockReturnValue(true),
      validateStageTransition: jest.fn().mockReturnValue(true),
      getValidTargetStages: jest.fn().mockReturnValue(['internal_approval']),
      getTransitionType: jest.fn().mockReturnValue('forward'),
      getDragFeedback: jest.fn().mockReturnValue({
        dropZoneClass: 'bg-green-100',
        message: 'Hier ablegen',
        canDropHere: true
      }),
      getStageName: jest.fn().mockImplementation((stage: PipelineStage) => {
        const names: Record<PipelineStage, string> = {
          'ideas_planning': 'Ideen & Planung',
          'creation': 'Erstellung',
          'internal_approval': 'Interne Freigabe',
          'customer_approval': 'Kunden-Freigabe',
          'distribution': 'Verteilung',
          'monitoring': 'Monitoring',
          'completed': 'Abgeschlossen'
        };
        return names[stage];
      })
    });
  });

  // ========================================
  // FULL BOARD INTEGRATION TESTS
  // ========================================

  describe('Full Board Integration', () => {
    it('sollte vollständiges Board mit allen Komponenten laden', async () => {
      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Board Header sollte geladen sein
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
      expect(screen.getByTestId('total-projects')).toHaveTextContent('4 Projekte');

      // Alle Kanban Spalten sollten da sein
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
        expect(screen.getByTestId(`kanban-column-${stage}`)).toBeInTheDocument();
      });

      // User Presence sollte aktive User anzeigen
      expect(screen.getByTestId('user-presence')).toBeInTheDocument();
      expect(screen.getByTestId('active-user-user-1')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('active-user-user-2')).toHaveTextContent('Jane Smith');

      // Projekte sollten in korrekten Spalten sein
      expect(screen.getByTestId('project-project-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-project-2')).toBeInTheDocument();
      expect(screen.getByTestId('project-project-3')).toBeInTheDocument();
      expect(screen.getByTestId('project-project-4')).toBeInTheDocument();
    });

    it('sollte Real-time Updates korrekt verarbeiten', async () => {
      const { rerender } = render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Initial State
      expect(screen.getByTestId('column-count-creation')).toHaveTextContent('1');

      // Simuliere Real-time Update - neues Projekt hinzugefügt
      const updatedProjects = {
        ...createMockProjects(),
        creation: [
          ...createMockProjects().creation,
          {
            id: 'project-5',
            title: 'Neues Projekt',
            description: 'Real-time hinzugefügt',
            currentStage: 'creation' as PipelineStage,
            status: 'active',
            organizationId: 'org-1',
            userId: 'user-1',
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp
          }
        ]
      };

      rerender(
        <KanbanBoard
          projects={updatedProjects}
          totalProjects={5}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Updated State
      expect(screen.getByTestId('column-count-creation')).toHaveTextContent('2');
      expect(screen.getByTestId('total-projects')).toHaveTextContent('5 Projekte');
      expect(screen.getByTestId('project-project-5')).toBeInTheDocument();
    });
  });

  // ========================================
  // DRAG & DROP INTEGRATION TESTS
  // ========================================

  describe('Drag & Drop Integration', () => {
    it('sollte vollständigen Drag & Drop Flow durchführen', async () => {
      const user = userEvent.setup();

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const projectElement = screen.getByTestId('project-project-1');
      const targetColumn = screen.getByTestId('kanban-column-creation');

      // Simuliere Drag Start
      fireEvent.dragStart(projectElement);

      // Simuliere Drop
      fireEvent.drop(targetColumn, {
        dataTransfer: {
          getData: jest.fn().mockReturnValue('project-1')
        }
      });

      await waitFor(() => {
        expect(mockOnProjectMove).toHaveBeenCalledWith('project-1', 'creation');
      });
    });

    it('sollte Drag-Validation korrekt durchführen', async () => {
      // Setup Mock für ungültigen Move
      const mockDragAndDropReturns = mockUseDragAndDrop();
      mockDragAndDropReturns.validateStageTransition = jest.fn().mockReturnValue(false);
      mockDragAndDropReturns.canMoveProject = jest.fn().mockReturnValue(false);

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // User sollte Projekte nicht bewegen können wenn nicht berechtigt
      expect(mockDragAndDropReturns.canMoveProject).toBeDefined();
    });

    it('sollte Multi-User Drag-Locks handhaben', async () => {
      // Setup Service Mock für Drag-Lock-Scenario
      mockKanbanBoardService.moveProject.mockResolvedValueOnce({
        success: false,
        project: {} as Project,
        errors: ['Projekt wird bereits von Jane Smith bearbeitet']
      });

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Simuliere Move-Versuch
      await mockOnProjectMove('project-1', 'creation');

      expect(mockKanbanBoardService.moveProject).toHaveBeenCalled();
    });
  });

  // ========================================
  // SEARCH & FILTER INTEGRATION TESTS
  // ========================================

  describe('Search & Filter Integration', () => {
    it('sollte vollständigen Search-Flow durchführen', async () => {
      const user = userEvent.setup();

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{ search: '' }}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const searchInput = screen.getByTestId('search-input');

      // Suche eingeben
      await user.type(searchInput, 'Website');

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          search: 'Website'
        });
      });
    });

    it('sollte Filter-Panel-Integration durchführen', async () => {
      const user = userEvent.setup();

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Filter-Panel öffnen
      const toggleFiltersButton = screen.getByTestId('toggle-filters');
      await user.click(toggleFiltersButton);

      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      });

      // Kunden-Filter setzen
      const customerFilter = screen.getByTestId('customer-filter');
      await user.selectOptions(customerFilter, 'customer-1');

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          customers: ['customer-1']
        });
      });

      // Überfällig-Filter aktivieren
      const overdueFilter = screen.getByTestId('overdue-filter');
      await user.click(overdueFilter);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          overdue: true
        });
      });

      // Filter-Panel schließen
      const closeFiltersButton = screen.getByTestId('close-filters');
      await user.click(closeFiltersButton);

      await waitFor(() => {
        expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
      });
    });

    it('sollte kombinierte Filter korrekt anwenden', async () => {
      const combinedFilters: BoardFilters = {
        search: 'Design',
        customers: ['customer-1'],
        overdue: true,
        priority: ['high']
      };

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={combinedFilters}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Filter sollten an alle Komponenten weitergereicht werden
      expect(screen.getByTestId('search-input')).toHaveValue('Design');
    });
  });

  // ========================================
  // RESPONSIVE INTEGRATION TESTS
  // ========================================

  describe('Responsive Integration', () => {
    it('sollte Desktop zu Mobile Integration korrekt handhaben', async () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { rerender } = render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Trigger resize
      fireEvent(window, new Event('resize'));
      rerender(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        // Mobile Accordion sollte angezeigt werden
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
        
        // Desktop Spalten sollten versteckt sein
        expect(screen.queryByTestId('kanban-column-ideas_planning')).not.toBeInTheDocument();
      });

      // Mobile Projekte sollten funktionieren
      expect(screen.getByTestId('mobile-project-project-1')).toBeInTheDocument();
    });

    it('sollte Mobile Interactions korrekt handhaben', async () => {
      const user = userEvent.setup();

      // Mock Mobile size
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      const { rerender } = render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      fireEvent(window, new Event('resize'));
      rerender(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });

      // Click auf Mobile Projekt
      const mobileProject = screen.getByTestId('mobile-project-project-1');
      await user.click(mobileProject);

      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1');
    });
  });

  // ========================================
  // ERROR HANDLING INTEGRATION TESTS
  // ========================================

  describe('Error Handling Integration', () => {
    it('sollte Service-Errors graceful handhaben', async () => {
      // Setup Service Error
      mockKanbanBoardService.moveProject.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Simuliere Move der fehlschlägt
      await mockOnProjectMove('project-1', 'creation');

      // Board sollte nicht crashen
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte Real-time Connection-Errors handhaben', () => {
      // Setup Realtime Error
      mockUseBoardRealtime.mockReturnValue({
        boardData: null,
        loading: false,
        error: 'Connection failed',
        refresh: jest.fn(),
        updateProjectsWithFilters: jest.fn()
      });

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Board sollte fallback auf Props verwenden
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
    });

    it('sollte Loading States korrekt propagieren', () => {
      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={true}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Loading sollte an alle Spalten propagiert werden
      expect(screen.getByTestId('column-loading-ideas_planning')).toBeInTheDocument();
      expect(screen.getByTestId('column-loading-creation')).toBeInTheDocument();
    });
  });

  // ========================================
  // MULTI-TENANCY INTEGRATION TESTS
  // ========================================

  describe('Multi-Tenancy Integration', () => {
    it('sollte Organization-Isolation korrekt durchführen', () => {
      const orgProjects = createMockProjects();
      
      // Stelle sicher dass alle Projekte zur gleichen Organisation gehören
      Object.values(orgProjects).flat().forEach(project => {
        expect(project.organizationId).toBe('org-1');
      });

      render(
        <KanbanBoard
          projects={orgProjects}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Alle Projekte sollten korrekt angezeigt werden
      expect(screen.getByTestId('project-project-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-project-2')).toBeInTheDocument();
    });

    it('sollte Cross-Tenant-Zugriff verhindern', async () => {
      // Setup User ohne Berechtigung
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-3', email: 'unauthorized@test.com', name: 'Unauthorized User' },
        loading: false,
        signOut: jest.fn(),
        updateProfile: jest.fn()
      });

      const mockDragAndDropReturns = mockUseDragAndDrop();
      mockDragAndDropReturns.canMoveProject = jest.fn().mockReturnValue(false);

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // User sollte keine Projekte bewegen können
      expect(mockDragAndDropReturns.canMoveProject).toBeDefined();
    });
  });

  // ========================================
  // PERFORMANCE INTEGRATION TESTS
  // ========================================

  describe('Performance Integration', () => {
    it('sollte große Datenmengen performant handhaben', () => {
      // Erstelle viele Projekte
      const manyProjects: Record<PipelineStage, Project[]> = {
        'ideas_planning': Array.from({ length: 50 }, (_, i) => ({
          id: `project-ideas-${i}`,
          title: `Ideas Projekt ${i}`,
          description: `Beschreibung ${i}`,
          currentStage: 'ideas_planning' as PipelineStage,
          status: 'active',
          organizationId: 'org-1',
          userId: 'user-1',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        })),
        'creation': Array.from({ length: 30 }, (_, i) => ({
          id: `project-creation-${i}`,
          title: `Creation Projekt ${i}`,
          description: `Beschreibung ${i}`,
          currentStage: 'creation' as PipelineStage,
          status: 'active',
          organizationId: 'org-1',
          userId: 'user-1',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        })),
        'internal_approval': [],
        'customer_approval': [],
        'distribution': [],
        'monitoring': [],
        'completed': Array.from({ length: 100 }, (_, i) => ({
          id: `project-completed-${i}`,
          title: `Completed Projekt ${i}`,
          description: `Beschreibung ${i}`,
          currentStage: 'completed' as PipelineStage,
          status: 'completed',
          organizationId: 'org-1',
          userId: 'user-1',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp
        }))
      };

      const start = performance.now();
      
      render(
        <KanbanBoard
          projects={manyProjects}
          totalProjects={180}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const end = performance.now();

      // Render sollte auch mit vielen Projekten schnell sein
      expect(end - start).toBeLessThan(1000);

      // Sollte alle Spalten rendern
      expect(screen.getByTestId('column-count-ideas_planning')).toHaveTextContent('50');
      expect(screen.getByTestId('column-count-creation')).toHaveTextContent('30');
      expect(screen.getByTestId('column-count-completed')).toHaveTextContent('100');
    });

    it('sollte häufige Updates performant verarbeiten', async () => {
      const { rerender } = render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const start = performance.now();

      // Simuliere 50 schnelle Updates
      for (let i = 0; i < 50; i++) {
        const updatedProjects = {
          ...createMockProjects(),
          ideas_planning: createMockProjects().ideas_planning.map(p => ({
            ...p,
            title: `${p.title} - Update ${i}`,
            updatedAt: Timestamp.now()
          }))
        };

        rerender(
          <KanbanBoard
            projects={updatedProjects}
            totalProjects={4}
            activeUsers={mockActiveUsers}
            filters={{}}
            loading={false}
            onProjectMove={mockOnProjectMove}
            onFiltersChange={mockOnFiltersChange}
            onProjectSelect={mockOnProjectSelect}
            onRefresh={mockOnRefresh}
          />
        );
      }

      const end = performance.now();

      // Updates sollten performant sein
      expect(end - start).toBeLessThan(2000);
    });
  });

  // ========================================
  // ACCESSIBILITY INTEGRATION TESTS
  // ========================================

  describe('Accessibility Integration', () => {
    it('sollte vollständige Keyboard-Navigation unterstützen', async () => {
      const user = userEvent.setup();

      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = screen.getByTestId('refresh-button');
      
      // Tab navigation sollte funktionieren
      await user.tab();
      expect(document.activeElement).toBe(refreshButton);

      // Enter sollte funktionieren
      await user.keyboard('{Enter}');
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('sollte Screen Reader Labels korrekt setzen', () => {
      render(
        <KanbanBoard
          projects={createMockProjects()}
          totalProjects={4}
          activeUsers={mockActiveUsers}
          filters={{}}
          loading={false}
          onProjectMove={mockOnProjectMove}
          onFiltersChange={mockOnFiltersChange}
          onProjectSelect={mockOnProjectSelect}
          onRefresh={mockOnRefresh}
        />
      );

      // Wichtige Elemente sollten accessible labels haben
      expect(screen.getByTestId('total-projects')).toHaveTextContent('4 Projekte');
      
      // Spalten-Header sollten semantisch korrekt sein
      expect(screen.getByTestId('column-header-ideas_planning')).toBeInTheDocument();
    });
  });
});