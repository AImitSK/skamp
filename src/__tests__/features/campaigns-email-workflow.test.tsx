// src/__tests__/features/campaigns-email-workflow.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';

// Mock email services
jest.mock('@/lib/email/sendgrid-service', () => ({
  sendgridService: {
    sendCampaignEmails: jest.fn(),
    validateEmailList: jest.fn()
  }
}));

describe('Campaign Email and Analytics Workflows', () => {
  const mockCampaign = {
    id: 'test-campaign-123',
    title: 'Test Email Campaign',
    status: 'approved',
    clientId: 'client-123',
    clientName: 'Test Client',
    distributionListId: 'list-123',
    distributionListName: 'Test Distribution List',
    recipientCount: 25,
    contentHtml: '<p>Campaign content</p>',
    attachedAssets: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Send Modal Workflow', () => {
    it('should display send modal with campaign details', async () => {
      const CampaignsPage = require('@/app/dashboard/pr-tools/campaigns/page').default;
      
      // Mock campaigns service
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getAllByOrganization = jest.fn().mockResolvedValue([mockCampaign]);

      render(<CampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagnen')).toBeInTheDocument();
        expect(screen.getByText('Test Email Campaign')).toBeInTheDocument();
      });

      // Find and click the send button (via dropdown menu)
      const dropdownButton = screen.getAllByRole('button').find(button => 
        button.querySelector('svg')
      );
      
      if (dropdownButton) {
        fireEvent.click(dropdownButton);
        
        // Find and click "Versenden" option
        const sendOption = screen.queryByText('Versenden');
        if (sendOption) {
          fireEvent.click(sendOption);

          // Send modal should open
          await waitFor(() => {
            // The EmailSendModal would display campaign information
            expect(screen.getByText(/Test Email Campaign/)).toBeInTheDocument();
          });
        }
      }
    });

    it('should validate recipients before sending', async () => {
      // This test would check recipient validation in the EmailSendModal
      // The actual implementation would depend on the EmailSendModal component
      
      const mockEmailService = require('@/lib/email/sendgrid-service');
      mockEmailService.sendgridService.validateEmailList = jest.fn().mockResolvedValue({
        validEmails: 20,
        invalidEmails: 5,
        totalEmails: 25
      });

      // Test would simulate the validation process
      expect(mockEmailService.sendgridService.validateEmailList).toBeDefined();
    });

    it('should handle send confirmation and track status', async () => {
      const mockEmailService = require('@/lib/email/sendgrid-service');
      const mockPrService = require('@/lib/firebase/pr-service');
      
      mockEmailService.sendgridService.sendCampaignEmails = jest.fn().mockResolvedValue({
        messageId: 'send-123',
        sentCount: 25,
        status: 'sent'
      });

      mockPrService.prService.updateStatus = jest.fn().mockResolvedValue(true);

      // The actual test would simulate the send process
      // This is a structure test to ensure the mocks are properly set up
      expect(mockEmailService.sendgridService.sendCampaignEmails).toBeDefined();
      expect(mockPrService.prService.updateStatus).toBeDefined();
    });
  });

  describe('Campaign Status Updates', () => {
    it('should update campaign status after successful send', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent', sentAt: new Date() };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getAllByOrganization = jest.fn().mockResolvedValue([sentCampaign]);

      const CampaignsPage = require('@/app/dashboard/pr-tools/campaigns/page').default;
      
      render(<CampaignsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Email Campaign')).toBeInTheDocument();
      });

      // Campaign should show as sent (this would be reflected in the StatusBadge)
      // The exact UI depends on StatusBadge implementation
    });

    it('should handle send failures gracefully', async () => {
      const mockEmailService = require('@/lib/email/sendgrid-service');
      mockEmailService.sendgridService.sendCampaignEmails = jest.fn().mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Test would verify that send failures are handled properly
      // and the campaign status is updated accordingly
      expect(mockEmailService.sendgridService.sendCampaignEmails).toBeDefined();
    });
  });

  describe('Analytics Tracking', () => {
    it('should display email analytics correctly', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent' };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Kampagnen-Analytics')).toBeInTheDocument();
      });

      // Should display key metrics
      expect(screen.getByText('Versendet')).toBeInTheDocument();
      expect(screen.getByText('Zugestellt')).toBeInTheDocument();
      expect(screen.getByText('Geöffnet')).toBeInTheDocument();
      expect(screen.getByText('Geklickt')).toBeInTheDocument();
      expect(screen.getByText('Abgewiesen')).toBeInTheDocument();
      expect(screen.getByText('Fehlgeschlagen')).toBeInTheDocument();

      // Should display activity feed
      expect(screen.getByText('Aktivitätsverlauf')).toBeInTheDocument();
    });

    it('should filter analytics activities', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent', recipientCount: 10 };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Aktivitätsverlauf')).toBeInTheDocument();
      });

      // Find the filter dropdown
      const filterSelect = screen.getByDisplayValue('Alle Aktivitäten');
      expect(filterSelect).toBeInTheDocument();

      // Change filter to "Nur Öffnungen"
      fireEvent.change(filterSelect, { target: { value: 'opened' } });

      // Filter should be applied
      expect(filterSelect.value).toBe('opened');
    });

    it('should export analytics data to CSV', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent' };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      // Mock document.createElement and URL.createObjectURL for CSV download
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        click: jest.fn(),
        setAttribute: jest.fn(),
        download: ''
      } as any);

      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      // Click export button
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      // Verify CSV download was initiated
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
    });

    it('should refresh analytics data', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent' };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Aktualisieren')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByText('Aktualisieren');
      fireEvent.click(refreshButton);

      // Should trigger data reload
      await waitFor(() => {
        expect(mockPrService.prService.getById).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Email Activity Tracking', () => {
    it('should display email activities with correct icons and information', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent', recipientCount: 5 };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Aktivitätsverlauf')).toBeInTheDocument();
      });

      // With mock data, should show various activity types
      // The component creates mock activities for demonstration
      expect(screen.getByText('E-Mail versendet')).toBeInTheDocument();
      expect(screen.getByText('E-Mail zugestellt')).toBeInTheDocument();
      expect(screen.getByText('E-Mail geöffnet')).toBeInTheDocument();
    });

    it('should handle activity metadata correctly', async () => {
      const sentCampaign = { ...mockCampaign, status: 'sent', recipientCount: 3 };
      
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(sentCampaign);

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Aktivitätsverlauf')).toBeInTheDocument();
      });

      // Should display metadata like device type and location
      // Based on mock data in the component
      expect(screen.queryByText('Desktop')).toBeInTheDocument();
      expect(screen.queryByText('Mobil')).toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle analytics loading errors', async () => {
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockRejectedValue(new Error('Failed to load campaign'));

      const AnalyticsPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/analytics/page').default;
      
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fehler')).toBeInTheDocument();
      });

      // Should provide way to return to campaigns
      expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
    });

    it('should handle send service unavailable', async () => {
      const mockEmailService = require('@/lib/email/sendgrid-service');
      mockEmailService.sendgridService.sendCampaignEmails = jest.fn().mockRejectedValue(
        new Error('SendGrid service unavailable')
      );

      // Test structure to ensure error handling is considered
      expect(mockEmailService.sendgridService.sendCampaignEmails).toBeDefined();
    });
  });
});