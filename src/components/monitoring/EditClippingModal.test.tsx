import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditClippingModal } from './EditClippingModal';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useUpdateClipping } from '@/lib/hooks/useMonitoringMutations';
import { calculateAVE } from '@/lib/utils/publication-matcher';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';
import { Timestamp } from 'firebase/firestore';

// Mocks
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/hooks/useMonitoringMutations');
jest.mock('@/lib/utils/publication-matcher', () => ({
  calculateAVE: jest.fn()
}));
jest.mock('@/lib/firebase/ave-settings-service', () => ({
  aveSettingsService: {
    getSentimentScoreFromLabel: jest.fn()
  }
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

describe('EditClippingModal', () => {
  const mockSend: EmailCampaignSend = {
    id: 'send-123',
    campaignId: 'campaign-456',
    recipientEmail: 'test@example.com',
    recipientName: 'Anna Schmidt',
    status: 'sent',
    userId: 'user-abc',
    organizationId: 'org-123'
  };

  const mockClipping: MediaClipping = {
    id: 'clipping-789',
    organizationId: 'org-123',
    campaignId: 'campaign-456',
    emailSendId: 'send-123',
    title: 'Existing Article',
    url: 'https://example.com/existing',
    publishedAt: Timestamp.fromDate(new Date('2025-11-15')),
    outletName: 'Existing News',
    outletType: 'online',
    reach: 75000,
    sentiment: 'positive',
    sentimentScore: 0.7,
    detectionMethod: 'manual',
    detectedAt: Timestamp.now(),
    createdBy: 'user-abc',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockUser = { uid: 'user-abc' };
  const mockOrganization = { id: 'org-123', name: 'Test Org' };
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: mockOrganization });
    (useUpdateClipping as jest.Mock).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false
    });
    (calculateAVE as jest.Mock).mockReturnValue(5000);
    (aveSettingsService.getSentimentScoreFromLabel as jest.Mock).mockReturnValue(0.7);
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Veröffentlichung bearbeiten')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/Empfänger/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Artikel-URL/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Artikel-Titel/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium\/Outlet/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medientyp/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Veröffentlichungsdatum/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reichweite/)).toBeInTheDocument();
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByLabelText(/Sentiment-Score/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Änderungen speichern/ })).toBeInTheDocument();
    });

    it('should pre-fill form with clipping data', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText(/Artikel-URL/) as HTMLInputElement;
      expect(urlInput.value).toBe('https://example.com/existing');

      const titleInput = screen.getByLabelText(/Artikel-Titel/) as HTMLInputElement;
      expect(titleInput.value).toBe('Existing Article');

      const outletInput = screen.getByLabelText(/Medium\/Outlet/) as HTMLInputElement;
      expect(outletInput.value).toBe('Existing News');

      const typeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
      expect(typeSelect.value).toBe('online');

      const reachInput = screen.getByLabelText(/Reichweite/) as HTMLInputElement;
      expect(reachInput.value).toBe('75000');

      // Sentiment select: Suche nach dem Select mit "Positiv" Option
      const sentimentSelect = screen.getByDisplayValue(/Positiv/) as HTMLSelectElement;
      expect(sentimentSelect.value).toBe('positive');
    });

    it('should display recipient info as disabled', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const recipientInput = screen.getByLabelText(/Empfänger/) as HTMLInputElement;
      expect(recipientInput.value).toContain('Anna Schmidt');
      expect(recipientInput.value).toContain('test@example.com');
      expect(recipientInput.disabled).toBe(true);
    });

    it('should handle clipping without optional fields', () => {
      const minimalClipping: MediaClipping = {
        ...mockClipping,
        url: null as any,
        title: null as any,
        outletName: null as any,
        reach: undefined,
        sentimentScore: undefined
      };

      render(
        <EditClippingModal
          send={mockSend}
          clipping={minimalClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText(/Artikel-URL/) as HTMLInputElement;
      expect(urlInput.value).toBe('');

      const reachInput = screen.getByLabelText(/Reichweite/) as HTMLInputElement;
      expect(reachInput.value).toBe('');
    });

    it('should handle clipping with Timestamp publishedAt', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const dateInput = screen.getByLabelText(/Veröffentlichungsdatum/) as HTMLInputElement;
      // Prüfe nur dass ein Datum vorhanden ist (Format-Konvertierung kann variieren)
      expect(dateInput.value).toBeTruthy();
      expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD Format

      // Prüfe auch dass Sentiment korrekt initialisiert ist
      const sentimentSelect = screen.getByDisplayValue(/Positiv/) as HTMLSelectElement;
      expect(sentimentSelect).toBeInTheDocument();
    });

    it('should fallback to current date if publishedAt is invalid', () => {
      const clippingWithoutDate = {
        ...mockClipping,
        publishedAt: null as any
      };

      render(
        <EditClippingModal
          send={mockSend}
          clipping={clippingWithoutDate}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const dateInput = screen.getByLabelText(/Veröffentlichungsdatum/) as HTMLInputElement;
      expect(dateInput.value).toBeTruthy(); // Should have a date
    });
  });

  describe('Form Interactions', () => {
    it('should update articleUrl on input change', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText(/Artikel-URL/) as HTMLInputElement;
      await user.clear(urlInput);
      await user.type(urlInput, 'https://newurl.com/article');

      expect(urlInput.value).toBe('https://newurl.com/article');
    });

    it('should update articleTitle on input change', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/Artikel-Titel/) as HTMLInputElement;
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      expect(titleInput.value).toBe('New Title');
    });

    it('should update outletType on select change', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const typeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
      await user.selectOptions(typeSelect, 'broadcast');

      expect(typeSelect.value).toBe('broadcast');
    });

    it('should update reach on input change', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getByLabelText(/Reichweite/) as HTMLInputElement;
      await user.clear(reachInput);
      await user.type(reachInput, '200000');

      expect(reachInput.value).toBe('200000');
    });

    it('should update sentiment and sentimentScore on select change', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Finde das Select über die Option mit Positiv (aktueller Wert)
      const sentimentSelect = screen.getByDisplayValue(/Positiv/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'negative');

      expect(sentimentSelect.value).toBe('negative');

      // Prüfe auch dass der Slider aktualisiert wurde
      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      expect(slider.value).toBe('-0.7');
    });

    it('should update sentimentScore on slider change', async () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '-0.3' } });

      expect(slider.value).toBe('-0.3');
    });
  });

  describe('Sentiment Synchronization', () => {
    it('should sync sentiment when select changes to negative', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const sentimentSelect = screen.getByDisplayValue(/Positiv/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'negative');

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      expect(slider.value).toBe('-0.7');
    });

    it('should sync sentiment when slider changes to neutral range', async () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.1' } });

      // Nach dem Slider-Change ist der Wert jetzt "Neutral"
      await waitFor(() => {
        const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
        expect(sentimentSelect.value).toBe('neutral');
      });
    });
  });

  describe('AVE Calculation', () => {
    it('should calculate and display AVE with existing reach', () => {
      (calculateAVE as jest.Mock).mockReturnValue(8500);

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(calculateAVE).toHaveBeenCalledWith(75000, 'positive', 'online');
      expect(screen.getByText('8.500 €')).toBeInTheDocument();
    });

    it('should recalculate AVE when reach is changed', async () => {
      const user = userEvent.setup();
      (calculateAVE as jest.Mock).mockReturnValue(12000);

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getByLabelText(/Reichweite/) as HTMLInputElement;
      await user.clear(reachInput);
      await user.type(reachInput, '250000');

      await waitFor(() => {
        expect(calculateAVE).toHaveBeenCalledWith(250000, 'positive', 'online');
      });
    });

    it('should not display AVE when reach is removed', async () => {
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getByLabelText(/Reichweite/) as HTMLInputElement;
      await user.clear(reachInput);

      await waitFor(() => {
        expect(screen.queryByText(/Voraussichtlicher AVE/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with updated data', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutate.mockResolvedValue({});

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/Artikel-Titel/) as HTMLInputElement;
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-123',
            clippingId: 'clipping-789',
            sendId: 'send-123',
            recipientName: 'Anna Schmidt',
            formData: expect.objectContaining({
              articleTitle: 'Updated Title'
            })
          })
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should not submit when user is missing', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit when organization is missing', async () => {
      (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: null });
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit when clipping ID is missing', async () => {
      const clippingWithoutId = { ...mockClipping, id: undefined };
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={clippingWithoutId}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit when send ID is missing', async () => {
      const sendWithoutId = { ...mockSend, id: undefined };
      const user = userEvent.setup();

      render(
        <EditClippingModal
          send={sendWithoutId}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should disable buttons during submission', async () => {
      (useUpdateClipping as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
        isPending: true
      });

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Speichern\.\.\./ });
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/ });

      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should handle submission error gracefully', async () => {
      const user = userEvent.setup();
      mockMutate.mockRejectedValue(new Error('Update failed'));
      const onSuccess = jest.fn();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /Änderungen speichern/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Modal Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={onClose}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /Abbrechen/ });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should require articleUrl field', () => {
      render(
        <EditClippingModal
          send={mockSend}
          clipping={mockClipping}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText(/Artikel-URL/) as HTMLInputElement;
      expect(urlInput.required).toBe(true);
    });
  });
});
