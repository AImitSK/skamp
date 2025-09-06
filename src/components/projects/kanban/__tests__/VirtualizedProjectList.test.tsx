// src/components/projects/kanban/__tests__/VirtualizedProjectList.test.tsx
// Performance Tests für VirtualizedProjectList Komponente
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedProjectList } from '../VirtualizedProjectList';
import { Project } from '@/types/project';
import { Timestamp } from 'firebase/firestore';
import { PERFORMANCE_CONFIG } from '../kanban-constants';

// ========================================
// MOCKS SETUP
// ========================================

// Mock ProjectCard
jest.mock('../ProjectCard', () => ({
  ProjectCard: ({ project, onSelect }: any) => (
    <div 
      data-testid={`project-card-${project.id}`}
      onClick={() => onSelect?.(project.id)}
    >
      <h3>{project.title}</h3>
      <p>{project.description}</p>
    </div>
  )
}));

// Mock Intersection Observer für Virtual Scrolling
class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  
  triggerIntersection(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this);
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock für requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16); // 60 FPS simulation
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// ========================================
// TEST DATA GENERATORS
// ========================================

const mockTimestamp = Timestamp.now();

const createMockProject = (id: string, overrides?: Partial<Project>): Project => ({
  id,
  title: `Projekt ${id}`,
  description: `Beschreibung für Projekt ${id}`,
  currentStage: 'creation',
  status: 'active',
  organizationId: 'org-1',
  userId: 'user-1',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  ...overrides
});

const createManyProjects = (count: number): Project[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockProject(`project-${i}`, {
      title: `Projekt ${i}`,
      description: `Beschreibung ${i}`,
      priority: i % 4 === 0 ? 'urgent' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low'
    } as any)
  );
};

// ========================================
// TESTS
// ========================================

