// src/__tests__/features/campaign-pdf-integration.test.ts
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { prService } from '@/lib/firebase/pr-service';
import { listsService } from '@/lib/firebase/lists-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';

// Mock Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Auth und Organization Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: jest.fn(),
}));

// Mock Firebase Services
jest.mock('@/lib/firebase/pdf-versions-service', () => ({
  pdfVersionsService: {
    createPDFVersion: jest.fn(),
    getCurrentVersion: jest.fn(),
    getVersionHistory: jest.fn(),
    updateVersionStatus: jest.fn(),
    lockCampaignEditing: jest.fn(),
    unlockCampaignEditing: jest.fn(),
    isEditingLocked: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    create: jest.fn(),
    requestApproval: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/lists-service', () => ({
  listsService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/approval-workflow-service', () => ({
  approvalWorkflowService: {
    createWorkflow: jest.fn(),
  },
}));

// Mock UI Components
jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

// Mock Complex Components
jest.mock('@/components/campaigns/AssetSelectorModal', () => ({
  AssetSelectorModal: () => <div data-testid="asset-selector-modal">Asset Selector</div>,
}));

jest.mock('@/components/campaigns/KeyVisualSection', () => ({
  KeyVisualSection: ({ onChange }: any) => (
    <div data-testid="key-visual-section">
      <button onClick={() => onChange({ type: 'image', url: 'test.jpg' })}>
        Set Key Visual
      </button>
    </div>
  ),
}));

jest.mock('@/components/pr/campaign/CampaignContentComposer', () => ({
  __esModule: true,
  default: ({ onTitleChange, onMainContentChange, onFullContentChange }: any) => (
    <div data-testid="content-composer">
      <input
        data-testid="title-input"
        placeholder="Campaign Title"
        onChange={(e) => onTitleChange?.(e.target.value)}
      />
      <textarea
        data-testid="content-input"
        placeholder="Main Content"
        onChange={(e) => {
          onMainContentChange?.(e.target.value);
          onFullContentChange?.(e.target.value);
        }}
      />
    </div>
  ),
}));

jest.mock('@/components/pr/ModernCustomerSelector', () => ({
  ModernCustomerSelector: ({ onChange }: any) => (
    <div data-testid="customer-selector">
      <button onClick={() => onChange('customer-123', 'Test Customer')}>
        Select Customer
      </button>
    </div>
  ),
}));

jest.mock('@/components/pr/campaign/CampaignRecipientManager', () => ({
  __esModule: true,
  default: ({ onListsChange }: any) => (
    <div data-testid="recipient-manager">
      <button onClick={() => onListsChange(['list-1'], ['Test List'], 5)}>
        Select Recipients
      </button>
    </div>
  ),
}));

jest.mock('@/components/campaigns/ApprovalSettings', () => ({
  ApprovalSettings: ({ onChange }: any) => (
    <div data-testid="approval-settings">
      <button
        onClick={() =>
          onChange({
            teamApprovalRequired: true,
            customerApprovalRequired: true,
          })
        }
      >
        Enable Approvals
      </button>
    </div>
  ),
}));

// Dynamic Import Mocks
jest.mock('@/components/pr/ai/StructuredGenerationModal', () => ({
  __esModule: true,
  default: ({ onGenerate }: any) => (
    <div data-testid="ai-modal">
      <button
        onClick={() =>
          onGenerate({
            structured: {
              headline: 'AI Generated Title',
              leadParagraph: 'AI Generated Lead',
              bodyParagraphs: ['AI Generated Body'],
              quote: {
                text: 'AI Generated Quote',
                person: 'AI Person',
                role: 'AI Role',
                company: 'AI Company',
              },
            },
          })
        }
      >
        Generate Content
      </button>
    </div>
  ),
}));

const mockRouter = {
  push: jest.fn(),
};

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
};

const mockOrganization = {
  id: 'test-org-123',
  name: 'Test Organization',
};

const mockPdfVersionsService = pdfVersionsService as jest.Mocked<typeof pdfVersionsService>;
const mockPrService = prService as jest.Mocked<typeof prService>;
const mockListsService = listsService as jest.Mocked<typeof listsService>;
const mockApprovalWorkflowService = approvalWorkflowService as jest.Mocked<typeof approvalWorkflowService>;

// Import the component after mocks are set up
let NewPRCampaignPage: React.ComponentType;

