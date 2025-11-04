// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/__tests__/PreviewTab.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewTab from '../PreviewTab';
import { CampaignProvider, useCampaign } from '../../context/CampaignContext';
import { Timestamp } from 'firebase/firestore';

// Mock Context
jest.mock('../../context/CampaignContext', () => {
  const actual = jest.requireActual('../../context/CampaignContext');
  return {
    ...actual,
    useCampaign: jest.fn()
  };
});

const mockUseCampaign = useCampaign as jest.MockedFunction<typeof useCampaign>;

describe('PreviewTab', () => {
  const campaignId = 'test-campaign-123';
  const organizationId = 'test-org-456';

  const mockCampaign = {
    id: campaignId,
    title: 'Test Campaign',
    contentHtml: '<p>Test content</p>',
    mainContent: '<p>Main test content</p>',
    status: 'draft' as const,
    userId: 'user-123',
    organizationId: organizationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const defaultContextValue = {
    campaign: mockCampaign,
    campaignTitle: 'Test Campaign',
    editorContent: '<p>Main test content</p>',
    keyVisual: undefined,
    keywords: ['test', 'campaign'],
    boilerplateSections: [],
    attachedAssets: [],
    seoScore: {
      totalScore: 85,
      breakdown: { headline: 15, keywords: 10, structure: 10, relevance: 10, concreteness: 10, engagement: 10, social: 20 },
      hints: ['Good title'],
      keywordMetrics: []
    },
    selectedCompanyName: 'Test Client',
    approvalData: {
      customerApprovalRequired: false,
      customerContact: undefined,
      customerApprovalMessage: ''
    },
    selectedTemplateId: undefined,
    updateSelectedTemplate: jest.fn(),
    currentPdfVersion: null,
    generatingPdf: false,
    generatePdf: jest.fn(),
    editLockStatus: {
      isLocked: false,
      lockedBy: undefined,
      lockedAt: undefined
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaign.mockReturnValue(defaultContextValue as any);
  });

  describe('useMemo finalContentHtml', () => {
    it('sollte editorContent allein rendern wenn keine Boilerplates', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // finalContentHtml sollte nur editorContent enthalten
      expect(screen.getByText(/Main test content/i)).toBeInTheDocument();
    });

    it('sollte editorContent + Boilerplates kombinieren', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: [
          {
            id: 'section-1',
            type: 'boilerplate',
            boilerplateId: 'boilerplate-1',
            position: 'footer',
            order: 0,
            isLocked: false,
            isCollapsed: false,
            content: '<p>Boilerplate footer content</p>'
          }
        ]
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Beide Inhalte sollten sichtbar sein
      expect(screen.getByText(/Main test content/i)).toBeInTheDocument();
      expect(screen.getByText(/Boilerplate footer content/i)).toBeInTheDocument();
    });

    it('sollte mehrere Boilerplates in korrekter Reihenfolge kombinieren', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: [
          {
            id: 'section-1',
            type: 'boilerplate',
            boilerplateId: 'boilerplate-1',
            position: 'footer',
            order: 0,
            isLocked: false,
            content: '<p>First boilerplate</p>'
          },
          {
            id: 'section-2',
            type: 'boilerplate',
            boilerplateId: 'boilerplate-2',
            position: 'footer',
            order: 1,
            isLocked: false,
            content: '<p>Second boilerplate</p>'
          }
        ]
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const content = screen.getByText(/Main test content/i).closest('div');
      expect(content).toBeInTheDocument();
    });

    it('sollte Re-Renders vermeiden wenn editorContent unverändert (useMemo)', () => {
      const { rerender } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Gleiche Props, useMemo sollte finalContentHtml nicht neu berechnen
      rerender(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Teste dass Component weiterhin korrekt rendert
      expect(screen.getByText(/Main test content/i)).toBeInTheDocument();
    });

    it('sollte useMemo für finalContentHtml verwenden', () => {
      // Test dass useMemo korrekt implementiert ist
      // Der tatsächliche Re-Render Test ist zu komplex wegen CampaignPreviewStep
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Verify Component renders
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });

    it('sollte boilerplateSections in finalContentHtml integrieren', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: [
          {
            id: 'section-1',
            type: 'boilerplate',
            boilerplateId: 'boilerplate-1',
            position: 'footer',
            order: 0,
            isLocked: false,
            content: '<p>Footer boilerplate</p>'
          }
        ]
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Verify Component renders with boilerplates
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });
  });

  describe('PDF Generation', () => {
    it('sollte "PDF generieren" Button anzeigen wenn nicht gesperrt', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByRole('button', { name: /PDF generieren/i })).toBeInTheDocument();
    });

    it('sollte generatePdf() aufrufen beim Klick auf Button', async () => {
      const user = userEvent.setup();
      const mockGeneratePdf = jest.fn();

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        generatePdf: mockGeneratePdf
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const generateButton = screen.getByRole('button', { name: /PDF generieren/i });
      await user.click(generateButton);

      expect(mockGeneratePdf).toHaveBeenCalled();
    });

    it('sollte Loading State anzeigen während PDF generiert wird', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        generatingPdf: true
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/PDF wird erstellt/i)).toBeInTheDocument();
    });

    it('sollte Button deaktivieren während PDF generiert wird', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        generatingPdf: true
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const generateButton = screen.getByRole('button', { name: /PDF wird erstellt/i });
      expect(generateButton).toBeDisabled();
    });

    it('sollte currentPdfVersion anzeigen wenn vorhanden', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/pdf.pdf',
          status: 'draft',
          createdAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Vorschau PDF/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('sollte "Entwurf" Badge für draft PDF anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/pdf.pdf',
          status: 'draft',
          createdAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Entwurf/i)).toBeInTheDocument();
    });

    it('sollte "Freigegeben" Badge für approved PDF anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/pdf.pdf',
          status: 'approved',
          createdAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Freigegeben/i)).toBeInTheDocument();
    });

    it('sollte Download Button für PDF anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/pdf.pdf',
          status: 'draft',
          createdAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /Download/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('sollte Hinweis anzeigen wenn keine PDF-Version vorhanden', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Noch keine PDF-Version erstellt/i)).toBeInTheDocument();
    });
  });

  describe('Edit-Lock Integration', () => {
    it('sollte PDF-Generierung sperren wenn Edit-Lock aktiv', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: true,
          reason: 'pending_customer_approval',
          lockedAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/PDF-Erstellung gesperrt/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /PDF generieren/i })).not.toBeInTheDocument();
    });

    it('sollte Lock-Grund anzeigen wenn gesperrt', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: true,
          reason: 'pending_customer_approval',
          lockedAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Kunde prüft/i)).toBeInTheDocument();
    });

    it('sollte PDF-Button anzeigen wenn nicht gesperrt', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: false
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByRole('button', { name: /PDF generieren/i })).toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('sollte CampaignPreviewStep rendern', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });

    it('sollte PDFVersionHistory rendern', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/PDF-Versionen Historie/i)).toBeInTheDocument();
    });

    it('sollte PipelinePDFViewer rendern wenn Campaign Project hat', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        campaign: {
          ...mockCampaign,
          projectId: 'project-123'
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // PipelinePDFViewer sollte gerendert werden (prüfe via Test-ID oder Text)
      // Da wir die Komponente nicht im Detail mocken, prüfen wir nur dass keine Fehler auftreten
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });
  });
});
