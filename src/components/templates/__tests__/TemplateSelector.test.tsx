// src/components/templates/__tests__/TemplateSelector.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { AuthContext } from '@/context/AuthContext';
import { PDFTemplate } from '@/types/pdf-template';

// Mock des PDF-Template-Service
jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getAllTemplatesForOrganization: jest.fn(),
    getSystemTemplates: jest.fn(),
    getTemplatePreview: jest.fn(),
  },
}));

// Mock des Auth-Context
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User'
};

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const value = {
    user: mockUser,
    isAuthenticated: true,
    loading: false
  };
  
  return (
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  );
};

// Test-Templates
const mockSystemTemplates: PDFTemplate[] = [
  {
    id: 'modern_professional',
    name: 'Modern Professional',
    description: 'Klares, minimalistisches Design für Business-Kommunikation',
    version: '1.0.0',
    isSystem: true,
    isActive: true,
    usageCount: 42,
    lastUsed: new Date('2023-12-01'),
    layout: {
      type: 'modern',
      headerHeight: 80,
      footerHeight: 60,
      margins: { top: 60, right: 50, bottom: 60, left: 50 },
      columns: 1,
      pageFormat: 'A4'
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      baseFontSize: 11,
      lineHeight: 1.6,
      headingScale: [24, 20, 16, 14]
    },
    colorScheme: {
      primary: '#005fab',
      secondary: '#f8fafc',
      accent: '#0ea5e9',
      text: '#1e293b',
      background: '#ffffff',
      border: '#e2e8f0'
    },
    components: {},
    createdAt: new Date('2023-01-01')
  },
  {
    id: 'classic_elegant',
    name: 'Classic Elegant',
    description: 'Traditionelles Design mit serif-Typografie',
    version: '1.0.0',
    isSystem: true,
    isActive: true,
    usageCount: 28,
    layout: {
      type: 'classic',
      headerHeight: 100,
      footerHeight: 80,
      margins: { top: 80, right: 60, bottom: 80, left: 60 },
      columns: 1,
      pageFormat: 'A4'
    },
    typography: {
      primaryFont: 'Times New Roman',
      secondaryFont: 'Georgia',
      baseFontSize: 12,
      lineHeight: 1.8,
      headingScale: [28, 22, 18, 16]
    },
    colorScheme: {
      primary: '#1f2937',
      secondary: '#f9fafb',
      accent: '#6b7280',
      text: '#111827',
      background: '#ffffff',
      border: '#d1d5db'
    },
    components: {},
    createdAt: new Date('2023-01-01')
  }
];

const mockCustomTemplate: PDFTemplate = {
  id: 'custom_org1_123456',
  name: 'Firmen Template',
  description: 'Benutzerdefiniertes Template für unsere Organisation',
  version: '1.0.0',
  organizationId: 'org-123',
  isSystem: false,
  isActive: true,
  usageCount: 5,
  lastUsed: new Date('2023-12-15'),
  layout: {
    type: 'custom',
    headerHeight: 60,
    footerHeight: 40,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    columns: 1,
    pageFormat: 'A4'
  },
  typography: {
    primaryFont: 'Arial',
    secondaryFont: 'Arial',
    baseFontSize: 12,
    lineHeight: 1.6,
    headingScale: [24, 20, 16, 14]
  },
  colorScheme: {
    primary: '#005fab',
    secondary: '#6b7280',
    accent: '#10b981',
    background: '#ffffff',
    text: '#111827',
    border: '#e5e7eb'
  },
  components: {},
  createdAt: new Date('2023-11-01')
};

