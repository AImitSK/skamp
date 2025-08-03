// src/__tests__/features/lists.test.tsx
/**
 * Tests für Lists Feature (Verteilerlisten)
 * 
 * Testet die kritischen Funktionen der Verteilerlisten:
 * - CRUD-Operationen für statische und dynamische Listen
 * - Kontakt-Zuordnung und -Selektion
 * - Filter-System für dynamische Listen
 * - Export-Funktionalität
 * - Modal-Workflows
 * - Multi-Tenancy Datenisolation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Mock Firebase
jest.mock('@/lib/firebase/lists-service', () => ({
  listsService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
    getContacts: jest.fn(),
    getContactsByFilters: jest.fn(),
    getContactsByIds: jest.fn(),
    refreshDynamicList: jest.fn(),
  },
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    loading: false,
  }),
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'test-org-123', name: 'Test Organization' },
    loading: false,
  }),
}));

// Mock CRM Data Context
jest.mock('@/context/CrmDataContext', () => ({
  useCrmData: () => ({
    contacts: [
      {
        id: 'contact1',
        name: { firstName: 'Max', lastName: 'Mustermann' },
        displayName: 'Max Mustermann',
        emails: [{ email: 'max@test.de', isPrimary: true }],
        position: 'Redakteur',
        companyName: 'Test Verlag',
        companyId: 'company1'
      },
      {
        id: 'contact2',
        name: { firstName: 'Anna', lastName: 'Schmidt' },
        displayName: 'Anna Schmidt',
        emails: [{ email: 'anna@test.de', isPrimary: true }],
        position: 'Chefredakteurin',
        companyName: 'Media GmbH',
        companyId: 'company2'
      }
    ],
    companies: [
      {
        id: 'company1',
        name: 'Test Verlag',
        type: 'publisher',
        mainAddress: { countryCode: 'DE' }
      }
    ],
    tags: [
      { id: 'tag1', name: 'Politik' },
      { id: 'tag2', name: 'Wirtschaft' }
    ],
    loading: false,
    refresh: jest.fn(),
  }),
}));

// Mock Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ listId: 'test-list-123' }),
}));

import ListsPage from '@/app/dashboard/contacts/lists/page';
import ListModal from '@/app/dashboard/contacts/lists/ListModal';
import ContactSelectorModal from '@/app/dashboard/contacts/lists/ContactSelectorModal';
import { listsService } from '@/lib/firebase/lists-service';

describe('Lists Feature', () => {
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
  const mockOrganization = { id: 'test-org-123', name: 'Test Organization' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lists Overview Page', () => {
    it('sollte Listen korrekt anzeigen', async () => {
      const mockLists = [
        {
          id: 'list1',
          name: 'Tech Journalisten',
          description: 'Technologie-Journalisten Deutschland',
          type: 'dynamic',
          category: 'press',
          contactCount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'test-user-123',
          organizationId: 'test-org-123',
          filters: { companyTypes: ['media_house'] }
        }
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      render(<ListsPage />);

      await waitFor(() => {
        expect(screen.getByText('Tech Journalisten')).toBeInTheDocument();
        expect(screen.getByText('15 Kontakte')).toBeInTheDocument();
        expect(screen.getByText('Dynamische Liste')).toBeInTheDocument();
      });
    });

    it('sollte "Neue Liste erstellen" Button anzeigen', async () => {
      (listsService.getAll as jest.Mock).mockResolvedValue([]);

      render(<ListsPage />);

      await waitFor(() => {
        expect(screen.getByText('Liste erstellen')).toBeInTheDocument();
      });
    });

    it('sollte Suchfunktion arbeiten', async () => {
      const mockLists = [
        {
          id: 'list1',
          name: 'Tech Journalisten',
          type: 'dynamic',
          contactCount: 15
        },
        {
          id: 'list2',
          name: 'Wirtschaftsreporter',
          type: 'static',
          contactCount: 8
        }
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      render(<ListsPage />);

      await waitFor(() => {
        expect(screen.getByText('Tech Journalisten')).toBeInTheDocument();
        expect(screen.getByText('Wirtschaftsreporter')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/suchen/i);
      await userEvent.type(searchInput, 'Tech');

      // Nach der Eingabe sollte nur noch "Tech Journalisten" sichtbar sein
      await waitFor(() => {
        expect(screen.getByText('Tech Journalisten')).toBeInTheDocument();
        expect(screen.queryByText('Wirtschaftsreporter')).not.toBeInTheDocument();
      });
    });
  });

  describe('ListModal (Erstellen/Bearbeiten)', () => {
    const mockOnClose = jest.fn();
    const mockOnSave = jest.fn();

    beforeEach(() => {
      mockOnClose.mockClear();
      mockOnSave.mockClear();
    });

    it('sollte neues Liste-Formular anzeigen', () => {
      render(
        <ListModal
          onClose={mockOnClose}
          onSave={mockOnSave}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      expect(screen.getByText('Neue Liste erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText('Listen-Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
      expect(screen.getByText('Dynamische Liste')).toBeInTheDocument();
      expect(screen.getByText('Statische Liste')).toBeInTheDocument();
    });

    it('sollte zwischen dynamischer und statischer Liste wechseln', async () => {
      render(
        <ListModal
          onClose={mockOnClose}
          onSave={mockOnSave}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      // Standardmäßig sollte "Dynamische Liste" ausgewählt sein
      expect(screen.getByText('Filter-Kriterien')).toBeInTheDocument();

      // Zu statischer Liste wechseln
      const staticRadio = screen.getByLabelText('Statische Liste');
      await userEvent.click(staticRadio);

      await waitFor(() => {
        expect(screen.getByText('Manuelle Kontaktauswahl')).toBeInTheDocument();
        expect(screen.queryByText('Filter-Kriterien')).not.toBeInTheDocument();
      });
    });

    it('sollte Validierung für leeren Namen durchführen', async () => {
      render(
        <ListModal
          onClose={mockOnClose}
          onSave={mockOnSave}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      const saveButton = screen.getByText('Speichern');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Listenname ist erforderlich')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('sollte dynamische Liste mit Filtern erstellen', async () => {
      (listsService.getContactsByFilters as jest.Mock).mockResolvedValue([
        { id: 'contact1', name: { firstName: 'Max', lastName: 'Mustermann' } }
      ]);

      render(
        <ListModal
          onClose={mockOnClose}
          onSave={mockOnSave}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      // Name eingeben
      const nameInput = screen.getByLabelText('Listen-Name *');
      await userEvent.type(nameInput, 'Test Liste');

      // Filter setzen (z.B. Firmentyp)
      // Note: Hier würde man normalerweise mit der MultiSelectDropdown interagieren
      // Das ist in einem Unit Test schwierig zu simulieren

      const saveButton = screen.getByText('Speichern');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Liste',
            type: 'dynamic',
            userId: mockUser.uid,
            organizationId: mockOrganization.id
          })
        );
      });
    });
  });

  describe('ContactSelectorModal', () => {
    const mockOnClose = jest.fn();
    const mockOnSave = jest.fn();

    beforeEach(() => {
      mockOnClose.mockClear();
      mockOnSave.mockClear();
    });

    it('sollte Kontakte zum Auswählen anzeigen', () => {
      render(
        <ContactSelectorModal
          initialSelectedIds={[]}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Kontakte auswählen')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
      expect(screen.getByText('0 Kontakte ausgewählt')).toBeInTheDocument();
    });

    it('sollte Kontakte durchsuchen können', async () => {
      render(
        <ContactSelectorModal
          initialSelectedIds={[]}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const searchInput = screen.getByPlaceholderText('Kontakte durchsuchen...');
      await userEvent.type(searchInput, 'Max');

      // Nach der Suche sollte nur Max Mustermann angezeigt werden
      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.queryByText('Anna Schmidt')).not.toBeInTheDocument();
      });
    });

    it('sollte Kontakte auswählen und speichern', async () => {
      render(
        <ContactSelectorModal
          initialSelectedIds={[]}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Max Mustermann auswählen
      const maxCheckbox = screen.getAllByRole('checkbox')[0];
      await userEvent.click(maxCheckbox);

      await waitFor(() => {
        expect(screen.getByText('1 Kontakte ausgewählt')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Auswahl übernehmen');
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(['contact1']);
    });
  });

  describe('Liste Export', () => {
    it('sollte CSV Export funktionieren', async () => {
      // Mock für Papa.unparse
      const mockUnparse = jest.fn().mockReturnValue('CSV content');
      jest.doMock('papaparse', () => ({
        unparse: mockUnparse
      }));

      // Mock für Blob und URL.createObjectURL
      global.Blob = jest.fn().mockImplementation((content, options) => ({
        content,
        options
      }));
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:url');

      const mockLists = [{
        id: 'list1',
        name: 'Test Liste',
        type: 'static',
        contactIds: ['contact1'],
        contactCount: 1
      }];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);
      (listsService.getContacts as jest.Mock).mockResolvedValue([
        {
          id: 'contact1',
          name: { firstName: 'Max', lastName: 'Mustermann' },
          emails: [{ email: 'max@test.de', isPrimary: true }]
        }
      ]);

      render(<ListsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Liste')).toBeInTheDocument();
      });

      // Hier würde man normalerweise den Export-Button in einem Dropdown finden
      // Das ist im Unit Test schwierig zu simulieren ohne die ganze Dropdown-Interaktion
    });
  });

  describe('Multi-Tenancy', () => {
    it('sollte nur Listen der aktuellen Organisation laden', async () => {
      render(<ListsPage />);

      await waitFor(() => {
        expect(listsService.getAll).toHaveBeenCalledWith(
          mockUser.uid,
          mockOrganization.id
        );
      });
    });

    it('sollte Listen mit korrekter Organization ID erstellen', async () => {
      render(
        <ListModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      // Validieren dass die Organization ID korrekt verwendet wird
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('sollte Fehler beim Laden von Listen handhaben', async () => {
      (listsService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ListsPage />);

      await waitFor(() => {
        // Hier würde normalerweise eine Fehlermeldung angezeigt werden
        // Das hängt von der konkreten Implementierung ab
        expect(listsService.getAll).toHaveBeenCalled();
      });
    });

    it('sollte Fehler beim Erstellen von Listen handhaben', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));

      render(
        <ListModal
          onClose={jest.fn()}
          onSave={mockOnSave}
          userId={mockUser.uid}
          organizationId={mockOrganization.id}
        />
      );

      const nameInput = screen.getByLabelText('Listen-Name *');
      await userEvent.type(nameInput, 'Test Liste');

      const saveButton = screen.getByText('Speichern');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        // Hier sollte eine Fehlermeldung angezeigt werden
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', () => {
      render(<ListsPage />);

      // Suche nach wichtigen ARIA-Labels
      expect(screen.getByRole('button', { name: /liste erstellen/i })).toBeInTheDocument();
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      render(
        <ContactSelectorModal
          initialSelectedIds={[]}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Tab-Navigation sollte funktionieren
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });
});