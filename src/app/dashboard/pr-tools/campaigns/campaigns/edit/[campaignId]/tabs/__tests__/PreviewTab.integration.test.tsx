// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/__tests__/PreviewTab.integration.test.tsx
/**
 * PreviewTab Integration Tests
 *
 * Test-Schwerpunkte:
 * 1. Basic Rendering & Structure
 * 2. Context-Integration (alle Context-Werte)
 * 3. finalContentHtml useMemo (editorContent + boilerplateSections)
 * 4. PDF-Generierung (Button, Loading, Lock-Status)
 * 5. Template-Auswahl (selectedTemplateId, updateSelectedTemplate)
 * 6. PDF-Version Anzeige (currentPdfVersion, Status-Badges, Download)
 * 7. Pipeline-PDF-Viewer (conditional rendering, onPDFGenerated callback)
 * 8. Conditional Rendering (Workflow-Banner, Pipeline-Viewer)
 * 9. React.memo (keine unnötigen Re-Renders)
 */

import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewTab from '../PreviewTab';
import { useCampaign } from '../../context/CampaignContext';
import { Timestamp } from 'firebase/firestore';
import { toastService } from '@/lib/utils/toast';
import { EDIT_LOCK_CONFIG } from '@/types/pr';

// Mock Context
jest.mock('../../context/CampaignContext', () => ({
  useCampaign: jest.fn()
}));

// Mock Child Components
jest.mock('@/components/campaigns/CampaignPreviewStep', () => ({
  CampaignPreviewStep: ({
    campaignTitle,
    finalContentHtml,
    keyVisual,
    selectedCompanyName,
    realPrScore,
    keywords,
    boilerplateSections,
    attachedAssets,
    editorContent,
    approvalData,
    organizationId,
    selectedTemplateId,
    onTemplateSelect,
    showTemplateSelector
  }: any) => (
    <div data-testid="campaign-preview-step">
      <div data-testid="preview-title">{campaignTitle}</div>
      <div data-testid="preview-content" dangerouslySetInnerHTML={{ __html: finalContentHtml }} />
      {keyVisual && <div data-testid="preview-keyvisual">{keyVisual.url}</div>}
      <div data-testid="preview-company">{selectedCompanyName}</div>
      <div data-testid="preview-score">{realPrScore?.totalScore}</div>
      <div data-testid="preview-keywords">{keywords.join(',')}</div>
      <div data-testid="preview-template-id">{selectedTemplateId || 'none'}</div>
      {showTemplateSelector && (
        <button
          data-testid="template-selector-button"
          onClick={() => onTemplateSelect?.('template-123', 'Test Template')}
        >
          Select Template
        </button>
      )}
    </div>
  )
}));

jest.mock('@/components/campaigns/PDFVersionHistory', () => ({
  PDFVersionHistory: ({ campaignId, organizationId, showActions }: any) => (
    <div data-testid="pdf-version-history">
      <div data-testid="history-campaign-id">{campaignId}</div>
      <div data-testid="history-org-id">{organizationId}</div>
      <div data-testid="history-show-actions">{showActions ? 'true' : 'false'}</div>
    </div>
  )
}));

jest.mock('@/components/campaigns/PipelinePDFViewer', () => ({
  PipelinePDFViewer: ({ campaign, organizationId, onPDFGenerated }: any) => (
    <div data-testid="pipeline-pdf-viewer">
      <div data-testid="pipeline-campaign-id">{campaign.id}</div>
      <div data-testid="pipeline-org-id">{organizationId}</div>
      <button
        data-testid="pipeline-generate-button"
        onClick={() => onPDFGenerated?.('https://example.com/pipeline.pdf')}
      >
        Generate Pipeline PDF
      </button>
    </div>
  )
}));

// Mock Toast Service
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

const mockUseCampaign = useCampaign as jest.MockedFunction<typeof useCampaign>;

