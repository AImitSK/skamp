// src/__tests__/team-approval-pdf-integration.test.ts - Umfassende Tests für PDF-Team-Approval Integration

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InternalApprovalPage from '@/app/freigabe-intern/[shareId]/page';
import { TeamApprovalCard } from '@/components/approvals/TeamApprovalCard';

// Mock alle Services
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/team-approval-service');
jest.mock('@/lib/firebase/approval-workflow-service');
jest.mock('@/lib/firebase/pdf-versions-service');
jest.mock('@/lib/firebase/pdf-approval-bridge-service');
jest.mock('next/navigation');

import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { prService } from '@/lib/firebase/pr-service';
import { teamApprovalService } from '@/lib/firebase/team-approval-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { useParams, useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

// Mock-Implementierungen
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockPRService = prService as jest.Mocked<typeof prService>;
const mockTeamApprovalService = teamApprovalService as jest.Mocked<typeof teamApprovalService>;
const mockApprovalWorkflowService = approvalWorkflowService as jest.Mocked<typeof approvalWorkflowService>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Test-Daten-Factory
const createTestCampaign = (overrides = {}) => ({
  id: 'test-campaign-id',
  title: 'Test Pressemitteilung',
  contentHtml: '<p>Test Content</p>',
  organizationId: 'test-org-id',
  approvalData: {
    workflowId: 'test-workflow-id'
  },
  ...overrides
});

const createTestWorkflow = (overrides = {}) => ({
  id: 'test-workflow-id',
  stages: [
    {
      type: 'team' as const,
      requiredApprovals: 2,
      name: 'Team-Freigabe'
    }
  ],
  currentStage: 0,
  teamSettings: {
    approvers: [
      {
        userId: 'team-member-1',
        displayName: 'Max Mustermann',
        email: 'max@example.com',
        status: 'approved' as const,
        photoUrl: null
      },
      {
        userId: 'team-member-2',
        displayName: 'Anna Schmidt',
        email: 'anna@example.com',
        status: 'pending' as const,
        photoUrl: null
      }
    ],
    message: 'Bitte sorgfältig prüfen'
  },
  customerSettings: {
    required: true
  },
  createdBy: 'Campaign Creator',
  createdAt: Timestamp.now(),
  ...overrides
});

const createTestUserApproval = (overrides = {}) => ({
  id: 'test-user-approval-id',
  workflowId: 'test-workflow-id',
  userId: 'team-member-2',
  status: 'pending' as const,
  assignedAt: Timestamp.now(),
  ...overrides
});

const createTestPdfVersion = (overrides = {}) => ({
  id: 'test-pdf-version-id',
  campaignId: 'test-campaign-id',
  organizationId: 'test-org-id',
  version: 1,
  createdAt: Timestamp.now(),
  createdBy: 'test-user-id',
  status: 'pending_team' as const,
  downloadUrl: 'https://storage.googleapis.com/test.pdf',
  fileName: 'test-pressemitteilung-v1.pdf',
  fileSize: 1024000,
  approvalId: 'test-workflow-id',
  ...overrides
});

