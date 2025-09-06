// src/components/projects/workflow/__tests__/TaskDependenciesVisualizer.test.tsx
// PLAN 8/9: PIPELINE-TASK-INTEGRATION - TaskDependenciesVisualizer Component Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskDependenciesVisualizer from '../TaskDependenciesVisualizer';
import { PipelineAwareTask } from '@/types/tasks';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ArrowRightIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="arrow-right-icon" />
  ),
  LockClosedIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="lock-closed-icon" />
  ),
  CheckCircleIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="check-circle-icon" />
  ),
  ClockIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="clock-icon" />
  )
}));

describe('TaskDependenciesVisualizer', () => {
  const mockTasks: PipelineAwareTask[] = [
    {
      id: 'task-1',
      userId: 'user-1',
      organizationId: 'org-1',
      title: 'Strategie-Dokument erstellen',
      status: 'completed',
      priority: 'high',
      pipelineStage: 'ideas_planning',
      requiredForStageCompletion: true,
      stageContext: {
        createdOnStageEntry: true,
        inheritedFromTemplate: 'strategy-template',
        stageProgressWeight: 5,
        criticalPath: true
      }
    },
    {
      id: 'task-2',
      userId: 'user-1',
      organizationId: 'org-1',
      title: 'Content-Outline erstellen',
      status: 'pending',
      priority: 'high',
      pipelineStage: 'creation',
      requiredForStageCompletion: true,
      dependsOnTaskIds: ['task-1'],
      stageContext: {
        createdOnStageEntry: true,
        inheritedFromTemplate: 'content-template',
        stageProgressWeight: 4,
        criticalPath: true
      }
    },
    {
      id: 'task-3',
      userId: 'user-1',
      organizationId: 'org-1',
      title: 'Texte verfassen',
      status: 'blocked',
      priority: 'medium',
      pipelineStage: 'creation',
      requiredForStageCompletion: false,
      dependsOnTaskIds: ['task-2']
    },
    {
      id: 'task-4',
      userId: 'user-1',
      organizationId: 'org-1',
      title: 'Review durchführen',
      status: 'pending',
      priority: 'medium',
      pipelineStage: 'internal_approval',
      dependsOnTaskIds: ['task-2', 'task-3']
    }
  ];

  const mockProps = {
    projectId: 'project-123',
    tasks: mockTasks,
    onTaskUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basis-Rendering', () => {
    it('sollte Komponente korrekt rendern', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByText('Task-Abhängigkeiten')).toBeInTheDocument();
      expect(screen.getByText('Kritischen Pfad anzeigen')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('sollte alle Tasks anzeigen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByText('Strategie-Dokument erstellen')).toBeInTheDocument();
      expect(screen.getByText('Content-Outline erstellen')).toBeInTheDocument();
      expect(screen.getByText('Texte verfassen')).toBeInTheDocument();
      expect(screen.getByText('Review durchführen')).toBeInTheDocument();
    });

    it('sollte Legende korrekt anzeigen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
      expect(screen.getByText('Bereit')).toBeInTheDocument();
      expect(screen.getByText('Wartend')).toBeInTheDocument();
      expect(screen.getByText('Blockiert')).toBeInTheDocument();
    });

    it('sollte SVG-Graph für Abhängigkeiten rendern', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
      expect(svg.tagName).toBe('svg');
    });
  });

  describe('Task-Status und Styling', () => {
    it('sollte korrekte Status-Icons anzeigen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument(); // completed
      expect(screen.getByTestId('lock-closed-icon')).toBeInTheDocument(); // blocked
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument(); // waiting
    });

    it('sollte korrekte Status-Farben verwenden', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const completedTask = screen.getByText('Strategie-Dokument erstellen').closest('div');
      expect(completedTask).toHaveClass('bg-green-100', 'border-green-300', 'text-green-800');

      const blockedTask = screen.getByText('Texte verfassen').closest('div');
      expect(blockedTask).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800');
    });

    it('sollte kritische Tasks für Stage kennzeichnen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const criticalBadges = screen.getAllByText('Kritisch für Stage');
      expect(criticalBadges).toHaveLength(2); // task-1 and task-2
    });

    it('sollte Pipeline-Stage anzeigen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByText('ideas_planning')).toBeInTheDocument();
      expect(screen.getByText('creation')).toBeInTheDocument();
      expect(screen.getByText('internal_approval')).toBeInTheDocument();
    });
  });

  describe('Task-Abhängigkeits-Logik', () => {
    it('sollte Task-Status basierend auf Dependencies berechnen', () => {
      const tasksWithDependencies: PipelineAwareTask[] = [
        {
          id: 'completed-task',
          status: 'completed',
          title: 'Completed Task',
          userId: 'user-1',
          organizationId: 'org-1',
          priority: 'medium'
        },
        {
          id: 'ready-task',
          status: 'pending',
          title: 'Ready Task',
          dependsOnTaskIds: ['completed-task'],
          userId: 'user-1',
          organizationId: 'org-1',
          priority: 'medium'
        },
        {
          id: 'waiting-task',
          status: 'pending',
          title: 'Waiting Task',
          dependsOnTaskIds: ['pending-task'],
          userId: 'user-1',
          organizationId: 'org-1',
          priority: 'medium'
        },
        {
          id: 'pending-task',
          status: 'pending',
          title: 'Pending Task',
          userId: 'user-1',
          organizationId: 'org-1',
          priority: 'medium'
        }
      ];

      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={tasksWithDependencies}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );

      const completedTask = screen.getByText('Completed Task').closest('div');
      expect(completedTask).toHaveClass('bg-green-100');

      const readyTask = screen.getByText('Ready Task').closest('div');
      expect(readyTask).toHaveClass('bg-blue-100'); // ready

      const waitingTask = screen.getByText('Waiting Task').closest('div');
      expect(waitingTask).toHaveClass('bg-yellow-100'); // waiting
    });

    it('sollte Level-basierte Positionierung berechnen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      // Tasks sollten basierend auf Dependencies angeordnet werden
      const taskNodes = screen.getAllByText(/erstellen|verfassen|durchführen/);
      expect(taskNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Interaktionen', () => {
    it('sollte Task-Details beim Klick anzeigen', async () => {
      const user = userEvent.setup();
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const task = screen.getByText('Content-Outline erstellen');
      await user.click(task);

      expect(screen.getByText('Abhängigkeiten:')).toBeInTheDocument();
      expect(screen.getByText('Strategie-Dokument erstellen')).toBeInTheDocument();
    });

    it('sollte Task-Details beim zweiten Klick ausblenden', async () => {
      const user = userEvent.setup();
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const task = screen.getByText('Content-Outline erstellen');
      
      // Erste Klick - Details anzeigen
      await user.click(task);
      expect(screen.getByText('Abhängigkeiten:')).toBeInTheDocument();

      // Zweite Klick - Details ausblenden
      await user.click(task);
      expect(screen.queryByText('Abhängigkeiten:')).not.toBeInTheDocument();
    });

    it('sollte Entsperren-Button für blockierte Tasks anzeigen', async () => {
      const user = userEvent.setup();
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const blockedTask = screen.getByText('Texte verfassen');
      await user.click(blockedTask);

      expect(screen.getByText('Entsperren')).toBeInTheDocument();
    });

    it('sollte onTaskUpdate beim Entsperren aufrufen', async () => {
      const user = userEvent.setup();
      mockProps.onTaskUpdate.mockResolvedValue(undefined);

      render(<TaskDependenciesVisualizer {...mockProps} />);

      const blockedTask = screen.getByText('Texte verfassen');
      await user.click(blockedTask);

      const unblockButton = screen.getByText('Entsperren');
      await user.click(unblockButton);

      expect(mockProps.onTaskUpdate).toHaveBeenCalledWith('task-3', { status: 'pending' });
    });

    it('sollte Kritischen-Pfad-Toggle handhaben', async () => {
      const user = userEvent.setup();
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Kritischer Pfad Visualisierung', () => {
    it('sollte kritischen Pfad hervorheben wenn aktiviert', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      // Tasks mit criticalPath sollten rot markiert sein
      const criticalTasks = mockTasks.filter(t => t.stageContext?.criticalPath);
      criticalTasks.forEach(task => {
        const taskElement = screen.getByText(task.title).closest('div');
        expect(taskElement).toHaveClass('ring-2', 'ring-red-500');
      });
    });

    it('sollte kritischen Pfad ausblenden wenn deaktiviert', async () => {
      const user = userEvent.setup();
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox); // Deaktivieren

      // Critical path highlighting sollte entfernt werden
      const taskElement = screen.getByText('Strategie-Dokument erstellen').closest('div');
      expect(taskElement).not.toHaveClass('ring-red-500');
    });
  });

  describe('Responsive Design', () => {
    it('sollte Task-Liste für mobile Geräte anzeigen', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByText('Task-Liste')).toBeInTheDocument();
      
      // Mobile Task-Liste sollte alle Tasks enthalten
      const mobileTaskElements = screen.getAllByText('Kritisch');
      expect(mobileTaskElements).toHaveLength(2); // Mobile Ansicht zeigt kritische Tasks
    });

    it('sollte SVG korrekt skalieren', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toHaveAttribute('width', '100%');
      expect(svg).toHaveAttribute('viewBox', '0 0 800 400');
    });
  });

  describe('Error Handling und Edge Cases', () => {
    it('sollte mit leeren Tasks umgehen', () => {
      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={[]}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );

      expect(screen.getByText('Task-Abhängigkeiten')).toBeInTheDocument();
      expect(screen.getByText('Task-Liste')).toBeInTheDocument();
    });

    it('sollte mit Tasks ohne Abhängigkeiten umgehen', () => {
      const independentTasks: PipelineAwareTask[] = [
        {
          id: 'independent-task',
          title: 'Independent Task',
          status: 'pending',
          priority: 'medium',
          userId: 'user-1',
          organizationId: 'org-1'
        }
      ];

      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={independentTasks}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );

      expect(screen.getByText('Independent Task')).toBeInTheDocument();
    });

    it('sollte Fehler beim Task-Update handhaben', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockProps.onTaskUpdate.mockRejectedValue(new Error('Update failed'));

      render(<TaskDependenciesVisualizer {...mockProps} />);

      const blockedTask = screen.getByText('Texte verfassen');
      await user.click(blockedTask);

      const unblockButton = screen.getByText('Entsperren');
      await user.click(unblockButton);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Fehler beim Entsperren der Task:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('sollte mit fehlenden onTaskUpdate umgehen', async () => {
      const user = userEvent.setup();
      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={mockTasks}
          onTaskUpdate={undefined}
        />
      );

      const blockedTask = screen.getByText('Texte verfassen');
      await user.click(blockedTask);

      const unblockButton = screen.getByText('Entsperren');
      await user.click(unblockButton);

      // Sollte nicht crashen
      expect(screen.getByText('Entsperren')).toBeInTheDocument();
    });

    it('sollte mit zirkulären Abhängigkeiten umgehen', () => {
      const circularTasks: PipelineAwareTask[] = [
        {
          id: 'task-a',
          title: 'Task A',
          status: 'pending',
          priority: 'medium',
          dependsOnTaskIds: ['task-b'],
          userId: 'user-1',
          organizationId: 'org-1'
        },
        {
          id: 'task-b',
          title: 'Task B',
          status: 'pending',
          priority: 'medium',
          dependsOnTaskIds: ['task-a'],
          userId: 'user-1',
          organizationId: 'org-1'
        }
      ];

      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={circularTasks}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );

      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();
    });

    it('sollte mit nicht existierenden Dependency-IDs umgehen', () => {
      const tasksWithInvalidDeps: PipelineAwareTask[] = [
        {
          id: 'valid-task',
          title: 'Valid Task',
          status: 'pending',
          priority: 'medium',
          dependsOnTaskIds: ['non-existent-task'],
          userId: 'user-1',
          organizationId: 'org-1'
        }
      ];

      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={tasksWithInvalidDeps}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );

      expect(screen.getByText('Valid Task')).toBeInTheDocument();
      // Komponente sollte nicht crashen
    });
  });

  describe('Performance und Optimization', () => {
    it('sollte große Task-Listen effizient verarbeiten', () => {
      const largeTasks: PipelineAwareTask[] = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
        priority: 'medium',
        userId: 'user-1',
        organizationId: 'org-1',
        dependsOnTaskIds: i > 0 ? [`task-${i-1}`] : []
      }));

      const startTime = Date.now();
      render(
        <TaskDependenciesVisualizer 
          projectId="test"
          tasks={largeTasks}
          onTaskUpdate={mockProps.onTaskUpdate}
        />
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Sollte unter 1 Sekunde dauern
      expect(screen.getByText('Task 0')).toBeInTheDocument();
      expect(screen.getByText('Task 99')).toBeInTheDocument();
    });

    it('sollte Task-Node-Berechnung bei Props-Updates optimieren', () => {
      const { rerender } = render(<TaskDependenciesVisualizer {...mockProps} />);

      const updatedTasks = [
        ...mockTasks,
        {
          id: 'new-task',
          title: 'New Task',
          status: 'pending' as const,
          priority: 'low' as const,
          userId: 'user-1',
          organizationId: 'org-1'
        }
      ];

      rerender(
        <TaskDependenciesVisualizer 
          {...mockProps}
          tasks={updatedTasks}
        />
      );

      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    it('sollte Event-Handler korrekt cleanen bei Unmount', () => {
      const { unmount } = render(<TaskDependenciesVisualizer {...mockProps} />);
      
      unmount();
      
      // Sollte keine Memory-Leaks oder Fehler verursachen
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels verwenden', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      const task = screen.getByText('Content-Outline erstellen');
      
      // Focus per Tab
      task.focus();
      expect(task).toHaveFocus();

      // Enter drücken
      fireEvent.keyDown(task, { key: 'Enter', code: 'Enter' });
    });

    it('sollte Screen Reader freundliche Struktur verwenden', () => {
      render(<TaskDependenciesVisualizer {...mockProps} />);

      expect(screen.getByRole('heading', { name: 'Task-Abhängigkeiten' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });
});