describe('VirtualizedProjectList Performance Tests', () => {
  const mockOnSelect = jest.fn();
  const mockUseDraggableProject = jest.fn().mockReturnValue({ 
    isDragging: false, 
    drag: jest.fn() 
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // BASIC VIRTUALIZATION TESTS
  // ========================================

  describe('Basic Virtualization', () => {
    it('sollte kleine Listen ohne Virtualisierung rendern', () => {
      const smallProjects = createManyProjects(10);
      
      render(
        <VirtualizedProjectList
          projects={smallProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Alle 10 Projekte sollten direkt gerendert werden
      smallProjects.forEach(project => {
        expect(screen.getByTestId(`project-card-${project.id}`)).toBeInTheDocument();
      });
    });

    it('sollte große Listen virtualisieren', () => {
      const manyProjects = createManyProjects(50); // Über Threshold von 20
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Sollte virtualized Container haben
      const virtualContainer = screen.getByTestId('virtualized-container');
      expect(virtualContainer).toBeInTheDocument();
      expect(virtualContainer).toHaveStyle('height: 400px');
    });

    it('sollte Threshold-basierte Virtualisierung verwenden', () => {
      const thresholdProjects = createManyProjects(PERFORMANCE_CONFIG.virtualScrolling.threshold);
      
      render(
        <VirtualizedProjectList
          projects={thresholdProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Bei genau Threshold sollte direkt gerendert werden
      thresholdProjects.forEach(project => {
        expect(screen.getByTestId(`project-card-${project.id}`)).toBeInTheDocument();
      });
    });

    it('sollte über Threshold virtualisieren', () => {
      const overThresholdProjects = createManyProjects(PERFORMANCE_CONFIG.virtualScrolling.threshold + 1);
      
      render(
        <VirtualizedProjectList
          projects={overThresholdProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Sollte virtualized Container verwenden
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
    });
  });

  // ========================================
  // SCROLL PERFORMANCE TESTS
  // ========================================

  describe('Scroll Performance', () => {
    it('sollte nur sichtbare Items rendern', () => {
      const manyProjects = createManyProjects(100);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400} // Ca. 3-4 Items sichtbar bei 120px Höhe pro Item
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const container = screen.getByTestId('virtualized-container');
      
      // Nur ca. 3-4 + overscan Items sollten gerendert werden
      const renderedItems = container.querySelectorAll('[data-testid^="project-card-"]');
      expect(renderedItems.length).toBeLessThan(15); // Mit Overscan
      expect(renderedItems.length).toBeGreaterThan(0);
    });

    it('sollte Overscan-Items für smoothes Scrolling verwenden', () => {
      const manyProjects = createManyProjects(50);
      const expectedOverscan = PERFORMANCE_CONFIG.virtualScrolling.overscan;
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={360} // 3 Items * 120px
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const container = screen.getByTestId('virtualized-container');
      const renderedItems = container.querySelectorAll('[data-testid^="project-card-"]');
      
      // Sollte sichtbare Items + Overscan haben
      // 3 sichtbare + 5 overscan = mindestens 8, aber weniger als alle 50
      expect(renderedItems.length).toBeGreaterThan(3);
      expect(renderedItems.length).toBeLessThan(50);
    });

    it('sollte Scroll-Events performant verarbeiten', async () => {
      const manyProjects = createManyProjects(100);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const container = screen.getByTestId('virtualized-container');
      
      const start = performance.now();
      
      // Simulate scroll events
      for (let i = 0; i < 50; i++) {
        fireEvent.scroll(container, { target: { scrollTop: i * 10 } });
      }
      
      const end = performance.now();
      
      // Scroll-Verarbeitung sollte schnell sein
      expect(end - start).toBeLessThan(100); // Weniger als 100ms für 50 scroll events
    });

    it('sollte dynamische Item-Höhen unterstützen', () => {
      const projectsWithVaryingContent = createManyProjects(30).map((p, i) => ({
        ...p,
        description: i % 3 === 0 ? 'Kurz' : i % 3 === 1 ? 
          'Mittlere Beschreibung mit mehr Text' : 
          'Sehr sehr lange Beschreibung mit viel Text der über mehrere Zeilen geht und die Item-Höhe beeinflusst'
      }));
      
      render(
        <VirtualizedProjectList
          projects={projectsWithVaryingContent}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Sollte mit unterschiedlichen Höhen umgehen
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
    });
  });

  // ========================================
  // MEMORY EFFICIENCY TESTS
  // ========================================

  describe('Memory Efficiency', () => {
    it('sollte große Listen ohne Memory-Issues handhaben', () => {
      const veryLargeList = createManyProjects(1000);
      
      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(
        <VirtualizedProjectList
          projects={veryLargeList}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render-Zeit sollte reasonable sein
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Memory-Zunahme sollte begrenzt sein (wenn verfügbar)
      if (startMemory > 0) {
        const memoryIncrease = endMemory - startMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Weniger als 50MB
      }
    });

    it('sollte Items korrekt recyceln beim Scrolling', async () => {
      const manyProjects = createManyProjects(100);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const container = screen.getByTestId('virtualized-container');
      const initialItemCount = container.querySelectorAll('[data-testid^="project-card-"]').length;
      
      // Scroll nach unten
      fireEvent.scroll(container, { target: { scrollTop: 1000 } });
      
      await waitFor(() => {
        const afterScrollItemCount = container.querySelectorAll('[data-testid^="project-card-"]').length;
        
        // Item-Count sollte stabil bleiben (Recycling)
        expect(Math.abs(afterScrollItemCount - initialItemCount)).toBeLessThan(5);
      });
    });

    it('sollte Component-Unmounting sauber handhaben', () => {
      const manyProjects = createManyProjects(100);
      
      const { unmount } = render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Sollte nicht crashen beim Unmounting
      expect(() => unmount()).not.toThrow();
    });
  });

  // ========================================
  // UPDATE PERFORMANCE TESTS
  // ========================================

  describe('Update Performance', () => {
    it('sollte Project-Updates effizient verarbeiten', () => {
      const initialProjects = createManyProjects(50);
      
      const { rerender } = render(
        <VirtualizedProjectList
          projects={initialProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Update ein Projekt
      const updatedProjects = initialProjects.map(p => 
        p.id === 'project-5' ? { ...p, title: 'Updated Title' } : p
      );
      
      const start = performance.now();
      rerender(
        <VirtualizedProjectList
          projects={updatedProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      // Update sollte schnell sein
      expect(end - start).toBeLessThan(50);
    });

    it('sollte Project-Hinzufügungen effizient handhaben', () => {
      const initialProjects = createManyProjects(30);
      
      const { rerender } = render(
        <VirtualizedProjectList
          projects={initialProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Füge 20 neue Projekte hinzu
      const moreProjects = [...initialProjects, ...createManyProjects(20)];
      
      const start = performance.now();
      rerender(
        <VirtualizedProjectList
          projects={moreProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      // Addition sollte performant sein
      expect(end - start).toBeLessThan(100);
    });

    it('sollte Project-Entfernungen effizient handhaben', () => {
      const initialProjects = createManyProjects(50);
      
      const { rerender } = render(
        <VirtualizedProjectList
          projects={initialProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Entferne jedes zweite Projekt
      const filteredProjects = initialProjects.filter((_, i) => i % 2 === 0);
      
      const start = performance.now();
      rerender(
        <VirtualizedProjectList
          projects={filteredProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      // Removal sollte performant sein
      expect(end - start).toBeLessThan(100);
    });
  });

  // ========================================
  // INTERACTION PERFORMANCE TESTS
  // ========================================

  describe('Interaction Performance', () => {
    it('sollte Clicks performant verarbeiten', async () => {
      const manyProjects = createManyProjects(100);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Click auf erstes sichtbares Item
      const firstItem = screen.getByTestId('project-card-project-0');
      
      const start = performance.now();
      fireEvent.click(firstItem);
      const end = performance.now();
      
      // Click-Verarbeitung sollte instant sein
      expect(end - start).toBeLessThan(10);
      expect(mockOnSelect).toHaveBeenCalledWith('project-0');
    });

    it('sollte Drag-Start performant handhaben', () => {
      const manyProjects = createManyProjects(50);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Drag sollte für alle Items initialisiert werden
      expect(mockUseDraggableProject).toHaveBeenCalled();
    });

    it('sollte Hover-Events performant verarbeiten', () => {
      const manyProjects = createManyProjects(30);
      
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const firstItem = screen.getByTestId('project-card-project-0');
      
      const start = performance.now();
      fireEvent.mouseEnter(firstItem);
      fireEvent.mouseLeave(firstItem);
      const end = performance.now();
      
      // Hover sollte schnell sein
      expect(end - start).toBeLessThan(10);
    });
  });

  // ========================================
  // LOADING STATE PERFORMANCE TESTS
  // ========================================

  describe('Loading State Performance', () => {
    it('sollte Loading-State ohne Performance-Impact anzeigen', () => {
      const manyProjects = createManyProjects(100);
      
      const start = performance.now();
      render(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={true}
        />
      );
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('sollte Loading zu Loaded Transition performant handhaben', () => {
      const manyProjects = createManyProjects(50);
      
      const { rerender } = render(
        <VirtualizedProjectList
          projects={[]}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={true}
        />
      );
      
      const start = performance.now();
      rerender(
        <VirtualizedProjectList
          projects={manyProjects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      expect(end - start).toBeLessThan(200);
    });
  });

  // ========================================
  // EDGE CASE PERFORMANCE TESTS
  // ========================================

  describe('Edge Case Performance', () => {
    it('sollte leere Listen performant handhaben', () => {
      const start = performance.now();
      render(
        <VirtualizedProjectList
          projects={[]}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50);
      expect(screen.getByText('Keine Projekte')).toBeInTheDocument();
    });

    it('sollte extreme Höhen performant handhaben', () => {
      const manyProjects = createManyProjects(100);
      
      const extremeHeights = [10, 50000, 1, 99999];
      
      extremeHeights.forEach(height => {
        const start = performance.now();
        const { unmount } = render(
          <VirtualizedProjectList
            projects={manyProjects}
            height={height}
            onProjectSelect={mockOnSelect}
            useDraggableProject={mockUseDraggableProject}
            loading={false}
          />
        );
        const end = performance.now();
        
        expect(end - start).toBeLessThan(200);
        unmount();
      });
    });

    it('sollte null/undefined Projects graceful handhaben', () => {
      const start = performance.now();
      render(
        <VirtualizedProjectList
          projects={null as any}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50);
    });
  });

  // ========================================
  // STRESS TESTS
  // ========================================

  describe('Stress Tests', () => {
    it('sollte 10k+ Items handhaben', () => {
      const massiveList = createManyProjects(10000);
      
      const start = performance.now();
      const { unmount } = render(
        <VirtualizedProjectList
          projects={massiveList}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      const end = performance.now();
      
      // Sollte auch mit 10k Items performant sein
      expect(end - start).toBeLessThan(1000);
      
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
      
      unmount();
    });

    it('sollte schnelle List-Updates handhaben', () => {
      let projects = createManyProjects(100);
      
      const { rerender } = render(
        <VirtualizedProjectList
          projects={projects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      const start = performance.now();
      
      // 50 schnelle Updates
      for (let i = 0; i < 50; i++) {
        projects = projects.map(p => ({ ...p, updatedAt: Timestamp.now() }));
        rerender(
          <VirtualizedProjectList
            projects={projects}
            height={400}
            onProjectSelect={mockOnSelect}
            useDraggableProject={mockUseDraggableProject}
            loading={false}
          />
        );
      }
      
      const end = performance.now();
      
      // Sollte auch bei vielen Updates performant bleiben
      expect(end - start).toBeLessThan(2000);
    });

    it('sollte Memory bei langen Sessions stabil halten', () => {
      const projects = createManyProjects(500);
      
      // Simuliere lange Session mit vielen Operationen
      const { rerender, unmount } = render(
        <VirtualizedProjectList
          projects={projects}
          height={400}
          onProjectSelect={mockOnSelect}
          useDraggableProject={mockUseDraggableProject}
          loading={false}
        />
      );
      
      // Viele Re-renders und Scroll-Events
      for (let i = 0; i < 100; i++) {
        rerender(
          <VirtualizedProjectList
            projects={projects}
            height={400 + (i % 10)}
            onProjectSelect={mockOnSelect}
            useDraggableProject={mockUseDraggableProject}
            loading={i % 2 === 0}
          />
        );
      }
      
      // Sollte nicht crashen oder langsam werden
      expect(screen.getByTestId('virtualized-container')).toBeInTheDocument();
      
      unmount();
    });
  });
});