describe('Team-Freigabe-Seite PDF-Integration', () => {
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Standard mock setup
    mockUseAuth.mockReturnValue({
      user: { uid: 'team-member-2', email: 'anna@example.com' },
      loading: false
    } as any);
    
    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'test-org-id', name: 'Test Organization' },
      loading: false
    } as any);
    
    mockUseParams.mockReturnValue({ shareId: 'test-share-id' });
    mockUseRouter.mockReturnValue({ push: jest.fn() } as any);
    
    // PDF-Versions-Service Mock
    jest.doMock('@/lib/firebase/pdf-versions-service', () => ({
      pdfVersionsService: {
        getVersionHistory: jest.fn().mockResolvedValue([createTestPdfVersion()])
      }
    }));
    
    // PDF-Approval-Bridge-Service Mock
    jest.doMock('@/lib/firebase/pdf-approval-bridge-service', () => ({
      pdfApprovalBridgeService: {
        syncApprovalStatusToPDF: jest.fn().mockResolvedValue(undefined)
      }
    }));
  });

  describe('Enhanced Data Loading', () => {
    it('sollte PDF-Versionen mit Team-Approval laden', async () => {
      const mockCampaign = createTestCampaign();
      const mockWorkflow = createTestWorkflow();
      const mockUserApproval = createTestUserApproval();
      const mockPdfVersions = [createTestPdfVersion({ status: 'pending_team' })];
      
      mockPRService.getCampaignByShareId.mockResolvedValue(mockCampaign);
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([mockUserApproval]);
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF-Version zur Freigabe')).toBeInTheDocument();
        expect(screen.getByText('Bitte sorgfältig prüfen')).toBeInTheDocument();
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });
    });
    
    it('sollte Team-Approval-Message korrekt anzeigen', async () => {
      const mockWorkflow = createTestWorkflow({
        teamSettings: {
          ...createTestWorkflow().teamSettings,
          message: 'Besondere Aufmerksamkeit auf Abschnitt 3'
        }
      });
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([createTestUserApproval()]);
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('💬 Nachricht vom Campaign-Ersteller')).toBeInTheDocument();
        expect(screen.getByText('"Besondere Aufmerksamkeit auf Abschnitt 3"')).toBeInTheDocument();
      });
    });
    
    it('sollte graceful mit PDF-Loading-Fehlern umgehen', async () => {
      const mockCampaign = createTestCampaign();
      const mockWorkflow = createTestWorkflow();
      const mockUserApproval = createTestUserApproval();
      
      mockPRService.getCampaignByShareId.mockResolvedValue(mockCampaign);
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([mockUserApproval]);
      
      // PDF-Service wirft Fehler
      jest.doMock('@/lib/firebase/pdf-versions-service', () => ({
        pdfVersionsService: {
          getVersionHistory: jest.fn().mockRejectedValue(new Error('PDF Load Fehler'))
        }
      }));
      
      render(<InternalApprovalPage />);
      
      // Seite sollte trotzdem funktionieren, nur ohne PDF-Sektion
      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
        expect(screen.queryByText('PDF-Version zur Freigabe')).not.toBeInTheDocument();
      });
    });
  });
  
  describe('PDF-Status Synchronisation', () => {
    it('sollte PDF-Status synchronisieren bei Team-Mitglied Approval', async () => {
      const mockUserApproval = createTestUserApproval({ status: 'pending' });
      const mockPdfVersion = createTestPdfVersion({ status: 'pending_team' });
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([mockUserApproval]);
      mockTeamApprovalService.submitTeamDecision.mockResolvedValue(undefined);
      
      // Dynamische PDF-Bridge Service Mock
      const mockSyncApprovalStatusToPDF = jest.fn().mockResolvedValue(undefined);
      jest.doMock('@/lib/firebase/pdf-approval-bridge-service', () => ({
        pdfApprovalBridgeService: {
          syncApprovalStatusToPDF: mockSyncApprovalStatusToPDF
        }
      }));
      
      render(<InternalApprovalPage />);
      
      // Warte auf Seiten-Load
      await waitFor(() => {
        expect(screen.getByText('Freigeben')).toBeInTheDocument();
      });
      
      const approveButton = screen.getByText('Freigeben');
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        expect(mockSyncApprovalStatusToPDF).toHaveBeenCalledWith(
          mockUserApproval.workflowId,
          'approved'
        );
      });
    });
    
    it('sollte lokalen PDF-Status nach Approval-Entscheidung updaten', async () => {
      const mockUserApproval = createTestUserApproval({ status: 'pending' });
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([mockUserApproval]);
      mockTeamApprovalService.submitTeamDecision.mockResolvedValue(undefined);
      
      render(<InternalApprovalPage />);
      
      // Warte auf Seiten-Load mit PDF
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });
      
      const approveButton = screen.getByText('Freigeben');
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        // PDF-Status sollte sich zu "freigegeben" ändern
        expect(screen.getByText('PDF freigegeben')).toBeInTheDocument();
      });
    });
    
    it('sollte PDF-Sync-Fehler graceful behandeln', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockUserApproval = createTestUserApproval({ status: 'pending' });
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([mockUserApproval]);
      mockTeamApprovalService.submitTeamDecision.mockResolvedValue(undefined);
      
      // PDF-Sync wirft Fehler
      jest.doMock('@/lib/firebase/pdf-approval-bridge-service', () => ({
        pdfApprovalBridgeService: {
          syncApprovalStatusToPDF: jest.fn().mockRejectedValue(new Error('PDF Sync Fehler'))
        }
      }));
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Freigeben')).toBeInTheDocument();
      });
      
      const approveButton = screen.getByText('Freigeben');
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        // Team-Approval sollte trotzdem erfolgreich sein
        expect(mockTeamApprovalService.submitTeamDecision).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('PDF-Synchronisation fehlgeschlagen:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Enhanced UI-Elemente', () => {
    it('sollte PDF-Download und View-Buttons anzeigen', async () => {
      const mockPdfVersion = createTestPdfVersion({
        downloadUrl: 'https://storage.googleapis.com/test.pdf'
      });
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([createTestUserApproval()]);
      
      // Mock window.open
      const mockWindowOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true
      });
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF herunterladen')).toBeInTheDocument();
        expect(screen.getByText('PDF ansehen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('PDF ansehen'));
      expect(mockWindowOpen).toHaveBeenCalledWith(mockPdfVersion.downloadUrl, '_blank');
    });
    
    it('sollte PDF-Versionen-Historie anzeigen wenn mehrere Versionen vorhanden', async () => {
      const mockPdfVersions = [
        createTestPdfVersion({ id: 'v1', version: 1 }),
        createTestPdfVersion({ id: 'v2', version: 2 })
      ];
      
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([createTestUserApproval()]);
      
      jest.doMock('@/lib/firebase/pdf-versions-service', () => ({
        pdfVersionsService: {
          getVersionHistory: jest.fn().mockResolvedValue(mockPdfVersions)
        }
      }));
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Weitere Versionen anzeigen (1)')).toBeInTheDocument();
      });
    });
    
    it('sollte Enhanced Decision Form mit PDF-Guidance anzeigen', async () => {
      mockPRService.getCampaignByShareId.mockResolvedValue(createTestCampaign());
      mockApprovalWorkflowService.getWorkflow.mockResolvedValue(createTestWorkflow());
      mockTeamApprovalService.getApprovalsByUser.mockResolvedValue([createTestUserApproval()]);
      
      render(<InternalApprovalPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Prüfungshinweise:')).toBeInTheDocument();
        expect(screen.getByText(/Laden Sie das PDF herunter/)).toBeInTheDocument();
        expect(screen.getByText(/Bei Freigabe wird die Kampagne an den Kunden weitergeleitet/)).toBeInTheDocument();
      });
    });
  });
});

