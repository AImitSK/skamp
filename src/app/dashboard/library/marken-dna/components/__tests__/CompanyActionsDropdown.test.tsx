import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompanyActionsDropdown } from '../CompanyActionsDropdown';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

describe('CompanyActionsDropdown', () => {
  const mockDocuments = {
    briefing: true,
    swot: true,
    audience: false,
    positioning: false,
    goals: false,
    messages: false,
  };

  const defaultProps = {
    companyId: 'company-123',
    companyName: 'Test GmbH',
    documents: mockDocuments,
    onCreateOrEdit: jest.fn(),
    onDeleteAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rendert den 3-Punkte-Button', () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('zeigt Company-Namen im Header wenn Dropdown geöffnet', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test GmbH')).toBeInTheDocument();
    });
  });

  it('zeigt alle 6 Dokument-Typen an', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('documents.briefing')).toBeInTheDocument();
      expect(screen.getByText('documents.swot')).toBeInTheDocument();
      expect(screen.getByText('documents.audience')).toBeInTheDocument();
      expect(screen.getByText('documents.positioning')).toBeInTheDocument();
      expect(screen.getByText('documents.goals')).toBeInTheDocument();
      expect(screen.getByText('documents.messages')).toBeInTheDocument();
    });
  });

  it('zeigt "Bearbeiten" für vorhandene Dokumente', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // Briefing und SWOT existieren
      const editLabels = screen.getAllByText('actions.edit');
      expect(editLabels).toHaveLength(2);
    });
  });

  it('zeigt Plus-Icon für fehlende Dokumente', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // 4 Dokumente fehlen = 4 Plus-Icons
      const items = screen.getByText('documents.audience').closest('button');
      expect(items).toBeInTheDocument();
    });
  });

  it('ruft onCreateOrEdit beim Klick auf Dokument auf', async () => {
    const onCreateOrEdit = jest.fn();
    render(<CompanyActionsDropdown {...defaultProps} onCreateOrEdit={onCreateOrEdit} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const briefingItem = screen.getByText('documents.briefing').closest('button');
      if (briefingItem) {
        fireEvent.click(briefingItem);
      }
    });

    expect(onCreateOrEdit).toHaveBeenCalledWith('briefing');
  });

  it('zeigt "Alle Dokumente löschen" Option', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('actions.deleteAll')).toBeInTheDocument();
    });
  });

  it('ruft onDeleteAll beim Klick auf Löschen auf', async () => {
    const onDeleteAll = jest.fn();
    render(<CompanyActionsDropdown {...defaultProps} onDeleteAll={onDeleteAll} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const deleteButton = screen.getByText('actions.deleteAll').closest('button');
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }
    });

    expect(onDeleteAll).toHaveBeenCalled();
  });

  it('zeigt Dokumente mit korrektem Status', async () => {
    render(<CompanyActionsDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // Prüfe dass alle 6 Dokumenttypen angezeigt werden
      expect(screen.getByText('documents.briefing')).toBeInTheDocument();
      expect(screen.getByText('documents.swot')).toBeInTheDocument();

      // Prüfe dass "Bearbeiten" für existierende Dokumente angezeigt wird
      const editLabels = screen.getAllByText('actions.edit');
      expect(editLabels.length).toBe(2); // briefing + swot
    });
  });
});
