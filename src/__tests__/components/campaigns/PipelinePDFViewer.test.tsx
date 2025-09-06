// src/__tests__/components/campaigns/PipelinePDFViewer.test.tsx - ✅ Plan 2/9: Pipeline-PDF-Viewer Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PipelinePDFViewer } from '@/components/campaigns/PipelinePDFViewer';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { PRCampaign } from '@/types/pr';
import { Timestamp } from 'firebase/firestore';

// Mock PDF-Versions Service
jest.mock('@/lib/firebase/pdf-versions-service', () => ({
  pdfVersionsService: {
    generatePipelinePDF: jest.fn(),
    updateInternalPDFStatus: jest.fn()
  }
}));

// Mock Navigator Clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// Mock Window.open
const mockWindowOpen = jest.fn();
Object.assign(window, {
  open: mockWindowOpen
});

// Cast Mocks
const mockPDFVersionsService = pdfVersionsService as jest.Mocked<typeof pdfVersionsService>;
const mockClipboard = navigator.clipboard.writeText as jest.Mock;

describe('PipelinePDFViewer - Plan 2/9: Pipeline-PDF-Viewer Tests', () => {
  const mockOrganizationId = 'org-123';
  const mockOnPDFGenerated = jest.fn();

  const baseCampaign: PRCampaign = {
    id: 'campaign-123',
    title: 'Test Kampagne für Pipeline',
    mainContent: '<p>Hauptinhalt der Kampagne</p>',
    organizationId: mockOrganizationId,
    userId: 'user-456',
    status: 'draft',
    projectId: 'project-789',
    pipelineStage: 'creation',
    internalPDFs: {
      enabled: true,
      versionCount: 2,
      lastGenerated: Timestamp.fromDate(new Date('2025-01-15T10:30:00Z')),
      autoGenerate: true,
      storageFolder: 'internal-pdfs/campaign-123'
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPDFVersionsService.generatePipelinePDF.mockResolvedValue('https://example.com/pipeline.pdf');
  });

  describe('Pipeline-Stadium Rendering', () => {
    it('sollte Creation-Stadium korrekt anzeigen', () => {
      const campaign = { ...baseCampaign, pipelineStage: 'creation' as const };
      
      render(
        <PipelinePDFViewer 
          campaign={campaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Interne Pipeline-PDFs')).toBeInTheDocument();
      expect(screen.getByText('Erstellung')).toBeInTheDocument();
      expect(screen.getByText('Entwurfs-PDFs für interne Abstimmung')).toBeInTheDocument();
    });

    it('sollte Review-Stadium korrekt anzeigen', () => {
      const campaign = { ...baseCampaign, pipelineStage: 'review' as const };
      
      render(
        <PipelinePDFViewer 
          campaign={campaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Review-PDFs für Team-Freigabe')).toBeInTheDocument();
      
      // Badge sollte amber/gelb sein (über Styling-Classes)
      const badge = screen.getByText('Review');
      expect(badge).toHaveClass('bg-amber-50'); // Assuming Tailwind classes
    });

    it('sollte Approval-Stadium korrekt anzeigen', () => {
      const campaign = { ...baseCampaign, pipelineStage: 'approval' as const };
      
      render(
        <PipelinePDFViewer 
          campaign={campaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Finale PDFs für Kunden-Freigabe')).toBeInTheDocument();
    });

    it('sollte unbekanntes Stadium graceful handhaben', () => {
      const campaign = { ...baseCampaign, pipelineStage: undefined };
      
      render(
        <PipelinePDFViewer 
          campaign={campaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Unbekannt')).toBeInTheDocument();
      expect(screen.getByText('Pipeline-PDFs')).toBeInTheDocument();
    });
  });

  describe('PDF-Generation Funktionalität', () => {
    it('sollte Pipeline-PDF generieren bei Button-Klick', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledWith(
        'campaign-123',
        baseCampaign,
        { organizationId: mockOrganizationId, userId: 'current-user' }
      );

      await waitFor(() => {
        expect(mockOnPDFGenerated).toHaveBeenCalledWith('https://example.com/pipeline.pdf');
      });
    });

    it('sollte Loading-State während PDF-Generation anzeigen', async () => {
      const user = userEvent.setup();
      
      // Mock langsame PDF-Generation
      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('https://example.com/test.pdf'), 100))
      );

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      // Loading-State sollte angezeigt werden
      expect(screen.getByText('Generiere...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      // Warte auf Completion
      await waitFor(() => {
        expect(screen.getByText('PDF generieren')).toBeInTheDocument();
      });

      expect(generateButton).not.toBeDisabled();
    });

    it('sollte Fehler bei PDF-Generation anzeigen', async () => {
      const user = userEvent.setup();
      
      mockPDFVersionsService.generatePipelinePDF.mockRejectedValue(
        new Error('PDF generation failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Pipeline-PDF-Generierung fehlgeschlagen:',
        expect.any(Error)
      );

      expect(mockOnPDFGenerated).not.toHaveBeenCalled();
    });

    it('sollte Version-Count nach erfolgreicher Generation aktualisieren', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      // Initial Version Count
      expect(screen.getByText('Versionen: 2')).toBeInTheDocument();

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Versionen: 3')).toBeInTheDocument();
      });
    });

    it('sollte Campaign ohne ID oder projectId handhaben', async () => {
      const user = userEvent.setup();
      
      const campaignWithoutIds = { 
        ...baseCampaign, 
        id: undefined,
        projectId: undefined 
      };

      render(
        <PipelinePDFViewer 
          campaign={campaignWithoutIds} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Kampagne oder Projekt-ID fehlt')).toBeInTheDocument();
      });

      expect(mockPDFVersionsService.generatePipelinePDF).not.toHaveBeenCalled();
    });
  });

  describe('Download und Teilen Funktionalität', () => {
    it('sollte Download-Button nach PDF-Generation anzeigen', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /link kopieren/i })).toBeInTheDocument();
      });
    });

    it('sollte PDF in neuem Tab öffnen bei Download-Klick', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      // Generiere PDF erst
      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        return user.click(downloadButton);
      });

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/pipeline.pdf', '_blank');
    });

    it('sollte PDF-URL in Clipboard kopieren', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      // Generiere PDF erst
      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        const shareButton = screen.getByRole('button', { name: /link kopieren/i });
        return user.click(shareButton);
      });

      expect(mockClipboard).toHaveBeenCalledWith('https://example.com/pipeline.pdf');
    });

    it('sollte "Noch keine PDF" Nachricht anzeigen wenn keine PDF vorhanden', () => {
      const campaignNoPDFs = { 
        ...baseCampaign, 
        internalPDFs: { enabled: true, versionCount: 0, autoGenerate: false, storageFolder: 'internal-pdfs/campaign-123' }
      };

      render(
        <PipelinePDFViewer 
          campaign={campaignNoPDFs} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Noch keine Pipeline-PDF generiert')).toBeInTheDocument();
    });
  });

  describe('Auto-Generate Status-Anzeige', () => {
    it('sollte Auto-Generate Badge anzeigen wenn aktiviert', () => {
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Auto-Generation AN')).toBeInTheDocument();
    });

    it('sollte Auto-Generate Hinweis-Box anzeigen wenn aktiviert', () => {
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText(/Bei jeder Speicherung wird automatisch eine neue interne PDF-Version erstellt/)).toBeInTheDocument();
    });

    it('sollte KEINE Auto-Generate Elemente zeigen wenn deaktiviert', () => {
      const campaignNoAutoGen = { 
        ...baseCampaign, 
        internalPDFs: { ...baseCampaign.internalPDFs!, autoGenerate: false }
      };

      render(
        <PipelinePDFViewer 
          campaign={campaignNoAutoGen} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.queryByText('Auto-Generation AN')).not.toBeInTheDocument();
      expect(screen.queryByText(/Bei jeder Speicherung wird automatisch/)).not.toBeInTheDocument();
    });
  });

  describe('Pipeline-Stadium-spezifische Metadaten', () => {
    it('sollte Versions-Count und letztes Update anzeigen', () => {
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Versionen: 2')).toBeInTheDocument();
      expect(screen.getByText(/Zuletzt: 15\.01\.2025, 11:30/)).toBeInTheDocument(); // Deutsche Formatierung
    });

    it('sollte "Zuletzt"-Info NICHT anzeigen wenn keine lastGenerated', () => {
      const campaignNoLastGen = { 
        ...baseCampaign, 
        internalPDFs: { ...baseCampaign.internalPDFs!, lastGenerated: undefined }
      };

      render(
        <PipelinePDFViewer 
          campaign={campaignNoLastGen} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Versionen: 2')).toBeInTheDocument();
      expect(screen.queryByText(/Zuletzt:/)).not.toBeInTheDocument();
    });

    it('sollte korrekte deutsche Datumsformatierung verwenden', () => {
      const campaign = { 
        ...baseCampaign,
        internalPDFs: {
          ...baseCampaign.internalPDFs!,
          lastGenerated: Timestamp.fromDate(new Date('2025-12-31T23:59:59Z'))
        }
      };

      render(
        <PipelinePDFViewer 
          campaign={campaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText(/Zuletzt: 01\.01\.2026, 00:59/)).toBeInTheDocument();
    });
  });

  describe('Sichtbarkeits-Logik', () => {
    it('sollte NICHT rendern wenn kein projectId', () => {
      const campaignNoProject = { ...baseCampaign, projectId: undefined };

      const { container } = render(
        <PipelinePDFViewer 
          campaign={campaignNoProject} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('sollte NICHT rendern wenn internalPDFs deaktiviert', () => {
      const campaignPDFsDisabled = { 
        ...baseCampaign, 
        internalPDFs: { enabled: false, versionCount: 0, autoGenerate: false, storageFolder: 'internal-pdfs/campaign-123' }
      };

      const { container } = render(
        <PipelinePDFViewer 
          campaign={campaignPDFsDisabled} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('sollte rendern wenn internalPDFs aktiviert UND projectId vorhanden', () => {
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      expect(screen.getByText('Interne Pipeline-PDFs')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('sollte Error-State nach Fehlern korrekt zurücksetzen', async () => {
      const user = userEvent.setup();
      
      mockPDFVersionsService.generatePipelinePDF
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce('https://example.com/success.pdf');

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      
      // Erster Versuch - Fehler
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/PDF-Generierung fehlgeschlagen/)).toBeInTheDocument();
      });

      // Zweiter Versuch - Erfolg
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText(/PDF-Generierung fehlgeschlagen/)).not.toBeInTheDocument();
      });

      expect(mockOnPDFGenerated).toHaveBeenCalledWith('https://example.com/success.pdf');
    });

    it('sollte Network-Error spezifisch behandeln', async () => {
      const user = userEvent.setup();
      
      mockPDFVersionsService.generatePipelinePDF.mockRejectedValue(
        new Error('Network request failed')
      );

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.')).toBeInTheDocument();
      });
    });
  });

  describe('Props und Callbacks', () => {
    it('sollte className prop korrekt anwenden', () => {
      const { container } = render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
          className="custom-pdf-viewer"
        />
      );

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('custom-pdf-viewer');
    });

    it('sollte ohne onPDFGenerated callback funktionieren', async () => {
      const user = userEvent.setup();
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          // Kein onPDFGenerated callback
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      
      // Sollte nicht crashen ohne callback
      await expect(user.click(generateButton)).resolves.not.toThrow();

      await waitFor(() => {
        expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalled();
      });
    });

    it('sollte verschiedene organizationIds korrekt weiterleiten', async () => {
      const user = userEvent.setup();
      const customOrgId = 'custom-org-456';
      
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={customOrgId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      expect(mockPDFVersionsService.generatePipelinePDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ organizationId: customOrgId })
      );
    });
  });

  describe('Accessibility & UX', () => {
    it('sollte korrekte ARIA-Labels für Buttons haben', () => {
      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('sollte Loading-Spinner accessible machen', async () => {
      const user = userEvent.setup();
      
      mockPDFVersionsService.generatePipelinePDF.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('test.pdf'), 50))
      );

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      // Button sollte disabled sein während Loading
      expect(generateButton).toBeDisabled();
      
      // Loading-Text sollte sichtbar sein
      expect(screen.getByText('Generiere...')).toBeInTheDocument();
    });

    it('sollte Error-Messages mit korrektem Kontext anzeigen', async () => {
      const user = userEvent.setup();
      
      mockPDFVersionsService.generatePipelinePDF.mockRejectedValue(
        new Error('Specific error message')
      );

      render(
        <PipelinePDFViewer 
          campaign={baseCampaign} 
          organizationId={mockOrganizationId}
          onPDFGenerated={mockOnPDFGenerated}
        />
      );

      const generateButton = screen.getByRole('button', { name: /pdf generieren/i });
      await user.click(generateButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/PDF-Generierung fehlgeschlagen/);
        expect(errorMessage).toHaveClass('text-red-700'); // Error-Styling
        
        // Icon sollte vorhanden sein
        const errorIcon = screen.getByTestId('exclamation-triangle-icon') || 
                         document.querySelector('[data-testid="exclamation-triangle-icon"]');
        // Icon wird durch Heroicons gerendert, schwer zu testen ohne spezifische Test-IDs
      });
    });
  });
});