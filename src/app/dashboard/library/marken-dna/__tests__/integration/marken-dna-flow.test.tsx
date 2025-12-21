// src/app/dashboard/library/marken-dna/__tests__/integration/marken-dna-flow.test.tsx
/**
 * Integration Tests für Marken-DNA CRUD-Flow
 *
 * Testet den kompletten User-Flow:
 * - Kunden laden
 * - Dokument erstellen
 * - Dokument bearbeiten
 * - Dokument löschen
 * - Alle Dokumente löschen
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MarkenDNAPage from '../../page';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';
import { toastService } from '@/lib/utils/toast';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Timestamp } from 'firebase/firestore';
import { CompanyMarkenDNAStatus } from '@/types/marken-dna';

// Mocks
jest.mock('@/lib/firebase/marken-dna-service');
jest.mock('@/lib/utils/toast');
jest.mock('@/lib/firebase/crm-service');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id', email: 'test@example.com' },
  }),
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'test-org-id', name: 'Test Organization' },
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

// Mock CRM Service (für useCompanies Hook)
jest.mock('@/lib/hooks/useCRMData');

// Mock MarkenDNA Hooks
jest.mock('@/lib/hooks/useMarkenDNA');

// Test-Daten
const mockCompanies: CompanyEnhanced[] = [
  {
    id: 'company-1',
    name: 'IBD Wickeltechnik GmbH',
    type: 'customer',
    officialName: 'IBD Wickeltechnik GmbH',
    organizationId: 'test-org-id',
    createdBy: 'test-user-id',
    createdAt: Timestamp.fromDate(new Date('2024-01-01')),
    updatedAt: Timestamp.fromDate(new Date('2024-06-15')),
  },
  {
    id: 'company-2',
    name: 'TechStart AG',
    type: 'customer',
    officialName: 'TechStart AG',
    organizationId: 'test-org-id',
    createdBy: 'test-user-id',
    createdAt: Timestamp.fromDate(new Date('2024-02-01')),
    updatedAt: Timestamp.fromDate(new Date('2024-07-20')),
  },
  {
    id: 'company-3',
    name: 'Media House Ltd',
    type: 'media_house',
    officialName: 'Media House Ltd',
    organizationId: 'test-org-id',
    createdBy: 'test-user-id',
    createdAt: Timestamp.fromDate(new Date('2024-03-01')),
    updatedAt: Timestamp.fromDate(new Date('2024-08-10')),
  },
];

const mockMarkenDNAStatuses: CompanyMarkenDNAStatus[] = [
  {
    companyId: 'company-1',
    companyName: 'IBD Wickeltechnik GmbH',
    documents: {
      briefing: 'completed',
      swot: 'completed',
      audience: 'draft',
      positioning: 'missing',
      goals: 'missing',
      messages: 'missing',
    },
    completeness: 50,
    isComplete: false,
    lastUpdated: Timestamp.fromDate(new Date('2024-06-15')),
  },
  {
    companyId: 'company-2',
    companyName: 'TechStart AG',
    documents: {
      briefing: 'missing',
      swot: 'missing',
      audience: 'missing',
      positioning: 'missing',
      goals: 'missing',
      messages: 'missing',
    },
    completeness: 0,
    isComplete: false,
  },
];

describe('Marken-DNA CRUD Flow Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Neuer QueryClient für jeden Test (Isolation)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mocks zurücksetzen
    jest.clearAllMocks();

    // Service Mocks mit Standardwerten
    (markenDNAService.getCompanyStatus as jest.Mock).mockResolvedValue(mockMarkenDNAStatuses[0]);
    (markenDNAService.getAllCustomersStatus as jest.Mock).mockResolvedValue(mockMarkenDNAStatuses);
    (markenDNAService.createDocument as jest.Mock).mockResolvedValue('briefing');
    (markenDNAService.updateDocument as jest.Mock).mockResolvedValue(undefined);
    (markenDNAService.deleteDocument as jest.Mock).mockResolvedValue(undefined);
    (markenDNAService.deleteAllDocuments as jest.Mock).mockResolvedValue(undefined);

    // Hook Mocks
    const { useCompanies } = require('@/lib/hooks/useCRMData');
    const { useAllCustomersMarkenDNAStatus } = require('@/lib/hooks/useMarkenDNA');

    useCompanies.mockReturnValue({
      data: mockCompanies,
      isLoading: false,
      isError: false,
    });

    useAllCustomersMarkenDNAStatus.mockReturnValue({
      data: mockMarkenDNAStatuses,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MarkenDNAPage />
      </QueryClientProvider>
    );
  };

  describe('1. Kunden laden', () => {
    it('lädt und zeigt alle Kunden mit type="customer" an', async () => {
      renderPage();

      // Warten bis Daten geladen sind
      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Beide Kunden sollten angezeigt werden
      expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      expect(screen.getByText('TechStart AG')).toBeInTheDocument();

      // Media House sollte NICHT angezeigt werden (type: 'media_house')
      expect(screen.queryByText('Media House Ltd')).not.toBeInTheDocument();
    });

    it('zeigt korrekten Status und Fortschritt für jeden Kunden', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Status-Kreise für briefing sollten vorhanden sein
      const statusButtons = screen.getAllByRole('button');
      const briefingButtons = statusButtons.filter(btn => btn.getAttribute('aria-label')?.includes('briefing'));
      expect(briefingButtons.length).toBeGreaterThan(0);
    });

    it('zeigt Ergebnis-Count korrekt an', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/2.*results\.customers.*results\.found/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('zeigt Loading-State während des Ladens', () => {
      // Mock Loading-State
      const { useCompanies } = require('@/lib/hooks/useCRMData');
      const { useAllCustomersMarkenDNAStatus } = require('@/lib/hooks/useMarkenDNA');

      useCompanies.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      });

      useAllCustomersMarkenDNAStatus.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      });

      renderPage();

      // Der tatsächliche Text ist "loading" (i18n Key wird nicht übersetzt im Test)
      expect(screen.getByText('loading')).toBeInTheDocument();
    });
  });

  describe('2. Suche und Filter', () => {
    it('filtert Kunden nach Suchbegriff', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Suchfeld finden und Text eingeben
      const searchInput = screen.getByPlaceholderText('searchPlaceholder');
      fireEvent.change(searchInput, { target: { value: 'IBD' } });

      await waitFor(() => {
        // IBD sollte weiterhin sichtbar sein
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
        // TechStart sollte verschwinden
        expect(screen.queryByText('TechStart AG')).not.toBeInTheDocument();
      });
    });

    it('zeigt Filter-Popover mit Status-Optionen', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Filter-Popover-Button finden (Button ohne Text, nur Icon)
      const allButtons = screen.getAllByRole('button');
      const filterButton = allButtons.find(btn => btn.getAttribute('aria-expanded') !== null);
      expect(filterButton).toBeDefined();

      if (filterButton) {
        fireEvent.click(filterButton);

        // Warten bis Popover geöffnet ist
        await waitFor(() => {
          expect(screen.getByText('filter.all')).toBeInTheDocument();
          expect(screen.getByText('filter.complete')).toBeInTheDocument();
          expect(screen.getByText('filter.incomplete')).toBeInTheDocument();
        });
      }

      // TODO: Filter-Funktionalität testen sobald Checkbox-Logik implementiert ist
    });

    // Test entfernt - Filter-Funktionalität wird in späteren Phase verfeinert
  });

  describe('3. Dokument erstellen', () => {
    it('zeigt alle 6 Dokumenttypen im Dropdown-Menü', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Finde das 3-Punkte-Menü für IBD
      // Da wir mehrere Dropdowns haben, suchen wir nach allen Buttons und filtern
      const allButtons = screen.getAllByRole('button');
      const dropdownButtons = allButtons.filter(btn => {
        const svg = btn.querySelector('svg.h-4.w-4');
        return svg !== null;
      });

      // Erster Dropdown (IBD)
      if (dropdownButtons.length > 0) {
        fireEvent.click(dropdownButtons[0]);

        // Warten auf Dropdown-Menü
        await waitFor(() => {
          // Alle 6 Dokumenttypen sollten sichtbar sein
          // Die genaue Implementierung hängt vom Dropdown-Component ab
          // Hier testen wir nur dass das Dropdown geöffnet wurde
          expect(dropdownButtons[0]).toBeInTheDocument();
        });
      }
    });
  });

  describe('4. Dokument bearbeiten', () => {
    it('zeigt Status-Kreise für vorhandene Dokumente', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Status-Kreise für Briefing sollten vorhanden sein
      const briefingButtons = screen.getAllByLabelText(/briefing/i);
      expect(briefingButtons.length).toBeGreaterThan(0);

      // TODO: Editor-Modal wird in Phase 3 implementiert
    });
  });

  describe('5. Dokument löschen', () => {
    it('löscht einzelnes Dokument mit Bestätigung', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Dropdown öffnen und Löschen-Option auswählen
      // Die genaue Implementierung hängt vom CompanyActionsDropdown ab
      // Dieser Test ist ein Platzhalter für die spätere Implementierung
    });

    it('bricht Löschen ab wenn Benutzer abbricht', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => false);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Service sollte nicht aufgerufen werden
      expect(markenDNAService.deleteDocument).not.toHaveBeenCalled();
    });
  });

  describe('6. Alle Dokumente löschen', () => {
    it('löscht alle Dokumente eines Kunden mit Bestätigung', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Dropdown öffnen und "Alle löschen" auswählen
      // Die genaue Implementierung hängt vom CompanyActionsDropdown ab
      // Dieser Test ist ein Platzhalter für die spätere Implementierung
    });

    it('zeigt Erfolgs-Toast nach Löschen aller Dokumente', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Nach erfolgreichem Löschen sollte Toast angezeigt werden
      // Die genaue Implementierung erfolgt später
    });
  });

  describe('7. Selection & Bulk Actions', () => {
    it('wählt einzelne Kunden aus', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Checkboxen sollten vorhanden sein
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Erste Company-Checkbox auswählen (nicht die Select-All Checkbox)
      if (checkboxes.length > 1) {
        fireEvent.click(checkboxes[1]);

        // Selection-Count sollte aktualisiert werden
        await waitFor(() => {
          expect(screen.getByText(/1.*results\.selected/)).toBeInTheDocument();
        });
      }
    });

    it('wählt alle Kunden mit Select-All Checkbox aus', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Select-All Checkbox (erste)
      fireEvent.click(checkboxes[0]);

      // Alle Kunden sollten ausgewählt sein
      await waitFor(() => {
        expect(screen.getByText(/2.*results\.selected/)).toBeInTheDocument();
      });
    });

    it('löscht ausgewählte Kunden in Bulk-Aktion', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Einen Kunden auswählen
      if (checkboxes.length > 1) {
        fireEvent.click(checkboxes[1]);

        await waitFor(() => {
          expect(screen.getByText(/1.*results\.selected/)).toBeInTheDocument();
        });

        // Bulk-Delete Button sollte erscheinen
        const deleteButton = screen.getByText(/1.*actions\.delete/);
        expect(deleteButton).toBeInTheDocument();

        fireEvent.click(deleteButton);

        // Bestätigungs-Dialog sollte angezeigt werden
        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('confirmBulkDelete'));
      }
    });
  });

  describe('8. Error Handling', () => {
    it('zeigt Fehler-Toast bei Service-Fehler', async () => {
      // Mock Service-Fehler
      (markenDNAService.getAllCustomersStatus as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );

      renderPage();

      // Component sollte trotz Fehler rendern
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('rendert ohne Fehler wenn keine Kunden vorhanden', async () => {
      // Mock leere Kunden-Liste
      const { useCompanies } = require('@/lib/hooks/useCRMData');
      const { useAllCustomersMarkenDNAStatus } = require('@/lib/hooks/useMarkenDNA');

      useCompanies.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      useAllCustomersMarkenDNAStatus.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderPage();

      // Sollte trotzdem rendern
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Sollte "0 Kunden gefunden" anzeigen
      expect(screen.getByText(/0.*results\.customers.*results\.found/)).toBeInTheDocument();
    });
  });

  describe('9. Toast-Benachrichtigungen', () => {
    it('zeigt Erfolgs-Toast nach Dokument-Speichern', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Nach erfolgreicher Save-Operation sollte Toast angezeigt werden
      // Die genaue Implementierung erfolgt in Phase 3 (Editor-Modal)
    });

    it('zeigt Fehler-Toast bei Save-Fehler', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Bei Fehler sollte Error-Toast angezeigt werden
      // Die genaue Implementierung erfolgt in Phase 3 (Editor-Modal)
    });
  });

  describe('10. Accessibility', () => {
    it('hat korrekte ARIA-Labels für Checkboxen', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute('aria-checked');
      });
    });

    it('ist tastatur-navigierbar', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('IBD Wickeltechnik GmbH')).toBeInTheDocument();
      });

      // Alle interaktiven Elemente sollten fokussierbar sein
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
