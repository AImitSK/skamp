// src/__tests__/components/templates/TemplatePreviewModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { PDFTemplate, MockPRData } from '@/types/pdf-template';

const mockTemplate: PDFTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'Template for testing',
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
    header: { backgroundColor: '#005fab', textColor: '#ffffff' },
    title: { textColor: '#005fab', fontSize: 24 },
    content: { fontSize: 11, textColor: '#1f2937' },
    sidebar: { backgroundColor: '#f8fafc' },
    footer: { backgroundColor: '#f8fafc', fontSize: 9 },
    logo: { margin: 10 },
    keyVisual: { borderRadius: 6 },
    boilerplate: { backgroundColor: '#f8fafc' }
  }
};

// Mock fetch for preview generation
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      html: '<html><body><h1>Mock Preview HTML</h1></body></html>',
      templateName: 'Test Template'
    })
  })
) as jest.Mock;

describe('TemplatePreviewModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with template preview', async () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    expect(screen.getByText('Template-Vorschau: Test Template')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Mock Preview HTML')).toBeInTheDocument();
    });
  });

  it('handles modal close', () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    const closeButton = screen.getByRole('button', { name: /schließen/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles template selection from preview', async () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mock Preview HTML')).toBeInTheDocument();
    });

    const selectButton = screen.getByRole('button', { name: /template verwenden/i });
    fireEvent.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalledWith(mockTemplate);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state during preview generation', () => {
    // Mock fetch to return a pending promise
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    expect(screen.getByText(/vorschau wird generiert/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles preview generation error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Preview failed'));

    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/fehler beim generieren der vorschau/i)).toBeInTheDocument();
    });
  });

  it('allows switching between different mock data types', async () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    const mockDataSelector = screen.getByRole('combobox', { name: /mock-daten/i });
    fireEvent.change(mockDataSelector, { target: { value: 'tech' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/pdf-templates/preview',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mockDataType":"tech"')
        })
      );
    });
  });

  it('supports fullscreen preview mode', () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        organizationId="test-org"
      />
    );

    const fullscreenButton = screen.getByRole('button', { name: /vollbild/i });
    fireEvent.click(fullscreenButton);

    const modal = screen.getByTestId('template-preview-modal');
    expect(modal).toHaveClass('fullscreen');
  });
});