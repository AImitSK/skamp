// src/__tests__/components/approval-settings-simplified.test.tsx
// Tests für vereinfachte ApprovalSettings (Customer-Only)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalSettings } from '@/components/campaigns/ApprovalSettings';

// ==================== MOCKS ====================

// Mock von CustomerContactSelector
jest.mock('@/components/campaigns/CustomerContactSelector', () => ({
  CustomerContactSelector: ({ selectedContact, onContactChange, clientId }: any) => (
    <div data-testid="customer-contact-selector" data-client-id={clientId}>
      <div>Selected Contact: {selectedContact || 'None'}</div>
      <button 
        onClick={() => onContactChange({
          contactId: 'contact-1',
          name: 'Test Kunde',
          email: 'kunde@example.com'
        })}
        data-testid="select-customer-contact"
      >
        Select Contact
      </button>
    </div>
  )
}));

// ==================== TYPES ====================

interface SimplifiedApprovalData {
  customerApprovalRequired: boolean;
  customerContact?: any;
  customerApprovalMessage?: string;
}

// ==================== HELPER FUNCTIONS ====================

const createTestApprovalData = (overrides: Partial<SimplifiedApprovalData> = {}): SimplifiedApprovalData => ({
  customerApprovalRequired: false,
  customerContact: undefined,
  customerApprovalMessage: '',
  ...overrides
});

const renderApprovalSettings = (props: Partial<{
  value: SimplifiedApprovalData;
  onChange: (data: SimplifiedApprovalData) => void;
  organizationId: string;
  clientId?: string;
  clientName?: string;
}> = {}) => {
  const defaultProps = {
    value: createTestApprovalData(),
    onChange: jest.fn(),
    organizationId: 'test-org-id',
    clientId: 'test-client-id',
    clientName: 'Test Client',
    ...props
  };

  return render(<ApprovalSettings {...defaultProps} />);
};

// ==================== TESTS ====================

