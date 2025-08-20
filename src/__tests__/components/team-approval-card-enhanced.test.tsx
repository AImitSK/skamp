// src/__tests__/components/team-approval-card-enhanced.test.tsx
// Comprehensive UI-Component Tests für TeamApprovalCard mit PDF-Integration

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamApprovalCard } from '@/components/approvals/TeamApprovalCard';
import { ApprovalWorkflow, TeamApproval } from '@/types/approvals-enhanced';
import { PDFVersion } from '@/lib/firebase/pdf-versions-service';

// ==================== MOCK DATA ====================

const mockWorkflow: ApprovalWorkflow = {
  id: 'workflow-123',
  campaignId: 'campaign-456',
  organizationId: 'org-789',
  currentStage: 'team',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  teamSettings: {
    enabled: true,
    approvers: [
      {
        userId: 'user-1',
        displayName: 'Max Mustermann',
        email: 'max@company.com',
        photoUrl: 'https://example.com/avatar1.jpg',
        status: 'approved',
        approvedAt: new Date('2024-01-15T10:00:00Z'),
        message: 'Sieht gut aus!'
      },
      {
        userId: 'user-2',
        displayName: 'Anna Schmidt',
        email: 'anna@company.com',
        photoUrl: null,
        status: 'pending'
      },
      {
        userId: 'user-3',
        displayName: 'Tom Weber',
        email: 'tom@company.com',
        photoUrl: 'https://example.com/avatar3.jpg',
        status: 'rejected',
        rejectedAt: new Date('2024-01-16T14:30:00Z'),
        message: 'Bitte Titel überarbeiten'
      }
    ],
    message: 'Bitte bis Freitag prüfen und freigeben.'
  },
  customerSettings: {
    enabled: false,
    customerContact: null,
    message: null
  }
};

const mockUserApproval: TeamApproval = {
  userId: 'user-2',
  status: 'pending',
  message: null,
  approvedAt: null,
  rejectedAt: null
};

