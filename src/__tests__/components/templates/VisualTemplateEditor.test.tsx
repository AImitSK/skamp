// src/__tests__/components/templates/VisualTemplateEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { VisualTemplateEditor } from '@/components/templates/VisualTemplateEditor';
import { PDFTemplate } from '@/types/pdf-template';

const mockTemplate: PDFTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'Template for testing',
  version: '1.0.0',
  isSystem: false,
  isActive: true,
  createdAt: new Date(),
  organizationId: 'test-org',
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

describe('VisualTemplateEditor Component', () => {
  const mockOnSave = jest.fn();
  const mockOnPreview = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template editor with all editing panels', () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Template bearbeiten: Test Template')).toBeInTheDocument();
    expect(screen.getByText('Farbschema')).toBeInTheDocument();
    expect(screen.getByText('Typografie')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Komponenten')).toBeInTheDocument();
  });

  it('allows editing color scheme', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const primaryColorInput = screen.getByDisplayValue('#005fab');
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

    await waitFor(() => {
      expect(primaryColorInput).toHaveValue('#ff0000');
    });

    // Live preview should update
    expect(mockOnPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        colorScheme: expect.objectContaining({
          primary: '#ff0000'
        })
      })
    );
  });

  it('allows editing typography settings', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const fontSizeInput = screen.getByDisplayValue('11');
    fireEvent.change(fontSizeInput, { target: { value: '12' } });

    await waitFor(() => {
      expect(fontSizeInput).toHaveValue('12');
    });
  });

  it('allows editing layout settings', () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const marginTopInput = screen.getByDisplayValue('20'); // Top margin
    fireEvent.change(marginTopInput, { target: { value: '25' } });

    expect(marginTopInput).toHaveValue('25');
  });

  it('handles template save', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const primaryColorInput = screen.getByDisplayValue('#005fab');
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

    const saveButton = screen.getByRole('button', { name: /speichern/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          colorScheme: expect.objectContaining({
            primary: '#ff0000'
          })
        })
      );
    });
  });

  it('handles template preview', () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const previewButton = screen.getByRole('button', { name: /vorschau/i });
    fireEvent.click(previewButton);

    expect(mockOnPreview).toHaveBeenCalledWith(mockTemplate);
  });

  it('handles template cancel', () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows unsaved changes warning', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const primaryColorInput = screen.getByDisplayValue('#005fab');
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

    await waitFor(() => {
      expect(screen.getByText(/ungespeicherte änderungen/i)).toBeInTheDocument();
    });
  });

  it('allows resetting to original values', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const primaryColorInput = screen.getByDisplayValue('#005fab');
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

    const resetButton = screen.getByRole('button', { name: /zurücksetzen/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(primaryColorInput).toHaveValue('#005fab');
    });
  });

  it('supports real-time preview updates', async () => {
    render(
      <VisualTemplateEditor
        template={mockTemplate}
        onSave={mockOnSave}
        onPreview={mockOnPreview}
        onCancel={mockOnCancel}
      />
    );

    const primaryColorInput = screen.getByDisplayValue('#005fab');
    
    // Enable real-time preview
    const realTimeToggle = screen.getByRole('checkbox', { name: /live-vorschau/i });
    fireEvent.click(realTimeToggle);

    // Make changes
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

    // Should trigger preview automatically with debounce
    await waitFor(() => {
      expect(mockOnPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          colorScheme: expect.objectContaining({
            primary: '#ff0000'
          })
        })
      );
    }, { timeout: 1000 });
  });
});