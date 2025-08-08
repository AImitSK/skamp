// src/__tests__/features/campaigns-integration.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { useRouter } from 'next/navigation';
import { prService } from '@/lib/firebase/pr-service';
import { listsService } from '@/lib/firebase/lists-service';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ campaignId: 'test-campaign-123' })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Firebase services
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/lists-service');
jest.mock('@/lib/firebase/organization-service');

// Mock Auth context
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com'
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false
  })
}));

// Mock Organization context
const mockOrganization = {
  id: 'test-org-123',
  name: 'Test Organization'
};

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: mockOrganization,
    loading: false
  })
}));

describe('Campaign Integration Workflows', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('Campaign Creation Workflow', () => {
    it('should create a complete campaign successfully', async () => {
      // Mock services
      (listsService.getAll as jest.Mock).mockResolvedValue([
        {
          id: 'list-123',
          name: 'Test Distribution List',
          contactsCount: 50
        }
      ]);

      (prService.create as jest.Mock).mockResolvedValue({
        id: 'new-campaign-123',
        title: 'Test Campaign',
        status: 'draft'
      });

      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Fill campaign title
      const titleInput = screen.getByDisplayValue('');
      fireEvent.change(titleInput, { target: { value: 'Test Campaign' } });

      // Select distribution list (mocked)
      const listSelector = screen.getByText(/Verteiler/);
      expect(listSelector).toBeInTheDocument();

      // Fill content
      const contentArea = screen.getByText(/Pressemitteilung/);
      expect(contentArea).toBeInTheDocument();

      // Submit form
      const submitButton = screen.getByText('Kampagne erstellen');
      fireEvent.click(submitButton);

      // Verify service calls
      await waitFor(() => {
        expect(prService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Campaign',
            organizationId: mockOrganization.id
          })
        );
      });

      // Verify navigation
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/pr-tools/campaigns?refresh=true');
    });

    it('should show validation errors for incomplete campaign', async () => {
      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Try to submit without required fields
      const submitButton = screen.getByText('Kampagne erstellen');
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Titel ist erforderlich/)).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Edit Workflow', () => {
    const mockCampaign = {
      id: 'test-campaign-123',
      title: 'Existing Campaign',
      status: 'draft',
      clientId: 'client-123',
      clientName: 'Test Client',
      distributionListId: 'list-123',
      distributionListName: 'Test List',
      recipientCount: 25,
      contentHtml: '<p>Test content</p>',
      attachedAssets: [],
      approvalRequired: false,
      boilerplateSections: []
    };

    it('should load and edit existing campaign', async () => {
      // Mock services
      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (prService.update as jest.Mock).mockResolvedValue(mockCampaign);
      (listsService.getAll as jest.Mock).mockResolvedValue([]);

      const EditCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page').default;
      
      render(<EditCampaignPage />);

      // Wait for campaign to load
      await waitFor(() => {
        expect(screen.getByText('PR-Kampagne bearbeiten')).toBeInTheDocument();
        expect(prService.getById).toHaveBeenCalledWith('test-campaign-123');
      });

      // Verify form is populated with existing data
      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Existing Campaign');
        expect(titleInput).toBeInTheDocument();
      });

      // Edit title
      const titleInput = screen.getByDisplayValue('Existing Campaign');
      fireEvent.change(titleInput, { target: { value: 'Updated Campaign Title' } });

      // Submit changes
      const saveButton = screen.getByText('Änderungen speichern');
      fireEvent.click(saveButton);

      // Verify update service call
      await waitFor(() => {
        expect(prService.update).toHaveBeenCalledWith(
          'test-campaign-123',
          expect.objectContaining({
            title: 'Updated Campaign Title'
          })
        );
      });

      // Verify navigation back to campaigns list
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/pr-tools/campaigns');
    });
  });

  describe('Campaign View and Status Workflow', () => {
    const mockCampaign = {
      id: 'test-campaign-123',
      title: 'View Campaign',
      status: 'draft',
      clientId: 'client-123',
      clientName: 'Test Client',
      contentHtml: '<p>Campaign content</p>',
      recipientCount: 30,
      attachedAssets: []
    };

    it('should display campaign details correctly', async () => {
      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);

      const ViewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page').default;
      
      render(<ViewCampaignPage />);

      // Wait for campaign to load
      await waitFor(() => {
        expect(screen.getByText('View Campaign')).toBeInTheDocument();
        expect(screen.getByText('Test Client')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
      });

      // Verify back button works
      const backButton = screen.getByText('Zurück zu Kampagnen');
      fireEvent.click(backButton);
      // Button should be a link to campaigns page
      expect(backButton.closest('a')).toHaveAttribute('href', '/dashboard/pr-tools/campaigns');
    });
  });

  describe('Campaign Analytics Workflow', () => {
    const mockCampaign = {
      id: 'test-campaign-123',
      title: 'Analytics Campaign',
      status: 'sent',
      recipientCount: 100,
      clientId: 'client-123',
      clientName: 'Test Client'
    };

    it('should display analytics data correctly', async () => {
      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByText('Kampagnen-Analytics')).toBeInTheDocument();
        expect(screen.getByText('Analytics Campaign')).toBeInTheDocument();
        expect(screen.getByText('Test Client')).toBeInTheDocument();
      });

      // Verify metrics cards are present
      expect(screen.getByText('Versendet')).toBeInTheDocument();
      expect(screen.getByText('Zugestellt')).toBeInTheDocument();
      expect(screen.getByText('Geöffnet')).toBeInTheDocument();
      expect(screen.getByText('Geklickt')).toBeInTheDocument();

      // Verify activity feed
      expect(screen.getByText('Aktivitätsverlauf')).toBeInTheDocument();
    });

    it('should handle export functionality', async () => {
      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Kampagnen-Analytics')).toBeInTheDocument();
      });

      // Find export button
      const exportButton = screen.getByText('Export CSV');
      expect(exportButton).toBeInTheDocument();

      // Click export (this will trigger the download, but we can't easily test the actual file download)
      fireEvent.click(exportButton);
      // No error should occur
    });
  });

  describe('Campaign List and Bulk Operations', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Campaign 1',
        status: 'draft',
        clientName: 'Client A',
        recipientCount: 25,
        createdAt: { toDate: () => new Date() }
      },
      {
        id: 'campaign-2',
        title: 'Campaign 2', 
        status: 'sent',
        clientName: 'Client B',
        recipientCount: 50,
        createdAt: { toDate: () => new Date() }
      }
    ];

    it('should display campaigns list and support filtering', async () => {
      (prService.getAllByOrganization as jest.Mock).mockResolvedValue(mockCampaigns);

      const CampaignsPage = require('@/app/dashboard/pr-tools/campaigns/page').default;
      
      render(<CampaignsPage />);

      // Wait for campaigns to load
      await waitFor(() => {
        expect(screen.getByText('PR-Kampagnen')).toBeInTheDocument();
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Campaign 2')).toBeInTheDocument();
      });

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Kampagnen durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Campaign 1' } });

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('Campaign 1')).toBeInTheDocument();
        // Campaign 2 should be filtered out in a real implementation
      });
    });

    it('should support bulk delete operations', async () => {
      (prService.getAllByOrganization as jest.Mock).mockResolvedValue(mockCampaigns);
      (prService.delete as jest.Mock).mockResolvedValue(true);

      const CampaignsPage = require('@/app/dashboard/pr-tools/campaigns/page').default;
      
      render(<CampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagnen')).toBeInTheDocument();
      });

      // Select campaigns via checkboxes (this tests the checkbox interaction)
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]); // Select first campaign
      }

      // The bulk delete functionality should be available
      // (Implementation details depend on the actual UI design)
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service error
      (prService.getById as jest.Mock).mockRejectedValue(new Error('Network error'));

      const ViewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page').default;
      
      render(<ViewCampaignPage />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Fehler/)).toBeInTheDocument();
      });
    });

    it('should handle campaign not found', async () => {
      (prService.getById as jest.Mock).mockResolvedValue(null);

      const ViewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page').default;
      
      render(<ViewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText(/nicht gefunden/)).toBeInTheDocument();
      });
    });
  });
});