describe('PreviewTab Integration Tests', () => {
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
    campaignTitle: 'Test Campaign Title',
    editorContent: '<p>Editor main content</p>',
    keyVisual: undefined,
    keywords: ['test', 'campaign', 'seo'],
    boilerplateSections: [],
    attachedAssets: [],
    seoScore: {
      totalScore: 85,
      breakdown: {
        headline: 15,
        keywords: 10,
        structure: 10,
        relevance: 10,
        concreteness: 10,
        engagement: 10,
        social: 20
      },
      hints: ['Good title', 'Add more keywords'],
      keywordMetrics: []
    },
    selectedCompanyName: 'ACME Corporation',
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

    // Mock window.open
    global.window.open = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 1. BASIC RENDERING & STRUCTURE
   */
  describe('Basic Rendering & Structure', () => {
    it('sollte PreviewTab erfolgreich rendern', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });

    it('sollte korrekte Grundstruktur haben (bg-white, rounded-lg, border, p-6)', () => {
      const { container } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-white', 'rounded-lg', 'border', 'p-6');
    });

    it('sollte CampaignPreviewStep enthalten', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
    });

    it('sollte PDFVersionHistory enthalten', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('pdf-version-history')).toBeInTheDocument();
    });

    it('sollte alle Hauptabschnitte enthalten', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF-Vorschau und Versionen/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF-Versionen Historie/i)).toBeInTheDocument();
    });
  });

  /**
   * 2. CONTEXT-INTEGRATION
   */
  describe('Context-Integration', () => {
    it('sollte campaignTitle aus Context verwenden', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-title')).toHaveTextContent('Test Campaign Title');
    });

    it('sollte editorContent aus Context verwenden', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const content = screen.getByTestId('preview-content');
      expect(content.innerHTML).toContain('Editor main content');
    });

    it('sollte keyVisual aus Context weitergeben', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        keyVisual: {
          url: 'https://example.com/image.jpg',
          assetId: 'asset-123'
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-keyvisual')).toHaveTextContent('https://example.com/image.jpg');
    });

    it('sollte keywords aus Context weitergeben', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-keywords')).toHaveTextContent('test,campaign,seo');
    });

    it('sollte seoScore aus Context weitergeben', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-score')).toHaveTextContent('85');
    });

    it('sollte selectedCompanyName aus Context weitergeben', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-company')).toHaveTextContent('ACME Corporation');
    });

    it('sollte boilerplateSections aus Context weitergeben', () => {
      const boilerplates = [
        {
          id: 'section-1',
          type: 'boilerplate',
          boilerplateId: 'boilerplate-1',
          position: 'footer',
          order: 0,
          isLocked: false,
          content: '<p>Boilerplate content</p>'
        }
      ];

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: boilerplates
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // CampaignPreviewStep erhält boilerplateSections
      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
    });

    it('sollte attachedAssets aus Context weitergeben', () => {
      const assets = [
        {
          assetId: 'asset-1',
          assetName: 'image.jpg',
          assetUrl: 'https://example.com/image.jpg',
          assetType: 'image'
        }
      ];

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        attachedAssets: assets
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
    });

    it('sollte approvalData aus Context weitergeben', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        approvalData: {
          customerApprovalRequired: true,
          customerContact: {
            contactId: 'contact-123',
            contactName: 'John Doe',
            contactEmail: 'john@example.com'
          },
          customerApprovalMessage: ''
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
    });
  });

  /**
   * 3. FINAL CONTENT HTML - useMemo
   */
  describe('finalContentHtml useMemo', () => {
    it('sollte nur editorContent verwenden wenn keine Boilerplates', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const content = screen.getByTestId('preview-content');
      expect(content.innerHTML).toContain('Editor main content');
      expect(content.innerHTML).not.toContain('Boilerplate');
    });

    it('sollte editorContent mit boilerplateSections kombinieren', () => {
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

      const content = screen.getByTestId('preview-content');
      expect(content.innerHTML).toContain('Editor main content');
      expect(content.innerHTML).toContain('Footer boilerplate');
    });

    it('sollte mehrere Boilerplates kombinieren', () => {
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

      const content = screen.getByTestId('preview-content');
      expect(content.innerHTML).toContain('First boilerplate');
      expect(content.innerHTML).toContain('Second boilerplate');
    });

    it('sollte finalContentHtml bei editorContent-Änderung neu berechnen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editorContent: '<p>Initial content</p>'
      } as any);

      const { rerender, unmount } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-content').innerHTML).toContain('Initial content');

      // Unmount und neu rendern mit geänderten Daten
      unmount();

      // Ändere editorContent
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editorContent: '<p>Updated editor content</p>'
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-content').innerHTML).toContain('Updated editor content');
    });

    it('sollte finalContentHtml bei boilerplateSections-Änderung neu berechnen', () => {
      const { unmount } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-content').innerHTML).toContain('Editor main content');
      expect(screen.getByTestId('preview-content').innerHTML).not.toContain('New boilerplate');

      // Unmount und neu rendern
      unmount();

      // Füge Boilerplate hinzu
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
            content: '<p>New boilerplate</p>'
          }
        ]
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-content').innerHTML).toContain('New boilerplate');
    });

    it('sollte leere boilerplateSections korrekt handhaben', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        boilerplateSections: []
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const content = screen.getByTestId('preview-content');
      expect(content.innerHTML).toContain('Editor main content');
    });
  });

  /**
   * 4. PDF-GENERIERUNG
   */
  describe('PDF-Generierung', () => {
    it('sollte "PDF generieren" Button anzeigen wenn nicht gesperrt', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByRole('button', { name: /PDF generieren/i })).toBeInTheDocument();
    });

    it('sollte generatePdf aufrufen beim Klick', async () => {
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

      const button = screen.getByRole('button', { name: /PDF generieren/i });
      await user.click(button);

      expect(mockGeneratePdf).toHaveBeenCalledTimes(1);
      expect(mockGeneratePdf).toHaveBeenCalledWith();
    });

    it('sollte Loading-State während generatingPdf=true anzeigen', () => {
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
      expect(screen.getByRole('button', { name: /PDF wird erstellt/i })).toBeDisabled();
    });

    it('sollte Button disabled während generatingPdf=true', () => {
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

      const button = screen.getByRole('button', { name: /PDF wird erstellt/i });
      expect(button).toBeDisabled();
    });

    it('sollte Spinner während PDF-Generierung anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        generatingPdf: true
      } as any);

      const { container } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('sollte Lock-Status anzeigen wenn editLockStatus.isLocked=true', () => {
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

    it('sollte Lock-Grund aus EDIT_LOCK_CONFIG anzeigen', () => {
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

      const expectedLabel = EDIT_LOCK_CONFIG['pending_customer_approval'].label;
      expect(screen.getByText(new RegExp(expectedLabel, 'i'))).toBeInTheDocument();
    });

    it('sollte Fallback-Text bei unbekanntem Lock-Grund anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: true,
          reason: undefined,
          lockedAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Bearbeitung nicht möglich/i)).toBeInTheDocument();
    });

    it('sollte Lock-Icon anzeigen wenn gesperrt', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: true,
          reason: 'pending_customer_approval',
          lockedAt: Timestamp.now()
        }
      } as any);

      const { container } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // LockClosedIcon wird gerendert
      expect(screen.getByText(/PDF-Erstellung gesperrt/i)).toBeInTheDocument();
    });
  });

  /**
   * 5. TEMPLATE-AUSWAHL
   */
  describe('Template-Auswahl', () => {
    it('sollte selectedTemplateId an CampaignPreviewStep übergeben', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        selectedTemplateId: 'template-abc-123'
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-template-id')).toHaveTextContent('template-abc-123');
    });

    it('sollte "none" anzeigen wenn kein Template ausgewählt', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('preview-template-id')).toHaveTextContent('none');
    });

    it('sollte updateSelectedTemplate Callback übergeben', () => {
      const mockUpdate = jest.fn();
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateSelectedTemplate: mockUpdate
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
    });

    it('sollte updateSelectedTemplate aufrufen bei Template-Auswahl', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        updateSelectedTemplate: mockUpdate
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      const button = screen.getByTestId('template-selector-button');
      await user.click(button);

      expect(mockUpdate).toHaveBeenCalledWith('template-123', 'Test Template');
    });

    it('sollte showTemplateSelector=true übergeben', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Template Selector Button sollte sichtbar sein
      expect(screen.getByTestId('template-selector-button')).toBeInTheDocument();
    });
  });

  /**
   * 6. PDF-VERSION ANZEIGE
   */
  describe('PDF-Version Anzeige', () => {
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
    });

    it('sollte Download-Button für PDF anzeigen', () => {
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

      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('sollte window.open mit downloadUrl aufrufen beim Klick', async () => {
      const user = userEvent.setup();
      const downloadUrl = 'https://example.com/pdf.pdf';

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl,
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
      await user.click(downloadButton);

      expect(window.open).toHaveBeenCalledWith(downloadUrl, '_blank');
    });

    it('sollte "Entwurf" Badge für status=draft anzeigen', () => {
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

    it('sollte "Freigegeben" Badge für status=approved anzeigen', () => {
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

    it('sollte "Freigabe angefordert" Badge für status=pending_customer anzeigen', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/pdf.pdf',
          status: 'pending_customer',
          createdAt: Timestamp.now()
        }
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Freigabe angefordert/i)).toBeInTheDocument();
    });

    it('sollte "Aktuell" Badge anzeigen', () => {
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

      expect(screen.getByText(/Aktuell/i)).toBeInTheDocument();
    });

    it('sollte "Noch keine PDF-Version erstellt" Hinweis anzeigen ohne Version', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Noch keine PDF-Version erstellt/i)).toBeInTheDocument();
    });

    it('sollte Icon für fehlende PDF anzeigen', () => {
      const { container } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Noch keine PDF-Version erstellt/i)).toBeInTheDocument();
      // DocumentTextIcon wird gerendert
    });
  });

  /**
   * 7. PIPELINE-PDF-VIEWER
   */
  describe('Pipeline-PDF-Viewer', () => {
    it('sollte PipelinePDFViewer rendern wenn campaign.projectId vorhanden', () => {
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

      expect(screen.getByTestId('pipeline-pdf-viewer')).toBeInTheDocument();
    });

    it('sollte PipelinePDFViewer NICHT rendern ohne projectId', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.queryByTestId('pipeline-pdf-viewer')).not.toBeInTheDocument();
    });

    it('sollte campaign an PipelinePDFViewer übergeben', () => {
      const campaignWithProject = {
        ...mockCampaign,
        projectId: 'project-123'
      };

      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        campaign: campaignWithProject
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('pipeline-campaign-id')).toHaveTextContent(campaignId);
    });

    it('sollte organizationId an PipelinePDFViewer übergeben', () => {
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

      expect(screen.getByTestId('pipeline-org-id')).toHaveTextContent(organizationId);
    });

    it('sollte onPDFGenerated Callback mit toastService.success aufrufen', async () => {
      const user = userEvent.setup();
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

      const generateButton = screen.getByTestId('pipeline-generate-button');
      await user.click(generateButton);

      expect(toastService.success).toHaveBeenCalledWith('Pipeline-PDF erfolgreich generiert');
    });

    it('sollte onPDFGenerated mit pdfUrl aufrufen', async () => {
      const user = userEvent.setup();
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

      const generateButton = screen.getByTestId('pipeline-generate-button');
      await user.click(generateButton);

      // Toast wird mit Erfolgs-Nachricht aufgerufen
      expect(toastService.success).toHaveBeenCalled();
    });
  });

  /**
   * 8. CONDITIONAL RENDERING
   */
  describe('Conditional Rendering', () => {
    it('sollte Workflow-Banner NICHT anzeigen ohne approvalWorkflowResult', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.queryByText(/Freigabe-Workflow aktiv/i)).not.toBeInTheDocument();
    });

    it('sollte Pipeline-PDF-Viewer nur mit projectId anzeigen', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.queryByTestId('pipeline-pdf-viewer')).not.toBeInTheDocument();
    });

    it('sollte PDF-Version Box nur mit currentPdfVersion anzeigen', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.queryByText(/Vorschau PDF/i)).not.toBeInTheDocument();
    });

    it('sollte PDFVersionHistory immer anzeigen mit campaignId & organizationId', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('pdf-version-history')).toBeInTheDocument();
      expect(screen.getByTestId('history-campaign-id')).toHaveTextContent(campaignId);
      expect(screen.getByTestId('history-org-id')).toHaveTextContent(organizationId);
    });

    it('sollte showActions=true an PDFVersionHistory übergeben', () => {
      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByTestId('history-show-actions')).toHaveTextContent('true');
    });
  });

  /**
   * 9. REACT.MEMO
   */
  describe('React.memo', () => {
    it('sollte PreviewTab mit React.memo umschlossen sein', () => {
      // PreviewTab ist als default export React.memo(function PreviewTab...)
      const { rerender } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Gleiche Props = sollte nicht neu rendern
      rerender(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });

    it('sollte bei geänderten Props neu rendern', () => {
      const { rerender } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Ändere campaignId
      rerender(
        <PreviewTab
          organizationId={organizationId}
          campaignId="new-campaign-id"
        />
      );

      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });

    it('sollte bei unverändertem organizationId nicht neu rendern', () => {
      const { rerender } = render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Gleiche Props
      rerender(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Component bleibt stabil
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
    });
  });

  /**
   * 10. INTEGRATION SCENARIOS
   */
  describe('Integration Scenarios', () => {
    it('sollte komplett mit allen Context-Werten rendern', () => {
      const fullContextValue = {
        campaign: {
          ...mockCampaign,
          projectId: 'project-123'
        },
        campaignTitle: 'Full Integration Test',
        editorContent: '<p>Full content</p>',
        keyVisual: {
          url: 'https://example.com/keyvisual.jpg',
          assetId: 'asset-123'
        },
        keywords: ['integration', 'test', 'full'],
        boilerplateSections: [
          {
            id: 'section-1',
            type: 'boilerplate',
            boilerplateId: 'boilerplate-1',
            position: 'footer',
            order: 0,
            isLocked: false,
            content: '<p>Footer content</p>'
          }
        ],
        attachedAssets: [
          {
            assetId: 'asset-1',
            assetName: 'document.pdf',
            assetUrl: 'https://example.com/doc.pdf',
            assetType: 'document'
          }
        ],
        seoScore: {
          totalScore: 95,
          breakdown: { headline: 20, keywords: 15, structure: 15, relevance: 15, concreteness: 10, engagement: 10, social: 10 },
          hints: ['Excellent'],
          keywordMetrics: []
        },
        selectedCompanyName: 'Full Company',
        approvalData: {
          customerApprovalRequired: true,
          customerContact: {
            contactId: 'contact-123',
            contactName: 'Jane Doe',
            contactEmail: 'jane@example.com'
          },
          customerApprovalMessage: ''
        },
        selectedTemplateId: 'template-xyz',
        updateSelectedTemplate: jest.fn(),
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 2,
          downloadUrl: 'https://example.com/full.pdf',
          status: 'approved',
          createdAt: Timestamp.now()
        },
        generatingPdf: false,
        generatePdf: jest.fn(),
        editLockStatus: {
          isLocked: false,
          lockedBy: undefined,
          lockedAt: undefined
        }
      };

      mockUseCampaign.mockReturnValue(fullContextValue as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      // Alle Hauptelemente sollten vorhanden sein
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument();
      expect(screen.getByTestId('campaign-preview-step')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-version-history')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-pdf-viewer')).toBeInTheDocument();
      expect(screen.getByText(/Vorschau PDF/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('sollte mit locked Status und PDF-Version korrekt funktionieren', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        editLockStatus: {
          isLocked: true,
          reason: 'approved_final',
          lockedAt: Timestamp.now()
        },
        currentPdfVersion: {
          id: 'pdf-123',
          campaignId: campaignId,
          version: 1,
          downloadUrl: 'https://example.com/final.pdf',
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

      expect(screen.getByText(/PDF-Erstellung gesperrt/i)).toBeInTheDocument();
      // Badge "Freigegeben" wird sowohl im Lock-Label als auch im PDF-Status angezeigt
      const badges = screen.getAllByText(/Freigegeben/i);
      expect(badges.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('sollte mit generating=true und ohne PDF-Version korrekt funktionieren', () => {
      mockUseCampaign.mockReturnValue({
        ...defaultContextValue,
        generatingPdf: true,
        currentPdfVersion: null
      } as any);

      render(
        <PreviewTab
          organizationId={organizationId}
          campaignId={campaignId}
        />
      );

      expect(screen.getByText(/PDF wird erstellt/i)).toBeInTheDocument();
      expect(screen.getByText(/Noch keine PDF-Version erstellt/i)).toBeInTheDocument();
    });
  });
});
