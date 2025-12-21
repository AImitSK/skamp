import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkenDNAEditorModal } from '../MarkenDNAEditorModal';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Timestamp } from 'firebase/firestore';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

describe('MarkenDNAEditorModal', () => {
  const mockCompany: CompanyEnhanced = {
    id: 'company-123',
    name: 'Test GmbH',
    type: 'customer',
    officialName: 'Test GmbH',
    organizationId: 'org-123',
    createdBy: 'user-123',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rendert das Modal mit korrektem Titel', () => {
    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="briefing"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Briefing-Check')).toBeInTheDocument();
    expect(screen.getByText(/modal.for/)).toBeInTheDocument();
    expect(screen.getByText(/Test GmbH/)).toBeInTheDocument();
  });

  it('zeigt Split-View mit Chat und Dokument-Bereichen', () => {
    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="swot"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('modal.aiAssistant')).toBeInTheDocument();
    expect(screen.getByText('modal.document')).toBeInTheDocument();
  });

  it('zeigt Placeholder wenn kein Dokument-Inhalt vorhanden', () => {
    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="positioning"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('modal.noContent')).toBeInTheDocument();
  });

  it('ruft onClose bei Klick auf Abbrechen', () => {
    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="messages"
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /actions.cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('ruft onSave und onClose bei Klick auf Speichern', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="briefing"
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /actions.save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('zeigt Loading-State während Speichern', async () => {
    // Mock verzögertes Speichern
    mockOnSave.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="swot"
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /actions.save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('actions.saving')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('deaktiviert Buttons während Speichern', async () => {
    mockOnSave.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="audience"
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /actions.save/i });
    const cancelButton = screen.getByRole('button', { name: /actions.cancel/i });

    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('rendert alle Dokumenttypen korrekt', () => {
    const documentTypes = [
      { type: 'briefing' as const, title: 'Briefing-Check' },
      { type: 'swot' as const, title: 'SWOT-Analyse' },
      { type: 'audience' as const, title: 'Zielgruppen-Radar' },
      { type: 'positioning' as const, title: 'Positionierungs-Designer' },
      { type: 'goals' as const, title: 'Ziele-Setzer' },
      { type: 'messages' as const, title: 'Botschaften-Baukasten' },
    ];

    documentTypes.forEach(({ type, title }) => {
      const { unmount } = render(
        <MarkenDNAEditorModal
          open={true}
          onClose={mockOnClose}
          company={mockCompany}
          documentType={type}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      unmount();
    });
  });

  it('hat Bearbeiten-Button im Dokument-Header', () => {
    render(
      <MarkenDNAEditorModal
        open={true}
        onClose={mockOnClose}
        company={mockCompany}
        documentType="positioning"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByRole('button', { name: /actions.edit/i })).toBeInTheDocument();
  });
});
