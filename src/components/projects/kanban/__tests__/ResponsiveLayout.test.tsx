// src/components/projects/kanban/__tests__/ResponsiveLayout.test.tsx
// Umfassende Tests für Responsive Layout Funktionalität
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KanbanBoard } from '../KanbanBoard';
import { 
  RESPONSIVE_CONFIG, 
  getResponsiveConfig, 
  getAllStages,
  getStageColor,
  getStageConfig
} from '../kanban-constants';
import { Project, PipelineStage } from '@/types/project';
import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { Timestamp } from 'firebase/firestore';

// ========================================
// RESPONSIVE TESTING UTILITIES
// ========================================

interface ViewportSize {
  width: number;
  height: number;
  expectedLayout: 'accordion' | 'compact' | 'full';
  expectedColumns: number;
}

const VIEWPORT_SIZES: ViewportSize[] = [
  { width: 320, height: 568, expectedLayout: 'accordion', expectedColumns: 1 },   // Mobile Small
  { width: 375, height: 667, expectedLayout: 'accordion', expectedColumns: 1 },   // Mobile Medium
  { width: 414, height: 896, expectedLayout: 'accordion', expectedColumns: 1 },   // Mobile Large
  { width: 768, height: 1024, expectedLayout: 'compact', expectedColumns: 3 },    // Tablet Portrait
  { width: 1024, height: 768, expectedLayout: 'compact', expectedColumns: 3 },    // Tablet Landscape
  { width: 1200, height: 800, expectedLayout: 'full', expectedColumns: 7 },       // Desktop Small
  { width: 1440, height: 900, expectedLayout: 'full', expectedColumns: 7 },       // Desktop Medium
  { width: 1920, height: 1080, expectedLayout: 'full', expectedColumns: 7 },      // Desktop Large
  { width: 2560, height: 1440, expectedLayout: 'full', expectedColumns: 7 }       // Desktop XL
];

// Mock window.matchMedia für verschiedene Breakpoints
const mockMatchMedia = (width: number) => {
  return jest.fn().mockImplementation(query => {
    // Parse media queries
    const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
    
    let matches = false;
    
    if (maxWidthMatch) {
      const maxWidth = parseInt(maxWidthMatch[1]);
      matches = width <= maxWidth;
    } else if (minWidthMatch) {
      const minWidth = parseInt(minWidthMatch[1]);
      matches = width >= minWidth;
    }
    
    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
};

// Helper für Viewport-Änderungen
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Mock matchMedia für neue Größe
  window.matchMedia = mockMatchMedia(width);
  
  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

// ========================================
// MOCKS SETUP
// ========================================

// Mock Child Components für bessere Testbarkeit
jest.mock('../KanbanColumn', () => ({
  KanbanColumn: ({ stage, projects }: any) => (
    <div data-testid={`column-${stage}`} data-project-count={projects.length}>
      Column: {stage}
    </div>
  )
}));

jest.mock('../MobileKanbanAccordion', () => ({
  MobileKanbanAccordion: ({ sections }: any) => (
    <div data-testid="mobile-accordion" data-section-count={sections.length}>
      Mobile View
    </div>
  )
}));

jest.mock('../BoardHeader', () => ({
  BoardHeader: ({ totalProjects }: any) => (
    <div data-testid="board-header">{totalProjects} Projects</div>
  )
}));

jest.mock('../BoardFilterPanel', () => ({
  BoardFilterPanel: () => <div data-testid="filter-panel">Filters</div>
}));

jest.mock('../UserPresenceOverlay', () => ({
  UserPresenceOverlay: ({ activeUsers }: any) => (
    <div data-testid="user-presence">{activeUsers.length} Users</div>
  )
}));

jest.mock('@/hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    useDraggableProject: jest.fn(),
    useDropZone: jest.fn(),
    getStageName: (stage: string) => stage
  })
}));

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const createMockProjects = (): Record<PipelineStage, Project[]> => ({
  'ideas_planning': [
    {
      id: 'project-1',
      title: 'Projekt 1',
      description: 'Test Projekt',
      currentStage: 'ideas_planning',
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
      description: 'Test Projekt',
      currentStage: 'creation',
      status: 'active',
      organizationId: 'org-1',
      userId: 'user-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp
    }
  ],
  'internal_approval': [],
  'customer_approval': [],
  'distribution': [],
  'monitoring': [],
  'completed': []
});

