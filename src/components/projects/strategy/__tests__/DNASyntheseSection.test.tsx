import { render, screen, fireEvent } from '@testing-library/react';
import { DNASyntheseSection } from '../DNASyntheseSection';
import { Timestamp } from 'firebase/firestore';
import type { CompanyMarkenDNAStatus } from '@/types/marken-dna';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock StatusCircles
jest.mock('@/components/marken-dna/StatusCircles', () => ({
  StatusCircles: ({ documents }: any) => (
    <div data-testid="status-circles">{JSON.stringify(documents)}</div>
  ),
}));

describe('DNASyntheseSection', () => {
  const mockDNASynthese = {
    id: 'synthese-123',
    content: '<p>DNA Synthese Inhalt</p>',
    plainText: 'DNA Synthese Inhalt',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockMarkenDNAStatus: CompanyMarkenDNAStatus = {
    companyId: 'company-123',
    companyName: 'Test GmbH',
    isComplete: false,
    completeness: 33,
    documents: {
      briefing: 'completed',
      swot: 'completed',
      audience: 'missing',
      positioning: 'missing',
      goals: 'missing',
      messages: 'missing',
    },
  };

  const defaultProps = {
    projectId: 'project-123',
    companyId: 'company-123',
    companyName: 'Test GmbH',
    dnaSynthese: null,
    canSynthesize: false,
    markenDNAStatus: mockMarkenDNAStatus,
    onSynthesize: jest.fn(),
    onDelete: jest.fn(),
    onEdit: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering ohne Synthese', () => {
    it('zeigt "DNA synthetisieren" Button wenn canSynthesize=true', () => {
      render(<DNASyntheseSection {...defaultProps} canSynthesize={true} />);

      expect(
        screen.getByText(/Erstelle eine KI-optimierte Kurzform/)
      ).toBeInTheDocument();
      expect(screen.getByText('DNA synthetisieren')).toBeInTheDocument();
    });

    it('zeigt StatusCircles und Vervollständigen-Button wenn canSynthesize=false', () => {
      render(<DNASyntheseSection {...defaultProps} canSynthesize={false} />);

      expect(
        screen.getByText(/Die Marken-DNA von Test GmbH ist noch nicht vollständig/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('status-circles')).toBeInTheDocument();
      expect(
        screen.getByText('Marken-DNA vervollständigen')
      ).toBeInTheDocument();
    });

    it('ruft onSynthesize auf bei Klick auf "DNA synthetisieren"', () => {
      const onSynthesize = jest.fn();
      render(
        <DNASyntheseSection
          {...defaultProps}
          canSynthesize={true}
          onSynthesize={onSynthesize}
        />
      );

      const synthesizeButton = screen.getByText('DNA synthetisieren');
      fireEvent.click(synthesizeButton);

      expect(onSynthesize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rendering mit Synthese', () => {
    it('zeigt "DNA Synthese aktiv" Badge', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      expect(screen.getByText('DNA Synthese aktiv')).toBeInTheDocument();
    });

    it('rendert den Synthese-Inhalt', () => {
      const { container } = render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      // Der Inhalt wird via dangerouslySetInnerHTML gerendert
      const contentDiv = container.querySelector('.prose.prose-sm.max-w-none');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv?.innerHTML).toContain('DNA Synthese Inhalt');
    });

    it('zeigt Bearbeiten-Button', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    });

    it('zeigt Dropdown-Menu mit Aktionen', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      expect(dropdownButton).toBeInTheDocument();
    });
  });

  describe('Dropdown-Aktionen', () => {
    it('enthält "Neu synthetisieren" Option', () => {
      render(
        <DNASyntheseSection
          {...defaultProps}
          dnaSynthese={mockDNASynthese}
          canSynthesize={true}
        />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      fireEvent.click(dropdownButton);

      expect(screen.getByText('Neu synthetisieren')).toBeInTheDocument();
    });

    it('enthält "Löschen" Option', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      fireEvent.click(dropdownButton);

      expect(screen.getByText('Löschen')).toBeInTheDocument();
    });

    it('ruft onDelete auf bei Klick auf "Löschen" (mit Bestätigung)', () => {
      // Mock window.confirm
      global.confirm = jest.fn().mockReturnValue(true);
      const onDelete = jest.fn();

      render(
        <DNASyntheseSection
          {...defaultProps}
          dnaSynthese={mockDNASynthese}
          onDelete={onDelete}
        />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      fireEvent.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('ruft onDelete NICHT auf wenn Bestätigung abgelehnt', () => {
      global.confirm = jest.fn().mockReturnValue(false);
      const onDelete = jest.fn();

      render(
        <DNASyntheseSection
          {...defaultProps}
          dnaSynthese={mockDNASynthese}
          onDelete={onDelete}
        />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      fireEvent.click(dropdownButton);

      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Bearbeitungsmodus', () => {
    it('wechselt zu Bearbeitungsmodus bei Klick auf "Bearbeiten"', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      const editButton = screen.getByText('Bearbeiten');
      fireEvent.click(editButton);

      // Textarea sollte sichtbar sein
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Speichern')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    it('ruft onEdit auf bei Klick auf "Speichern"', () => {
      const onEdit = jest.fn();
      render(
        <DNASyntheseSection
          {...defaultProps}
          dnaSynthese={mockDNASynthese}
          onEdit={onEdit}
        />
      );

      // In Bearbeitungsmodus wechseln
      const editButton = screen.getByText('Bearbeiten');
      fireEvent.click(editButton);

      // Inhalt ändern
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, {
        target: { value: '<p>Geänderter Inhalt</p>' },
      });

      // Speichern
      const saveButton = screen.getByText('Speichern');
      fireEvent.click(saveButton);

      expect(onEdit).toHaveBeenCalledWith('<p>Geänderter Inhalt</p>');
    });

    it('verwirft Änderungen bei Klick auf "Abbrechen"', () => {
      render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      // In Bearbeitungsmodus wechseln
      fireEvent.click(screen.getByText('Bearbeiten'));

      // Inhalt ändern
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, {
        target: { value: '<p>Geänderter Inhalt</p>' },
      });

      // Abbrechen
      fireEvent.click(screen.getByText('Abbrechen'));

      // Sollte wieder im Anzeigemodus sein
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('deaktiviert Buttons während isLoading=true', () => {
      render(
        <DNASyntheseSection
          {...defaultProps}
          canSynthesize={true}
          isLoading={true}
        />
      );

      const button = screen.getByText('DNA synthetisieren');
      expect(button).toBeDisabled();
    });

    it('deaktiviert Dropdown-Items während isLoading=true', () => {
      render(
        <DNASyntheseSection
          {...defaultProps}
          dnaSynthese={mockDNASynthese}
          isLoading={true}
        />
      );

      const dropdownButton = screen.getByRole('button', { name: /aktionen/i });
      fireEvent.click(dropdownButton);

      const deleteItem = screen.getByText('Löschen');
      // Catalyst Dropdown verwendet aria-disabled statt disabled
      expect(deleteItem.closest('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Icons', () => {
    it('verwendet BeakerIcon im Header', () => {
      const { container } = render(
        <DNASyntheseSection {...defaultProps} />
      );

      // BeakerIcon hat text-purple-600 Klasse
      const icon = container.querySelector('.text-purple-600');
      expect(icon).toBeInTheDocument();
    });

    it('verwendet CheckCircleIcon bei aktiver Synthese', () => {
      const { container } = render(
        <DNASyntheseSection {...defaultProps} dnaSynthese={mockDNASynthese} />
      );

      // CheckCircleIcon hat text-green-600 Klasse
      const icon = container.querySelector('.text-green-600');
      expect(icon).toBeInTheDocument();
    });
  });
});
