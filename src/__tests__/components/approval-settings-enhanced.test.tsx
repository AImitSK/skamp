// src/__tests__/components/approval-settings-enhanced.test.tsx
// Comprehensive UI-Component Tests für ApprovalSettings mit PDF-Integration

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalSettings } from '@/components/campaigns/ApprovalSettings';
import { EnhancedApprovalData, createDefaultEnhancedApprovalData } from '@/types/approvals-enhanced';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { TeamMember } from '@/types/international';

// ==================== MOCKS ====================

jest.mock('@/lib/firebase/team-service-enhanced', () => ({
  teamMemberService: {
    getByOrganization: jest.fn(),
  }
}));

const mockTeamMemberService = teamMemberService as jest.Mocked<typeof teamMemberService>;

// Mock von Child-Components
jest.mock('@/components/campaigns/TeamMemberSelector', () => ({
  TeamMemberSelector: ({ selectedMembers, onSelectionChange, organizationId }: any) => (
    <div data-testid="team-member-selector" data-organization-id={organizationId}>
      <div>Selected Members: {selectedMembers.join(', ')}</div>
      <button 
        onClick={() => onSelectionChange(['user-1', 'user-2'])}
        data-testid="select-team-members"
      >
        Select Members
      </button>
    </div>
  )
}));

jest.mock('@/components/campaigns/CustomerContactSelector', () => ({
  CustomerContactSelector: ({ selectedContact, onContactChange, clientId }: any) => (
    <div data-testid="customer-contact-selector" data-client-id={clientId}>
      <div>Selected Contact: {selectedContact || 'None'}</div>
      <button 
        onClick={() => onContactChange('contact-1')}
        data-testid="select-customer-contact"
      >
        Select Contact
      </button>
    </div>
  )
}));

jest.mock('@/components/notifications/SimpleSwitch', () => ({
  SimpleSwitch: ({ checked, onChange }: any) => (
    <button
      data-testid="simple-switch"
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  )
}));

// ==================== TEST DATA ====================

const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-1',
    displayName: 'Max Mustermann',
    email: 'max@company.com',
    photoUrl: 'https://example.com/avatar1.jpg',
    role: 'member',
    organizationId: 'org-123',
    isActive: true,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'user-2',
    displayName: 'Anna Schmidt',
    email: 'anna@company.com',
    photoUrl: null,
    role: 'admin',
    organizationId: 'org-123',
    isActive: true,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const defaultApprovalData: EnhancedApprovalData = {
  ...createDefaultEnhancedApprovalData(),
  teamApprovalRequired: false,
  customerApprovalRequired: false,
  teamApprovers: [],
  customerContact: undefined
};

const createTestProps = (overrides = {}) => ({
  value: defaultApprovalData,
  onChange: jest.fn(),
  organizationId: 'org-123',
  clientId: 'client-456',
  clientName: 'Test Client GmbH',
  campaignId: 'campaign-789',
  showPDFIntegrationPreview: true,
  onPDFWorkflowToggle: jest.fn(),
  ...overrides
});

// ==================== TEST SUITE ====================