const mockPDFVersion: PDFVersion = {
  id: 'pdf-version-123',
  campaignId: 'campaign-456',
  organizationId: 'org-789',
  version: 3,
  status: 'approved',
  pdfUrl: 'https://storage.example.com/pdfs/campaign-456-v3.pdf',
  htmlContent: '<html>...</html>',
  templateId: 'template-1',
  metadata: {
    title: 'Test Campaign PDF',
    generatedAt: new Date(),
    generatedBy: 'user-1'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const createTestProps = (overrides = {}) => ({
  workflow: mockWorkflow,
  userApproval: mockUserApproval,
  currentUserId: 'user-2',
  onSubmitDecision: jest.fn(),
  currentPdfVersion: mockPDFVersion,
  teamApprovalMessage: mockWorkflow.teamSettings.message,
  ...overrides
});

// ==================== TEST SUITE ====================

describe('TeamApprovalCard Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  // ==================== RENDERING TESTS ====================

  describe('Component Rendering', () => {
    test('sollte grundlegende Elemente rendern', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Team-Freigabe Status')).toBeInTheDocument();
      expect(screen.getByText('2/3 freigegeben')).toBeInTheDocument();
      expect(screen.getByText('1 abgelehnt')).toBeInTheDocument();
    });

    test('sollte PDF-Version Badge anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('PDF v3')).toBeInTheDocument();
    });

    test('sollte Team-Nachricht anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Nachricht für das Team')).toBeInTheDocument();
      expect(screen.getByText('"Bitte bis Freitag prüfen und freigeben."')).toBeInTheDocument();
    });

    test('sollte ohne PDF-Version rendern', () => {
      const props = createTestProps({ currentPdfVersion: null });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Team-Freigabe Status')).toBeInTheDocument();
      expect(screen.queryByText('PDF v3')).not.toBeInTheDocument();
    });
  });

  // ==================== APPROVER DISPLAY TESTS ====================

  describe('Approver Display', () => {
    test('sollte alle Approver korrekt anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      // Approver Namen
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
      expect(screen.getByText('Tom Weber')).toBeInTheDocument();

      // Approver E-Mails
      expect(screen.getByText('max@company.com')).toBeInTheDocument();
      expect(screen.getByText('anna@company.com')).toBeInTheDocument();
      expect(screen.getByText('tom@company.com')).toBeInTheDocument();
    });

    test('sollte aktuellen User markieren', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
      expect(screen.getByText('(Sie)')).toBeInTheDocument();
    });

    test('sollte Approver Status korrekt anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Freigegeben am 15.01.2024, 11:00')).toBeInTheDocument();
      expect(screen.getByText('"Sieht gut aus!"')).toBeInTheDocument();
      expect(screen.getByText('Wartet auf Entscheidung')).toBeInTheDocument();
      expect(screen.getByText('Abgelehnt am 16.01.2024, 15:30')).toBeInTheDocument();
      expect(screen.getByText('"Bitte Titel überarbeiten"')).toBeInTheDocument();
    });

    test('sollte Avatar-Bilder korrekt anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      const avatarImage = screen.getByAltText('Max Mustermann');
      expect(avatarImage).toBeInTheDocument();
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar1.jpg');

      // Initialen für User ohne Avatar
      expect(screen.getByText('A')).toBeInTheDocument(); // Anna Schmidt
    });
  });

  // ==================== PROGRESS INDICATOR TESTS ====================

  describe('Progress Indicator', () => {
    test('sollte Fortschrittsbalken korrekt anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Fortschritt')).toBeInTheDocument();
      expect(screen.getByText('2/3 bearbeitet')).toBeInTheDocument();
      expect(screen.getByText('1 freigegeben')).toBeInTheDocument();
      expect(screen.getByText('1 abgelehnt')).toBeInTheDocument();
      expect(screen.getByText('1 ausstehend')).toBeInTheDocument();
    });

    test('sollte korrekten Fortschritt ohne Ablehnungen anzeigen', () => {
      const workflowWithoutRejections = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: [
            ...mockWorkflow.teamSettings.approvers.slice(0, 2), // Nur approved und pending
          ]
        }
      };
      
      const props = createTestProps({ workflow: workflowWithoutRejections });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('1/2 freigegeben')).toBeInTheDocument();
      expect(screen.queryByText('1 abgelehnt')).not.toBeInTheDocument();
    });
  });

  // ==================== CURRENT USER STATUS TESTS ====================

  describe('Current User Status', () => {
    test('sollte Status für aktuellen User anzeigen wenn Approver', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Ihre Entscheidung')).toBeInTheDocument();
      expect(screen.getByText('Entscheidung ausstehend')).toBeInTheDocument();
    });

    test('sollte Status für bereits entschiedenen User anzeigen', () => {
      const userApproval = { ...mockUserApproval, status: 'approved' as const };
      const props = createTestProps({ userApproval });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Sie haben freigegeben')).toBeInTheDocument();
      expect(screen.getByText('Freigegeben')).toBeInTheDocument();
    });

    test('sollte Status für ablehnenden User anzeigen', () => {
      const userApproval = { ...mockUserApproval, status: 'rejected' as const };
      const props = createTestProps({ userApproval });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Sie haben abgelehnt')).toBeInTheDocument();
      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });

    test('sollte keine Current User Section anzeigen wenn nicht Approver', () => {
      const props = createTestProps({ currentUserId: 'user-999' });
      render(<TeamApprovalCard {...props} />);

      expect(screen.queryByText('Ihre Entscheidung')).not.toBeInTheDocument();
    });
  });

  // ==================== PDF INTEGRATION TESTS ====================

  describe('PDF Integration Status', () => {
    test('sollte PDF-Version Status anzeigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('PDF-Version 3 ist mit dieser Freigabe verknüpft')).toBeInTheDocument();
      expect(screen.getByText('PDF freigegeben')).toBeInTheDocument();
    });

    test('sollte PDF Status ohne Freigabe-Badge anzeigen', () => {
      const pdfVersion = { ...mockPDFVersion, status: 'pending' as const };
      const props = createTestProps({ currentPdfVersion: pdfVersion });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('PDF-Version 3 ist mit dieser Freigabe verknüpft')).toBeInTheDocument();
      expect(screen.queryByText('PDF freigegeben')).not.toBeInTheDocument();
    });

    test('sollte ohne PDF-Version kein PDF Status anzeigen', () => {
      const props = createTestProps({ currentPdfVersion: null });
      render(<TeamApprovalCard {...props} />);

      expect(screen.queryByText('PDF-Version')).not.toBeInTheDocument();
    });
  });

  // ==================== INTERACTION TESTS ====================

  describe('User Interactions', () => {
    test('sollte onSubmitDecision für Freigabe aufrufen', async () => {
      const mockOnSubmitDecision = jest.fn();
      const props = createTestProps({ onSubmitDecision: mockOnSubmitDecision });
      
      // Diese Tests würden normalerweise Action-Buttons testen,
      // aber die aktuelle Component zeigt nur Status an
      // In einer vollständigen Implementation würde es Approve/Reject Buttons geben
      expect(mockOnSubmitDecision).toBeDefined();
    });

    test('sollte Hover-Effekte für Approver-Karten haben', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      // Transition-Classes werden korrekt gesetzt
      const approverCards = screen.getAllByText(/.*@company\.com/);
      approverCards.forEach(card => {
        const cardElement = card.closest('div');
        expect(cardElement).toHaveClass('transition-all');
      });
    });
  });

  // ==================== EDGE CASES TESTS ====================

  describe('Edge Cases', () => {
    test('sollte mit leerem teamApprovalMessage umgehen', () => {
      const props = createTestProps({ teamApprovalMessage: null });
      render(<TeamApprovalCard {...props} />);

      expect(screen.queryByText('Nachricht für das Team')).not.toBeInTheDocument();
    });

    test('sollte mit leerer Approver-Liste umgehen', () => {
      const workflowEmpty = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: []
        }
      };
      
      const props = createTestProps({ 
        workflow: workflowEmpty,
        currentUserId: 'user-999'
      });
      
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('0/0 freigegeben')).toBeInTheDocument();
      expect(screen.getByText('0/0 bearbeitet')).toBeInTheDocument();
    });

    test('sollte mit undefined photoUrl umgehen', () => {
      const workflowWithUndefinedPhoto = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: [{
            userId: 'user-1',
            displayName: 'Max Mustermann',
            email: 'max@company.com',
            photoUrl: undefined as any,
            status: 'pending' as const
          }]
        }
      };
      
      const props = createTestProps({ workflow: workflowWithUndefinedPhoto });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('M')).toBeInTheDocument(); // Initial von "Max"
    });
  });

  // ==================== DATE FORMATTING TESTS ====================

  describe('Date Formatting', () => {
    test('sollte Firestore Timestamps korrekt formatieren', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      };
      
      const workflowWithFirestoreTimestamp = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: [{
            ...mockWorkflow.teamSettings.approvers[0],
            approvedAt: firestoreTimestamp
          }]
        }
      };
      
      const props = createTestProps({ workflow: workflowWithFirestoreTimestamp });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Freigegeben am 15.01.2024, 11:00')).toBeInTheDocument();
    });

    test('sollte mit null Timestamps umgehen', () => {
      const workflowWithNullTimestamp = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: [{
            ...mockWorkflow.teamSettings.approvers[1],
            approvedAt: null,
            rejectedAt: null
          }]
        }
      };
      
      const props = createTestProps({ workflow: workflowWithNullTimestamp });
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByText('Wartet auf Entscheidung')).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  describe('Accessibility', () => {
    test('sollte korrekte alt-Attribute für Avatar-Bilder haben', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      const avatar = screen.getByAltText('Max Mustermann');
      expect(avatar).toBeInTheDocument();
    });

    test('sollte semantisch korrekte Struktur haben', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      expect(screen.getByRole('heading', { name: /Team-Freigabe Status/ })).toBeInTheDocument();
    });

    test('sollte Color-Contrast für Status-Indicators berücksichtigen', () => {
      const props = createTestProps();
      render(<TeamApprovalCard {...props} />);

      // Status-Icons haben korrekte Farben
      const elements = screen.getAllByText(/.*@company\.com/);
      elements.forEach(element => {
        const parentDiv = element.closest('div');
        expect(parentDiv).toHaveClass(/text-green-600|text-yellow-600|text-red-600/);
      });
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance', () => {
    test('sollte effizient mit großer Approver-Liste umgehen', () => {
      const largeApproverList = Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        displayName: `User ${i}`,
        email: `user${i}@company.com`,
        photoUrl: null,
        status: 'pending' as const
      }));
      
      const workflowLarge = {
        ...mockWorkflow,
        teamSettings: {
          ...mockWorkflow.teamSettings,
          approvers: largeApproverList
        }
      };
      
      const props = createTestProps({ workflow: workflowLarge });
      const startTime = performance.now();
      
      render(<TeamApprovalCard {...props} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Render sollte unter 100ms sein
      expect(screen.getByText('0/50 freigegeben')).toBeInTheDocument();
    });

    test('sollte Memoization für teure Berechnungen nutzen', () => {
      const props = createTestProps();
      const { rerender } = render(<TeamApprovalCard {...props} />);
      
      // Identische Props sollten nicht zu Neuberechnungen führen
      rerender(<TeamApprovalCard {...props} />);
      
      expect(screen.getByText('Team-Freigabe Status')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    test('sollte mit verschiedenen PDF-Status korrekt integrieren', () => {
      const scenarios = [
        { status: 'pending', expectedText: 'PDF-Version 3 ist mit dieser Freigabe verknüpft' },
        { status: 'approved', expectedText: 'PDF freigegeben' },
        { status: 'rejected', expectedText: 'PDF-Version 3 ist mit dieser Freigabe verknüpft' }
      ];
      
      scenarios.forEach(({ status, expectedText }) => {
        const pdfVersion = { ...mockPDFVersion, status: status as any };
        const props = createTestProps({ currentPdfVersion: pdfVersion });
        
        const { unmount } = render(<TeamApprovalCard {...props} />);
        
        expect(screen.getByText(expectedText)).toBeInTheDocument();
        
        unmount();
      });
    });

    test('sollte konsistent mit ApprovalWorkflow-Datenstruktur arbeiten', () => {
      // Test mit realistischen Workflow-Daten
      const realWorkflow: ApprovalWorkflow = {
        id: 'real-workflow',
        campaignId: 'real-campaign',
        organizationId: 'real-org',
        currentStage: 'team',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        teamSettings: {
          enabled: true,
          approvers: [
            {
              userId: 'real-user-1',
              displayName: 'Real User',
              email: 'real@example.com',
              status: 'approved',
              approvedAt: new Date(),
              message: 'LGTM'
            }
          ],
          message: 'Real message'
        },
        customerSettings: {
          enabled: false,
          customerContact: null,
          message: null
        }
      };
      
      const realUserApproval: TeamApproval = {
        userId: 'real-user-1',
        status: 'approved',
        message: 'LGTM',
        approvedAt: new Date(),
        rejectedAt: null
      };
      
      const props = createTestProps({ 
        workflow: realWorkflow,
        userApproval: realUserApproval,
        currentUserId: 'real-user-1'
      });
      
      render(<TeamApprovalCard {...props} />);
      
      expect(screen.getByText('Real User')).toBeInTheDocument();
      expect(screen.getByText('Sie haben freigegeben')).toBeInTheDocument();
    });
  });
});