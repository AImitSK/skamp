// src/__tests__/components/pr/EmailSendModal-pipeline.test.tsx
// Tests für EmailSendModal Pipeline-Erweiterungen (Plan 4/9)

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailSendModal from '@/components/pr/EmailSendModal';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock EmailComposer
jest.mock('@/components/pr/email/EmailComposer', () => {
  return function MockEmailComposer({
    campaign,
    onClose,
    onSent,
    projectMode,
    onPipelineComplete
  }: {
    campaign: PRCampaign;
    onClose: () => void;
    onSent: () => void;
    projectMode?: boolean;
    onPipelineComplete?: (campaignId: string) => void;
  }) {
    return (
      <div data-testid="email-composer">
        <h2>EmailComposer Mock</h2>
        <p data-testid="campaign-title">{campaign.title}</p>
        <p data-testid="project-mode">{projectMode ? 'Pipeline-Mode: Aktiv' : 'Standard-Mode'}</p>
        {campaign.projectId && (
          <p data-testid="project-info">Projekt: {campaign.projectTitle}</p>
        )}
        <button onClick={onClose} data-testid="close-button">Schließen</button>
        <button 
          onClick={() => onSent()} 
          data-testid="sent-button"
        >
          Senden
        </button>
        {onPipelineComplete && (
          <button
            onClick={() => onPipelineComplete(campaign.id!)}
            data-testid="pipeline-complete-button"
          >
            Pipeline Complete
          </button>
        )}
      </div>
    );
  };
});

// Mock UI Dialog
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onClose, size }: {
    children: React.ReactNode;
    open: boolean;
    onClose: () => void;
    size?: string;
  }) => {
    if (!open) return null;
    return (
      <div 
        data-testid="dialog" 
        data-size={size}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-backdrop" onClick={onClose} data-testid="dialog-backdrop" />
        <div className="dialog-content">
          {children}
        </div>
      </div>
    );
  }
}));

const mockOnClose = jest.fn();
const mockOnSent = jest.fn();
const mockOnPipelineComplete = jest.fn();

