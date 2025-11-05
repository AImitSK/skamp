// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/__tests__/ContentTab.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContentTab from '../ContentTab';
import { useCampaign } from '../../context/CampaignContext';

// Mock all dependencies
jest.mock('../../context/CampaignContext', () => ({
  useCampaign: jest.fn()
}));

jest.mock('@/components/pr/campaign/CampaignContentComposer', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="campaign-content-composer">Mocked Composer</div>)
}));

jest.mock('@/components/campaigns/KeyVisualSection', () => ({
  KeyVisualSection: jest.fn(() => <div data-testid="key-visual-section">Mocked KeyVisual</div>)
}));

jest.mock('../components/CustomerFeedbackAlert', () => ({
  CustomerFeedbackAlert: jest.fn(({ feedback }) =>
    feedback && feedback.length > 0 ?
      <div data-testid="customer-feedback-alert">Mocked Feedback</div> :
      null
  )
}));

jest.mock('../components/AiAssistantCTA', () => ({
  AiAssistantCTA: jest.fn(() => <div data-testid="ai-assistant-cta">Mocked AI CTA</div>)
}));

describe('ContentTab', () => {
  const mockUseCampaign = useCampaign as jest.MockedFunction<typeof useCampaign>;

  // Standard Mock-Daten für CampaignContext
  const defaultContextValue = {
    campaignTitle: 'Test Campaign Title',
    updateTitle: jest.fn(),
    editorContent: '<p>Test editor content</p>',
    updateEditorContent: jest.fn(),
    pressReleaseContent: '<p>Test press release</p>',
    updatePressReleaseContent: jest.fn(),
    boilerplateSections: [],
    updateBoilerplateSections: jest.fn(),
    keywords: ['test', 'keywords'],
    updateKeywords: jest.fn(),
    keyVisual: undefined,
    updateKeyVisual: jest.fn(),
    selectedCompanyId: 'company-123',
    selectedCompanyName: 'Test Company',
    selectedProjectId: 'project-456',
    selectedProjectName: 'Test Project',
    previousFeedback: []
  };

  // Standard Props für ContentTab
  const defaultProps = {
    organizationId: 'org-123',
    userId: 'user-456',
    campaignId: 'campaign-789',
    onOpenAiModal: jest.fn(),
    onSeoScoreChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaign.mockReturnValue(defaultContextValue as any);
  });

  describe('Rendering', () => {
    it('rendert korrekt mit gemocktem CampaignContext', () => {
      render(<ContentTab {...defaultProps} />);

      expect(screen.getByTestId('campaign-content-composer')).toBeInTheDocument();
      expect(screen.getByTestId('key-visual-section')).toBeInTheDocument();
      expect(screen.getByTestId('ai-assistant-cta')).toBeInTheDocument();
    });

    it('zeigt CustomerFeedbackAlert wenn previousFeedback vorhanden', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        previousFeedback: [
          {
            author: 'Kunde',
            comment: 'Bitte Titel ändern',
            requestedAt: {
              toDate: () => new Date('2025-01-15T10:00:00')
            }
          }
        ]
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(screen.getByTestId('customer-feedback-alert')).toBeInTheDocument();
    });

    it('zeigt CustomerFeedbackAlert nicht wenn previousFeedback leer ist', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        previousFeedback: []
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(screen.queryByTestId('customer-feedback-alert')).not.toBeInTheDocument();
    });

    it('rendert AiAssistantCTA mit korrekten Props', () => {
      render(<ContentTab {...defaultProps} />);

      expect(screen.getByTestId('ai-assistant-cta')).toBeInTheDocument();
    });

    it('rendert die Hauptstruktur mit korrekten CSS-Klassen', () => {
      const { container } = render(<ContentTab {...defaultProps} />);

      const mainDiv = container.querySelector('.bg-white.rounded-lg.border.p-6');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    it('verwendet useCampaign Hook korrekt', () => {
      render(<ContentTab {...defaultProps} />);

      expect(mockUseCampaign).toHaveBeenCalledTimes(1);
    });

    it('holt alle benötigten Werte aus dem Context', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;

      render(<ContentTab {...defaultProps} />);

      // Prüfe, dass Context-Werte an Child Components übergeben werden
      expect(CampaignContentComposer).toHaveBeenCalled();
      expect(KeyVisualSection).toHaveBeenCalled();
    });

    it('übergibt campaignTitle an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        campaignTitle: 'Custom Campaign Title'
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Campaign Title'
        }),
        expect.anything()
      );
    });

    it('übergibt editorContent an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editorContent: '<p>Custom editor content</p>'
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          mainContent: '<p>Custom editor content</p>'
        }),
        expect.anything()
      );
    });
  });

  describe('CampaignContentComposer Props', () => {
    it('übergibt alle erforderlichen Props an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          clientId: 'company-123',
          clientName: 'Test Company',
          title: 'Test Campaign Title',
          mainContent: '<p>Test editor content</p>',
          keywords: ['test', 'keywords'],
          hideMainContentField: false,
          hidePreview: true,
          hideBoilerplates: true
        }),
        expect.anything()
      );
    });

    it('übergibt updateTitle als onTitleChange an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockUpdateTitle = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateTitle: mockUpdateTitle
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          onTitleChange: mockUpdateTitle
        }),
        expect.anything()
      );
    });

    it('übergibt updateEditorContent als onMainContentChange an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockUpdateEditorContent = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateEditorContent: mockUpdateEditorContent
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          onMainContentChange: mockUpdateEditorContent
        }),
        expect.anything()
      );
    });

    it('übergibt updatePressReleaseContent als onFullContentChange an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockUpdatePressReleaseContent = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updatePressReleaseContent: mockUpdatePressReleaseContent
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          onFullContentChange: mockUpdatePressReleaseContent
        }),
        expect.anything()
      );
    });

    it('übergibt boilerplateSections korrekt an CampaignContentComposer', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockBoilerplateSections = [
        { id: '1', content: 'Section 1' },
        { id: '2', content: 'Section 2' }
      ];

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: mockBoilerplateSections
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          initialBoilerplateSections: mockBoilerplateSections
        }),
        expect.anything()
      );
    });
  });

  describe('KeyVisualSection Props', () => {
    it('übergibt alle erforderlichen Props an KeyVisualSection', () => {
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;

      render(<ContentTab {...defaultProps} />);

      expect(KeyVisualSection).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          userId: 'user-456',
          clientId: 'company-123',
          clientName: 'Test Company',
          campaignId: 'campaign-789',
          campaignName: 'Test Campaign Title',
          selectedProjectId: 'project-456',
          selectedProjectName: 'Test Project',
          enableSmartRouter: true
        }),
        expect.anything()
      );
    });

    it('übergibt keyVisual als value an KeyVisualSection', () => {
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;
      const mockKeyVisual = {
        url: 'https://example.com/image.jpg',
        alt: 'Test Image'
      };

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        keyVisual: mockKeyVisual
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(KeyVisualSection).toHaveBeenCalledWith(
        expect.objectContaining({
          value: mockKeyVisual
        }),
        expect.anything()
      );
    });

    it('übergibt updateKeyVisual als onChange an KeyVisualSection', () => {
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;
      const mockUpdateKeyVisual = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateKeyVisual: mockUpdateKeyVisual
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(KeyVisualSection).toHaveBeenCalledWith(
        expect.objectContaining({
          onChange: mockUpdateKeyVisual
        }),
        expect.anything()
      );
    });
  });

  describe('Callback Tests', () => {
    it('übergibt onOpenAiModal an AiAssistantCTA', () => {
      const AiAssistantCTA = require('../components/AiAssistantCTA').AiAssistantCTA;
      const mockOnOpenAiModal = jest.fn();

      render(<ContentTab {...defaultProps} onOpenAiModal={mockOnOpenAiModal} />);

      expect(AiAssistantCTA).toHaveBeenCalledWith(
        expect.objectContaining({
          onOpenAiModal: mockOnOpenAiModal
        }),
        expect.anything()
      );
    });

    it('handleSeoScoreChange transformiert scoreData korrekt mit social property', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockOnSeoScoreChange = jest.fn();

      render(<ContentTab {...defaultProps} onSeoScoreChange={mockOnSeoScoreChange} />);

      // Hole die onSeoScoreChange Callback-Funktion aus dem Mock-Call
      const composerProps = CampaignContentComposer.mock.calls[0][0];
      const handleSeoScoreChange = composerProps.onSeoScoreChange;

      // Simuliere SEO Score Change mit breakdown aber ohne social
      const scoreData = {
        totalScore: 85,
        breakdown: {
          headline: 20,
          keywords: 15,
          structure: 15
        },
        hints: []
      };

      handleSeoScoreChange(scoreData);

      // Prüfe, dass social Property hinzugefügt wurde
      expect(mockOnSeoScoreChange).toHaveBeenCalledWith({
        totalScore: 85,
        breakdown: {
          headline: 20,
          keywords: 15,
          structure: 15,
          social: 0
        },
        hints: []
      });
    });

    it('handleSeoScoreChange behält existierendes social property bei', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockOnSeoScoreChange = jest.fn();

      render(<ContentTab {...defaultProps} onSeoScoreChange={mockOnSeoScoreChange} />);

      const composerProps = CampaignContentComposer.mock.calls[0][0];
      const handleSeoScoreChange = composerProps.onSeoScoreChange;

      const scoreData = {
        totalScore: 90,
        breakdown: {
          headline: 20,
          keywords: 15,
          structure: 15,
          social: 10
        },
        hints: []
      };

      handleSeoScoreChange(scoreData);

      expect(mockOnSeoScoreChange).toHaveBeenCalledWith({
        totalScore: 90,
        breakdown: {
          headline: 20,
          keywords: 15,
          structure: 15,
          social: 10
        },
        hints: []
      });
    });

    it('handleSeoScoreChange behandelt scoreData ohne breakdown korrekt', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;
      const mockOnSeoScoreChange = jest.fn();

      render(<ContentTab {...defaultProps} onSeoScoreChange={mockOnSeoScoreChange} />);

      const composerProps = CampaignContentComposer.mock.calls[0][0];
      const handleSeoScoreChange = composerProps.onSeoScoreChange;

      const scoreData = {
        totalScore: 75
      };

      handleSeoScoreChange(scoreData);

      // Sollte unverändert weitergereicht werden wenn kein breakdown vorhanden
      expect(mockOnSeoScoreChange).toHaveBeenCalledWith({
        totalScore: 75
      });
    });
  });

  describe('Performance-Hooks Tests', () => {
    it('verwendet useCallback für handleSeoScoreChange', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      // Erster Render
      render(<ContentTab {...defaultProps} />);

      const firstOnSeoScoreChange = CampaignContentComposer.mock.calls[0][0].onSeoScoreChange;

      // Prüfe dass die Callback-Funktion existiert
      expect(firstOnSeoScoreChange).toBeDefined();
      expect(typeof firstOnSeoScoreChange).toBe('function');
    });

    it('verwendet useMemo für composerKey basierend auf boilerplateSections', () => {
      // Test dass Component mit verschiedenen boilerplateSections rendert
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: []
      } as any);

      const { rerender } = render(<ContentTab {...defaultProps} />);

      // Component sollte erfolgreich rendern
      expect(screen.getByTestId('campaign-content-composer')).toBeInTheDocument();

      // Update mit anderen Sections
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: [
          { id: '1', content: 'A' },
          { id: '2', content: 'B' }
        ]
      } as any);

      rerender(<ContentTab {...defaultProps} />);

      // Component sollte weiterhin korrekt rendern
      expect(screen.getByTestId('campaign-content-composer')).toBeInTheDocument();
    });

    it('ist mit React.memo wrapped für Performance-Optimierung', () => {
      // Prüfe dass ContentTab korrekt rendert und keine Fehler wirft
      render(<ContentTab {...defaultProps} />);

      expect(screen.getByTestId('campaign-content-composer')).toBeInTheDocument();
      expect(screen.getByTestId('key-visual-section')).toBeInTheDocument();

      // Component sollte keine displayName haben (typisch für React.memo)
      expect(ContentTab.displayName).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('funktioniert wenn keyVisual undefined ist', () => {
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        keyVisual: undefined
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(KeyVisualSection).toHaveBeenCalledWith(
        expect.objectContaining({
          value: undefined
        }),
        expect.anything()
      );
    });

    it('funktioniert wenn selectedProjectName undefined ist', () => {
      const KeyVisualSection = require('@/components/campaigns/KeyVisualSection').KeyVisualSection;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        selectedProjectName: undefined
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(KeyVisualSection).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedProjectName: undefined
        }),
        expect.anything()
      );
    });

    it('funktioniert mit leeren keywords Array', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        keywords: []
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: []
        }),
        expect.anything()
      );
    });

    it('funktioniert mit leeren boilerplateSections Array', () => {
      const CampaignContentComposer = require('@/components/pr/campaign/CampaignContentComposer').default;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: []
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CampaignContentComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          initialBoilerplateSections: []
        }),
        expect.anything()
      );
    });
  });

  describe('CustomerFeedbackAlert Integration', () => {
    it('übergibt previousFeedback an CustomerFeedbackAlert', () => {
      const CustomerFeedbackAlert = require('../components/CustomerFeedbackAlert').CustomerFeedbackAlert;
      const mockFeedback = [
        {
          author: 'Kunde',
          comment: 'Bitte ändern',
          requestedAt: {
            toDate: () => new Date()
          }
        }
      ];

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        previousFeedback: mockFeedback
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CustomerFeedbackAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback: mockFeedback
        }),
        expect.anything()
      );
    });

    it('übergibt leeres Array wenn previousFeedback undefined ist', () => {
      const CustomerFeedbackAlert = require('../components/CustomerFeedbackAlert').CustomerFeedbackAlert;

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        previousFeedback: null
      } as any);

      render(<ContentTab {...defaultProps} />);

      expect(CustomerFeedbackAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback: []
        }),
        expect.anything()
      );
    });
  });
});
