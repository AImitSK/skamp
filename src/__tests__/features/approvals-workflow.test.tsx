// src/__tests__/features/approvals-workflow.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { approvalService } from '@/lib/firebase/approval-service';
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import ApprovalsPage from '@/app/dashboard/pr-tools/approvals/page';
import ApprovalPage from '@/app/dashboard/pr-tools/approvals/[shareId]/page';
import { ApprovalListView, ApprovalEnhanced } from '@/types/approvals';
import { AuthProvider } from '../test-utils';

// Mock the dependencies
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/firebase/approval-service');
jest.mock('@/lib/firebase/crm-service-enhanced');
jest.mock('next/navigation', () => ({
  useParams: () => ({ shareId: 'test-share-id' }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockApprovalService = approvalService as jest.Mocked<typeof approvalService>;
const mockCompaniesService = companiesEnhancedService as jest.Mocked<typeof companiesEnhancedService>;

// Test data
const mockApproval: ApprovalListView = {
  id: 'test-approval-1',
  organizationId: 'test-org',
  title: 'Test Pressemitteilung',
  campaignId: 'test-campaign-1',
  campaignTitle: 'Test Campaign',
  clientId: 'test-client-1',
  clientName: 'Test Client GmbH',
  recipients: [
    {
      id: 'recipient-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'approver',
      status: 'pending',
      isRequired: true,
      notificationsSent: 0,
    },
  ],
  content: {
    html: '<p>Test content</p>',
  },
  status: 'pending',
  workflow: 'simple',
  shareId: 'test-share-id',
  shareSettings: {
    requirePassword: false,
    requireEmailVerification: false,
    accessLog: true,
  },
  options: {
    requireAllApprovals: false,
    allowPartialApproval: true,
    autoSendAfterApproval: false,
    allowComments: true,
    allowInlineComments: false,
  },
  history: [],
  analytics: {
    totalViews: 0,
    uniqueViews: 0,
  },
  notifications: {
    requested: {
      sent: false,
      method: 'email',
    },
  },
  version: 1,
  createdBy: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date(),
  requestedAt: new Date(),
  pendingCount: 1,
  approvedCount: 0,
  progressPercentage: 0,
  isOverdue: false,
} as any;

const mockEnhancedApproval: ApprovalEnhanced = {
  ...mockApproval,
  metadata: {
    language: 'de',
  },
} as ApprovalEnhanced;

describe('Approvals Workflow', () => {
  beforeEach(() => {
    // Setup default mocks
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      loading: false,
    } as any);

    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'test-org', name: 'Test Org' },
      loading: false,
    } as any);

    // Reset all service mocks
    jest.clearAllMocks();
  });

  describe('Approvals Overview Page', () => {
    beforeEach(() => {
      mockApprovalService.searchEnhanced.mockResolvedValue([mockApproval]);
      mockCompaniesService.getAll.mockResolvedValue([]);
    });

    it('should render approvals overview with correct data', async () => {
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      // Check for loading state initially
      expect(screen.getByText('Lade Freigaben...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Freigaben-Center')).toBeInTheDocument();
      });

      // Check stats cards
      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
      expect(screen.getByText('Änderungen erbeten')).toBeInTheDocument();
      expect(screen.getByText('Freigegeben')).toBeInTheDocument();
      expect(screen.getByText('Überfällig')).toBeInTheDocument();

      // Check approval item
      expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      expect(screen.getByText('Test Client GmbH')).toBeInTheDocument();
    });

    it('should filter approvals by status', async () => {
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigaben-Center')).toBeInTheDocument();
      });

      // Click filter button
      const filterButton = screen.getByLabelText('Filter');
      fireEvent.click(filterButton);

      // Wait for filter panel
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      // Check "Ausstehend" status filter
      const pendingCheckbox = screen.getByRole('checkbox', { name: /ausstehend/i });
      fireEvent.click(pendingCheckbox);

      // Service should be called with filter
      await waitFor(() => {
        expect(mockApprovalService.searchEnhanced).toHaveBeenCalledWith(
          'test-org',
          expect.objectContaining({
            status: ['pending'],
          })
        );
      });
    });

    it('should search approvals by title', async () => {
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigaben-Center')).toBeInTheDocument();
      });

      // Find and use search input
      const searchInput = screen.getByPlaceholderText('Kampagnen durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      // Service should be called with search term
      await waitFor(() => {
        expect(mockApprovalService.searchEnhanced).toHaveBeenCalledWith(
          'test-org',
          expect.objectContaining({
            search: 'Test',
          })
        );
      });
    });

    it('should handle approval actions from dropdown', async () => {
      mockApprovalService.sendReminder.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Click actions dropdown
      const actionsButton = screen.getAllByRole('button', { name: '' })[0]; // EllipsisVerticalIcon button
      fireEvent.click(actionsButton);

      // Wait for dropdown menu
      await waitFor(() => {
        expect(screen.getByText('Erinnerung senden')).toBeInTheDocument();
      });

      // Click reminder action
      fireEvent.click(screen.getByText('Erinnerung senden'));

      // Service should be called
      await waitFor(() => {
        expect(mockApprovalService.sendReminder).toHaveBeenCalledWith(
          'test-approval-1',
          expect.objectContaining({
            organizationId: 'test-org',
            userId: 'test-user',
          })
        );
      });
    });

    it('should refresh data automatically', async () => {
      // Mock timer functions
      jest.useFakeTimers();
      
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigaben-Center')).toBeInTheDocument();
      });

      // Clear initial calls
      mockApprovalService.searchEnhanced.mockClear();

      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Service should be called again for auto-refresh
      await waitFor(() => {
        expect(mockApprovalService.searchEnhanced).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Public Approval Page', () => {
    beforeEach(() => {
      mockApprovalService.getByShareId.mockResolvedValue(mockEnhancedApproval);
      mockApprovalService.markAsViewed.mockResolvedValue(undefined);
    });

    it('should render public approval page correctly', async () => {
      render(<ApprovalPage />);

      // Check loading state
      expect(screen.getByText('Lade Pressemitteilung...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Check content display
      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(screen.getByText('Test Client GmbH')).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByText('Freigabe erteilen')).toBeInTheDocument();
      expect(screen.getByText('Änderungen anfordern')).toBeInTheDocument();
    });

    it('should handle approval action', async () => {
      mockApprovalService.submitDecision.mockResolvedValue(undefined);

      render(<ApprovalPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Click approve button
      const approveButton = screen.getByText('Freigabe erteilen');
      fireEvent.click(approveButton);

      // Service should be called
      await waitFor(() => {
        expect(mockApprovalService.submitDecision).toHaveBeenCalledWith(
          'test-share-id',
          expect.any(String),
          'approved'
        );
      });

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText('Freigabe erfolgreich erteilt')).toBeInTheDocument();
      });
    });

    it('should handle changes request with feedback', async () => {
      mockApprovalService.requestChanges.mockResolvedValue(undefined);

      render(<ApprovalPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Click changes request button
      const changesButton = screen.getByText('Änderungen anfordern');
      fireEvent.click(changesButton);

      // Wait for feedback form
      await waitFor(() => {
        expect(screen.getByText('Welche Änderungen wünschen Sie?')).toBeInTheDocument();
      });

      // Enter feedback
      const textArea = screen.getByPlaceholderText('Bitte beschreiben Sie die gewünschten Änderungen...');
      fireEvent.change(textArea, { target: { value: 'Bitte Titel ändern' } });

      // Submit feedback
      const submitButton = screen.getByText('Änderungen senden');
      fireEvent.click(submitButton);

      // Service should be called
      await waitFor(() => {
        expect(mockApprovalService.requestChanges).toHaveBeenCalledWith(
          'test-share-id',
          expect.any(String),
          'Bitte Titel ändern'
        );
      });

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText('Änderungen angefordert')).toBeInTheDocument();
      });
    });

    it('should mark approval as viewed on load', async () => {
      render(<ApprovalPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Mark as viewed should be called
      expect(mockApprovalService.markAsViewed).toHaveBeenCalledWith(
        'test-share-id',
        expect.any(String)
      );
    });

    it('should handle error states gracefully', async () => {
      mockApprovalService.getByShareId.mockRejectedValue(new Error('Not found'));

      render(<ApprovalPage />);

      await waitFor(() => {
        expect(screen.getByText('Fehler')).toBeInTheDocument();
        expect(screen.getByText('Die Pressemitteilung konnte nicht geladen werden.')).toBeInTheDocument();
      });
    });

    it('should display recipient status for multi-approval', async () => {
      const multiApproval = {
        ...mockEnhancedApproval,
        recipients: [
          {
            id: 'recipient-1',
            email: 'user1@example.com',
            name: 'User 1',
            role: 'approver',
            status: 'approved',
            isRequired: true,
            notificationsSent: 0,
          },
          {
            id: 'recipient-2',
            email: 'user2@example.com',
            name: 'User 2',
            role: 'approver',
            status: 'pending',
            isRequired: true,
            notificationsSent: 0,
          },
        ],
      };

      mockApprovalService.getByShareId.mockResolvedValue(multiApproval);

      render(<ApprovalPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Check recipient status display
      expect(screen.getByText('Freigabe-Status (1 von 2)')).toBeInTheDocument();
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('Freigegeben')).toBeInTheDocument();
      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully in overview', async () => {
      mockApprovalService.searchEnhanced.mockRejectedValue(new Error('Service error'));

      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
      });
    });

    it('should handle copy link errors', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Click actions dropdown and copy link
      const actionsButton = screen.getAllByRole('button', { name: '' })[0];
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Link kopieren')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Link kopieren'));

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('Fehler')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Freigaben-Center')).toBeInTheDocument();
      });

      // Check filter button has aria-label
      expect(screen.getByLabelText('Filter')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Pressemitteilung')).toBeInTheDocument();
      });

      // Check if elements are focusable
      const filterButton = screen.getByLabelText('Filter');
      filterButton.focus();
      expect(filterButton).toHaveFocus();
    });
  });
});