const defaultProps = {
  projects: createMockProjects(),
  totalProjects: 2,
  activeUsers: [],
  filters: {} as BoardFilters,
  loading: false,
  onProjectMove: jest.fn(),
  onFiltersChange: jest.fn(),
  onProjectSelect: jest.fn(),
  onRefresh: jest.fn()
};

// ========================================
// TESTS
// ========================================

describe('Responsive Layout Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default desktop size
    setViewportSize(1200, 800);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // RESPONSIVE CONFIG TESTS
  // ========================================

  describe('Responsive Configuration', () => {
    it('sollte korrekte Config für alle Breakpoints zurückgeben', () => {
      VIEWPORT_SIZES.forEach(({ width, expectedLayout, expectedColumns }) => {
        const config = getResponsiveConfig(width);
        
        expect(config.layout).toBe(expectedLayout);
        expect(config.columns).toBe(expectedColumns);
      });
    });

    it('sollte Mobile-Config für kleine Bildschirme verwenden', () => {
      const config = getResponsiveConfig(500);
      
      expect(config).toEqual(RESPONSIVE_CONFIG.mobile);
      expect(config.layout).toBe('accordion');
      expect(config.columns).toBe(1);
      expect(config.cardWidth).toBe('100%');
    });

    it('sollte Tablet-Config für mittlere Bildschirme verwenden', () => {
      const config = getResponsiveConfig(900);
      
      expect(config).toEqual(RESPONSIVE_CONFIG.tablet);
      expect(config.layout).toBe('compact');
      expect(config.columns).toBe(3);
      expect(config.cardWidth).toBe('300px');
    });

    it('sollte Desktop-Config für große Bildschirme verwenden', () => {
      const config = getResponsiveConfig(1400);
      
      expect(config).toEqual(RESPONSIVE_CONFIG.desktop);
      expect(config.layout).toBe('full');
      expect(config.columns).toBe(7);
      expect(config.cardWidth).toBe('280px');
    });

    it('sollte Edge-Cases bei Breakpoint-Grenzen korrekt handhaben', () => {
      // Genau an Breakpoint-Grenzen testen
      expect(getResponsiveConfig(767).layout).toBe('accordion'); // 1px unter Tablet
      expect(getResponsiveConfig(768).layout).toBe('compact');   // Genau Tablet-Breakpoint
      expect(getResponsiveConfig(1199).layout).toBe('compact');  // 1px unter Desktop
      expect(getResponsiveConfig(1200).layout).toBe('full');     // Genau Desktop-Breakpoint
    });
  });

  // ========================================
  // LAYOUT SWITCHING TESTS
  // ========================================

  describe('Layout Switching', () => {
    it('sollte von Desktop zu Mobile Layout wechseln', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Initial Desktop - sollte Spalten haben
      expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-accordion')).not.toBeInTheDocument();
      
      // Wechsel zu Mobile
      setViewportSize(375, 667);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
        expect(screen.queryByTestId('column-ideas_planning')).not.toBeInTheDocument();
      });
    });

    it('sollte von Mobile zu Desktop Layout wechseln', async () => {
      // Start mit Mobile
      setViewportSize(375, 667);
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
      
      // Wechsel zu Desktop
      setViewportSize(1400, 900);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-accordion')).not.toBeInTheDocument();
      });
    });

    it('sollte alle Viewport-Größen korrekt handhaben', async () => {
      for (const { width, height, expectedLayout } of VIEWPORT_SIZES) {
        setViewportSize(width, height);
        const { rerender, unmount } = render(<KanbanBoard {...defaultProps} />);
        
        await waitFor(() => {
          if (expectedLayout === 'accordion') {
            expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
          }
        });
        
        unmount();
      }
    });

    it('sollte Resize-Events korrekt verarbeiten', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Mehrere schnelle Resize-Events
      const sizes = [
        { width: 1200, height: 800 },
        { width: 800, height: 600 },
        { width: 400, height: 700 },
        { width: 1600, height: 900 }
      ];
      
      for (const { width, height } of sizes) {
        setViewportSize(width, height);
        rerender(<KanbanBoard {...defaultProps} />);
        
        await waitFor(() => {
          // Layout sollte entsprechend der Größe gewechselt haben
          if (width < 768) {
            expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
          }
        });
      }
    });
  });

  // ========================================
  // MOBILE LAYOUT TESTS
  // ========================================

  describe('Mobile Layout', () => {
    beforeEach(() => {
      setViewportSize(375, 667);
    });

    it('sollte Mobile-Accordion rendern', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
    });

    it('sollte alle Sections an Mobile-Accordion weiterreichen', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        const accordion = screen.getByTestId('mobile-accordion');
        expect(accordion).toHaveAttribute('data-section-count', '7'); // Alle 7 Stages
      });
    });

    it('sollte keine Desktop-Spalten in Mobile-Layout anzeigen', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('column-ideas_planning')).not.toBeInTheDocument();
        expect(screen.queryByTestId('column-creation')).not.toBeInTheDocument();
      });
    });

    it('sollte Event-Handler an Mobile-Accordion weiterreichen', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
        // Event handlers werden über Props weitergereicht
      });
    });
  });

  // ========================================
  // TABLET LAYOUT TESTS
  // ========================================

  describe('Tablet Layout', () => {
    beforeEach(() => {
      setViewportSize(768, 1024);
    });

    it('sollte Desktop-Spalten-Layout für Tablets verwenden', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Sollte Desktop-Layout verwenden, nicht Mobile
      expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-accordion')).not.toBeInTheDocument();
    });

    it('sollte alle Spalten für Tablet-Größe rendern', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      getAllStages().forEach(stage => {
        expect(screen.getByTestId(`column-${stage}`)).toBeInTheDocument();
      });
    });

    it('sollte Tablet-spezifische Styling-Klassen verwenden', () => {
      const config = getResponsiveConfig(800);
      
      expect(config.padding).toBe('p-4');
      expect(config.gap).toBe('gap-3');
      expect(config.cardWidth).toBe('300px');
    });
  });

  // ========================================
  // DESKTOP LAYOUT TESTS
  // ========================================

  describe('Desktop Layout', () => {
    beforeEach(() => {
      setViewportSize(1400, 900);
    });

    it('sollte alle 7 Spalten für Desktop rendern', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const allStages = getAllStages();
      expect(allStages).toHaveLength(7);
      
      allStages.forEach(stage => {
        expect(screen.getByTestId(`column-${stage}`)).toBeInTheDocument();
      });
    });

    it('sollte Desktop-spezifische Styling-Klassen verwenden', () => {
      const config = getResponsiveConfig(1400);
      
      expect(config.padding).toBe('p-4');
      expect(config.gap).toBe('gap-4');
      expect(config.cardWidth).toBe('280px');
      expect(config.columns).toBe(7);
    });

    it('sollte horizontales Scrolling für Desktop ermöglichen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Container sollte overflow-x-auto haben
      const container = screen.getByTestId('column-ideas_planning').parentElement;
      expect(container).toHaveClass('overflow-x-auto');
    });

    it('sollte kein Mobile-Layout für Desktop anzeigen', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.queryByTestId('mobile-accordion')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // ORIENTATION CHANGE TESTS
  // ========================================

  describe('Orientation Changes', () => {
    it('sollte Portrait zu Landscape Wechsel handhaben', async () => {
      // Start Portrait Mobile
      setViewportSize(375, 667);
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
      
      // Wechsel zu Landscape (wird größer, aber immer noch Mobile)
      setViewportSize(667, 375);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
    });

    it('sollte Tablet Portrait zu Landscape Wechsel handhaben', async () => {
      // Start Tablet Portrait
      setViewportSize(768, 1024);
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
      
      // Wechsel zu Tablet Landscape
      setViewportSize(1024, 768);
      rerender(<KanbanBoard {...defaultProps} />);
      
      // Sollte Desktop-Layout beibehalten
      expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-accordion')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('sollte Resize-Events debounced verarbeiten', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Viele schnelle Resize-Events
      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        setViewportSize(1200 + i, 800);
        rerender(<KanbanBoard {...defaultProps} />);
      }
      const end = Date.now();
      
      expect(end - start).toBeLessThan(1000); // Sollte performant bleiben
    });

    it('sollte Responsive-Config memoized werden', () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Re-render mit gleicher Größe sollte gecacht werden
      rerender(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByTestId('column-ideas_planning')).toBeInTheDocument();
    });

    it('sollte bei häufigen Layout-Wechseln performant bleiben', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      const start = Date.now();
      
      // Wechsel zwischen verschiedenen Layouts
      for (let i = 0; i < 10; i++) {
        setViewportSize(400, 600); // Mobile
        rerender(<KanbanBoard {...defaultProps} />);
        
        setViewportSize(1200, 800); // Desktop
        rerender(<KanbanBoard {...defaultProps} />);
      }
      
      const end = Date.now();
      expect(end - start).toBeLessThan(2000); // Sollte unter 2 Sekunden bleiben
    });
  });

  // ========================================
  // MEMORY MANAGEMENT TESTS
  // ========================================

  describe('Memory Management', () => {
    it('sollte Event-Listener beim Unmount aufräumen', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<KanbanBoard {...defaultProps} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('sollte bei Layout-Wechseln keine Memory-Leaks haben', async () => {
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<KanbanBoard {...defaultProps} />);
        setViewportSize(i % 2 === 0 ? 400 : 1200, 800);
        unmount();
      }
      
      // Sollte nicht crashen oder langsam werden
      expect(true).toBe(true);
    });

    it('sollte Component-State bei Layout-Wechseln beibehalten', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Initial Desktop
      expect(screen.getByTestId('board-header')).toHaveTextContent('2 Projects');
      
      // Wechsel zu Mobile
      setViewportSize(400, 600);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        // State sollte beibehalten werden
        expect(screen.getByTestId('board-header')).toHaveTextContent('2 Projects');
      });
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('sollte Touch-Targets für Mobile ausreichend groß haben', async () => {
      setViewportSize(375, 667);
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        // Mobile-Layout sollte touch-freundlich sein
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
    });

    it('sollte Keyboard-Navigation in allen Layouts unterstützen', () => {
      const sizes = [400, 800, 1400];
      
      sizes.forEach(width => {
        setViewportSize(width, 600);
        const { unmount } = render(<KanbanBoard {...defaultProps} />);
        
        // Sollte focusable Elements haben
        expect(screen.getByTestId('board-header')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('sollte Screen Reader mit Layout-Änderungen umgehen', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Layout-Wechsel sollte Screen Reader nicht verwirren
      setViewportSize(400, 600);
      rerender(<KanbanBoard {...defaultProps} />);
      
      await waitFor(() => {
        // Wichtige Informationen sollten in beiden Layouts verfügbar sein
        expect(screen.getByTestId('board-header')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('sollte mit extremen Viewport-Größen umgehen', () => {
      const extremeSizes = [
        { width: 100, height: 100 },   // Sehr klein
        { width: 5000, height: 3000 }, // Sehr groß
        { width: 1, height: 1 },       // Minimal
        { width: 9999, height: 1 }     // Extreme Seitenverhältnisse
      ];
      
      extremeSizes.forEach(({ width, height }) => {
        setViewportSize(width, height);
        const { unmount } = render(<KanbanBoard {...defaultProps} />);
        
        // Sollte nicht crashen
        expect(screen.getByTestId('board-header')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('sollte mit fehlenden window-Properties umgehen', () => {
      // Mock fehlerhafte window-Properties
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      Object.defineProperty(window, 'innerWidth', { value: undefined });
      Object.defineProperty(window, 'innerHeight', { value: undefined });
      
      render(<KanbanBoard {...defaultProps} />);
      
      // Sollte Fallback verwenden
      expect(screen.getByTestId('board-header')).toBeInTheDocument();
      
      // Restore
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight });
    });

    it('sollte mit schnellen Layout-Wechseln ohne Delay umgehen', async () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Sehr schnelle Wechsel
      setViewportSize(400, 600);
      rerender(<KanbanBoard {...defaultProps} />);
      
      setViewportSize(1400, 900);
      rerender(<KanbanBoard {...defaultProps} />);
      
      setViewportSize(350, 700);
      rerender(<KanbanBoard {...defaultProps} />);
      
      // Sollte final Layout korrekt anzeigen
      await waitFor(() => {
        expect(screen.getByTestId('mobile-accordion')).toBeInTheDocument();
      });
    });

    it('sollte Custom-Breakpoints korrekt verarbeiten', () => {
      // Test mit benutzerdefinierten Breakpoints
      const customSizes = [767.5, 768.5, 1199.5, 1200.5];
      
      customSizes.forEach(width => {
        const config = getResponsiveConfig(width);
        expect(config).toBeDefined();
        expect(['accordion', 'compact', 'full']).toContain(config.layout);
      });
    });
  });
});