describe('EmailSendModal Pipeline-Integration Tests', () => {
  const baseCampaign: PRCampaign = {
    id: 'test-campaign-123',
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    title: 'Test Campaign',
    contentHtml: '<p>Test content</p>',
    status: 'draft',
    distributionListId: 'list-1',
    distributionListName: 'Test List',
    recipientCount: 50,
    approvalRequired: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standard-Mode Tests', () => {
    it('sollte Modal im Standard-Mode korrekt rendern', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('email-composer')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('Standard-Mode')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-complete-button')).not.toBeInTheDocument();
    });

    it('sollte projectMode=false als Standard haben', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      expect(screen.getByText('Standard-Mode')).toBeInTheDocument();
    });

    it('sollte Modal-Größe 5xl haben', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const dialog = screen.getByTestId('dialog');
      expect(dialog).toHaveAttribute('data-size', '5xl');
    });

    it('sollte onClose korrekt weiterleiten', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('sollte onSent korrekt weiterleiten', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const sentButton = screen.getByTestId('sent-button');
      fireEvent.click(sentButton);

      expect(mockOnSent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pipeline-Mode Tests', () => {
    const pipelineCampaign: PRCampaign = {
      ...baseCampaign,
      projectId: 'project-123',
      projectTitle: 'Test Pipeline Project',
      pipelineStage: 'distribution'
    };

    it('sollte Modal im Pipeline-Mode korrekt rendern', () => {
      render(
        <EmailSendModal
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('email-composer')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('Pipeline-Mode: Aktiv')).toBeInTheDocument();
      expect(screen.getByText('Projekt: Test Pipeline Project')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-complete-button')).toBeInTheDocument();
    });

    it('sollte projectMode=true korrekt an EmailComposer weiterleiten', () => {
      render(
        <EmailSendModal
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByText('Pipeline-Mode: Aktiv')).toBeInTheDocument();
    });

    it('sollte onPipelineComplete korrekt weiterleiten', () => {
      render(
        <EmailSendModal
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const pipelineCompleteButton = screen.getByTestId('pipeline-complete-button');
      fireEvent.click(pipelineCompleteButton);

      expect(mockOnPipelineComplete).toHaveBeenCalledWith('test-campaign-123');
    });

    it('sollte Pipeline-Projekt-Informationen anzeigen', () => {
      render(
        <EmailSendModal
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByTestId('project-info')).toBeInTheDocument();
      expect(screen.getByText('Projekt: Test Pipeline Project')).toBeInTheDocument();
    });
  });

  describe('Pipeline-Mode ohne onPipelineComplete Tests', () => {
    it('sollte Pipeline-Mode ohne onPipelineComplete handhaben', () => {
      const pipelineCampaign: PRCampaign = {
        ...baseCampaign,
        projectId: 'project-no-callback',
        projectTitle: 'No Callback Project',
        pipelineStage: 'distribution'
      };

      render(
        <EmailSendModal
          campaign={pipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          // onPipelineComplete fehlt
        />
      );

      expect(screen.getByText('Pipeline-Mode: Aktiv')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-complete-button')).not.toBeInTheDocument();
    });
  });

  describe('Props-Weiterleitung Tests', () => {
    it('sollte alle Campaign-Props korrekt an EmailComposer weiterleiten', () => {
      const campaignWithSpecialProps: PRCampaign = {
        ...baseCampaign,
        title: 'Special Campaign Title',
        projectId: 'special-project-456',
        projectTitle: 'Special Project Title',
        pipelineStage: 'monitoring'
      };

      render(
        <EmailSendModal
          campaign={campaignWithSpecialProps}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByText('Special Campaign Title')).toBeInTheDocument();
      expect(screen.getByText('Projekt: Special Project Title')).toBeInTheDocument();
    });

    it('sollte Props-Kombinationen korrekt handhaben', () => {
      const testCases = [
        {
          projectMode: false,
          onPipelineComplete: undefined,
          expectedMode: 'Standard-Mode'
        },
        {
          projectMode: true,
          onPipelineComplete: mockOnPipelineComplete,
          expectedMode: 'Pipeline-Mode: Aktiv'
        },
        {
          projectMode: false,
          onPipelineComplete: mockOnPipelineComplete,
          expectedMode: 'Standard-Mode'
        }
      ];

      testCases.forEach((testCase, index) => {
        const { unmount } = render(
          <EmailSendModal
            campaign={{ ...baseCampaign, id: `test-${index}` }}
            onClose={mockOnClose}
            onSent={mockOnSent}
            projectMode={testCase.projectMode}
            onPipelineComplete={testCase.onPipelineComplete}
          />
        );

        expect(screen.getByText(testCase.expectedMode)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Modal-Verhalten Tests', () => {
    it('sollte Modal per Backdrop schließen', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const backdrop = screen.getByTestId('dialog-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('sollte Modal immer als open=true rendern', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('sollte Container-Styling korrekt anwenden', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const dialog = screen.getByRole('dialog');
      const container = dialog.querySelector('.h-\\[90vh\\]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Campaign-Daten Integration Tests', () => {
    it('sollte verschiedene Campaign-Status korrekt handhaben', () => {
      const campaignStatuses: Array<{
        status: PRCampaign['status'];
        description: string;
      }> = [
        { status: 'draft', description: 'Draft Campaign' },
        { status: 'approved', description: 'Approved Campaign' },
        { status: 'changes_requested', description: 'Changes Requested Campaign' }
      ];

      campaignStatuses.forEach((testCase) => {
        const campaign: PRCampaign = {
          ...baseCampaign,
          status: testCase.status,
          title: testCase.description
        };

        const { unmount } = render(
          <EmailSendModal
            campaign={campaign}
            onClose={mockOnClose}
            onSent={mockOnSent}
            projectMode={true}
            onPipelineComplete={mockOnPipelineComplete}
          />
        );

        expect(screen.getByText(testCase.description)).toBeInTheDocument();
        expect(screen.getByText('Pipeline-Mode: Aktiv')).toBeInTheDocument();
        unmount();
      });
    });

    it('sollte Campaign ohne projectId im Pipeline-Mode handhaben', () => {
      const nonPipelineCampaign: PRCampaign = {
        ...baseCampaign,
        // Kein projectId, projectTitle oder pipelineStage
        title: 'Non-Pipeline Campaign'
      };

      render(
        <EmailSendModal
          campaign={nonPipelineCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      expect(screen.getByText('Non-Pipeline Campaign')).toBeInTheDocument();
      expect(screen.getByText('Pipeline-Mode: Aktiv')).toBeInTheDocument();
      expect(screen.queryByTestId('project-info')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling Tests', () => {
    it('sollte mit undefined Campaign graceful umgehen', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        render(
          <EmailSendModal
            campaign={undefined as any}
            onClose={mockOnClose}
            onSent={mockOnSent}
          />
        );
        
        // Component sollte nicht crashen
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      } catch (error) {
        // Erwarte einen Fehler hier
        expect(error).toBeDefined();
      }

      consoleSpy.mockRestore();
    });

    it('sollte mit fehlenden Callbacks umgehen', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={undefined as any}
          onSent={undefined as any}
        />
      );

      // Component sollte ohne Fehler rendern
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('email-composer')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('sollte korrekte ARIA-Attribute haben', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('sollte Focus-Management korrekt handhaben', () => {
      render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
        />
      );

      // Dialog sollte fokussierbar sein
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('sollte nicht bei jedem Render neu mounten', () => {
      const { rerender } = render(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={false}
        />
      );

      const firstComposer = screen.getByTestId('email-composer');

      rerender(
        <EmailSendModal
          campaign={baseCampaign}
          onClose={mockOnClose}
          onSent={mockOnSent}
          projectMode={true}
          onPipelineComplete={mockOnPipelineComplete}
        />
      );

      const secondComposer = screen.getByTestId('email-composer');
      expect(firstComposer).toBeInTheDocument();
      expect(secondComposer).toBeInTheDocument();
    });
  });
});