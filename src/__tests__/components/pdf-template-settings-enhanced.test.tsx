// src/__tests__/components/pdf-template-settings-enhanced.test.tsx
// Comprehensive UI-Component Tests für PDF-Template Settings Page

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDFTemplateSettingsPage from '@/app/dashboard/settings/pdf-templates/page';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';

// ==================== MOCKS ====================

jest.mock('@/lib/hooks/useAuth');
jest.mock('react-hot-toast');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.open für PDF-Downloads
global.open = jest.fn();

// ==================== TEST DATA ====================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockOrganization = {
  id: 'org-456',
  name: 'Test Organization'
};

const mockTemplates = [
  {
    id: 'template-1',
    name: 'Professional Template',
    description: 'Clean professional design',
    version: '1.0',
    isSystem: true,
    colorScheme: {
      primary: '#005fab',
      secondary: '#f8f9fa',
      accent: '#28a745',
      text: '#333333'
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Arial',
      baseFontSize: 12,
      lineHeight: 1.5
    },
    components: {
      header: {
        enabled: true,
        backgroundColor: '#005fab',
        textColor: '#ffffff',
        height: 60
      },
      footer: {
        enabled: true,
        backgroundColor: '#f8f9fa',
        textColor: '#333333'
      },
      sidebar: {
        enabled: true,
        width: 200,
        backgroundColor: '#f8f9fa'
      }
    }
  },
  {
    id: 'template-2',
    name: 'Modern Template',
    description: 'Contemporary design with bold colors',
    version: '2.1',
    isSystem: true,
    colorScheme: {
      primary: '#dc3545',
      secondary: '#e9ecef',
      accent: '#007bff',
      text: '#212529'
    },
    typography: {
      primaryFont: 'Roboto',
      secondaryFont: 'Helvetica',
      baseFontSize: 11,
      lineHeight: 1.4
    },
    components: {
      header: {
        enabled: true,
        backgroundColor: '#dc3545',
        textColor: '#ffffff',
        height: 80
      },
      footer: {
        enabled: false
      },
      sidebar: {
        enabled: true,
        width: 180,
        backgroundColor: '#e9ecef'
      }
    }
  }
];

const mockUsageStats = [
  {
    templateId: 'template-1',
    usageCount: 15,
    lastUsed: new Date('2024-01-15')
  },
  {
    templateId: 'template-2',
    usageCount: 8,
    lastUsed: new Date('2024-01-10')
  }
];

// ==================== HELPER FUNCTIONS ====================

const mockSuccessfulFetch = (data: any) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ success: true, ...data })
  } as Response);
};

const mockFailedFetch = (error: string) => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ success: false, error })
  } as Response);
};

const setupAuthMock = (user = mockUser, organization = mockOrganization) => {
  mockUseAuth.mockReturnValue({
    user,
    organization,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn()
  });
};

// ==================== TEST SUITE ====================

