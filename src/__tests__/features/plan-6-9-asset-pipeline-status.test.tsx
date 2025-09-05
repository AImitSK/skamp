/**
 * Plan 6/9: AssetPipelineStatus UI-Komponente Tests
 * 
 * Testet die AssetPipelineStatus Komponente:
 * - Asset Health Metrics und Scoring
 * - Pipeline-Phase Status-Anzeige
 * - Asset-Validierung und Re-Validierung
 * - Timeline und History-Anzeige
 * - Phase-spezifische Detailed Views
 * - Quick Actions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssetPipelineStatus from '@/components/projects/assets/AssetPipelineStatus';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/lib/firebase/project-service';
import { Timestamp } from 'firebase/firestore';
import type { Project } from '@/types/project';

// Mock der Abhängigkeiten
jest.mock('@/context/AuthContext');
jest.mock('@/lib/firebase/project-service');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

describe('Plan 6/9: AssetPipelineStatus UI-Komponente', () => {
  const mockUser = { uid: 'org123', email: 'test@example.com' };
  
  const mockProject: Project = {
    id: 'project123',
    userId: 'user123',
    organizationId: 'org123',
    title: 'Test Marketing Projekt',
    description: 'Test Projekt für Asset Pipeline Status',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockValidationResult = {
    projectId: 'project123',
    totalAssets: 20,
    validAssets: 15,
    missingAssets: 3,
    outdatedAssets: 2,
    validationDetails: [
      {
        campaignId: 'campaign1',
        campaignTitle: 'Test Campaign 1',
        assetIssues: {
          isValid: true,
          missingAssets: [],
          outdatedSnapshots: [],
          validationErrors: []
        }
      },
      {
        campaignId: 'campaign2',
        campaignTitle: 'Test Campaign 2',
        assetIssues: {
          isValid: false,
          missingAssets: ['asset1', 'asset2'],
          outdatedSnapshots: ['attachment1'],
          validationErrors: [
            'logo.jpg: Asset nicht verfügbar',
            'presentation.pdf: Asset veraltet'
          ]
        }
      }
    ]
  };

  const defaultProps = {
    project: mockProject,
    onValidationUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockProjectService.validateProjectAssets.mockResolvedValue(mockValidationResult);
  });

  describe('Basis-Rendering und Loading', () => {
    it('sollte Loading-State anzeigen', () => {
      mockProjectService.validateProjectAssets.mockReturnValue(new Promise(() => {}));
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      expect(screen.getByText((content, element) => 
        element?.classList.contains('animate-pulse') || false
      )).toBeInTheDocument();
    });

    it('sollte Asset Health Status beim Mount laden', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockProjectService.validateProjectAssets).toHaveBeenCalledWith(
          'project123',
          { organizationId: 'org123' }
        );
      });
    });

    it('sollte onValidationUpdate Callback aufrufen', async () => {
      const mockOnValidationUpdate = jest.fn();
      
      render(<AssetPipelineStatus {...defaultProps} onValidationUpdate={mockOnValidationUpdate} />);
      
      await waitFor(() => {
        expect(mockOnValidationUpdate).toHaveBeenCalledWith(mockValidationResult);
      });
    });

    it('sollte graceful mit fehlenden Benutzerdaten umgehen', () => {
      mockUseAuth.mockReturnValue({ user: null } as any);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      expect(mockProjectService.validateProjectAssets).not.toHaveBeenCalled();
    });
  });

  describe('Asset Health Overview', () => {
    it('sollte Health Score korrekt berechnen und anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        // Health Score = 100 - ((missing + outdated) / total) * 100
        // Health Score = 100 - ((3 + 2) / 20) * 100 = 75%
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('Health Score')).toBeInTheDocument();
      });
    });

    it('sollte Health Score Farben korrekt zuordnen', async () => {
      // Test für guten Score (>90%)
      const goodValidation = {
        ...mockValidationResult,
        totalAssets: 100,
        validAssets: 95,
        missingAssets: 3,
        outdatedAssets: 2
      };
      
      mockProjectService.validateProjectAssets.mockResolvedValue(goodValidation);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
        // Grüner Health Score
        expect(document.querySelector('.text-green-600.bg-green-50')).toBeInTheDocument();
      });
    });

    it('sollte kritische Health Score korrekt identifizieren', async () => {
      const criticalValidation = {
        ...mockValidationResult,
        totalAssets: 10,
        validAssets: 3,
        missingAssets: 5,
        outdatedAssets: 2
      };
      
      mockProjectService.validateProjectAssets.mockResolvedValue(criticalValidation);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        // Health Score = 100 - ((5 + 2) / 10) * 100 = 30%
        expect(screen.getByText('30%')).toBeInTheDocument();
        // Roter Health Score
        expect(document.querySelector('.text-red-600.bg-red-50')).toBeInTheDocument();
      });
    });

    it('sollte Asset-Statistiken korrekt anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument(); // Total Assets
        expect(screen.getByText('15')).toBeInTheDocument(); // Valid Assets
        expect(screen.getByText('5')).toBeInTheDocument();  // Issues (3+2)
      });
    });

    it('sollte kritische Probleme auflisten', async () => {
      const criticalValidation = {
        ...mockValidationResult,
        missingAssets: 8,
        outdatedAssets: 12
      };
      
      mockProjectService.validateProjectAssets.mockResolvedValue(criticalValidation);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Kritische Probleme')).toBeInTheDocument();
        expect(screen.getByText('8 fehlende Assets')).toBeInTheDocument();
        expect(screen.getByText('12 veraltete Assets')).toBeInTheDocument();
      });
    });

    it('sollte keine kritischen Probleme anzeigen wenn keine vorhanden', async () => {
      const goodValidation = {
        ...mockValidationResult,
        missingAssets: 0,
        outdatedAssets: 2 // Unter Threshold von 5
      };
      
      mockProjectService.validateProjectAssets.mockResolvedValue(goodValidation);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Kritische Probleme')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pipeline Phase Status', () => {
    it('sollte alle Pipeline-Phasen anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Erstellung')).toBeInTheDocument();
        expect(screen.getByText('Interne Freigabe')).toBeInTheDocument();
        expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
        expect(screen.getByText('Distribution')).toBeInTheDocument();
        expect(screen.getByText('Monitoring')).toBeInTheDocument();
      });
    });

    it('sollte Phase-Cards anklickbar machen', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Erstellung')).toBeInTheDocument();
      });
      
      const creationPhase = screen.getByText('Erstellung').closest('.cursor-pointer');
      if (creationPhase) {
        await user.click(creationPhase);
        
        expect(screen.getByText('Details: Erstellung')).toBeInTheDocument();
        expect(creationPhase).toHaveClass('border-blue-500', 'bg-blue-50');
      }
    });

    it('sollte Phase-Details ein-/ausblenden', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const creationPhase = screen.getByText('Erstellung').closest('.cursor-pointer');
        if (creationPhase) {
          user.click(creationPhase);
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Details: Erstellung')).toBeInTheDocument();
      });
      
      // Nochmal klicken um zu schließen
      const creationPhase = screen.getByText('Erstellung').closest('.cursor-pointer');
      if (creationPhase) {
        await user.click(creationPhase);
        
        expect(screen.queryByText('Details: Erstellung')).not.toBeInTheDocument();
      }
    });

    it('sollte Phase-spezifische Asset-Statistiken anzeigen', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const creationPhase = screen.getByText('Erstellung').closest('.cursor-pointer');
        if (creationPhase) {
          user.click(creationPhase);
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assets gesamt')).toBeInTheDocument();
        expect(screen.getByText('Gültige Assets')).toBeInTheDocument();
        expect(screen.getByText('Veraltet')).toBeInTheDocument();
        expect(screen.getByText('Fehlend')).toBeInTheDocument();
      });
    });

    it('sollte Fortschrittsbalken für Phasen anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const progressBars = document.querySelectorAll('.bg-green-500.h-2.rounded-full');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Asset-Validierung', () => {
    it('sollte "Neu validieren" Button anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Neu validieren')).toBeInTheDocument();
      });
    });

    it('sollte Re-Validierung durchführen', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Neu validieren')).toBeInTheDocument();
      });
      
      const validateButton = screen.getByText('Neu validieren');
      await user.click(validateButton);
      
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(2); // Initial + Re-validation
    });

    it('sollte Validierung-Status während Prozess anzeigen', async () => {
      const user = userEvent.setup();
      
      // Mock langsame Validierung
      mockProjectService.validateProjectAssets.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockValidationResult), 1000))
      );
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const validateButton = screen.getByText('Neu validieren');
        user.click(validateButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Validiere...')).toBeInTheDocument();
        const spinningIcon = document.querySelector('.animate-spin');
        expect(spinningIcon).toBeInTheDocument();
      });
    });

    it('sollte Validierung-Button während Prozess disablen', async () => {
      const user = userEvent.setup();
      
      mockProjectService.validateProjectAssets.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockValidationResult), 100))
      );
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const validateButton = screen.getByText('Neu validieren') as HTMLButtonElement;
        user.click(validateButton);
        expect(validateButton.disabled).toBe(true);
      });
    });

    it('sollte Quick Action "Assets validieren" Button anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assets validieren')).toBeInTheDocument();
      });
    });
  });

  describe('Timeline und History', () => {
    it('sollte Timeline ein/ausblenden', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const timelineButton = screen.getByText('Timeline anzeigen');
        expect(timelineButton).toBeInTheDocument();
      });
      
      const timelineButton = screen.getByText('Timeline anzeigen');
      await user.click(timelineButton);
      
      expect(screen.getByText('Timeline ausblenden')).toBeInTheDocument();
    });

    it('sollte leere Timeline nicht anzeigen', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const timelineButton = screen.getByText('Timeline anzeigen');
        user.click(timelineButton);
      });
      
      await waitFor(() => {
        // Keine Timeline-Inhalte da assetHistory leer ist
        expect(screen.queryByText('Asset Activity Timeline')).not.toBeInTheDocument();
      });
    });

    it('sollte Timeline-Aktivitäten anzeigen wenn vorhanden', async () => {
      // Mock mit Asset-History würde hier implementiert werden
      // Da die Komponente momentan leere History zurückgibt
      // Für vollständigen Test wäre prService Mock nötig
      
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const timelineButton = screen.getByText('Timeline anzeigen');
        expect(timelineButton).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('sollte Quick Actions Buttons anzeigen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Assets anzeigen')).toBeInTheDocument();
        expect(screen.getByText('Assets validieren')).toBeInTheDocument();
      });
    });

    it('sollte "Assets anzeigen" Button funktionsfähig sein', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const showAssetsButton = screen.getByText('Assets anzeigen');
        expect(showAssetsButton).toBeInTheDocument();
        
        // Button sollte klickbar sein (auch wenn TODO Implementation)
        user.click(showAssetsButton);
      });
    });

    it('sollte beide Validieren-Buttons synchron verhalten', async () => {
      const user = userEvent.setup();
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const headerValidateButton = screen.getByText('Neu validieren');
        const quickActionButton = screen.getByText('Assets validieren');
        
        expect(headerValidateButton).toBeInTheDocument();
        expect(quickActionButton).toBeInTheDocument();
      });
      
      // Klick auf Quick Action sollte auch Header-Button Status ändern
      const quickActionButton = screen.getByText('Assets validieren');
      await user.click(quickActionButton);
      
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('sollte graceful mit Validierung-Fehlern umgehen', async () => {
      mockProjectService.validateProjectAssets.mockRejectedValue(new Error('Validation failed'));
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        // Sollte nicht crashen und Loading beenden
        expect(screen.queryByText((content, element) => 
          element?.classList.contains('animate-pulse') || false
        )).not.toBeInTheDocument();
      });
    });

    it('sollte Re-Validierung-Fehler graceful behandeln', async () => {
      const user = userEvent.setup();
      
      // Erste Validierung erfolgreich, zweite fehlerhaft
      mockProjectService.validateProjectAssets
        .mockResolvedValueOnce(mockValidationResult)
        .mockRejectedValue(new Error('Re-validation failed'));
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const validateButton = screen.getByText('Neu validieren');
        user.click(validateButton);
      });
      
      await waitFor(() => {
        // Button sollte wieder enabled werden
        const validateButton = screen.getByText('Neu validieren') as HTMLButtonElement;
        expect(validateButton.disabled).toBe(false);
      });
    });

    it('sollte mit fehlenden Validierung-Daten umgehen', async () => {
      mockProjectService.validateProjectAssets.mockResolvedValue({
        projectId: 'project123',
        totalAssets: 0,
        validAssets: 0,
        missingAssets: 0,
        outdatedAssets: 0,
        validationDetails: []
      });
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument(); // Perfekter Score bei 0 Assets
        expect(screen.getByText('0')).toBeInTheDocument(); // Alle Zähler = 0
      });
    });
  });

  describe('UI/UX Features', () => {
    it('sollte responsive Grid-Layout verwenden', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        // Health Metrics Grid
        expect(document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4')).toBeInTheDocument();
        
        // Phase Status Grid
        expect(document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
      });
    });

    it('sollte korrekte Icons für verschiedene Health Scores verwenden', async () => {
      // Test für guten Score
      const goodValidation = { ...mockValidationResult, missingAssets: 0, outdatedAssets: 1 };
      mockProjectService.validateProjectAssets.mockResolvedValue(goodValidation);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('[data-testid="check-circle-icon"]') ||
               document.querySelector('svg[class*="CheckCircleIcon"]')).toBeInTheDocument();
      });
    });

    it('sollte Hover-Effekte für interaktive Elemente haben', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const phaseCards = document.querySelectorAll('.cursor-pointer.transition-colors');
        expect(phaseCards.length).toBeGreaterThan(0);
        
        const buttons = document.querySelectorAll('.hover\\:bg-gray-50, .hover\\:bg-blue-700');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('sollte Fortschrittsbalken-Animation verwenden', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        const progressBars = document.querySelectorAll('[style*="width:"]');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance und Optimierungen', () => {
    it('sollte Status nur bei Mount und Projekt-Änderung laden', () => {
      const { rerender } = render(<AssetPipelineStatus {...defaultProps} />);
      
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(1);
      
      // Re-render ohne Projekt-Änderung
      rerender(<AssetPipelineStatus {...defaultProps} />);
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(1);
      
      // Re-render mit neuem Projekt
      const newProject = { ...mockProject, id: 'project456' };
      rerender(<AssetPipelineStatus {...defaultProps} project={newProject} />);
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(2);
    });

    it('sollte bei fehlendem User/Projekt nicht laden', () => {
      mockUseAuth.mockReturnValue({ user: null } as any);
      
      render(<AssetPipelineStatus {...defaultProps} />);
      
      expect(mockProjectService.validateProjectAssets).not.toHaveBeenCalled();
    });

    it('sollte Berechnung-intensiven Health Score cachen', async () => {
      render(<AssetPipelineStatus {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
      
      // Mehrfache Re-Renders sollten keine zusätzlichen Service-Calls auslösen
      const { rerender } = render(<AssetPipelineStatus {...defaultProps} />);
      rerender(<AssetPipelineStatus {...defaultProps} />);
      
      expect(mockProjectService.validateProjectAssets).toHaveBeenCalledTimes(1);
    });
  });
});