describe('Campaign PDF Integration', () => {
  beforeAll(async () => {
    // Dynamic import after mocks are set up
    const module = await import('@/app/dashboard/pr-tools/campaigns/campaigns/new/page');
    NewPRCampaignPage = module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: mockOrganization });

    // Mock successful service responses
    mockListsService.getAll.mockResolvedValue([
      {
        id: 'list-1',
        name: 'Test List',
        recipientCount: 5,
        organizationId: mockOrganization.id,
      },
    ] as any);

    mockPrService.create.mockResolvedValue('new-campaign-123');
    mockApprovalWorkflowService.createWorkflow.mockResolvedValue('workflow-123');
    
    mockPdfVersionsService.createPDFVersion.mockResolvedValue('pdf-version-123');
    mockPdfVersionsService.getCurrentVersion.mockResolvedValue(null);
    mockPdfVersionsService.getVersionHistory.mockResolvedValue([]);
    mockPdfVersionsService.isEditingLocked.mockResolvedValue(false);
  });

  describe('Campaign Creation Workflow', () => {
    it('sollte durch alle 4 Steps navigieren und PDF generieren können', async () => {
      render(<NewPRCampaignPage />);

      // Wait for data loading
      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Step 1: Pressemeldung
      expect(screen.getByText('Pressemeldung')).toBeInTheDocument();
      
      // Select customer
      fireEvent.click(screen.getByText('Select Customer'));
      
      // Fill content
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Test Campaign Title' },
      });
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: '<p>Test campaign content</p>' },
      });

      // Go to Step 2
      fireEvent.click(screen.getByText('Weiter'));

      // Step 2: Anhänge
      expect(screen.getByText('Anhänge')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Weiter'));

      // Step 3: Freigaben
      expect(screen.getByText('Freigaben')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Weiter'));

      // Step 4: Vorschau
      expect(screen.getByText('Vorschau')).toBeInTheDocument();
      expect(screen.getByText('PDF-Export')).toBeInTheDocument();

      // PDF generieren
      const pdfButton = screen.getByText('PDF generieren');
      expect(pdfButton).toBeInTheDocument();
      
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockPdfVersionsService.createPDFVersion).toHaveBeenCalledWith(
          expect.stringMatching(/temp_\d+/), // Temporäre Campaign ID
          mockOrganization.id,
          expect.objectContaining({
            title: 'Test Campaign Title',
            mainContent: '<p>Test campaign content</p>',
            boilerplateSections: [],
          }),
          expect.objectContaining({
            userId: mockUser.uid,
            status: 'draft',
          })
        );
      });
    });

    it('sollte Campaign mit PDF-Versionierung korrekt speichern', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Setup campaign data
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Campaign with PDF' },
      });
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: '<p>Campaign content for PDF</p>' },
      });

      // Navigate to final step
      fireEvent.click(screen.getByText('Weiter')); // Step 2
      fireEvent.click(screen.getByText('Weiter')); // Step 3
      fireEvent.click(screen.getByText('Weiter')); // Step 4

      // Save campaign
      const saveButton = screen.getByText('Als Entwurf speichern');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockPrService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Campaign with PDF',
            mainContent: '<p>Campaign content for PDF</p>',
            organizationId: mockOrganization.id,
            userId: mockUser.uid,
            status: 'draft',
          })
        );
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/pr-tools/campaigns?refresh=true');
      });
    });
  });

  describe('PDF Generation Integration', () => {
    it('sollte PDF für Kundenfreigabe mit Approval-Integration erstellen', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Setup campaign
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Campaign for Approval' },
      });
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: '<p>Content for customer approval</p>' },
      });

      // Navigate to approvals step
      fireEvent.click(screen.getByText('Weiter')); // Step 2
      fireEvent.click(screen.getByText('Weiter')); // Step 3

      // Enable approvals
      fireEvent.click(screen.getByText('Enable Approvals'));
      fireEvent.click(screen.getByText('Weiter')); // Step 4

      // Save with approval request
      const approvalButton = screen.getByText('Freigabe anfordern');
      fireEvent.click(approvalButton);

      await waitFor(() => {
        expect(mockPrService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            approvalRequired: true,
            approvalData: expect.objectContaining({
              teamApprovalRequired: true,
              customerApprovalRequired: true,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockApprovalWorkflowService.createWorkflow).toHaveBeenCalledWith(
          'new-campaign-123',
          mockOrganization.id,
          expect.objectContaining({
            teamApprovalRequired: true,
            customerApprovalRequired: true,
          })
        );
      });
    });

    it('sollte PDF-Generation Fehler graceful behandeln', async () => {
      mockPdfVersionsService.createPDFVersion.mockRejectedValue(
        new Error('PDF generation failed')
      );

      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Setup und navigate zu PDF step
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Test Campaign' },
      });

      // Navigate to step 4
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));

      // Try to generate PDF
      fireEvent.click(screen.getByText('PDF generieren'));

      await waitFor(() => {
        expect(screen.getByText('Fehler bei der PDF-Erstellung')).toBeInTheDocument();
      });
    });
  });

  describe('Content Integration', () => {
    it('sollte AI-generierten Content korrekt in PDF-Metadaten übernehmen', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('KI-Assistent')).toBeInTheDocument();
      });

      // Open AI modal und generate content
      fireEvent.click(screen.getByText('KI-Assistent'));
      fireEvent.click(screen.getByText('Generate Content'));

      // Check if AI content is applied
      await waitFor(() => {
        const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
        expect(titleInput.value).toBe('AI Generated Title');
      });

      // Navigate to step 4 and generate PDF
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));

      fireEvent.click(screen.getByText('PDF generieren'));

      await waitFor(() => {
        expect(mockPdfVersionsService.createPDFVersion).toHaveBeenCalledWith(
          expect.any(String),
          mockOrganization.id,
          expect.objectContaining({
            title: 'AI Generated Title',
            boilerplateSections: expect.arrayContaining([
              expect.objectContaining({
                type: 'lead',
                customTitle: 'Lead-Absatz (KI-generiert)',
              }),
              expect.objectContaining({
                type: 'quote',
                customTitle: 'Zitat (KI-generiert)',
                metadata: expect.objectContaining({
                  person: 'AI Person',
                  role: 'AI Role',
                  company: 'AI Company',
                }),
              }),
            ]),
          }),
          expect.any(Object)
        );
      });
    });

    it('sollte Key Visual in PDF-Content Snapshot einbinden', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByTestId('key-visual-section')).toBeInTheDocument();
      });

      // Set key visual
      fireEvent.click(screen.getByText('Set Key Visual'));
      fireEvent.click(screen.getByText('Select Customer'));

      // Navigate to PDF generation
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));

      fireEvent.click(screen.getByText('PDF generieren'));

      await waitFor(() => {
        expect(mockPdfVersionsService.createPDFVersion).toHaveBeenCalledWith(
          expect.any(String),
          mockOrganization.id,
          expect.objectContaining({
            keyVisual: {
              type: 'image',
              url: 'test.jpg',
            },
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('sollte Validation Errors für unvollständige Kampagne anzeigen', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Navigate to final step without filling required fields
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));

      // Try to save
      fireEvent.click(screen.getByText('Als Entwurf speichern'));

      await waitFor(() => {
        expect(screen.getByText('Bitte wählen Sie einen Kunden aus')).toBeInTheDocument();
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Inhalt ist erforderlich')).toBeInTheDocument();
      });

      // prService.create should not be called
      expect(mockPrService.create).not.toHaveBeenCalled();
    });

    it('sollte Campaign-Erstellung Fehler behandeln', async () => {
      mockPrService.create.mockRejectedValue(new Error('Database error'));

      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Setup valid campaign
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Valid Campaign' },
      });
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: '<p>Valid content</p>' },
      });

      // Navigate and save
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Als Entwurf speichern'));

      await waitFor(() => {
        expect(screen.getByText(/Fehler: Database error/)).toBeInTheDocument();
      });

      // Should not navigate on error
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('sollte Approval Workflow Fehler behandeln aber Campaign speichern', async () => {
      mockApprovalWorkflowService.createWorkflow.mockRejectedValue(
        new Error('Workflow creation failed')
      );

      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Setup campaign with approvals
      fireEvent.click(screen.getByText('Select Customer'));
      fireEvent.change(screen.getByTestId('title-input'), {
        target: { value: 'Campaign with Failed Workflow' },
      });
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: '<p>Content</p>' },
      });

      // Enable approvals
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Enable Approvals'));
      fireEvent.click(screen.getByText('Weiter'));

      // Save with approval
      fireEvent.click(screen.getByText('Freigabe anfordern'));

      await waitFor(() => {
        expect(mockPrService.create).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/Die Kampagne wurde gespeichert, aber der Freigabe-Workflow konnte nicht erstellt werden/)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Step Navigation', () => {
    it('sollte korrekte Step-Navigation und Validierung durchführen', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Pressemeldung')).toBeInTheDocument();
      });

      // Should be on step 1
      expect(screen.getByText('Pressemeldung')).toHaveClass('text-[#005fab]'); // Active step

      // Go forward
      fireEvent.click(screen.getByText('Weiter'));
      expect(screen.getByText('Anhänge')).toHaveClass('text-[#005fab]');

      // Go forward
      fireEvent.click(screen.getByText('Weiter'));
      expect(screen.getByText('Freigaben')).toHaveClass('text-[#005fab]');

      // Go forward
      fireEvent.click(screen.getByText('Weiter'));
      expect(screen.getByText('Vorschau')).toHaveClass('text-[#005fab]');

      // Go back
      fireEvent.click(screen.getByText('Zurück'));
      expect(screen.getByText('Freigaben')).toHaveClass('text-[#005fab]');
    });

    it('sollte Form Submit nur in Step 4 erlauben', async () => {
      render(<NewPRCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // In Step 1, only "Weiter" should be visible, not save button
      expect(screen.queryByText('Als Entwurf speichern')).not.toBeInTheDocument();
      expect(screen.getByText('Weiter')).toBeInTheDocument();

      // Navigate to Step 4
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));
      fireEvent.click(screen.getByText('Weiter'));

      // Now save button should be visible
      expect(screen.getByText('Als Entwurf speichern')).toBeInTheDocument();
    });
  });
});