describe('TemplateSelector', () => {
  const defaultProps = {
    organizationId: 'org-123',
    onTemplateSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard-Mock für getAllTemplatesForOrganization
    (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
      .mockResolvedValue([...mockSystemTemplates, mockCustomTemplate]);
      
    (pdfTemplateService.getSystemTemplates as jest.Mock)
      .mockResolvedValue(mockSystemTemplates);
      
    (pdfTemplateService.getTemplatePreview as jest.Mock)
      .mockResolvedValue('<html><body>Vorschau</body></html>');
  });

  describe('Template-Laden', () => {
    it('sollte Loading-Spinner während des Ladens anzeigen', async () => {
      // Mock verzögerte Antwort
      (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(mockSystemTemplates), 100)
        ));

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      expect(screen.getByText('Templates werden geladen...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Templates werden geladen...')).not.toBeInTheDocument();
      });
    });

    it('sollte alle Templates erfolgreich laden und anzeigen', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
        expect(screen.getByText('Classic Elegant')).toBeInTheDocument();
        expect(screen.getByText('Firmen Template')).toBeInTheDocument();
      });

      // Prüfe Service-Aufrufe
      expect(pdfTemplateService.getAllTemplatesForOrganization).toHaveBeenCalledWith('org-123');
      
      // Prüfe Template-Beschreibungen
      expect(screen.getByText('Klares, minimalistisches Design für Business-Kommunikation')).toBeInTheDocument();
      expect(screen.getByText('Traditionelles Design mit serif-Typografie')).toBeInTheDocument();
      expect(screen.getByText('Benutzerdefiniertes Template für unsere Organisation')).toBeInTheDocument();
    });

    it('sollte System-Templates als Fallback laden wenn getAllTemplatesForOrganization fehlschlägt', async () => {
      (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
        .mockRejectedValue(new Error('Service nicht verfügbar'));
      
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
        expect(screen.getByText('Classic Elegant')).toBeInTheDocument();
      });

      // Sollte Warnung anzeigen
      expect(screen.getByText(/Warnung:/)).toBeInTheDocument();
    });

    it('sollte Fehler-Zustand anzeigen wenn alle Service-Aufrufe fehlschlagen', async () => {
      (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
        .mockRejectedValue(new Error('Service nicht verfügbar'));
      (pdfTemplateService.getSystemTemplates as jest.Mock)
        .mockRejectedValue(new Error('System-Templates nicht verfügbar'));

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Templates konnten nicht geladen werden')).toBeInTheDocument();
        expect(screen.getByText('Service nicht verfügbar')).toBeInTheDocument();
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
      });
    });
  });

  describe('Template-Auswahl', () => {
    it('sollte Template-Auswahl handhaben', async () => {
      const onTemplateSelect = jest.fn();

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} onTemplateSelect={onTemplateSelect} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      // Template auswählen
      const modernTemplate = screen.getByRole('button', { name: /Modern Professional/ });
      fireEvent.click(modernTemplate);

      expect(onTemplateSelect).toHaveBeenCalledWith('modern_professional', 'Modern Professional');
    });

    it('sollte ausgewähltes Template visuell hervorheben', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} selectedTemplateId="classic_elegant" />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Classic Elegant')).toBeInTheDocument();
      });

      // Prüfe ob das ausgewählte Template hervorgehoben ist
      const selectedTemplate = screen.getByRole('button', { name: /Classic Elegant/ });
      expect(selectedTemplate).toHaveAttribute('aria-pressed', 'true');
      expect(selectedTemplate).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('sollte Template-Auswahl bei disabled=true verhindern', async () => {
      const onTemplateSelect = jest.fn();

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} onTemplateSelect={onTemplateSelect} disabled={true} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const modernTemplate = screen.getByRole('button', { name: /Modern Professional/ });
      fireEvent.click(modernTemplate);

      expect(onTemplateSelect).not.toHaveBeenCalled();
      expect(modernTemplate).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Template-Vorschau', () => {
    it('sollte Vorschau-Button für jedes Template anzeigen', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} showPreview={true} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const previewButtons = screen.getAllByText('Vorschau');
      expect(previewButtons).toHaveLength(3); // 2 System + 1 Custom Template
    });

    it('sollte Template-Vorschau generieren und neues Fenster öffnen', async () => {
      // Mock window.open
      const mockOpen = jest.fn().mockReturnValue({
        document: {
          write: jest.fn(),
          close: jest.fn()
        }
      });
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen
      });

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} showPreview={true} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      // Klicke auf Vorschau-Button
      const previewButton = screen.getAllByText('Vorschau')[0];
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(pdfTemplateService.getTemplatePreview).toHaveBeenCalledWith(
          'modern_professional',
          expect.objectContaining({
            title: 'Beispiel Pressemitteilung',
            companyName: 'Beispiel-Unternehmen GmbH'
          })
        );
        expect(mockOpen).toHaveBeenCalledWith('', '_blank');
      });
    });

    it('sollte Vorschau-Fehler handhaben', async () => {
      (pdfTemplateService.getTemplatePreview as jest.Mock)
        .mockRejectedValue(new Error('Vorschau-Service nicht verfügbar'));

      const onPreviewError = jest.fn();

      render(
        <MockAuthProvider>
          <TemplateSelector 
            {...defaultProps} 
            showPreview={true}
            onPreviewError={onPreviewError}
          />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const previewButton = screen.getAllByText('Vorschau')[0];
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(onPreviewError).toHaveBeenCalledWith('Vorschau-Service nicht verfügbar');
      });
    });

    it('sollte keine Vorschau-Buttons zeigen wenn showPreview=false', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} showPreview={false} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      expect(screen.queryByText('Vorschau')).not.toBeInTheDocument();
    });
  });

  describe('Template-Informationen', () => {
    it('sollte System-Templates mit System-Badge markieren', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const systemBadges = screen.getAllByText('System');
      expect(systemBadges).toHaveLength(2); // Nur die beiden System-Templates
    });

    it('sollte Template-Usage-Count anzeigen', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      expect(screen.getByText('42')).toBeInTheDocument(); // Usage count von Modern Professional
      expect(screen.getByText('28')).toBeInTheDocument(); // Usage count von Classic Elegant
      expect(screen.getByText('5')).toBeInTheDocument();  // Usage count von Custom Template
    });

    it('sollte Template-Versionen anzeigen', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const versionTexts = screen.getAllByText(/Version 1\.0\.0/);
      expect(versionTexts).toHaveLength(3); // Alle drei Templates haben Version 1.0.0
    });

    it('sollte "Zuletzt verwendet"-Datum anzeigen', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      expect(screen.getByText('Zuletzt: 01.12.2023')).toBeInTheDocument();
      expect(screen.getByText('Zuletzt: 15.12.2023')).toBeInTheDocument();
    });
  });

  describe('Keyboard-Navigation', () => {
    it('sollte Template-Auswahl über Tastatur ermöglichen', async () => {
      const user = userEvent.setup();
      const onTemplateSelect = jest.fn();

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} onTemplateSelect={onTemplateSelect} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const modernTemplate = screen.getByRole('button', { name: /Modern Professional/ });
      
      // Tab zum Template und Enter drücken
      modernTemplate.focus();
      await user.keyboard('{Enter}');

      expect(onTemplateSelect).toHaveBeenCalledWith('modern_professional', 'Modern Professional');
    });

    it('sollte Spacebar für Template-Auswahl unterstützen', async () => {
      const user = userEvent.setup();
      const onTemplateSelect = jest.fn();

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} onTemplateSelect={onTemplateSelect} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Classic Elegant')).toBeInTheDocument();
      });

      const classicTemplate = screen.getByRole('button', { name: /Classic Elegant/ });
      
      classicTemplate.focus();
      await user.keyboard(' ');

      expect(onTemplateSelect).toHaveBeenCalledWith('classic_elegant', 'Classic Elegant');
    });
  });

  describe('Retry-Funktionalität', () => {
    it('sollte Retry-Button bei Fehler anzeigen und funktionieren', async () => {
      // Erste Anfrage schlägt fehl
      (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
        .mockRejectedValueOnce(new Error('Netzwerkfehler'))
        .mockRejectedValueOnce(new Error('Netzwerkfehler')) // Auch System-Templates schlagen fehl
        .mockResolvedValueOnce(mockSystemTemplates); // Retry erfolgreich

      (pdfTemplateService.getSystemTemplates as jest.Mock)
        .mockRejectedValueOnce(new Error('System-Templates nicht verfügbar'))
        .mockResolvedValueOnce(mockSystemTemplates); // Retry erfolgreich

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      // Warten auf Fehler-Zustand
      await waitFor(() => {
        expect(screen.getByText('Templates konnten nicht geladen werden')).toBeInTheDocument();
      });

      // Retry-Button klicken
      const retryButton = screen.getByText('Erneut versuchen');
      fireEvent.click(retryButton);

      // Warten auf erfolgreiche Templates
      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
        expect(screen.queryByText('Templates konnten nicht geladen werden')).not.toBeInTheDocument();
      });
    });
  });

  describe('Leerer Zustand', () => {
    it('sollte "Keine Templates verfügbar" anzeigen wenn keine Templates geladen werden', async () => {
      (pdfTemplateService.getAllTemplatesForOrganization as jest.Mock)
        .mockResolvedValue([]);
      (pdfTemplateService.getSystemTemplates as jest.Mock)
        .mockResolvedValue([]);

      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Keine Templates verfügbar')).toBeInTheDocument();
        expect(screen.getByText('Aktualisieren')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} selectedTemplateId="modern_professional" />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const modernTemplate = screen.getByRole('button', { 
        name: 'Template auswählen: Modern Professional' 
      });
      
      expect(modernTemplate).toHaveAttribute('aria-pressed', 'true');
      expect(modernTemplate).toHaveAttribute('tabIndex', '0');
    });

    it('sollte disabled Templates korrekt markieren', async () => {
      render(
        <MockAuthProvider>
          <TemplateSelector {...defaultProps} disabled={true} />
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Professional')).toBeInTheDocument();
      });

      const templates = screen.getAllByRole('button', { name: /Template auswählen/ });
      templates.forEach(template => {
        expect(template).toHaveAttribute('tabIndex', '-1');
      });
    });
  });
});