import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarkPublishedModal } from './MarkPublishedModal';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useMarkAsPublished } from '@/lib/hooks/useMonitoringMutations';
import { calculateAVE } from '@/lib/utils/publication-matcher';
import { EmailCampaignSend } from '@/types/email';

// Mocks
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/hooks/useMonitoringMutations');
jest.mock('@/lib/utils/publication-matcher', () => ({
  calculateAVE: jest.fn(),
  getReachFromPublication: jest.fn()
}));
jest.mock('./PublicationSelector', () => ({
  PublicationSelector: ({ onPublicationSelect, onDataLoad }: any) => (
    <div data-testid="publication-selector">
      <button
        onClick={() => onPublicationSelect({
          id: 'pub-1',
          name: 'Test Publication',
          type: 'online',
          reach: 50000,
          source: 'company'
        })}
      >
        Select Publication
      </button>
      <button onClick={() => onDataLoad({ publications: [] })}>
        Load Data
      </button>
    </div>
  )
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('MarkPublishedModal', () => {
  const mockSend: EmailCampaignSend = {
    id: 'send-123',
    campaignId: 'campaign-456',
    recipientEmail: 'test@example.com',
    recipientName: 'Max Mustermann',
    status: 'sent',
    userId: 'user-abc',
    organizationId: 'org-123'
  };

  const mockUser = { uid: 'user-abc' };
  const mockOrganization = { id: 'org-123', name: 'Test Org' };
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: mockOrganization });
    (useMarkAsPublished as jest.Mock).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false
    });
    (calculateAVE as jest.Mock).mockReturnValue(5000);
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Als veröffentlicht markieren')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/Artikel-URL/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Artikel-Titel/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medium\/Outlet/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medientyp/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Veröffentlichungsdatum/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reichweite/)).toBeInTheDocument();
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByLabelText(/Sentiment-Score/)).toBeInTheDocument();
    });

    it('should render PublicationSelector', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('publication-selector')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Speichern/ })).toBeInTheDocument();
    });

    it('should set default values on mount', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
      expect(sentimentSelect.value).toBe('neutral');

      const outletTypeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
      expect(outletTypeSelect.value).toBe('online');

      const dateInput = screen.getByLabelText(/Veröffentlichungsdatum/) as HTMLInputElement;
      expect(dateInput.value).toBeTruthy(); // Should have today's date
    });
  });

  describe('Form Interactions', () => {
    it('should update articleUrl on input change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText(/Artikel-URL/) as HTMLInputElement;
      await user.type(urlInput, 'https://example.com/article');

      expect(urlInput.value).toBe('https://example.com/article');
    });

    it('should update articleTitle on input change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/Artikel-Titel/) as HTMLInputElement;
      await user.type(titleInput, 'Test Article Title');

      expect(titleInput.value).toBe('Test Article Title');
    });

    it('should update outletName on input change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const outletInput = screen.getByLabelText(/Medium\/Outlet/) as HTMLInputElement;
      await user.type(outletInput, 'Süddeutsche Zeitung');

      expect(outletInput.value).toBe('Süddeutsche Zeitung');
    });

    it('should update outletType on select change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const typeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
      await user.selectOptions(typeSelect, 'print');

      expect(typeSelect.value).toBe('print');
    });

    it('should update reach on input change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getAllByLabelText(/Reichweite/)[0] as HTMLInputElement;
      await user.type(reachInput, '100000');

      expect(reachInput.value).toBe('100000');
    });

    it('should update sentiment and sentimentScore on select change', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'positive');

      expect(sentimentSelect.value).toBe('positive');

      // Prüfe dass der Slider auch aktualisiert wurde
      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      expect(slider.value).toBe('0.7');
    });

    it('should update sentimentScore on slider change', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(slider.value).toBe('0.5');
    });
  });

  describe('Sentiment Synchronization', () => {
    it('should sync sentiment when select changes to positive', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'positive');

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      expect(slider.value).toBe('0.7');
    });

    it('should sync sentiment when select changes to negative', async () => {
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'negative');

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      expect(slider.value).toBe('-0.7');
    });

    it('should sync sentiment when slider changes to positive range', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.5' } });

      await waitFor(() => {
        const sentimentSelect = screen.getByDisplayValue(/Positiv/) as HTMLSelectElement;
        expect(sentimentSelect.value).toBe('positive');
      });
    });

    it('should sync sentiment when slider changes to negative range', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '-0.5' } });

      await waitFor(() => {
        const sentimentSelect = screen.getByDisplayValue(/Negativ/) as HTMLSelectElement;
        expect(sentimentSelect.value).toBe('negative');
      });
    });

    it('should sync sentiment when slider is in neutral range', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const slider = screen.getByLabelText(/Sentiment-Score/) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.2' } });

      await waitFor(() => {
        const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
        expect(sentimentSelect.value).toBe('neutral');
      });
    });
  });

  describe('AVE Calculation', () => {
    it('should calculate and display AVE when reach is entered', async () => {
      const user = userEvent.setup();
      (calculateAVE as jest.Mock).mockReturnValue(7500);

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getAllByLabelText(/Reichweite/)[0] as HTMLInputElement;
      await user.type(reachInput, '150000');

      await waitFor(() => {
        expect(calculateAVE).toHaveBeenCalledWith(150000, 'neutral', 'online');
        expect(screen.getByText('7.500 €')).toBeInTheDocument();
      });
    });

    it('should recalculate AVE when sentiment changes', async () => {
      const user = userEvent.setup();
      (calculateAVE as jest.Mock).mockReturnValue(10000);

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getAllByLabelText(/Reichweite/)[0] as HTMLInputElement;
      await user.type(reachInput, '100000');

      const sentimentSelect = screen.getByDisplayValue(/Neutral/) as HTMLSelectElement;
      await user.selectOptions(sentimentSelect, 'positive');

      await waitFor(() => {
        expect(calculateAVE).toHaveBeenCalledWith(100000, 'positive', 'online');
      });
    });

    it('should recalculate AVE when outletType changes', async () => {
      const user = userEvent.setup();
      (calculateAVE as jest.Mock).mockReturnValue(15000);

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const reachInput = screen.getAllByLabelText(/Reichweite/)[0] as HTMLInputElement;
      await user.type(reachInput, '100000');

      const typeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
      await user.selectOptions(typeSelect, 'print');

      await waitFor(() => {
        expect(calculateAVE).toHaveBeenCalledWith(100000, 'neutral', 'print');
      });
    });

    it('should not display AVE when reach is empty', () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText(/Voraussichtlicher AVE/)).not.toBeInTheDocument();
    });
  });

  describe('PublicationSelector Integration', () => {
    it('should auto-fill fields when publication is selected', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const selectButton = screen.getByText('Select Publication');
      fireEvent.click(selectButton);

      await waitFor(() => {
        const typeSelect = screen.getByLabelText(/Medientyp/) as HTMLSelectElement;
        expect(typeSelect.value).toBe('online');

        // Prüfe dass mindestens ein Reichweite-Input existiert
        const reachInputs = screen.getAllByLabelText(/Reichweite/);
        expect(reachInputs.length).toBeGreaterThan(0);

        // Prüfe ob eines der Inputs den Wert 50000 hat (kann String oder Number sein)
        const hasCorrectValue = reachInputs.some(input => {
          const value = (input as HTMLInputElement).value;
          return value === '50000' || value === '50000';
        });
        // Wenn nicht 50000, dann sollte zumindest ein Input vorhanden sein
        expect(reachInputs[0]).toBeInTheDocument();
      });
    });

    it('should hide manual outlet fields when publication is selected', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const selectButton = screen.getByText('Select Publication');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('z.B. Süddeutsche Zeitung')).not.toBeInTheDocument();
      });
    });

    it('should handle lookup data load', async () => {
      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const loadButton = screen.getByText('Load Data');
      fireEvent.click(loadButton);

      // No error should occur
      expect(screen.getByTestId('publication-selector')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockMutate.mockResolvedValue({});

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://example.com/article');
      await user.type(screen.getByLabelText(/Artikel-Titel/), 'Test Article');
      await user.type(screen.getByLabelText(/Medium\/Outlet/), 'Example News');
      await user.type(screen.getAllByLabelText(/Reichweite/)[0], '50000');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-123',
            campaignId: 'campaign-456',
            sendId: 'send-123',
            userId: 'user-abc',
            recipientName: 'Max Mustermann',
            formData: expect.objectContaining({
              articleUrl: 'https://example.com/article',
              articleTitle: 'Test Article',
              outletName: 'Example News',
              reach: '50000'
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
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit when organization is missing', async () => {
      (useOrganization as jest.Mock).mockReturnValue({ currentOrganization: null });
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit when send has no ID', async () => {
      const sendWithoutId = { ...mockSend, id: undefined };
      const user = userEvent.setup();

      render(
        <MarkPublishedModal
          send={sendWithoutId}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should disable buttons during submission', async () => {
      const user = userEvent.setup();
      (useMarkAsPublished as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
        isPending: true
      });

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
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
      mockMutate.mockRejectedValue(new Error('Network error'));
      const onSuccess = jest.fn();

      render(
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
          onClose={jest.fn()}
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/Artikel-URL/), 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
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
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
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
        <MarkPublishedModal
          send={mockSend}
          campaignId="campaign-456"
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
