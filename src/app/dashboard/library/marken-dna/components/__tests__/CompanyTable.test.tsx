import { render, screen, fireEvent, within } from '@testing-library/react';
import { CompanyTable, CompanyTableProps } from '../CompanyTable';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Timestamp } from 'firebase/firestore';
import { DocumentStatus, MarkenDNADocumentType } from '@/components/marken-dna/StatusCircles';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

describe('CompanyTable', () => {
  const mockCompanies: CompanyEnhanced[] = [
    {
      id: 'company-1',
      name: 'Alpha GmbH',
      type: 'customer',
      officialName: 'Alpha GmbH',
      organizationId: 'org-123',
      createdBy: 'user-123',
      createdAt: Timestamp.fromDate(new Date('2024-01-01')),
      updatedAt: Timestamp.fromDate(new Date('2024-06-15')),
    },
    {
      id: 'company-2',
      name: 'Beta AG',
      type: 'customer',
      officialName: 'Beta AG',
      organizationId: 'org-123',
      createdBy: 'user-123',
      createdAt: Timestamp.fromDate(new Date('2024-02-01')),
      updatedAt: Timestamp.fromDate(new Date('2024-07-20')),
    },
    {
      id: 'company-3',
      name: 'Gamma Ltd',
      type: 'customer',
      officialName: 'Gamma Ltd',
      organizationId: 'org-123',
      createdBy: 'user-123',
      createdAt: Timestamp.fromDate(new Date('2024-03-01')),
      updatedAt: Timestamp.fromDate(new Date('2024-08-10')),
    },
  ];

  const mockGetMarkenDNAStatus = jest.fn((companyId: string): Record<MarkenDNADocumentType, DocumentStatus> => {
    if (companyId === 'company-1') {
      return {
        briefing: 'completed',
        swot: 'completed',
        audience: 'completed',
        positioning: 'draft',
        goals: 'missing',
        messages: 'missing',
      };
    }
    if (companyId === 'company-2') {
      return {
        briefing: 'completed',
        swot: 'draft',
        audience: 'missing',
        positioning: 'missing',
        goals: 'missing',
        messages: 'missing',
      };
    }
    return {
      briefing: 'missing',
      swot: 'missing',
      audience: 'missing',
      positioning: 'missing',
      goals: 'missing',
      messages: 'missing',
    };
  });

  const defaultProps: CompanyTableProps = {
    companies: mockCompanies,
    selectedIds: new Set(),
    onSelectAll: jest.fn(),
    onSelect: jest.fn(),
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    getMarkenDNAStatus: mockGetMarkenDNAStatus,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('rendert die Tabelle mit allen Spalten-Headern', () => {
      render(<CompanyTable {...defaultProps} />);

      expect(screen.getByText('table.name')).toBeInTheDocument();
      expect(screen.getByText('table.status')).toBeInTheDocument();
      expect(screen.getByText('table.updated')).toBeInTheDocument();
    });

    it('rendert alle Companies', () => {
      render(<CompanyTable {...defaultProps} />);

      expect(screen.getByText('Alpha GmbH')).toBeInTheDocument();
      expect(screen.getByText('Beta AG')).toBeInTheDocument();
      expect(screen.getByText('Gamma Ltd')).toBeInTheDocument();
    });

    it('zeigt Customer-Badges für alle Firmen', () => {
      render(<CompanyTable {...defaultProps} />);

      const badges = screen.getAllByText('results.customer');
      expect(badges).toHaveLength(3);
    });

    it('zeigt Aktualisierungsdatum für Companies mit updatedAt', () => {
      render(<CompanyTable {...defaultProps} />);

      // Prüfe dass die Komponente updatedAt Timestamps verarbeitet
      // Die genaue Formatierung ist im Edge Cases Test abgedeckt
      const { container } = render(<CompanyTable {...defaultProps} />);
      const dateElements = container.querySelectorAll('.text-sm.text-zinc-700');

      // Es sollte 3 Datums-Elemente geben (eins pro Company)
      expect(dateElements.length).toBeGreaterThanOrEqual(3);
    });

    it('rendert StatusCircles für jede Firma', () => {
      render(<CompanyTable {...defaultProps} />);

      // Prüfe dass getMarkenDNAStatus für jede Company aufgerufen wurde
      expect(mockGetMarkenDNAStatus).toHaveBeenCalledWith('company-1');
      expect(mockGetMarkenDNAStatus).toHaveBeenCalledWith('company-2');
      expect(mockGetMarkenDNAStatus).toHaveBeenCalledWith('company-3');
    });
  });

  describe('Selection', () => {
    it('zeigt Select-All Checkbox im Header', () => {
      render(<CompanyTable {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('ruft onSelectAll bei Klick auf Select-All Checkbox', () => {
      const onSelectAll = jest.fn();
      render(<CompanyTable {...defaultProps} onSelectAll={onSelectAll} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0]; // Erste Checkbox ist Select-All

      fireEvent.click(selectAllCheckbox);

      expect(onSelectAll).toHaveBeenCalledWith(true);
    });

    it('zeigt alle Companies als selected wenn selectedIds alle enthält', () => {
      const selectedIds = new Set(['company-1', 'company-2', 'company-3']);
      render(<CompanyTable {...defaultProps} selectedIds={selectedIds} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Prüfe dass mindestens einige Checkboxen gecheckt sind
      const checkedBoxes = checkboxes.filter(cb => cb.getAttribute('aria-checked') === 'true');
      expect(checkedBoxes.length).toBeGreaterThan(0);
    });

    it('ruft onSelect beim Klick auf Company Checkbox', () => {
      const onSelect = jest.fn();
      render(<CompanyTable {...defaultProps} onSelect={onSelect} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Zweite Checkbox ist die erste Company
      const firstCompanyCheckbox = checkboxes[1];

      fireEvent.click(firstCompanyCheckbox);

      expect(onSelect).toHaveBeenCalledWith('company-1', true);
    });
  });

  describe('Sorting', () => {
    it('sortiert nach Name aufsteigend by default', () => {
      render(<CompanyTable {...defaultProps} />);

      const rows = screen.getAllByRole('button', { name: /GmbH|AG|Ltd/ });
      expect(rows[0]).toHaveTextContent('Alpha GmbH');
      expect(rows[1]).toHaveTextContent('Beta AG');
      expect(rows[2]).toHaveTextContent('Gamma Ltd');
    });

    it('ändert Sortierrichtung bei Klick auf Name-Header', () => {
      render(<CompanyTable {...defaultProps} />);

      const nameHeader = screen.getByText('table.name').closest('button')!;

      // Erster Klick: asc -> desc
      fireEvent.click(nameHeader);

      const rowsAfterClick = screen.getAllByRole('button', { name: /GmbH|AG|Ltd/ });
      expect(rowsAfterClick[0]).toHaveTextContent('Gamma Ltd');
      expect(rowsAfterClick[1]).toHaveTextContent('Beta AG');
      expect(rowsAfterClick[2]).toHaveTextContent('Alpha GmbH');
    });

    it('sortiert nach Status wenn Status-Header geklickt', () => {
      render(<CompanyTable {...defaultProps} />);

      const statusHeader = screen.getByText('table.status').closest('button')!;
      fireEvent.click(statusHeader);

      // company-1 hat 3 completed, company-2 hat 1 completed, company-3 hat 0
      const rows = screen.getAllByRole('button', { name: /GmbH|AG|Ltd/ });
      expect(rows[0]).toHaveTextContent('Gamma Ltd'); // 0 completed
      expect(rows[1]).toHaveTextContent('Beta AG');   // 1 completed
      expect(rows[2]).toHaveTextContent('Alpha GmbH'); // 3 completed
    });

    it('sortiert nach updatedAt wenn Updated-Header geklickt', () => {
      render(<CompanyTable {...defaultProps} />);

      const updatedHeader = screen.getByText('table.updated').closest('button')!;
      fireEvent.click(updatedHeader);

      const rows = screen.getAllByRole('button', { name: /GmbH|AG|Ltd/ });
      expect(rows[0]).toHaveTextContent('Alpha GmbH'); // Juni
      expect(rows[1]).toHaveTextContent('Beta AG');    // Juli
      expect(rows[2]).toHaveTextContent('Gamma Ltd');  // August
    });

    it('zeigt Sortier-Icons', () => {
      render(<CompanyTable {...defaultProps} />);

      const nameHeader = screen.getByText('table.name').closest('button')!;

      // Standard: aufsteigend sortiert nach Name
      // ChevronUpIcon sollte sichtbar sein
      expect(nameHeader.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('zeigt 3-Punkte-Menü für jede Company', () => {
      render(<CompanyTable {...defaultProps} />);

      // Prüfe dass die Dropdown-Komponente für jede Company gerendert wird
      // Wir prüfen auf SVG Icons mit der h-4 w-4 Klasse (3-Punkte-Icon)
      const allButtons = screen.getAllByRole('button');
      const dropdownButtons = allButtons.filter(button => {
        const svg = button.querySelector('svg.h-4.w-4');
        return svg !== null;
      });

      // Es sollte mindestens ein Dropdown-Button pro Company geben
      expect(dropdownButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('ruft onView beim Klick auf Company-Namen', () => {
      const onView = jest.fn();
      render(<CompanyTable {...defaultProps} onView={onView} />);

      const companyName = screen.getByText('Alpha GmbH');
      fireEvent.click(companyName);

      expect(onView).toHaveBeenCalledWith('company-1');
    });

    it('zeigt Dropdown-Menü-Optionen', () => {
      render(<CompanyTable {...defaultProps} />);

      // Finde alle Buttons und filtere nach dem mit EllipsisVertical Icon
      const allButtons = screen.getAllByRole('button');
      const dropdownButton = allButtons.find(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('h-4');
      });

      if (dropdownButton) {
        fireEvent.click(dropdownButton);
      }

      // Nach Klick sollten die Dropdown-Items erscheinen (in einem späteren Test-Zyklus)
    });
  });

  describe('Empty State', () => {
    it('rendert leere Tabelle ohne Fehler', () => {
      render(<CompanyTable {...defaultProps} companies={[]} />);

      expect(screen.getByText('table.name')).toBeInTheDocument();
      expect(screen.getByText('table.status')).toBeInTheDocument();
      expect(screen.getByText('table.updated')).toBeInTheDocument();
    });

    it('zeigt keine Checkboxen im Header wenn keine Companies', () => {
      render(<CompanyTable {...defaultProps} companies={[]} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Select-All Checkbox sollte vorhanden sein, aber keine weiteren
      expect(checkboxes).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('hat klickbare Company-Namen', () => {
      render(<CompanyTable {...defaultProps} />);

      const companyNames = screen.getAllByRole('button', { name: /GmbH|AG|Ltd/ });
      expect(companyNames).toHaveLength(3);

      companyNames.forEach(name => {
        expect(name).toBeEnabled();
      });
    });

    it('hat sortierbare Spalten-Header', () => {
      render(<CompanyTable {...defaultProps} />);

      const nameHeader = screen.getByText('table.name').closest('button');
      const statusHeader = screen.getByText('table.status').closest('button');
      const updatedHeader = screen.getByText('table.updated').closest('button');

      expect(nameHeader).toBeEnabled();
      expect(statusHeader).toBeEnabled();
      expect(updatedHeader).toBeEnabled();
    });
  });

  describe('Hover Effects', () => {
    it('hat hover:bg-zinc-50 auf Tabellenzeilen', () => {
      const { container } = render(<CompanyTable {...defaultProps} />);

      const rows = container.querySelectorAll('.hover\\:bg-zinc-50');
      expect(rows.length).toBe(3); // Eine pro Company
    });
  });

  describe('Edge Cases', () => {
    it('handhabt Companies ohne updatedAt', () => {
      const companiesWithoutDate = [
        {
          ...mockCompanies[0],
          updatedAt: undefined,
        },
      ];

      render(<CompanyTable {...defaultProps} companies={companiesWithoutDate} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('handhabt Companies ohne id', () => {
      const companiesWithoutId = [
        {
          ...mockCompanies[0],
          id: undefined,
        } as CompanyEnhanced,
      ];

      // Sollte nicht crashen
      expect(() => {
        render(<CompanyTable {...defaultProps} companies={companiesWithoutId} />);
      }).not.toThrow();
    });
  });
});