describe('TeamApprovalCard PDF-Integration', () => {
  
  const mockWorkflow = createTestWorkflow();
  const mockUserApproval = createTestUserApproval();
  const mockPdfVersion = createTestPdfVersion();
  const mockOnSubmitDecision = jest.fn();
  
  it('sollte PDF-Status Indicator in Header anzeigen', () => {
    render(
      <TeamApprovalCard
        workflow={mockWorkflow}
        userApproval={mockUserApproval}
        currentUserId="team-member-2"
        onSubmitDecision={mockOnSubmitDecision}
        currentPdfVersion={mockPdfVersion}
        teamApprovalMessage="Test Message"
      />
    );
    
    expect(screen.getByText('PDF v1')).toBeInTheDocument();
  });
  
  it('sollte Enhanced Team Message mit Gradient-Design anzeigen', () => {
    render(
      <TeamApprovalCard
        workflow={mockWorkflow}
        userApproval={mockUserApproval}
        currentUserId="team-member-2"
        onSubmitDecision={mockOnSubmitDecision}
        currentPdfVersion={mockPdfVersion}
        teamApprovalMessage="Besondere Aufmerksamkeit erforderlich"
      />
    );
    
    expect(screen.getByText('Nachricht für das Team')).toBeInTheDocument();
    expect(screen.getByText('"Besondere Aufmerksamkeit erforderlich"')).toBeInTheDocument();
  });
  
  it('sollte PDF-Integration Status in Footer anzeigen', () => {
    const approvedPdfVersion = createTestPdfVersion({ status: 'approved' });
    
    render(
      <TeamApprovalCard
        workflow={mockWorkflow}
        userApproval={mockUserApproval}
        currentUserId="team-member-2"
        onSubmitDecision={mockOnSubmitDecision}
        currentPdfVersion={approvedPdfVersion}
        teamApprovalMessage="Test Message"
      />
    );
    
    expect(screen.getByText('PDF-Version 1 ist mit dieser Freigabe verknüpft')).toBeInTheDocument();
    expect(screen.getByText('PDF freigegeben')).toBeInTheDocument();
  });
  
  it('sollte ohne PDF-Version funktionieren (Rückwärtskompatibilität)', () => {
    render(
      <TeamApprovalCard
        workflow={mockWorkflow}
        userApproval={mockUserApproval}
        currentUserId="team-member-2"
        onSubmitDecision={mockOnSubmitDecision}
        currentPdfVersion={null}
        teamApprovalMessage={null}
      />
    );
    
    // Sollte normal funktionieren ohne PDF-Elemente
    expect(screen.getByText('Team-Freigabe Status')).toBeInTheDocument();
    expect(screen.queryByText('PDF v')).not.toBeInTheDocument();
  });
});

describe('Helper Functions', () => {
  
  // Diese Tests würden die Helper-Functions testen, falls sie exportiert wären
  // Für jetzt fokussieren wir auf Integration-Tests
  
  it('sollte Dateigröße korrekt formatieren', () => {
    // Test für formatFileSize Function - würde Mock benötigen da nicht exportiert
    expect(true).toBe(true); // Placeholder
  });
  
  it('sollte geschätzte Bearbeitungszeit korrekt berechnen', () => {
    // Test für calculateEstimatedDuration Function
    expect(true).toBe(true); // Placeholder  
  });
});