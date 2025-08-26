// src/__tests__/components/campaigns/CampaignPreviewStep.enhanced.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { CampaignPreviewStep } from '@/components/campaigns/CampaignPreviewStep';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { KeyVisualData, CampaignAssetAttachment } from '@/types/pr';

// Mock PDF Template Service
jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getSystemTemplates: jest.fn(),
    getDefaultTemplate: jest.fn(),
    applyTemplate: jest.fn(),
  }
}));

// Mock PDF Generation API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      pdfBase64: 'mockBase64PdfData',
      fileName: 'test-campaign.pdf',
      metadata: {
        templateId: 'modern-professional',
        templateName: 'Modern Professional',
        renderMethod: 'template'
      }
    })
  })
) as jest.Mock;

const mockProps = {
  campaignTitle: 'Test Campaign Title',
  finalContentHtml: '<p>This is the final content HTML</p>',
  keyVisual: {
    url: 'https://example.com/image.jpg',
    alt: 'Test Key Visual',
    caption: 'Test Caption'
  } as KeyVisualData,
  selectedCompanyName: 'Test Company',
  campaignAdminName: 'John Doe',
  realPrScore: {
    totalScore: 85,
    breakdown: {
      headline: 90,
      keywords: 80,
      structure: 85,
      relevance: 88,
      concreteness: 82,
      engagement: 87,
      social: 75
    },
    hints: ['Great keyword usage', 'Consider improving social engagement'],
    keywordMetrics: []
  },
  keywords: ['test', 'campaign', 'pr'],
  boilerplateSections: [
    {
      id: 'section1',
      customTitle: 'About Company',
      content: '<p>Company description</p>',
      type: 'main' as const
    }
  ],
  attachedAssets: [] as CampaignAssetAttachment[],
  editorContent: '<p>Editor content</p>',
  approvalData: { customerApprovalRequired: false }
};

describe('CampaignPreviewStep Enhanced Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders campaign preview with template selector', () => {
    render(<CampaignPreviewStep {...mockProps} />);

    expect(screen.getByText('Test Campaign Title')).toBeInTheDocument();
    expect(screen.getByText('This is the final content HTML')).toBeInTheDocument();
    expect(screen.getByText('Template auswählen')).toBeInTheDocument();
  });

  it('displays key visual correctly', () => {
    render(<CampaignPreviewStep {...mockProps} />);

    const keyVisualImage = screen.getByAltText('Test Key Visual');
    expect(keyVisualImage).toBeInTheDocument();
    expect(keyVisualImage).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(screen.getByText('Test Caption')).toBeInTheDocument();
  });

  it('shows PR score and breakdown', () => {
    render(<CampaignPreviewStep {...mockProps} />);

    expect(screen.getByText('PR-Score: 85')).toBeInTheDocument();
    expect(screen.getByText('Headline: 90')).toBeInTheDocument();
    expect(screen.getByText('Keywords: 80')).toBeInTheDocument();
  });

  it('displays boilerplate sections', () => {
    render(<CampaignPreviewStep {...mockProps} />);

    expect(screen.getByText('About Company')).toBeInTheDocument();
    expect(screen.getByText('Company description')).toBeInTheDocument();
  });

  it('handles template selection', async () => {
    (pdfTemplateService.getSystemTemplates as jest.Mock).mockResolvedValue([
      {
        id: 'modern-professional',
        name: 'Modern Professional',
        description: 'Clean modern template'
      }
    ]);

    render(<CampaignPreviewStep {...mockProps} />);

    const templateSelector = screen.getByRole('button', { name: /template auswählen/i });
    fireEvent.click(templateSelector);

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const selectTemplateButton = screen.getByRole('button', { name: /auswählen/i });
    fireEvent.click(selectTemplateButton);

    expect(screen.getByText('Template: Modern Professional')).toBeInTheDocument();
  });

  it('generates PDF with selected template', async () => {
    render(<CampaignPreviewStep {...mockProps} />);

    // First select a template
    const templateSelector = screen.getByRole('button', { name: /template auswählen/i });
    fireEvent.click(templateSelector);

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const selectTemplateButton = screen.getByRole('button', { name: /auswählen/i });
    fireEvent.click(selectTemplateButton);

    // Then generate PDF
    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"templateId":"modern-professional"')
      });
    });
  });

  it('shows PDF generation progress', async () => {
    // Mock slow PDF generation
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            pdfBase64: 'mockBase64PdfData'
          })
        }), 2000)
      )
    );

    render(<CampaignPreviewStep {...mockProps} />);

    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    expect(screen.getByText(/pdf wird generiert/i)).toBeInTheDocument();
    expect(screen.getByTestId('pdf-generation-spinner')).toBeInTheDocument();
  });

  it('handles PDF generation error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('PDF generation failed'));

    render(<CampaignPreviewStep {...mockProps} />);

    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    await waitFor(() => {
      expect(screen.getByText(/fehler bei der pdf-generierung/i)).toBeInTheDocument();
    });
  });

  it('allows template customization', async () => {
    render(<CampaignPreviewStep {...mockProps} />);

    // Select a template first
    const templateSelector = screen.getByRole('button', { name: /template auswählen/i });
    fireEvent.click(templateSelector);

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const selectTemplateButton = screen.getByRole('button', { name: /auswählen/i });
    fireEvent.click(selectTemplateButton);

    // Then access customization
    const customizeButton = screen.getByRole('button', { name: /anpassen/i });
    fireEvent.click(customizeButton);

    expect(screen.getByText('Template-Anpassungen')).toBeInTheDocument();
    expect(screen.getByText('Farbschema')).toBeInTheDocument();
  });

  it('shows live preview when template changes', async () => {
    render(<CampaignPreviewStep {...mockProps} />);

    // Mock template preview update
    const mockPreviewUpdate = jest.fn();
    
    // Select template and make changes
    const templateSelector = screen.getByRole('button', { name: /template auswählen/i });
    fireEvent.click(templateSelector);

    await waitFor(() => {
      const selectButton = screen.getByRole('button', { name: /auswählen/i });
      fireEvent.click(selectButton);
    });

    // Check if preview updates with template styles
    const previewContainer = screen.getByTestId('campaign-preview');
    expect(previewContainer).toHaveStyle('--template-primary: #005fab');
  });

  it('validates required fields before PDF generation', () => {
    const propsWithoutTitle = { ...mockProps, campaignTitle: '' };
    render(<CampaignPreviewStep {...propsWithoutTitle} />);

    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    expect(screen.getByText(/titel ist erforderlich/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('supports PDF download after generation', async () => {
    // Mock URL.createObjectURL and link click
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    const mockClick = jest.fn();
    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    render(<CampaignPreviewStep {...mockProps} />);

    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pdf herunterladen/i })).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /pdf herunterladen/i });
    fireEvent.click(downloadButton);

    expect(mockClick).toHaveBeenCalled();
  });

  it('shows template metadata in PDF info', async () => {
    render(<CampaignPreviewStep {...mockProps} />);

    const generatePdfButton = screen.getByRole('button', { name: /pdf generieren/i });
    fireEvent.click(generatePdfButton);

    await waitFor(() => {
      expect(screen.getByText('Template: Modern Professional')).toBeInTheDocument();
      expect(screen.getByText('Render-Methode: template')).toBeInTheDocument();
    });
  });
});