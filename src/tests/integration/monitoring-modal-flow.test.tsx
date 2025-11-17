import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarkPublishedModal } from '@/components/monitoring/MarkPublishedModal';
import { EditClippingModal } from '@/components/monitoring/EditClippingModal';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { clippingService } from '@/lib/firebase/clipping-service';
import { prService } from '@/lib/firebase/pr-service';
import { toastService } from '@/lib/utils/toast';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';

// Mocks
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/firebase/clipping-service');
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/utils/toast');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __timestamp: true })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2025-11-17T10:00:00Z') })),
    fromDate: jest.fn((date) => ({ toDate: () => date }))
  }
}));
jest.mock('@/lib/utils/publication-matcher', () => ({
  calculateAVE: jest.fn((reach) => reach * 0.05),
  getReachFromPublication: jest.fn()
}));
jest.mock('@/lib/firebase/ave-settings-service', () => ({
  aveSettingsService: {
    getSentimentScoreFromLabel: jest.fn(() => 0.7)
  }
}));
jest.mock('@/components/monitoring/PublicationSelector', () => ({
  PublicationSelector: () => <div data-testid="publication-selector" />
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Monitoring Modal Flow - Integration Tests', () => {
  const mockSend: EmailCampaignSend = {
    id: 'send-123',
    campaignId: 'campaign-456',
    recipientEmail: 'journalist@news.com',
    recipientName: 'Lisa Müller',
    status: 'sent',
    userId: 'user-abc',
    organizationId: 'org-123'
  };

  const mockUser = { uid: 'user-abc' };
  const mockOrganization = { id: 'org-123', name: 'Test Org' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: mockOrganization });
    (prService.getById as jest.Mock).mockResolvedValue({ id: 'campaign-456', projectId: 'project-123' });
    (doc as jest.Mock).mockReturnValue({ path: 'email_campaign_sends/send-123' });
  });

  describe('Mark as Published Flow', () => {
    it('should complete full mark-as-published flow successfully', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      const onClose = jest.fn();

      (clippingService.create as jest.Mock).mockResolvedValue('clipping-new-123');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={onClose}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Step 1: Fill in article URL (required)
      const urlInput = screen.getByLabelText(/Artikel-URL/);
      await user.type(urlInput, 'https://news.com/article-about-product');

      // Step 2: Fill in article title
      const titleInput = screen.getByLabelText(/Artikel-Titel/);
      await user.type(titleInput, 'Neues Produkt revolutioniert den Markt');

      // Step 3: Fill in outlet name
      const outletInput = screen.getByLabelText(/Medium\/Outlet/);
      await user.type(outletInput, 'Süddeutsche Zeitung');

      // Step 4: Select outlet type
      const typeSelect = screen.getByLabelText(/Medientyp/);
      await user.selectOptions(typeSelect, 'print');

      // Step 5: Enter reach
      const reachInputs = screen.getAllByLabelText(/Reichweite/);
      const reachInput = reachInputs[0];
      await user.type(reachInput, '250000');

      // Step 6: Select sentiment
      const sentimentSelect = screen.getByDisplayValue(/Neutral/);
      await user.selectOptions(sentimentSelect, 'positive');

      // Step 7: Submit form
      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      // Verify: Services were called correctly
      await waitFor(() => {
        expect(prService.getById).toHaveBeenCalledWith('campaign-456');
        expect(clippingService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-123',
            campaignId: 'campaign-456',
            emailSendId: 'send-123',
            projectId: 'project-123',
            title: 'Neues Produkt revolutioniert den Markt',
            url: 'https://news.com/article-about-product',
            outletName: 'Süddeutsche Zeitung',
            outletType: 'print',
            reach: 250000,
            sentiment: 'positive',
            sentimentScore: 0.7,
            detectionMethod: 'manual',
            createdBy: 'user-abc',
            verifiedBy: 'user-abc'
          }),
          { organizationId: 'org-123' }
        );

        expect(updateDoc).toHaveBeenCalledWith(
          { path: 'email_campaign_sends/send-123' },
          expect.objectContaining({
            publishedStatus: 'published',
            clippingId: 'clipping-new-123',
            articleUrl: 'https://news.com/article-about-product',
            articleTitle: 'Neues Produkt revolutioniert den Markt',
            sentiment: 'positive',
            sentimentScore: 0.7,
            reach: 250000,
            manuallyMarkedPublished: true,
            markedPublishedBy: 'user-abc'
          })
        );
      });

      // Verify: Success feedback
      await waitFor(() => {
        expect(toastService.success).toHaveBeenCalledWith('Erfolgreich als veröffentlicht markiert');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error toast when clipping creation fails', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      (clippingService.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://news.com/article');
      await user.click(screen.getByRole('button', { name: /Speichern/ }));

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Database error');
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    it('should show error toast when send update fails', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      (clippingService.create as jest.Mock).mockResolvedValue('clipping-new-123');
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore update failed'));

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://news.com/article');
      await user.click(screen.getByRole('button', { name: /Speichern/ }));

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Firestore update failed');
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edit Clipping Flow', () => {
    const mockClipping: MediaClipping = {
      id: 'clipping-789',
      organizationId: 'org-123',
      campaignId: 'campaign-456',
      emailSendId: 'send-123',
      title: 'Original Article',
      url: 'https://news.com/original',
      publishedAt: Timestamp.fromDate(new Date('2025-11-15')),
      outletName: 'Original News',
      outletType: 'online',
      reach: 100000,
      sentiment: 'neutral',
      sentimentScore: 0.0,
      detectionMethod: 'manual',
      detectedAt: Timestamp.now(),
      createdBy: 'user-abc',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    it('should complete full edit-clipping flow successfully', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      const onClose = jest.fn();

      (clippingService.update as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Verify pre-filled data
      expect(screen.getByLabelText(/Artikel-URL/)).toHaveValue('https://news.com/original');

      // Step 1: Update article title
      const titleInput = screen.getByLabelText(/Artikel-Titel/);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Article Title');

      // Step 2: Update reach
      const reachInput = screen.getByLabelText(/Reichweite/);
      await user.clear(reachInput);
      await user.type(reachInput, '500000');

      // Step 3: Update sentiment
      const sentimentSelect = screen.getByDisplayValue(/Neutral/);
      await user.selectOptions(sentimentSelect, 'positive');

      // Step 4: Submit form
      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      // Verify: Services were called correctly
      await waitFor(() => {
        expect(clippingService.update).toHaveBeenCalledWith(
          'clipping-789',
          expect.objectContaining({
            title: 'Updated Article Title',
            url: 'https://news.com/original',
            reach: 500000,
            sentiment: 'positive',
            sentimentScore: 0.7
          }),
          { organizationId: 'org-123' }
        );

        expect(updateDoc).toHaveBeenCalledWith(
          { path: 'email_campaign_sends/send-123' },
          expect.objectContaining({
            articleTitle: 'Updated Article Title',
            reach: 500000,
            sentiment: 'positive',
            sentimentScore: 0.7
          })
        );
      });

      // Verify: Success feedback
      await waitFor(() => {
        expect(toastService.success).toHaveBeenCalledWith('Veröffentlichung erfolgreich aktualisiert');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error toast when clipping update fails', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      (clippingService.update as jest.Mock).mockRejectedValue(new Error('Clipping not found'));

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/Artikel-Titel/);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      await user.click(screen.getByRole('button', { name: /Änderungen speichern/ }));

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Clipping not found');
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    it('should show error toast when send update fails', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      (clippingService.update as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Send update failed'));

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/Artikel-Titel/);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      await user.click(screen.getByRole('button', { name: /Änderungen speichern/ }));

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Send update failed');
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should maintain consistent form structure between modals', () => {
      const { unmount: unmountMark } = render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const markFields = [
        screen.getByLabelText(/Artikel-URL/),
        screen.getByLabelText(/Artikel-Titel/),
        screen.getByLabelText(/Medientyp/),
        screen.getAllByLabelText(/Reichweite/)[0],
        screen.getByDisplayValue(/Neutral/) // Sentiment select by display value
      ];

      expect(markFields.every(field => field)).toBe(true);
      unmountMark();

      const mockClipping: MediaClipping = {
        id: 'clipping-789',
        organizationId: 'org-123',
        campaignId: 'campaign-456',
        emailSendId: 'send-123',
        title: 'Test',
        url: 'https://test.com',
        publishedAt: Timestamp.now(),
        outletName: 'Test',
        outletType: 'online',
        sentiment: 'neutral',
        detectionMethod: 'manual',
        detectedAt: Timestamp.now(),
        createdBy: 'user-abc',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const editFields = [
        screen.getByLabelText(/Artikel-URL/),
        screen.getByLabelText(/Artikel-Titel/),
        screen.getByLabelText(/Medientyp/),
        screen.getByLabelText(/Reichweite/),
        screen.getByDisplayValue(/Neutral/) // Sentiment select by display value
      ];

      expect(editFields.every(field => field)).toBe(true);
    });
  });
});