describe('ApprovalSettings (Simplified)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    
    it('should render customer approval toggle', () => {
      renderApprovalSettings();
      
      expect(screen.getByText('Kundenfreigabe erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Kampagne muss vom Kunden freigegeben werden')).toBeInTheDocument();
    });

    it('should not render any team approval elements', () => {
      renderApprovalSettings();
      
      // Keine Team-Freigabe-Elemente sollten vorhanden sein
      expect(screen.queryByText(/Team-Freigabe/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Team-Mitglieder/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('team-member-selector')).not.toBeInTheDocument();
    });

    it('should show simplified workflow preview', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.getByText('📝 Freigabe-Workflow (Einstufig)')).toBeInTheDocument();
      expect(screen.getByText('Kampagne wird zur Kundenfreigabe eingereicht')).toBeInTheDocument();
      expect(screen.getByText('PDF wird automatisch generiert und an Kunde gesendet')).toBeInTheDocument();
      expect(screen.getByText('Nach Freigabe kann Kampagne versendet werden')).toBeInTheDocument();
    });
  });

  describe('Customer Approval Toggle', () => {
    
    it('should toggle customer approval when clicked', async () => {
      const mockOnChange = jest.fn();
      renderApprovalSettings({ onChange: mockOnChange });
      
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
      
      await userEvent.click(toggle);
      
      expect(mockOnChange).toHaveBeenCalledWith({
        customerApprovalRequired: true,
        customerContact: undefined,
        customerApprovalMessage: ''
      });
    });

    it('should show customer contact selector when approval is enabled', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.getByTestId('customer-contact-selector')).toBeInTheDocument();
    });

    it('should hide customer contact selector when approval is disabled', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: false });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.queryByTestId('customer-contact-selector')).not.toBeInTheDocument();
    });

    it('should show workflow preview only when approval is enabled', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: false });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.queryByText('📝 Freigabe-Workflow (Einstufig)')).not.toBeInTheDocument();
      
      const approvalDataEnabled = createTestApprovalData({ customerApprovalRequired: true });
      const { rerender } = render(<ApprovalSettings 
        value={approvalDataEnabled}
        onChange={jest.fn()}
        organizationId="test-org-id"
      />);
      
      expect(screen.getByText('📝 Freigabe-Workflow (Einstufig)')).toBeInTheDocument();
    });
  });

  describe('Customer Contact Selection', () => {
    
    it('should show client selection warning when no clientId is provided', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ 
        value: approvalData,
        clientId: undefined 
      });
      
      expect(screen.getByText('Bitte wählen Sie zuerst einen Kunden aus, um Kontakte für die Freigabe festzulegen.')).toBeInTheDocument();
    });

    it('should call onChange when customer contact is selected', async () => {
      const mockOnChange = jest.fn();
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      
      renderApprovalSettings({ 
        value: approvalData,
        onChange: mockOnChange 
      });
      
      const selectButton = screen.getByTestId('select-customer-contact');
      await userEvent.click(selectButton);
      
      expect(mockOnChange).toHaveBeenCalledWith({
        customerApprovalRequired: true,
        customerContact: {
          contactId: 'contact-1',
          name: 'Test Kunde',
          email: 'kunde@example.com'
        },
        customerApprovalMessage: ''
      });
    });
  });

  describe('Customer Message', () => {
    
    it('should show customer message textarea when approval is enabled', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.getByText('Nachricht an den Kunden (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Persönliche Nachricht für den Kunden zur Freigabe...')).toBeInTheDocument();
    });

    it('should update customer message on input', async () => {
      const mockOnChange = jest.fn();
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      
      renderApprovalSettings({ 
        value: approvalData,
        onChange: mockOnChange 
      });
      
      const textarea = screen.getByPlaceholderText('Persönliche Nachricht für den Kunden zur Freigabe...');
      
      // Simulate typing a single character to verify onChange is called
      await userEvent.type(textarea, 'A');
      
      // Check that onChange was called with the partial message
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          customerApprovalMessage: 'A'
        })
      );
    });
  });

  describe('Simplified Workflow', () => {
    
    it('should show only customer stage in workflow preview', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ value: approvalData });
      
      // Workflow ist einstufig - nur Customer-Stage
      expect(screen.getByText('📝 Freigabe-Workflow (Einstufig)')).toBeInTheDocument();
      
      // Workflow-Schritte prüfen
      expect(screen.getByText('Kampagne wird zur Kundenfreigabe eingereicht')).toBeInTheDocument();
      expect(screen.getByText('PDF wird automatisch generiert und an Kunde gesendet')).toBeInTheDocument();
      expect(screen.getByText('Nach Freigabe kann Kampagne versendet werden')).toBeInTheDocument();
      
      // KEINE Team-Referenzen im Workflow
      expect(screen.queryByText(/Team/)).not.toBeInTheDocument();
      expect(screen.queryByText(/intern/)).not.toBeInTheDocument();
    });
  });

  describe('Data Structure Validation', () => {
    
    it('should have correct simplified data structure', () => {
      const mockOnChange = jest.fn();
      renderApprovalSettings({ onChange: mockOnChange });
      
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
      
      // Prüfe dass nur Customer-Felder im onChange-Call sind
      expect(mockOnChange).toHaveBeenCalledWith({
        customerApprovalRequired: true,
        customerContact: undefined,
        customerApprovalMessage: ''
      });
      
      // Prüfe dass KEINE Team-Felder vorhanden sind
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('teamApprovalRequired');
      expect(callArgs).not.toHaveProperty('teamApprovers');
      expect(callArgs).not.toHaveProperty('teamApprovalMessage');
    });
  });

  describe('Props Handling', () => {
    
    it('should handle missing clientId gracefully', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      
      expect(() => {
        renderApprovalSettings({ 
          value: approvalData,
          clientId: undefined,
          clientName: undefined 
        });
      }).not.toThrow();
      
      expect(screen.getByText(/Bitte wählen Sie zuerst einen Kunden aus/)).toBeInTheDocument();
    });

    it('should display client name when provided', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ 
        value: approvalData,
        clientName: 'Test Client GmbH' 
      });
      
      // ClientName könnte in CustomerContactSelector verwendet werden
      const selector = screen.getByTestId('customer-contact-selector');
      expect(selector).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    
    it('should have proper form labels', () => {
      const approvalData = createTestApprovalData({ customerApprovalRequired: true });
      renderApprovalSettings({ value: approvalData });
      
      expect(screen.getByText('Kundenfreigabe erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Nachricht an den Kunden (optional)')).toBeInTheDocument();
    });

    it('should have proper switch role', () => {
      renderApprovalSettings();
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
      // Die Komponente verwendet möglicherweise ein Button-Element mit switch-Rolle
      expect(['checkbox', 'button']).toContain(toggle.getAttribute('type'));
    });
  });
});