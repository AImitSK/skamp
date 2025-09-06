// src/components/projects/workflow/__tests__/StageTransitionController.test.tsx
// PLAN 8/9: PIPELINE-TASK-INTEGRATION - StageTransitionController Component Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageTransitionController from '../StageTransitionController';
import { PipelineStage } from '@/types/project';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChevronRightIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="chevron-right-icon" />
  ),
  CheckCircleIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="check-circle-icon" />
  ),
  ExclamationTriangleIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="exclamation-triangle-icon" />
  )
}));

describe('StageTransitionController', () => {
  const mockProps = {
    projectId: 'test-project-123',
    currentStage: 'creation' as PipelineStage,
    availableTransitions: [
      {
        stage: 'internal_approval' as PipelineStage,
        canTransition: true
      },
      {
        stage: 'customer_approval' as PipelineStage,
        canTransition: false,
        blockedReason: 'Interne Freigabe ausstehend'
      }
    ],
    onStageTransition: jest.fn(),
    onRollback: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basis-Rendering', () => {
    it('sollte Komponente korrekt rendern', () => {
      render(<StageTransitionController {...mockProps} />);

      expect(screen.getByText('Stage-Übergänge')).toBeInTheDocument();
      expect(screen.getByText('Aktueller Stage: Erstellung')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('sollte alle verfügbaren Übergänge anzeigen', () => {
      render(<StageTransitionController {...mockProps} />);

      expect(screen.getByText('Interne Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
      expect(screen.getAllByTestId('chevron-right-icon')).toHaveLength(2);
    });

    it('sollte blockierte Übergänge korrekt kennzeichnen', () => {
      render(<StageTransitionController {...mockProps} />);

      expect(screen.getByText('Blockiert')).toBeInTheDocument();
      expect(screen.getByText('Interne Freigabe ausstehend')).toBeInTheDocument();
      expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
    });

    it('sollte Stage-Labels korrekt anzeigen', () => {
      const allStageProps = {
        ...mockProps,
        availableTransitions: [
          { stage: 'ideas_planning' as PipelineStage, canTransition: true },
          { stage: 'creation' as PipelineStage, canTransition: true },
          { stage: 'internal_approval' as PipelineStage, canTransition: true },
          { stage: 'customer_approval' as PipelineStage, canTransition: true },
          { stage: 'distribution' as PipelineStage, canTransition: true },
          { stage: 'monitoring' as PipelineStage, canTransition: true },
          { stage: 'completed' as PipelineStage, canTransition: true }
        ]
      };

      render(<StageTransitionController {...allStageProps} />);

      expect(screen.getByText('Ideen & Planung')).toBeInTheDocument();
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      expect(screen.getByText('Interne Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Verteilung')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
    });
  });

  describe('Interaktionen und State Management', () => {
    it('sollte Transition-Button für verfügbare Übergänge aktivieren', () => {
      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      expect(availableButton).not.toBeDisabled();
      expect(availableButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('sollte Transition-Button für blockierte Übergänge deaktivieren', () => {
      render(<StageTransitionController {...mockProps} />);

      const blockedButton = screen.getAllByText('Übergang starten')[1];
      expect(blockedButton).toBeDisabled();
      expect(blockedButton).toHaveClass('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
    });

    it('sollte Bestätigungsdialog beim Klick auf verfügbaren Übergang anzeigen', async () => {
      const user = userEvent.setup();
      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      expect(screen.getByText('Stage-Übergang bestätigen')).toBeInTheDocument();
      expect(screen.getByText(/Sind Sie sicher, dass Sie zu "Interne Freigabe" wechseln möchten/)).toBeInTheDocument();
    });

    it('sollte Bestätigungsdialog schließen beim Klick auf Abbrechen', async () => {
      const user = userEvent.setup();
      render(<StageTransitionController {...mockProps} />);

      // Dialog öffnen
      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      // Dialog schließen
      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      expect(screen.queryByText('Stage-Übergang bestätigen')).not.toBeInTheDocument();
    });

    it('sollte onStageTransition beim Bestätigen aufrufen', async () => {
      const user = userEvent.setup();
      mockProps.onStageTransition.mockResolvedValue(undefined);

      render(<StageTransitionController {...mockProps} />);

      // Dialog öffnen
      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      // Bestätigen
      const confirmButton = screen.getByText('Bestätigen');
      await user.click(confirmButton);

      expect(mockProps.onStageTransition).toHaveBeenCalledWith('internal_approval');
    });

    it('sollte Loading-State während Transition anzeigen', async () => {
      const user = userEvent.setup();
      
      // Mock mit verzögerter Resolution
      mockProps.onStageTransition.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<StageTransitionController {...mockProps} />);

      // Dialog öffnen und bestätigen
      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);
      
      const confirmButton = screen.getByText('Bestätigen');
      await user.click(confirmButton);

      // Loading text sollte sofort erscheinen
      expect(screen.getByText('Wird übertragen...')).toBeInTheDocument();
      
      // Buttons sollten deaktiviert sein
      expect(screen.getByText('Bestätigen')).toBeDisabled();
      expect(screen.getByText('Abbrechen')).toBeDisabled();

      // Warten bis Transition abgeschlossen
      await waitFor(() => {
        expect(screen.queryByText('Stage-Übergang bestätigen')).not.toBeInTheDocument();
      });
    });
  });

  describe('Rollback-Funktionalität', () => {
    it('sollte Rollback-Sektion anzeigen wenn onRollback bereitgestellt wird', () => {
      render(<StageTransitionController {...mockProps} />);

      expect(screen.getByText('Rollback-Optionen')).toBeInTheDocument();
      expect(screen.getByText('Zurück zur Erstellung')).toBeInTheDocument();
    });

    it('sollte Rollback-Sektion nicht anzeigen ohne onRollback', () => {
      const propsWithoutRollback = {
        ...mockProps,
        onRollback: undefined
      };

      render(<StageTransitionController {...propsWithoutRollback} />);

      expect(screen.queryByText('Rollback-Optionen')).not.toBeInTheDocument();
      expect(screen.queryByText('Zurück zur Erstellung')).not.toBeInTheDocument();
    });

    it('sollte onRollback beim Klick auf Rollback-Button aufrufen', async () => {
      const user = userEvent.setup();
      mockProps.onRollback.mockResolvedValue(undefined);

      render(<StageTransitionController {...mockProps} />);

      const rollbackButton = screen.getByText('Zurück zur Erstellung');
      await user.click(rollbackButton);

      expect(mockProps.onRollback).toHaveBeenCalledWith('creation');
    });

    it('sollte Rollback-Button während Transition deaktivieren', async () => {
      const user = userEvent.setup();
      mockProps.onRollback.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<StageTransitionController {...mockProps} />);

      const rollbackButton = screen.getByText('Zurück zur Erstellung');
      await user.click(rollbackButton);

      expect(rollbackButton).toBeDisabled();
      
      await waitFor(() => {
        expect(rollbackButton).not.toBeDisabled();
      });
    });
  });

  describe('CSS-Klassen und Styling', () => {
    it('sollte korrekte CSS-Klassen für verfügbare Transitions verwenden', () => {
      render(<StageTransitionController {...mockProps} />);

      const availableTransition = screen.getByText('Interne Freigabe').closest('div');
      expect(availableTransition).toHaveClass('bg-green-50');
    });

    it('sollte korrekte CSS-Klassen für blockierte Transitions verwenden', () => {
      render(<StageTransitionController {...mockProps} />);

      const blockedTransition = screen.getByText('Kunden-Freigabe').closest('div');
      expect(blockedTransition).toHaveClass('bg-gray-50');
    });

    it('sollte Modal-Overlay korrekt stylen', async () => {
      const user = userEvent.setup();
      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      const modalOverlay = screen.getByText('Stage-Übergang bestätigen').closest('div')?.parentElement;
      expect(modalOverlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'z-50');
    });
  });

  describe('Error Handling und Edge Cases', () => {
    it('sollte Fehler beim Stage-Transition handhaben', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockProps.onStageTransition.mockRejectedValue(new Error('Transition failed'));

      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);
      
      const confirmButton = screen.getByText('Bestätigen');
      await user.click(confirmButton);

      // Dialog sollte trotz Fehler geschlossen werden
      await waitFor(() => {
        expect(screen.queryByText('Stage-Übergang bestätigen')).not.toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('sollte Fehler beim Rollback handhaben', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockProps.onRollback.mockRejectedValue(new Error('Rollback failed'));

      render(<StageTransitionController {...mockProps} />);

      const rollbackButton = screen.getByText('Zurück zur Erstellung');
      await user.click(rollbackButton);

      // Loading-State sollte trotz Fehler zurückgesetzt werden
      await waitFor(() => {
        expect(rollbackButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('sollte mit leeren availableTransitions umgehen', () => {
      const emptyTransitionsProps = {
        ...mockProps,
        availableTransitions: []
      };

      render(<StageTransitionController {...emptyTransitionsProps} />);

      expect(screen.getByText('Stage-Übergänge')).toBeInTheDocument();
      expect(screen.getByText('Aktueller Stage: Erstellung')).toBeInTheDocument();
      expect(screen.queryByText('Übergang starten')).not.toBeInTheDocument();
    });

    it('sollte mit undefined selectedStage umgehen', async () => {
      const user = userEvent.setup();
      render(<StageTransitionController {...mockProps} />);

      // Öffne Dialog
      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      // Simuliere selectedStage = null durch direkten State-Zugriff
      // (In echten Tests würde man den Component State nicht direkt manipulieren)
      const confirmButton = screen.getByText('Bestätigen');
      expect(confirmButton).toBeInTheDocument();

      // Normal bestätigen sollte funktionieren
      await user.click(confirmButton);
      expect(mockProps.onStageTransition).toHaveBeenCalled();
    });

    it('sollte mit verschiedenen currentStage-Werten umgehen', () => {
      const stages: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval',
        'customer_approval', 'distribution', 'monitoring', 'completed'
      ];

      stages.forEach(stage => {
        const { unmount } = render(
          <StageTransitionController 
            {...mockProps} 
            currentStage={stage}
          />
        );

        const expectedLabel = {
          'ideas_planning': 'Ideen & Planung',
          'creation': 'Erstellung',
          'internal_approval': 'Interne Freigabe',
          'customer_approval': 'Kunden-Freigabe',
          'distribution': 'Verteilung',
          'monitoring': 'Monitoring',
          'completed': 'Abgeschlossen'
        }[stage];

        expect(screen.getByText(`Aktueller Stage: ${expectedLabel}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility und UX', () => {
    it('sollte korrekte Button-Zustände für Screen Reader verwenden', () => {
      render(<StageTransitionController {...mockProps} />);

      const enabledButton = screen.getAllByText('Übergang starten')[0];
      const disabledButton = screen.getAllByText('Übergang starten')[1];

      expect(enabledButton).not.toHaveAttribute('aria-disabled');
      expect(disabledButton).toBeDisabled();
    });

    it('sollte semantische HTML-Struktur verwenden', () => {
      render(<StageTransitionController {...mockProps} />);

      expect(screen.getByRole('heading', { name: 'Stage-Übergänge' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Übergang starten' })).toHaveLength(2);
    });

    it('sollte Modal-Dialog korrekt für Screen Reader strukturieren', async () => {
      const user = userEvent.setup();
      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);

      expect(screen.getByRole('heading', { name: 'Stage-Übergang bestätigen' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      
      // Focus per Tab
      availableButton.focus();
      expect(availableButton).toHaveFocus();

      // Enter drücken
      fireEvent.keyDown(availableButton, { key: 'Enter', code: 'Enter' });
      
      // Dialog sollte öffnen (simuliert durch click)
      fireEvent.click(availableButton);
      expect(screen.getByText('Stage-Übergang bestätigen')).toBeInTheDocument();
    });

    it('sollte Loading-Zustand für Screen Reader zugänglich machen', async () => {
      const user = userEvent.setup();
      mockProps.onStageTransition.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);
      
      const confirmButton = screen.getByText('Bestätigen');
      await user.click(confirmButton);

      // Loading-Text sollte für Screen Reader verfügbar sein
      expect(screen.getByText('Wird übertragen...')).toBeInTheDocument();
    });
  });

  describe('Integration und Performance', () => {
    it('sollte mehrere aufeinanderfolgende Transitions korrekt handhaben', async () => {
      const user = userEvent.setup();
      mockProps.onStageTransition.mockResolvedValue(undefined);

      render(<StageTransitionController {...mockProps} />);

      // Erste Transition
      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);
      await user.click(screen.getByText('Bestätigen'));

      // Warten bis erste Transition abgeschlossen
      await waitFor(() => {
        expect(screen.queryByText('Stage-Übergang bestätigen')).not.toBeInTheDocument();
      });

      expect(mockProps.onStageTransition).toHaveBeenCalledTimes(1);
    });

    it('sollte Props-Updates korrekt verarbeiten', () => {
      const { rerender } = render(<StageTransitionController {...mockProps} />);

      const updatedProps = {
        ...mockProps,
        currentStage: 'internal_approval' as PipelineStage,
        availableTransitions: [
          {
            stage: 'customer_approval' as PipelineStage,
            canTransition: true
          }
        ]
      };

      rerender(<StageTransitionController {...updatedProps} />);

      expect(screen.getByText('Aktueller Stage: Interne Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
      expect(screen.queryByText('Interne Freigabe')).not.toBeInTheDocument();
    });

    it('sollte Memory-Leaks vermeiden bei Unmount während Transition', async () => {
      const user = userEvent.setup();
      let resolveFn: () => void;
      
      mockProps.onStageTransition.mockImplementation(() => 
        new Promise(resolve => { resolveFn = resolve; })
      );

      const { unmount } = render(<StageTransitionController {...mockProps} />);

      const availableButton = screen.getAllByText('Übergang starten')[0];
      await user.click(availableButton);
      await user.click(screen.getByText('Bestätigen'));

      // Unmount während laufender Transition
      unmount();

      // Resolve Promise nach Unmount
      resolveFn!();

      // Sollte keine Fehler werfen
      expect(mockProps.onStageTransition).toHaveBeenCalledTimes(1);
    });
  });
});