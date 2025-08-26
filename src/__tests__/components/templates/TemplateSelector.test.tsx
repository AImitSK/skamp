// src/__tests__/components/templates/TemplateSelector.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { TemplateSelector } from '@/components/templates/TemplateSelector';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { PDFTemplate } from '@/types/pdf-template';

// Mock the PDF Template Service
jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getSystemTemplates: jest.fn(),
    getOrganizationTemplates: jest.fn(),
    getDefaultTemplate: jest.fn(),
    applyTemplate: jest.fn(),
  }
}));

const mockTemplates: PDFTemplate[] = [
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean and modern design for professional use',
    version: '1.0.0',
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    layout: {
      type: 'modern',
      headerHeight: 60,
      footerHeight: 40,
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      columns: 1,
      pageFormat: 'A4'
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      baseFontSize: 11,
      lineHeight: 1.6,
      headingScale: [24, 18, 14, 12]
    },
    colorScheme: {
      primary: '#005fab',
      secondary: '#f8fafc',
      accent: '#3b82f6',
      text: '#1f2937',
      background: '#ffffff',
      border: '#e5e7eb'
    },
    components: {
      header: { backgroundColor: '#005fab', textColor: '#ffffff', padding: 12 },
      title: { textColor: '#005fab', fontSize: 24, fontWeight: 'bold' },
      content: { fontSize: 11, textColor: '#1f2937' },
      sidebar: { backgroundColor: '#f8fafc', borderColor: '#e5e7eb' },
      footer: { backgroundColor: '#f8fafc', fontSize: 9, textAlign: 'center' },
      logo: { margin: 10 },
      keyVisual: { borderRadius: 6 },
      boilerplate: { backgroundColor: '#f8fafc', padding: 15 }
    }
  }
];

describe('TemplateSelector Component', () => {
  const mockOnSelect = jest.fn();
  const mockOnPreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (pdfTemplateService.getSystemTemplates as jest.Mock).mockResolvedValue(mockTemplates);
    (pdfTemplateService.getOrganizationTemplates as jest.Mock).mockResolvedValue([]);
  });

  it('renders template selector with system templates', async () => {
    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId="modern-professional"
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    expect(screen.getByText('Clean and modern design for professional use')).toBeInTheDocument();
  });

  it('handles template selection', async () => {
    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId=""
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const selectButton = screen.getByRole('button', { name: /auswählen/i });
    fireEvent.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalledWith('modern-professional');
  });

  it('handles template preview', async () => {
    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId=""
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const previewButton = screen.getByRole('button', { name: /vorschau/i });
    fireEvent.click(previewButton);

    expect(mockOnPreview).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('shows selected template as active', async () => {
    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId="modern-professional"
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Professional')).toBeInTheDocument();
    });

    const templateCard = screen.getByTestId('template-card-modern-professional');
    expect(templateCard).toHaveClass('selected');
  });

  it('handles loading state', () => {
    (pdfTemplateService.getSystemTemplates as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId=""
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    expect(screen.getByText(/laden/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (pdfTemplateService.getSystemTemplates as jest.Mock).mockRejectedValue(
      new Error('Failed to load templates')
    );

    render(
      <TemplateSelector
        organizationId="test-org"
        selectedTemplateId=""
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/fehler beim laden/i)).toBeInTheDocument();
    });
  });
});