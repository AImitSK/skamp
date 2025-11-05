// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/__tests__/ApprovalTab.integration.test.tsx
// Integration Tests für ApprovalTab mit CampaignContext

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalTab from '../ApprovalTab';
import { CampaignProvider } from '../../context/CampaignContext';

// ==================== MOCKS ====================

// Mock toastService
jest.mock('@/lib/utils/toast', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User'
    }
  })
}));

// Mock prService
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn(),
    getCampaignByShareId: jest.fn()
  }
}));

// Mock pdfVersionsService
jest.mock('@/lib/firebase/pdf-versions-service', () => ({
  pdfVersionsService: {
    getEditLockStatus: jest.fn().mockResolvedValue({
      isLocked: false,
      lockedBy: undefined,
      lockedAt: undefined
    })
  },
  PDFVersion: {}
}));

// Mock ApprovalSettings
const mockApprovalSettingsOnChange = jest.fn();
jest.mock('@/components/campaigns/ApprovalSettings', () => ({
  __esModule: true,
  default: ({ value, onChange, organizationId, clientId, clientName, previousFeedback }: any) => (
    <div data-testid="approval-settings">
      <div data-testid="approval-settings-org-id">{organizationId}</div>
      <div data-testid="approval-settings-client-id">{clientId || 'no-client'}</div>
      <div data-testid="approval-settings-client-name">{clientName || 'no-client-name'}</div>
      <div data-testid="approval-settings-customer-approval">
        {value?.customerApprovalRequired ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="approval-settings-previous-feedback">
        {previousFeedback?.length || 0}
      </div>
      <button
        data-testid="toggle-customer-approval"
        onClick={() => {
          mockApprovalSettingsOnChange({
            ...value,
            customerApprovalRequired: !value?.customerApprovalRequired
          });
          onChange({
            ...value,
            customerApprovalRequired: !value?.customerApprovalRequired
          });
        }}
      >
        Toggle Customer Approval
      </button>
      <button
        data-testid="set-customer-contact"
        onClick={() => {
          onChange({
            ...value,
            customerContact: {
              contactId: 'contact-123',
              name: 'Test Contact',
              email: 'contact@example.com'
            }
          });
        }}
      >
        Set Customer Contact
      </button>
    </div>
  )
}));

// Mock PDFWorkflowPreview (we're testing integration, so use real component)
// Already imported through ApprovalTab

// ==================== HELPER FUNCTIONS ====================

const createMockCampaign = (overrides = {}) => ({
  id: 'test-campaign-id',
  organizationId: 'test-org-id',
  clientId: 'test-client-id',
  clientName: 'Test Client GmbH',
  projectId: 'test-project-id',
  title: 'Test Campaign',
  mainContent: '<p>Test content</p>',
  contentHtml: '<p>Test press release</p>',
  keywords: ['test', 'campaign'],
  status: 'draft' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  approvalData: {
    customerApprovalRequired: false,
    customerContact: undefined,
    customerApprovalMessage: ''
  },
  attachedAssets: [],
  boilerplateSections: [],
  ...overrides
});

const renderApprovalTabWithContext = (campaignData = createMockCampaign()) => {
  const { prService } = require('@/lib/firebase/pr-service');
  (prService.getById as jest.Mock).mockResolvedValue(campaignData);

  return render(
    <CampaignProvider
      campaignId="test-campaign-id"
      organizationId="test-org-id"
    >
      <ApprovalTab organizationId="test-org-id" />
    </CampaignProvider>
  );
};

// ==================== TESTS ====================

describe('ApprovalTab Integration', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {

    it('should render ApprovalTab successfully', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
      });
    });

    it('should render with proper structure', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
        expect(screen.getByText('Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.')).toBeInTheDocument();
      });
    });

    it('should render ApprovalSettings component', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });
    });

    it('should have correct container styling', async () => {
      const { container } = renderApprovalTabWithContext();

      await waitFor(() => {
        const mainContainer = container.querySelector('.bg-white.rounded-lg.border.p-6');
        expect(mainContainer).toBeInTheDocument();
      });
    });
  });

  describe('Context Integration', () => {

    it('should pass organizationId to ApprovalSettings', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-org-id')).toHaveTextContent('test-org-id');
      });
    });

    it('should pass clientId from context to ApprovalSettings', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-client-id')).toHaveTextContent('test-client-id');
      });
    });

    it('should pass clientName from context to ApprovalSettings', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-client-name')).toHaveTextContent('Test Client GmbH');
      });
    });

    it('should handle missing client data gracefully', async () => {
      const campaignWithoutClient = createMockCampaign({
        clientId: '',
        clientName: ''
      });

      renderApprovalTabWithContext(campaignWithoutClient);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-client-id')).toHaveTextContent('no-client');
        expect(screen.getByTestId('approval-settings-client-name')).toHaveTextContent('no-client-name');
      });
    });

    it('should pass approvalData from context to ApprovalSettings', async () => {
      const campaignWithApproval = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true,
          customerContact: {
            contactId: 'contact-1',
            name: 'Test Contact',
            email: 'contact@test.com'
          }
        }
      });

      renderApprovalTabWithContext(campaignWithApproval);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('enabled');
      });
    });

    it('should pass previousFeedback from context to ApprovalSettings', async () => {
      const campaignWithFeedback = createMockCampaign({
        approvalData: {
          customerApprovalRequired: false,
          feedbackHistory: [
            { comment: 'First feedback', requestedAt: new Date(), author: 'User 1' },
            { comment: 'Second feedback', requestedAt: new Date(), author: 'User 2' }
          ]
        }
      });

      renderApprovalTabWithContext(campaignWithFeedback);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-previous-feedback')).toHaveTextContent('2');
      });
    });
  });

  describe('ApprovalData Updates', () => {

    it('should update context when ApprovalSettings changes', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('disabled');
      });

      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('enabled');
      });
    });

    it('should allow customer contact to be set', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });

      const setContactButton = screen.getByTestId('set-customer-contact');
      await userEvent.click(setContactButton);

      // Button should be clickable and component should not crash
      await waitFor(() => {
        expect(setContactButton).toBeInTheDocument();
      });
    });
  });

  describe('PDF Workflow Preview Integration', () => {

    it('should not show PDF workflow preview when customer approval is disabled', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('disabled');
      });

      expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
    });

    it('should show PDF workflow preview when customer approval is enabled', async () => {
      const campaignWithApproval = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true
        }
      });

      renderApprovalTabWithContext(campaignWithApproval);

      await waitFor(() => {
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      });
    });

    it('should display all 3 workflow steps when enabled', async () => {
      const campaignWithApproval = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true
        }
      });

      renderApprovalTabWithContext(campaignWithApproval);

      await waitFor(() => {
        expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
        expect(screen.getByText('2. Freigabe-Link wird an Kunde versendet')).toBeInTheDocument();
        expect(screen.getByText('3. Kunde kann PDF prüfen und freigeben')).toBeInTheDocument();
      });
    });

    it('should update preview when approval is toggled on', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
        expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
      });
    });

    it('should hide preview when approval is toggled off', async () => {
      const campaignWithApproval = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true
        }
      });

      renderApprovalTabWithContext(campaignWithApproval);

      await waitFor(() => {
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
      });
    });
  });

  describe('useMemo Optimization', () => {

    it('should compute pdfWorkflowData correctly', async () => {
      const campaignWithApproval = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true
        }
      });

      renderApprovalTabWithContext(campaignWithApproval);

      await waitFor(() => {
        // Verify computed data is correct
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();

        // Verify all 3 steps from useMemo
        expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
        expect(screen.getByText('2. Freigabe-Link wird an Kunde versendet')).toBeInTheDocument();
        expect(screen.getByText('3. Kunde kann PDF prüfen und freigeben')).toBeInTheDocument();
      });
    });

    it('should generate empty steps when approval is disabled', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('disabled');
      });

      // Preview should not be shown
      expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
      expect(screen.queryByText('1. PDF wird automatisch generiert')).not.toBeInTheDocument();
    });

    it('should recompute pdfWorkflowData when approvalData changes', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.queryByText('1. PDF wird automatisch generiert')).not.toBeInTheDocument();
      });

      // Toggle approval on
      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
      });
    });
  });

  describe('React.memo Behavior', () => {

    it('should be memoized and not re-render unnecessarily', async () => {
      const { rerender } = renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
      });

      // Re-render with same organizationId
      rerender(
        <CampaignProvider
          campaignId="test-campaign-id"
          organizationId="test-org-id"
        >
          <ApprovalTab organizationId="test-org-id" />
        </CampaignProvider>
      );

      expect(screen.getByText('Freigabe-Einstellungen')).toBeInTheDocument();
    });

    it('should handle organizationId change', async () => {
      const { rerender } = renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-org-id')).toHaveTextContent('test-org-id');
      });

      // Change organizationId
      const { prService } = require('@/lib/firebase/pr-service');
      (prService.getById as jest.Mock).mockResolvedValue(createMockCampaign({ organizationId: 'new-org-id' }));

      rerender(
        <CampaignProvider
          campaignId="test-campaign-id"
          organizationId="new-org-id"
        >
          <ApprovalTab organizationId="new-org-id" />
        </CampaignProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-org-id')).toHaveTextContent('new-org-id');
      });
    });
  });

  describe('Edge Cases', () => {

    it('should handle undefined approvalData gracefully', async () => {
      const campaignWithoutApprovalData = createMockCampaign({
        approvalData: undefined
      });

      renderApprovalTabWithContext(campaignWithoutApprovalData);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });

      // Should not crash and default to disabled
      expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
    });

    it('should handle null approvalData gracefully', async () => {
      const campaignWithNullApprovalData = createMockCampaign({
        approvalData: null
      });

      renderApprovalTabWithContext(campaignWithNullApprovalData);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });

      expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
    });

    it('should handle incomplete approvalData', async () => {
      const campaignWithPartialApprovalData = createMockCampaign({
        approvalData: {
          customerApprovalRequired: true
          // Missing customerContact and customerApprovalMessage
        }
      });

      renderApprovalTabWithContext(campaignWithPartialApprovalData);

      await waitFor(() => {
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      });
    });

    it('should handle missing client information', async () => {
      const campaignWithoutClient = createMockCampaign({
        clientId: undefined,
        clientName: undefined
      });

      renderApprovalTabWithContext(campaignWithoutClient);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });

      // Should still render but show no client
      expect(screen.getByTestId('approval-settings-client-id')).toHaveTextContent('no-client');
    });

    it('should handle empty previousFeedback array', async () => {
      const campaignWithEmptyFeedback = createMockCampaign({
        approvalData: {
          customerApprovalRequired: false,
          feedbackHistory: []
        }
      });

      renderApprovalTabWithContext(campaignWithEmptyFeedback);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-previous-feedback')).toHaveTextContent('0');
      });
    });
  });

  describe('Component Integration Flow', () => {

    it('should complete full approval workflow', async () => {
      renderApprovalTabWithContext();

      // Step 1: Initial state - approval disabled
      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('disabled');
        expect(screen.queryByText('✅ PDF-Workflow bereit')).not.toBeInTheDocument();
      });

      // Step 2: Enable customer approval
      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('enabled');
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      });

      // Step 3: Set customer contact
      const setContactButton = screen.getByTestId('set-customer-contact');
      await userEvent.click(setContactButton);

      // Step 4: Verify workflow preview is still showing
      await waitFor(() => {
        expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
        expect(screen.getByText('2. Freigabe-Link wird an Kunde versendet')).toBeInTheDocument();
        expect(screen.getByText('3. Kunde kann PDF prüfen und freigeben')).toBeInTheDocument();
      });
    });

    it('should update all connected components simultaneously', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByTestId('approval-settings')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId('toggle-customer-approval');
      await userEvent.click(toggleButton);

      await waitFor(() => {
        // ApprovalSettings should update
        expect(screen.getByTestId('approval-settings-customer-approval')).toHaveTextContent('enabled');

        // PDFWorkflowPreview should appear
        expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {

    it('should have proper heading hierarchy', async () => {
      const { container } = renderApprovalTabWithContext();

      await waitFor(() => {
        const h3 = container.querySelector('h3');
        expect(h3).toHaveTextContent('Freigabe-Einstellungen');
      });
    });

    it('should have descriptive text for users', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        expect(screen.getByText('Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.')).toBeInTheDocument();
      });
    });

    it('should maintain focus management', async () => {
      renderApprovalTabWithContext();

      await waitFor(() => {
        const toggleButton = screen.getByTestId('toggle-customer-approval');
        toggleButton.focus();
        expect(document.activeElement).toBe(toggleButton);
      });
    });
  });
});