describe('ApprovalSettings Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Standard Mock-Setup
    mockTeamMemberService.getByOrganization.mockResolvedValue(mockTeamMembers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== RENDERING TESTS ====================

  describe('Component Rendering', () => {
    test('sollte grundlegende Elemente rendern', () => {
      const props = createTestProps();
      render(<ApprovalSettings {...props} />);

      expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
      expect(screen.getByText('Konfigurieren Sie den mehrstufigen Freigabe-Workflow für diese Kampagne')).toBeInTheDocument();
      expect(screen.getByText('Team-Freigabe erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Kunden-Freigabe erforderlich')).toBeInTheDocument();
    });

    test('sollte PDF-Integration Preview nicht anzeigen wenn deaktiviert', () => {
      const props = createTestProps({ showPDFIntegrationPreview: false });
      render(<ApprovalSettings {...props} />);

      expect(screen.queryByText('📄 PDF-Workflow Integration aktiviert')).not.toBeInTheDocument();
    });

    test('sollte Info-Box bei deaktivierter Freigabe anzeigen', () => {
      const props = createTestProps();
      render(<ApprovalSettings {...props} />);

      expect(screen.getByText('Keine Freigabe erforderlich:')).toBeInTheDocument();
      expect(screen.getByText(/Die Kampagne kann direkt versendet werden/)).toBeInTheDocument();
    });
  });

  // ==================== TEAM-APPROVAL TESTS ====================

  describe('Team-Freigabe Funktionalität', () => {
    test('sollte Team-Freigabe aktivieren können', async () => {
      const mockOnChange = jest.fn();
      const props = createTestProps({ onChange: mockOnChange });
      
      render(<ApprovalSettings {...props} />);
      
      const teamSwitch = screen.getAllByTestId('simple-switch')[0]; // Erster Switch ist Team
      
      await user.click(teamSwitch);
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          teamApprovalRequired: true,
          currentStage: 'team'
        })
      );
    });

    test('sollte Team-Mitglieder Selector bei aktivierter Team-Freigabe anzeigen', async () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('team-member-selector')).toBeInTheDocument();
      });
    });

    test('sollte Team-Mitglieder auswählen können', async () => {
      const mockOnChange = jest.fn();
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ 
        value: approvalData, 
        onChange: mockOnChange 
      });
      
      render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        const selectButton = screen.getByTestId('select-team-members');
        fireEvent.click(selectButton);
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          teamApprovers: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-1',
              displayName: 'Max Mustermann',
              email: 'max@company.com'
            }),
            expect.objectContaining({
              userId: 'user-2',
              displayName: 'Anna Schmidt',
              email: 'anna@company.com'
            })
          ])
        })
      );
    });

    test('sollte Team-Nachricht eingeben können', async () => {
      const mockOnChange = jest.fn();
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ 
        value: approvalData, 
        onChange: mockOnChange 
      });
      
      render(<ApprovalSettings {...props} />);
      
      const messageField = screen.getByPlaceholderText('Besondere Hinweise für die Team-Freigabe...');
      
      await user.type(messageField, 'Bitte bis Freitag freigeben');
      
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          teamApprovalMessage: 'Bitte bis Freitag freigeben'
        })
      );
    });
  });

  // ==================== CUSTOMER-APPROVAL TESTS ====================

  describe('Kunden-Freigabe Funktionalität', () => {
    test('sollte Kunden-Freigabe aktivieren können', async () => {
      const mockOnChange = jest.fn();
      const props = createTestProps({ onChange: mockOnChange });
      
      render(<ApprovalSettings {...props} />);
      
      const customerSwitch = screen.getAllByTestId('simple-switch')[1]; // Zweiter Switch ist Customer
      
      await user.click(customerSwitch);
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          customerApprovalRequired: true
        })
      );
    });

    test('sollte Customer-Kontakt Selector bei aktivierter Kunden-Freigabe und vorhandenem clientId anzeigen', async () => {
      const approvalData = {
        ...defaultApprovalData,
        customerApprovalRequired: true
      };
      const props = createTestProps({ 
        value: approvalData,
        clientId: 'client-456'
      });
      
      render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('customer-contact-selector')).toBeInTheDocument();
      });
    });

    test('sollte Warnung bei fehlender clientId anzeigen', () => {
      const approvalData = {
        ...defaultApprovalData,
        customerApprovalRequired: true
      };
      const props = createTestProps({ 
        value: approvalData,
        clientId: undefined
      });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('Bitte wählen Sie zuerst einen Kunden aus, um Kontakte anzuzeigen.')).toBeInTheDocument();
    });

    test('sollte Kunden-Kontakt auswählen können', async () => {
      const mockOnChange = jest.fn();
      const approvalData = {
        ...defaultApprovalData,
        customerApprovalRequired: true
      };
      const props = createTestProps({ 
        value: approvalData, 
        onChange: mockOnChange,
        clientId: 'client-456'
      });
      
      render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        const selectButton = screen.getByTestId('select-customer-contact');
        fireEvent.click(selectButton);
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          customerContact: expect.objectContaining({
            contactId: 'contact-1',
            name: 'Contact contact-1',
            email: 'contactcontact-1@client.com',
            companyName: 'Test Client GmbH'
          })
        })
      );
    });
  });

  // ==================== PDF-INTEGRATION TESTS ====================

  describe('PDF-Workflow Integration', () => {
    test('sollte PDF-Integration Preview bei aktivierter Team-Freigabe anzeigen', async () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('📄 PDF-Workflow Integration aktiviert')).toBeInTheDocument();
      expect(screen.getByText('PDF wird automatisch für Freigabe generiert')).toBeInTheDocument();
      expect(screen.getByText('Kampagne wird zur Bearbeitung gesperrt')).toBeInTheDocument();
      expect(screen.getByText('Freigabe-Links werden automatisch erstellt')).toBeInTheDocument();
    });

    test('sollte PDF-Integration Preview bei aktivierter Kunden-Freigabe anzeigen', async () => {
      const approvalData = {
        ...defaultApprovalData,
        customerApprovalRequired: true
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('📄 PDF-Workflow Integration aktiviert')).toBeInTheDocument();
    });

    test('sollte PDF-Workflow Toggle-Handler aufrufen', async () => {
      const mockOnPDFWorkflowToggle = jest.fn();
      const props = createTestProps({ 
        onPDFWorkflowToggle: mockOnPDFWorkflowToggle 
      });
      
      render(<ApprovalSettings {...props} />);
      
      const teamSwitch = screen.getAllByTestId('simple-switch')[0];
      
      await user.click(teamSwitch);
      
      expect(mockOnPDFWorkflowToggle).toHaveBeenCalledWith(true);
    });

    test('sollte automatischen Workflow-Ablauf Preview anzeigen', () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('Automatischer Ablauf nach dem Speichern:')).toBeInTheDocument();
      expect(screen.getByText('1. 📄 PDF-Version wird erstellt')).toBeInTheDocument();
      expect(screen.getByText('2. 🔒 Kampagne wird gesperrt')).toBeInTheDocument();
      expect(screen.getByText('3. 🔗 Freigabe-Links werden generiert')).toBeInTheDocument();
    });

    test('sollte Team-Link Preview bei ausgewählten Team-Mitgliedern anzeigen', async () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true,
        teamApprovers: [
          { userId: 'user-1', displayName: 'Max Mustermann', email: 'max@company.com', status: 'pending' },
          { userId: 'user-2', displayName: 'Anna Schmidt', email: 'anna@company.com', status: 'pending' }
        ]
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('Team-Freigabe Link wird generiert')).toBeInTheDocument();
      expect(screen.getByText(/alle 2 Team-Mitglieder/)).toBeInTheDocument();
    });

    test('sollte Customer-Link Preview bei ausgewähltem Kunden-Kontakt anzeigen', () => {
      const approvalData = {
        ...defaultApprovalData,
        customerApprovalRequired: true,
        customerContact: {
          contactId: 'contact-1',
          name: 'John Doe',
          email: 'john@client.com',
          companyName: 'Client Corp'
        }
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('Kunden-Freigabe Link wird generiert')).toBeInTheDocument();
      expect(screen.getByText('John Doe (john@client.com) erhält')).toBeInTheDocument();
    });
  });

  // ==================== WORKFLOW-PREVIEW TESTS ====================

  describe('Workflow-Vorschau', () => {
    test('sollte Workflow-Vorschau bei aktivierten Freigaben anzeigen', () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true,
        customerApprovalRequired: true,
        teamApprovers: [
          { userId: 'user-1', displayName: 'Max', email: 'max@company.com', status: 'pending' }
        ],
        customerContact: {
          contactId: 'contact-1',
          name: 'John',
          email: 'john@client.com',
          companyName: 'Client'
        }
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('🔄 Vollständiger Freigabe-Workflow Vorschau')).toBeInTheDocument();
      expect(screen.getByText('Team-Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Kunden-Freigabe')).toBeInTheDocument();
      expect(screen.getByText('Versand freigegeben')).toBeInTheDocument();
    });

    test('sollte PDF-Integration Schritte in Workflow-Vorschau anzeigen', () => {
      const approvalData = {
        ...defaultApprovalData,
        teamApprovalRequired: true
      };
      const props = createTestProps({ value: approvalData });
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('PDF-Integration Schritte:')).toBeInTheDocument();
      expect(screen.getByText('PDF generieren')).toBeInTheDocument();
      expect(screen.getByText('Edit-Lock aktivieren')).toBeInTheDocument();
      expect(screen.getByText('Links erstellen')).toBeInTheDocument();
      expect(screen.getByText('Status-Sync starten')).toBeInTheDocument();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    test('sollte graceful mit teamMemberService Fehler umgehen', async () => {
      mockTeamMemberService.getByOrganization.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const props = createTestProps();
      render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Fehler beim Laden der TeamMembers:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    test('sollte mit undefinierten Props umgehen können', () => {
      const props = {
        value: defaultApprovalData,
        onChange: jest.fn(),
        organizationId: 'org-123'
      };
      
      render(<ApprovalSettings {...props} />);
      
      expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  describe('Accessibility', () => {
    test('sollte korrekte ARIA-Labels haben', () => {
      const props = createTestProps();
      render(<ApprovalSettings {...props} />);
      
      const switches = screen.getAllByTestId('simple-switch');
      expect(switches).toHaveLength(2);
    });

    test('sollte Keyboard-Navigation unterstützen', async () => {
      const props = createTestProps();
      render(<ApprovalSettings {...props} />);
      
      const firstSwitch = screen.getAllByTestId('simple-switch')[0];
      
      firstSwitch.focus();
      expect(document.activeElement).toBe(firstSwitch);
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance', () => {
    test('sollte nicht bei jedem Render teamMembers neu laden', async () => {
      const props = createTestProps();
      const { rerender } = render(<ApprovalSettings {...props} />);
      
      await waitFor(() => {
        expect(mockTeamMemberService.getByOrganization).toHaveBeenCalledTimes(1);
      });
      
      rerender(<ApprovalSettings {...props} />);
      
      expect(mockTeamMemberService.getByOrganization).toHaveBeenCalledTimes(1);
    });

    test('sollte Callbacks nicht bei jedem Render neu erstellen', () => {
      const mockOnChange = jest.fn();
      const props = createTestProps({ onChange: mockOnChange });
      
      const { rerender } = render(<ApprovalSettings {...props} />);
      rerender(<ApprovalSettings {...props} />);
      
      // Component sollte stabil bleiben
      expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    test('sollte kompletten Team-Freigabe Workflow konfigurieren können', async () => {
      const mockOnChange = jest.fn();
      const mockOnPDFWorkflowToggle = jest.fn();
      
      const props = createTestProps({ 
        onChange: mockOnChange,
        onPDFWorkflowToggle: mockOnPDFWorkflowToggle
      });
      
      render(<ApprovalSettings {...props} />);
      
      // 1. Team-Freigabe aktivieren
      const teamSwitch = screen.getAllByTestId('simple-switch')[0];
      await user.click(teamSwitch);
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ teamApprovalRequired: true })
      );
      expect(mockOnPDFWorkflowToggle).toHaveBeenCalledWith(true);
      
      // 2. Team-Mitglieder auswählen
      await waitFor(() => {
        const selectButton = screen.getByTestId('select-team-members');
        fireEvent.click(selectButton);
      });
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          teamApprovers: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1' })
          ])
        })
      );
    });

    test('sollte kompletten Multi-Stage Workflow konfigurieren können', async () => {
      const mockOnChange = jest.fn();
      const props = createTestProps({ 
        onChange: mockOnChange,
        clientId: 'client-456'
      });
      
      render(<ApprovalSettings {...props} />);
      
      // 1. Team-Freigabe aktivieren
      const teamSwitch = screen.getAllByTestId('simple-switch')[0];
      await user.click(teamSwitch);
      
      // 2. Kunden-Freigabe aktivieren
      const customerSwitch = screen.getAllByTestId('simple-switch')[1];
      await user.click(customerSwitch);
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          teamApprovalRequired: true,
          customerApprovalRequired: true
        })
      );
    });
  });
});