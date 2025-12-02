// src/__tests__/components/campaigns/ProjectLinkBanner.test.tsx - Tests für ProjectLinkBanner Component
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ProjectLinkBanner } from '@/components/campaigns/ProjectLinkBanner';
import { PRCampaign, PipelineStage } from '@/types/pr';

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
});

describe('ProjectLinkBanner Component', () => {
  const mockOnProjectUpdate = jest.fn();

  const mockBaseCampaign: PRCampaign = {
    id: 'campaign-123',
    title: 'Test Kampagne',
    organizationId: 'org-123',
    userId: 'user-456',
    projectId: 'project-789',
    projectTitle: 'Marketing Q1 Kampagne',
    pipelineStage: 'creation' as PipelineStage,
    status: 'draft',
    contentHtml: 'Test Content',
    distributionListId: 'list-123',
    distributionListName: 'Test Liste',
    recipientCount: 10,
    approvalRequired: false,
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
  };

  const defaultProps = {
    campaign: mockBaseCampaign,
    onProjectUpdate: mockOnProjectUpdate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic', () => {
    it('sollte Komponente nicht rendern wenn projectId fehlt', () => {
      const campaignWithoutProject = { ...mockBaseCampaign, projectId: undefined };

      const { container } = render(<ProjectLinkBanner campaign={campaignWithoutProject} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/Verknüpft mit Projekt/)).not.toBeInTheDocument();
    });

    it('sollte Komponente rendern wenn projectId vorhanden ist', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      // Pruefe ob SVG (LinkIcon) vorhanden ist
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(screen.getByText(/Verknüpft mit Projekt:/)).toBeInTheDocument();
      expect(screen.getByText('Marketing Q1 Kampagne')).toBeInTheDocument();
    });

    it('sollte CSS-Klassen korrekt anwenden', () => {
      const customClassName = 'custom-banner-class';

      const { container } = render(<ProjectLinkBanner {...defaultProps} className={customClassName} />);

      // Hauptcontainer ist das erste div mit mb-4
      const banner = container.querySelector('div.mb-4');
      expect(banner).toHaveClass('mb-4', 'p-4', 'bg-blue-50', 'border', 'border-blue-200', 'rounded-lg', customClassName);
    });

    it('sollte Standard className verwenden wenn keine className gegeben', () => {
      const { container } = render(<ProjectLinkBanner campaign={mockBaseCampaign} />);

      // Hauptcontainer ist das erste div mit mb-4
      const banner = container.querySelector('div.mb-4');
      expect(banner).toHaveClass('mb-4', 'p-4', 'bg-blue-50');
    });
  });

  describe('Pipeline Stage Badges', () => {
    const stageTestCases = [
      { stage: 'creation' as PipelineStage, expectedText: 'Erstellung' },
      { stage: 'review' as PipelineStage, expectedText: 'Review' },
      { stage: 'approval' as PipelineStage, expectedText: 'Freigabe' },
      { stage: 'distribution' as PipelineStage, expectedText: 'Verteilung' },
      { stage: 'completed' as PipelineStage, expectedText: 'Abgeschlossen' }
    ];

    stageTestCases.forEach(({ stage, expectedText }) => {
      it(`sollte ${expectedText} Badge für ${stage} Stage anzeigen`, () => {
        const campaignWithStage = { ...mockBaseCampaign, pipelineStage: stage };

        render(<ProjectLinkBanner campaign={campaignWithStage} />);

        const badge = screen.getByText(expectedText);
        expect(badge).toBeInTheDocument();
        // Badge ist ein span mit Catalyst-Klassen
        expect(badge.tagName).toBe('SPAN');
      });
    });

    it('sollte keine Badge anzeigen wenn pipelineStage undefined ist', () => {
      const campaignWithoutStage = { ...mockBaseCampaign, pipelineStage: undefined };

      render(<ProjectLinkBanner campaign={campaignWithoutStage} />);

      // Keine der Badge-Texte sollte vorhanden sein
      expect(screen.queryByText('Erstellung')).not.toBeInTheDocument();
      expect(screen.queryByText('Review')).not.toBeInTheDocument();
    });

    it('sollte keine Badge anzeigen für unbekannte Pipeline Stage', () => {
      const campaignWithUnknownStage = { ...mockBaseCampaign, pipelineStage: 'unknown-stage' as any };

      render(<ProjectLinkBanner campaign={campaignWithUnknownStage} />);

      // Keine der Badge-Texte sollte vorhanden sein
      expect(screen.queryByText('Erstellung')).not.toBeInTheDocument();
      expect(screen.queryByText('Review')).not.toBeInTheDocument();
    });
  });

  describe('Budget Tracking', () => {
    it('sollte Budget-Informationen anzeigen wenn budgetTracking vorhanden', () => {
      const campaignWithBudget = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: 10000,
          spent: 3500,
          currency: 'EUR'
        }
      };

      render(<ProjectLinkBanner campaign={campaignWithBudget} />);

      expect(screen.getByText('Budget: 3500 / 10000 EUR')).toBeInTheDocument();
    });

    it('sollte spent=0 anzeigen wenn spent undefined ist', () => {
      const campaignWithBudgetNoSpent = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: 5000,
          spent: undefined,
          currency: 'USD'
        }
      };

      render(<ProjectLinkBanner campaign={campaignWithBudgetNoSpent} />);

      expect(screen.getByText('Budget: 0 / 5000 USD')).toBeInTheDocument();
    });

    it('sollte Default-Währung EUR verwenden wenn currency nicht definiert', () => {
      const campaignWithBudgetNoCurrency = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: 7500,
          spent: 2000,
          currency: undefined
        }
      };

      render(<ProjectLinkBanner campaign={campaignWithBudgetNoCurrency} />);

      expect(screen.getByText('Budget: 2000 / 7500 EUR')).toBeInTheDocument();
    });

    it('sollte Budget nicht anzeigen wenn allocated nicht vorhanden', () => {
      const campaignWithIncompleteudget = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: undefined,
          spent: 1000,
          currency: 'EUR'
        }
      };

      render(<ProjectLinkBanner campaign={campaignWithIncompleteudget} />);

      expect(screen.queryByText(/Budget:/)).not.toBeInTheDocument();
    });

    it('sollte Budget nicht anzeigen wenn budgetTracking undefined ist', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      expect(screen.queryByText(/Budget:/)).not.toBeInTheDocument();
    });
  });

  describe('Meilensteine', () => {
    it('sollte Meilenstein-Fortschritt anzeigen', () => {
      const campaignWithMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: [
          { id: '1', title: 'Meilenstein 1', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '2', title: 'Meilenstein 2', completed: false, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '3', title: 'Meilenstein 3', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }
        ]
      };

      render(<ProjectLinkBanner campaign={campaignWithMilestones} />);

      expect(screen.getByText('Meilensteine: 2 / 3 erreicht')).toBeInTheDocument();
    });

    it('sollte alle Meilensteine als erreicht zählen', () => {
      const campaignWithAllCompletedMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: [
          { id: '1', title: 'Meilenstein 1', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '2', title: 'Meilenstein 2', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }
        ]
      };

      render(<ProjectLinkBanner campaign={campaignWithAllCompletedMilestones} />);

      expect(screen.getByText('Meilensteine: 2 / 2 erreicht')).toBeInTheDocument();
    });

    it('sollte keine Meilensteine als erreicht zählen', () => {
      const campaignWithNoCompletedMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: [
          { id: '1', title: 'Meilenstein 1', completed: false, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '2', title: 'Meilenstein 2', completed: false, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }
        ]
      };

      render(<ProjectLinkBanner campaign={campaignWithNoCompletedMilestones} />);

      expect(screen.getByText('Meilensteine: 0 / 2 erreicht')).toBeInTheDocument();
    });

    it('sollte Meilensteine nicht anzeigen wenn keine budgetTracking vorhanden', () => {
      const campaignWithMilestonesNoBudget = {
        ...mockBaseCampaign,
        milestones: [
          { id: '1', title: 'Meilenstein 1', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }
        ]
      };

      render(<ProjectLinkBanner campaign={campaignWithMilestonesNoBudget} />);

      expect(screen.queryByText(/Meilensteine:/)).not.toBeInTheDocument();
    });

    it('sollte Meilensteine nicht anzeigen wenn Array leer ist', () => {
      const campaignWithEmptyMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: []
      };

      render(<ProjectLinkBanner campaign={campaignWithEmptyMilestones} />);

      expect(screen.queryByText(/Meilensteine:/)).not.toBeInTheDocument();
    });

    it('sollte Meilensteine nicht anzeigen wenn milestones undefined', () => {
      const campaignWithUndefinedMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: undefined
      };

      render(<ProjectLinkBanner campaign={campaignWithUndefinedMilestones} />);

      expect(screen.queryByText(/Meilensteine:/)).not.toBeInTheDocument();
    });
  });

  describe('Buttons und Interaktionen', () => {
    it('sollte Aktualisieren-Button anzeigen wenn onProjectUpdate vorhanden', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      expect(screen.getByText('Aktualisieren')).toBeInTheDocument();
    });

    it('sollte Aktualisieren-Button nicht anzeigen wenn onProjectUpdate fehlt', () => {
      render(<ProjectLinkBanner campaign={mockBaseCampaign} />);

      expect(screen.queryByText('Aktualisieren')).not.toBeInTheDocument();
    });

    it('sollte onProjectUpdate aufrufen wenn Aktualisieren-Button geklickt wird', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const updateButton = screen.getByText('Aktualisieren');
      fireEvent.click(updateButton);

      expect(mockOnProjectUpdate).toHaveBeenCalledTimes(1);
    });

    it('sollte "Projekt öffnen" Button immer anzeigen', () => {
      render(<ProjectLinkBanner campaign={mockBaseCampaign} />);

      expect(screen.getByText('Projekt öffnen')).toBeInTheDocument();
    });

    it('sollte window.open mit korrekter URL aufrufen bei "Projekt öffnen" Click', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const openButton = screen.getByText('Projekt öffnen');
      fireEvent.click(openButton);

      expect(mockWindowOpen).toHaveBeenCalledWith('/dashboard/projects/project-789', '_blank');
    });

    it('sollte Button-Styling korrekt anwenden', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const updateButton = screen.getByText('Aktualisieren');
      const openButton = screen.getByText('Projekt öffnen');

      // Buttons sollten Tailwind-Klassen haben (aus den Props übergeben)
      expect(updateButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'text-sm');
      expect(openButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'text-sm');
    });
  });

  describe('Kombinierte Budget und Meilenstein-Anzeige', () => {
    it('sollte sowohl Budget als auch Meilensteine anzeigen', () => {
      const campaignWithBoth = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: 15000,
          spent: 8500,
          currency: 'CHF'
        },
        milestones: [
          { id: '1', title: 'Start', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '2', title: 'Mitte', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any },
          { id: '3', title: 'Ende', completed: false, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }
        ]
      };

      render(<ProjectLinkBanner campaign={campaignWithBoth} />);

      expect(screen.getByText('Budget: 8500 / 15000 CHF')).toBeInTheDocument();
      expect(screen.getByText('Meilensteine: 2 / 3 erreicht')).toBeInTheDocument();
    });

    it('sollte Budget-Container mit korrekten Styles rendern', () => {
      const campaignWithBoth = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: [{ id: '1', title: 'Test', completed: true, dueDate: { seconds: 1234567890, nanoseconds: 0 } as any }]
      };

      render(<ProjectLinkBanner campaign={campaignWithBoth} />);

      const budgetContainer = screen.getByText(/Budget:/).parentElement;
      expect(budgetContainer).toHaveClass('flex', 'items-center', 'gap-4', 'mt-2', 'text-xs', 'text-blue-700');
    });
  });

  describe('Layout und Struktur', () => {
    it('sollte korrekte Hauptstruktur haben', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      // Hauptcontainer - Text innerhalb eines <p> Tags
      const textElement = screen.getByText(/Verknüpft mit Projekt/);
      const mainContainer = textElement.closest('div.mb-4');
      expect(mainContainer).toHaveClass('mb-4', 'p-4', 'bg-blue-50', 'border', 'border-blue-200', 'rounded-lg');

      // Flex Layout für Hauptbereich
      const flexContainer = mainContainer?.querySelector('.flex.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });

    it('sollte Link-Icon mit korrekter Positionierung haben', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const linkIcon = document.querySelector('svg');
      expect(linkIcon).toBeInTheDocument();
      expect(linkIcon).toHaveClass('h-5', 'w-5', 'text-blue-600');
    });

    it('sollte Text-Element korrekt strukturieren', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const projectText = screen.getByText(/Verknüpft mit Projekt/);
      // Text-Komponente fügt eigene Klassen hinzu - prüfe dass die Custom-Klassen enthalten sind
      expect(projectText).toHaveClass('text-sm', 'font-medium', 'text-blue-900');
    });

    it('sollte Button-Container korrekt anordnen', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const buttonContainer = screen.getByText('Aktualisieren').closest('.flex.items-center.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit sehr langem Projekt-Titel umgehen', () => {
      const campaignWithLongTitle = {
        ...mockBaseCampaign,
        projectTitle: 'A'.repeat(200) // 200 Zeichen langer Titel
      };

      render(<ProjectLinkBanner campaign={campaignWithLongTitle} />);

      const longTitle = screen.getByText('A'.repeat(200));
      expect(longTitle).toBeInTheDocument();
    });

    it('sollte mit Sonderzeichen im Projekt-Titel umgehen', () => {
      const campaignWithSpecialChars = {
        ...mockBaseCampaign,
        projectTitle: 'Projekt <>&"\'`'
      };

      render(<ProjectLinkBanner campaign={campaignWithSpecialChars} />);

      expect(screen.getByText('Projekt <>&"\'`')).toBeInTheDocument();
    });

    it('sollte mit null Projekt-Titel umgehen', () => {
      const campaignWithNullTitle = {
        ...mockBaseCampaign,
        projectTitle: null as any
      };

      render(<ProjectLinkBanner campaign={campaignWithNullTitle} />);

      // Sollte trotzdem rendern, aber ohne Titel
      expect(screen.getByText(/Verknüpft mit Projekt:/)).toBeInTheDocument();
    });

    it('sollte mit extremen Budget-Werten umgehen', () => {
      const campaignWithExtremeBudget = {
        ...mockBaseCampaign,
        budgetTracking: {
          allocated: 999999999,
          spent: 123456789,
          currency: 'EUR'
        }
      };

      render(<ProjectLinkBanner campaign={campaignWithExtremeBudget} />);

      expect(screen.getByText('Budget: 123456789 / 999999999 EUR')).toBeInTheDocument();
    });

    it('sollte mit sehr vielen Meilensteinen umgehen', () => {
      const manyMilestones = new Array(100).fill(0).map((_, i) => ({
        id: `milestone-${i}`,
        title: `Meilenstein ${i}`,
        completed: i % 2 === 0, // Jede zweite ist completed
        dueDate: { seconds: 1234567890, nanoseconds: 0 } as any
      }));

      const campaignWithManyMilestones = {
        ...mockBaseCampaign,
        budgetTracking: { allocated: 1000, spent: 500, currency: 'EUR' },
        milestones: manyMilestones
      };

      render(<ProjectLinkBanner campaign={campaignWithManyMilestones} />);

      expect(screen.getByText('Meilensteine: 50 / 100 erreicht')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('sollte nicht re-rendern wenn irrelevante Props ändern', () => {
      const { rerender } = render(<ProjectLinkBanner {...defaultProps} />);

      // Props die keinen Einfluss haben sollten
      rerender(<ProjectLinkBanner {...defaultProps} className="different-class" />);

      expect(screen.getByText(/Verknüpft mit Projekt/)).toBeInTheDocument();
    });

    it('sollte korrekt re-rendern wenn relevante Props ändern', () => {
      const { rerender } = render(<ProjectLinkBanner {...defaultProps} />);

      const updatedCampaign = {
        ...mockBaseCampaign,
        projectTitle: 'Neuer Projekt-Titel',
        pipelineStage: 'review' as PipelineStage
      };

      rerender(<ProjectLinkBanner campaign={updatedCampaign} />);

      expect(screen.getByText('Neuer Projekt-Titel')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sollte korrektes ARIA-Label für Link-Icon haben', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const linkIcon = document.querySelector('svg');
      expect(linkIcon).toBeInTheDocument();
      // Heroicons hat aria-hidden standardmäßig
      expect(linkIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('sollte alle Buttons fokussierbar machen', () => {
      render(<ProjectLinkBanner {...defaultProps} />);

      const updateButton = screen.getByText('Aktualisieren');
      const openButton = screen.getByText('Projekt öffnen');

      expect(updateButton).not.toHaveAttribute('disabled');
      expect(openButton).not.toHaveAttribute('disabled');
      
      // Focus testen
      updateButton.focus();
      expect(updateButton).toHaveFocus();
      
      openButton.focus();
      expect(openButton).toHaveFocus();
    });
  });
});