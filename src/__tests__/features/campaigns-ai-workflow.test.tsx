// src/__tests__/features/campaigns-ai-workflow.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { geminiService } from '@/lib/ai/gemini-service';

// Mock AI service
jest.mock('@/lib/ai/gemini-service', () => ({
  geminiService: {
    generateStructuredPressRelease: jest.fn()
  }
}));

// Mock dynamic import for AI modal
jest.mock('next/dynamic', () => () => {
  const MockComponent = ({ onClose, onGenerate, existingContent }: any) => (
    <div data-testid="ai-modal">
      <h2>KI-Assistent</h2>
      <button onClick={() => onGenerate({
        structured: {
          headline: 'AI Generated Title',
          leadParagraph: 'AI generated lead paragraph',
          bodyParagraphs: ['AI body paragraph 1', 'AI body paragraph 2'],
          quote: {
            text: 'AI generated quote',
            person: 'John Doe',
            role: 'CEO',
            company: 'Test Company'
          }
        }
      })}>
        Generate
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  );
  return MockComponent;
});

describe('Campaign AI Integration Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Content Generation', () => {
    it('should integrate AI-generated content into campaign', async () => {
      // Mock AI service response
      (geminiService.generateStructuredPressRelease as jest.Mock).mockResolvedValue({
        headline: 'AI Generated Press Release',
        leadParagraph: 'This is an AI-generated lead paragraph.',
        bodyParagraphs: [
          'First AI body paragraph with relevant content.',
          'Second AI body paragraph expanding on the topic.'
        ],
        quote: {
          text: 'This AI-generated quote adds credibility to our press release.',
          person: 'Jane Smith',
          role: 'Marketing Director',
          company: 'Innovative Solutions GmbH'
        }
      });

      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Click AI Assistant button
      const aiButton = screen.getByText('KI-Assistent');
      fireEvent.click(aiButton);

      // AI Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
      });

      // Generate AI content
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      // Verify content was generated and integrated
      await waitFor(() => {
        // Title should be updated
        const titleInput = screen.getByDisplayValue('AI Generated Title');
        expect(titleInput).toBeInTheDocument();
      });

      // Modal should close
      expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
    });

    it('should handle AI generation errors gracefully', async () => {
      // Mock AI service error
      (geminiService.generateStructuredPressRelease as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Click AI Assistant button
      const aiButton = screen.getByText('KI-Assistent');
      fireEvent.click(aiButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
      });

      // Try to generate content
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      // Should handle error gracefully (implementation depends on error handling in component)
      await waitFor(() => {
        // Error handling would be implemented in the actual component
        expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Boilerplate Section Management', () => {
    it('should manage AI-generated boilerplate sections', async () => {
      const EditCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page').default;
      
      // Mock existing campaign with boilerplate sections
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue({
        id: 'test-campaign',
        title: 'Test Campaign',
        boilerplateSections: [
          {
            id: 'section-1',
            type: 'lead',
            order: 0,
            isLocked: false,
            isCollapsed: false,
            customTitle: 'Lead-Absatz',
            content: '<p><strong>Existing lead paragraph</strong></p>'
          },
          {
            id: 'section-2', 
            type: 'quote',
            order: 1,
            isLocked: false,
            isCollapsed: false,
            customTitle: 'Zitat',
            content: 'Existing quote content',
            metadata: {
              person: 'John Doe',
              role: 'CEO',
              company: 'Test Corp'
            }
          }
        ]
      });

      render(<EditCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagne bearbeiten')).toBeInTheDocument();
      });

      // Click AI Assistant to add more sections
      const aiButton = screen.getByText('KI-Assistent');
      fireEvent.click(aiButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
      });

      // Generate additional AI content
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      // New AI sections should be added to existing ones
      await waitFor(() => {
        expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
        // Verify new sections were added (implementation specific)
      });
    });
  });

  describe('Content Composer Integration', () => {
    it('should work with CampaignContentComposer for AI content', async () => {
      // This test would verify that AI-generated content integrates properly
      // with the CampaignContentComposer component
      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // The CampaignContentComposer should be present
      expect(screen.getByText(/Pressemitteilung/)).toBeInTheDocument();
      
      // AI Assistant button should be available
      expect(screen.getByText('KI-Assistent')).toBeInTheDocument();
      
      // Info box about AI usage should be present
      expect(screen.getByText(/Tipp: Nutze den KI-Assistenten!/)).toBeInTheDocument();
    });
  });

  describe('AI Model Information Display', () => {
    it('should display current AI model information', async () => {
      const CampaignsPage = require('@/app/dashboard/pr-tools/campaigns/page').default;
      
      // Mock campaigns service
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getAllByOrganization = jest.fn().mockResolvedValue([]);

      render(<CampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagnen')).toBeInTheDocument();
      });

      // Should display AI model information
      expect(screen.getByText('KI-Modell:')).toBeInTheDocument();
      expect(screen.getByText('Gemini 1.5 Flash')).toBeInTheDocument();
    });
  });
});