describe('PDFTemplateSettingsPage Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    setupAuthMock();
    
    // Mock für toast
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
    mockToast.loading = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== LOADING STATE TESTS ====================

  describe('Loading States', () => {
    test('sollte Loading-Skeleton anzeigen', () => {
      setupAuthMock(undefined, undefined);
      mockUseAuth.mockReturnValue({
        user: null,
        organization: null,
        loading: true,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn()
      });

      render(<PDFTemplateSettingsPage />);
      
      expect(screen.getByText('PDF-Template Einstellungen')).toBeInTheDocument();
    });

    test('sollte Templates laden beim Mount', async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/pdf-templates?organizationId=org-456&includeSystem=true'
        );
      });
    });
  });

  // ==================== TEMPLATE SELECTION TESTS ====================

  describe('Template Selection', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
    });

    test('sollte alle Templates anzeigen', () => {
      expect(screen.getByText('Professional Template')).toBeInTheDocument();
      expect(screen.getByText('Modern Template')).toBeInTheDocument();
      expect(screen.getByText('Clean professional design')).toBeInTheDocument();
      expect(screen.getByText('Contemporary design with bold colors')).toBeInTheDocument();
    });

    test('sollte Standard-Template markieren', () => {
      expect(screen.getByText('Standard-Template')).toBeInTheDocument();
    });

    test('sollte Template auswählen können', async () => {
      const modernTemplate = screen.getByText('Modern Template').closest('.cursor-pointer');
      expect(modernTemplate).toBeInTheDocument();
      
      if (modernTemplate) {
        await user.click(modernTemplate);
        
        // Template sollte ausgewählt werden (durch visuelle Änderungen erkennbar)
        expect(modernTemplate).toHaveClass('ring-2', 'ring-[#005fab]');
      }
    });

    test('sollte System-Badge für System-Templates anzeigen', () => {
      const systemBadges = screen.getAllByText('System');
      expect(systemBadges).toHaveLength(2); // Beide Templates sind System-Templates
    });
  });

  // ==================== TEMPLATE ACTIONS TESTS ====================

  describe('Template Actions', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-2'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
      
      // Professional Template auswählen (ist nicht Standard)
      const professionalTemplate = screen.getByText('Professional Template').closest('.cursor-pointer');
      if (professionalTemplate) {
        await user.click(professionalTemplate);
      }
    });

    test('sollte Template als Standard setzen können', async () => {
      mockSuccessfulFetch({});
      
      const setDefaultButton = screen.getByText('Als Standard setzen');
      await user.click(setDefaultButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/pdf-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: 'org-456',
            templateId: 'template-1',
            action: 'set_default'
          })
        });
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Professional Template wurde als Standard-Template gesetzt');
    });

    test('sollte Fehler bei Standard-Template Setzung behandeln', async () => {
      mockFailedFetch('Template konnte nicht gesetzt werden');
      
      const setDefaultButton = screen.getByText('Als Standard setzen');
      await user.click(setDefaultButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  // ==================== CUSTOMIZATION TESTS ====================

  describe('Template Customization', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
      
      // Zur Anpassung-Tab wechseln
      const customizationTab = screen.getByText('Anpassen');
      await user.click(customizationTab);
    });

    test('sollte Customization-Tab anzeigen', () => {
      expect(screen.getByText('Farbschema')).toBeInTheDocument();
      expect(screen.getByText('Typografie')).toBeInTheDocument();
    });

    test('sollte Primärfarbe ändern können', async () => {
      const primaryColorInput = screen.getByLabelText('Primärfarbe');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#ff0000');
      
      // Input sollte neuen Wert haben
      expect(primaryColorInput).toHaveValue('#ff0000');
    });

    test('sollte Schriftart ändern können', async () => {
      const fontSelect = screen.getByDisplayValue('Inter');
      await user.click(fontSelect);
      
      const robotoOption = screen.getByText('Roboto');
      await user.click(robotoOption);
      
      expect(fontSelect).toHaveValue('Roboto');
    });

    test('sollte Anpassungen zurücksetzen können', async () => {
      const resetButton = screen.getByText('Anpassungen zurücksetzen');
      await user.click(resetButton);
      
      // Alle Werte sollten zurückgesetzt werden
      const primaryColorInput = screen.getByLabelText('Primärfarbe');
      expect(primaryColorInput).toHaveValue('#005fab'); // Original-Wert
    });
  });

  // ==================== PREVIEW TESTS ====================

  describe('Template Preview', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
      
      // Zur Vorschau-Tab wechseln
      const previewTab = screen.getByText('Vorschau');
      await user.click(previewTab);
    });

    test('sollte Preview-Tab anzeigen', async () => {
      mockSuccessfulFetch({
        html: '<div>Preview HTML</div>'
      });
      
      await waitFor(() => {
        expect(screen.getByText('Vorschau-Einstellungen')).toBeInTheDocument();
      });
    });

    test('sollte Vorschau generieren können', async () => {
      mockSuccessfulFetch({
        html: '<div>Generated Preview</div>'
      });
      
      const generateButton = screen.getByText('Vorschau aktualisieren');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/pdf-templates/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('templateId')
        });
      });
    });

    test('sollte PDF herunterladen können', async () => {
      mockSuccessfulFetch({
        success: true,
        pdfUrl: 'https://example.com/preview.pdf'
      });
      
      const downloadButton = screen.getByText('PDF herunterladen');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('preview')
        });
      });
      
      expect(global.open).toHaveBeenCalledWith('https://example.com/preview.pdf', '_blank');
    });
  });

  // ==================== UPLOAD TESTS ====================

  describe('Custom Template Upload', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
      
      // Zur Upload-Tab wechseln
      const uploadTab = screen.getByText('Upload');
      await user.click(uploadTab);
    });

    test('sollte Upload-Tab anzeigen', () => {
      expect(screen.getByText('Eigenes Template hochladen')).toBeInTheDocument();
      expect(screen.getByText('Laden Sie Ihr eigenes Template im JSON-Format hoch.')).toBeInTheDocument();
    });

    test('sollte Datei auswählen können', async () => {
      const file = new File(['{"template": "data"}'], 'template.json', { type: 'application/json' });
      const fileInput = screen.getByLabelText('Template-Datei');
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('template.json')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });

    test('sollte Template hochladen können', async () => {
      const file = new File(['{"template": "data"}'], 'template.json', { type: 'application/json' });
      const fileInput = screen.getByLabelText('Template-Datei');
      
      await user.upload(fileInput, file);
      
      mockSuccessfulFetch({});
      mockSuccessfulFetch({
        templates: [...mockTemplates, { id: 'template-3', name: 'Uploaded Template' }],
        defaultTemplateId: 'template-1'
      });
      
      const uploadButton = screen.getByText('Template hochladen');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/pdf-templates/upload', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Custom Template erfolgreich hochgeladen');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    test('sollte Fehler beim Template-Laden anzeigen', async () => {
      mockFailedFetch('Templates konnten nicht geladen werden');
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Templates konnten nicht geladen werden')).toBeInTheDocument();
      });
    });

    test('sollte Fehler bei Vorschau-Generierung behandeln', async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        const previewTab = screen.getByText('Vorschau');
        user.click(previewTab);
      });
      
      mockFailedFetch('Vorschau konnte nicht generiert werden');
      
      const generateButton = await screen.findByText('Vorschau aktualisieren');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Vorschau konnte nicht generiert werden');
      });
    });

    test('sollte mit fehlender Organization umgehen', () => {
      setupAuthMock(mockUser, undefined);
      
      render(<PDFTemplateSettingsPage />);
      
      // Sollte nicht crashen und graceful handeln
      expect(screen.getByText('PDF-Template Einstellungen')).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
    });

    test('sollte korrekte Heading-Hierarchie haben', () => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PDF-Template Einstellungen');
    });

    test('sollte Labels für Form-Inputs haben', async () => {
      const customizationTab = screen.getByText('Anpassen');
      await user.click(customizationTab);
      
      expect(screen.getByLabelText('Primärfarbe')).toBeInTheDocument();
      expect(screen.getByLabelText('Akzentfarbe')).toBeInTheDocument();
      expect(screen.getByLabelText('Hauptschriftart')).toBeInTheDocument();
    });

    test('sollte Keyboard-Navigation unterstützen', async () => {
      const tabs = screen.getAllByRole('button', { name: /Template wählen|Anpassen|Vorschau|Upload/ });
      
      tabs[0].focus();
      expect(document.activeElement).toBe(tabs[0]);
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance', () => {
    test('sollte Templates nur einmal beim Mount laden', async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      
      const { rerender } = render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Templates + Usage Stats
      });
      
      rerender(<PDFTemplateSettingsPage />);
      
      // Sollte nicht erneut laden
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('sollte Usage-Stats effizient laden', async () => {
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-1'
      });
      mockSuccessfulFetch({
        stats: mockUsageStats
      });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/pdf-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: 'org-456',
            action: 'get_usage_stats'
          })
        });
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    test('sollte kompletten Template-Workflow durchlaufen können', async () => {
      // 1. Templates laden
      mockSuccessfulFetch({
        templates: mockTemplates,
        defaultTemplateId: 'template-2'
      });
      mockSuccessfulFetch({ stats: mockUsageStats });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
      });
      
      // 2. Template auswählen
      const professionalTemplate = screen.getByText('Professional Template').closest('.cursor-pointer');
      if (professionalTemplate) {
        await user.click(professionalTemplate);
      }
      
      // 3. Als Standard setzen
      mockSuccessfulFetch({});
      const setDefaultButton = screen.getByText('Als Standard setzen');
      await user.click(setDefaultButton);
      
      // 4. Anpassen
      const customizationTab = screen.getByText('Anpassen');
      await user.click(customizationTab);
      
      const primaryColorInput = screen.getByLabelText('Primärfarbe');
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#ff0000');
      
      // 5. Vorschau generieren
      mockSuccessfulFetch({ html: '<div>Preview</div>' });
      const previewTab = screen.getByText('Vorschau');
      await user.click(previewTab);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/pdf-templates/preview', expect.any(Object));
      });
      
      expect(mockToast.success).toHaveBeenCalled();
    });

    test('sollte mit realistischen API-Responses umgehen', async () => {
      const realApiResponse = {
        success: true,
        templates: mockTemplates,
        defaultTemplateId: 'template-1',
        metadata: {
          totalCount: 2,
          systemCount: 2,
          customCount: 0
        }
      };
      
      mockSuccessfulFetch(realApiResponse);
      mockSuccessfulFetch({ success: true, stats: mockUsageStats });
      
      render(<PDFTemplateSettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Professional Template')).toBeInTheDocument();
        expect(screen.getByText('Modern Template')).toBeInTheDocument();
      });
      
      // Usage-Stats sollten angezeigt werden
      expect(screen.getByText('Verwendet: 15x')).toBeInTheDocument();
      expect(screen.getByText('Verwendet: 8x')).toBeInTheDocument();
    });
  });
});