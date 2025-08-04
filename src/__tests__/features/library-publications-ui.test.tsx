// src/__tests__/features/library-publications-ui.test.tsx
/**
 * Integration Tests für Publications UI-Komponenten
 * 
 * Testet die Benutzerinteraktionen und UI-Flows:
 * - Publications-Übersicht mit Filter und Suche
 * - Create/Edit Modal-Workflows
 * - Import-Wizard Durchführung
 * - Detail-Seiten Navigation
 * - Bulk-Operationen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import PublicationsPage from '@/app/dashboard/library/publications/page';
import { PublicationModal } from '@/app/dashboard/library/publications/PublicationModal';
import { PublicationImportModal } from '@/app/dashboard/library/publications/PublicationImportModal';
import { Publication } from '@/types/library';
import { CompanyEnhanced } from '@/types/crm-enhanced';

// Mock Next.js Router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: jest.fn()
  }),
  useParams: () => ({ publicationId: 'test-pub-id' }),
  useSearchParams: () => new URLSearchParams()
}));

// Mock Firebase Services
jest.mock('@/lib/firebase/library-service', () => ({
  publicationService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    verify: jest.fn(),
    import: jest.fn(),
    search: jest.fn()
  },
  advertisementService: {
    getByPublicationId: jest.fn()
  }
}));

jest.mock('@/lib/firebase/crm-service', () => ({
  companiesService: {
    getById: jest.fn(),
    getAll: jest.fn()
  }
}));

// Mock Auth & Organization Context
const mockUser = { uid: 'user123', email: 'test@example.com' };
const mockOrganization = { id: 'org456', name: 'Test Organization' };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: mockOrganization })
}));

// Mock Papa Parse für CSV-Tests
jest.mock('papaparse', () => ({
  unparse: jest.fn(() => 'mocked,csv,data'),
  parse: jest.fn((file, options) => {
    // Mock successful parse
    if (options.complete) {
      options.complete({
        data: [
          { titel: 'Test Publikation', verlag: 'Test Verlag' }
        ],
        meta: { fields: ['titel', 'verlag'] }
      });
    }
  })
}));

describe('Publications UI Integration Tests', () => {
  const mockPublications: Publication[] = [
    {
      id: 'pub1',
      title: 'Test Magazin',
      subtitle: 'Führendes Fachmagazin',
      publisherId: 'publisher1',
      publisherName: 'Test Verlag GmbH',
      type: 'magazine',
      format: 'print',
      languages: ['de'],
      geographicTargets: ['DE'],
      geographicScope: 'national',
      focusAreas: ['Wirtschaft', 'Politik'],
      metrics: {
        frequency: 'monthly',
        targetAudience: 'Führungskräfte',
        print: {
          circulation: 25000,
          circulationType: 'distributed'
        }
      },
      status: 'active',
      verified: true,
      organizationId: 'org456',
      websiteUrl: 'https://test-magazin.de',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'pub2',
      title: 'Online Portal',
      type: 'website',
      format: 'online',
      languages: ['de', 'en'],
      geographicTargets: ['DE', 'AT'],
      geographicScope: 'international',
      metrics: {
        frequency: 'continuous',
        online: {
          monthlyUniqueVisitors: 150000,
          monthlyPageViews: 500000
        }
      },
      status: 'active',
      verified: false,
      organizationId: 'org456',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockCompanies: CompanyEnhanced[] = [
    {
      id: 'publisher1',
      name: 'Test Verlag GmbH',
      type: 'publisher',
      organizationId: 'org456',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { publicationService } = require('@/lib/firebase/library-service');
    const { companiesService } = require('@/lib/firebase/crm-service');
    
    publicationService.getAll.mockResolvedValue(mockPublications);
    publicationService.getById.mockResolvedValue(mockPublications[0]);
    companiesService.getAll.mockResolvedValue(mockCompanies);
  });

  describe('Publications Overview Page', () => {
    it('sollte Publikationen-Liste korrekt anzeigen', async () => {
      renderWithProviders(<PublicationsPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Lade Publikationen...')).not.toBeInTheDocument();
      });

      // Check that publications are displayed
      expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      expect(screen.getByText('Online Portal')).toBeInTheDocument();
      expect(screen.getByText('2 Publikationen in Ihrer Bibliothek')).toBeInTheDocument();
    });

    it('sollte Suche korrekt durchführen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Publikationen durchsuchen...');
      await user.type(searchInput, 'Magazin');

      // Should filter results
      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
        expect(screen.queryByText('Online Portal')).not.toBeInTheDocument();
      });
    });

    it('sollte Filter korrekt anwenden', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      });

      // Open filter popover
      const filterButton = screen.getByLabelText('Filter');
      await user.click(filterButton);

      // Select magazine type filter
      const magazineCheckbox = screen.getByLabelText('Magazin');
      await user.click(magazineCheckbox);

      // Should show only magazines
      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
        expect(screen.queryByText('Online Portal')).not.toBeInTheDocument();
      });
    });

    it('sollte Create-Modal öffnen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      const createButton = await screen.findByText('Publikation hinzufügen');
      await user.click(createButton);

      expect(screen.getByText('Publikation erstellen')).toBeInTheDocument();
    });

    it('sollte Export durchführen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      });

      // Open actions menu
      const actionsButton = screen.getByLabelText('Mehr Aktionen');
      await user.click(actionsButton);

      // Click export
      const exportButton = screen.getByText('Exportieren');
      await user.click(exportButton);

      // Verify Papa.unparse was called
      const Papa = require('papaparse');
      expect(Papa.unparse).toHaveBeenCalled();
    });

    it('sollte Bulk-Delete durchführen', async () => {
      const user = userEvent.setup();
      const { publicationService } = require('@/lib/firebase/library-service');
      publicationService.softDelete.mockResolvedValue(undefined);

      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      });

      // Select publications
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First publication checkbox

      // Open actions and delete
      const actionsButton = screen.getByLabelText('Mehr Aktionen');
      await user.click(actionsButton);

      const deleteButton = screen.getByText('Ausgewählte löschen');
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText('Löschen');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(publicationService.softDelete).toHaveBeenCalled();
      });
    });
  });

  describe('Publication Modal', () => {
    it('sollte neue Publikation erstellen', async () => {
      const user = userEvent.setup();
      const { publicationService } = require('@/lib/firebase/library-service');
      const { companiesService } = require('@/lib/firebase/crm-service');
      
      publicationService.create.mockResolvedValue({ id: 'new-pub' });
      companiesService.getAll.mockResolvedValue(mockCompanies);

      const mockOnSuccess = jest.fn();
      const mockOnClose = jest.fn();

      renderWithProviders(
        <PublicationModal 
          isOpen={true} 
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText('Titel *'), 'Neue Publikation');
      
      // Select publisher
      const publisherSelect = screen.getByLabelText('Verlag *');
      await user.click(publisherSelect);
      await user.click(screen.getByText('Test Verlag GmbH'));

      // Select type
      const typeSelect = screen.getByLabelText('Typ *');
      await user.click(typeSelect);
      await user.click(screen.getByText('Magazin'));

      // Submit form
      const submitButton = screen.getByText('Erstellen');
      await user.click(submitButton);

      await waitFor(() => {
        expect(publicationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Neue Publikation',
            publisherId: 'publisher1',
            type: 'magazine'
          }),
          expect.any(Object)
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('sollte Validierungsfehler anzeigen', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      renderWithProviders(
        <PublicationModal 
          isOpen={true} 
          onClose={mockOnClose}
          onSuccess={jest.fn()}
        />
      );

      // Try to submit without required fields
      const submitButton = screen.getByText('Erstellen');
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Titel.*erforderlich/i)).toBeInTheDocument();
      });
    });

    it('sollte bestehende Publikation bearbeiten', async () => {
      const user = userEvent.setup();
      const { publicationService } = require('@/lib/firebase/library-service');
      
      publicationService.update.mockResolvedValue(undefined);

      renderWithProviders(
        <PublicationModal 
          isOpen={true} 
          onClose={jest.fn()}
          onSuccess={jest.fn()}
          publication={mockPublications[0]}
        />
      );

      // Check that form is pre-filled
      expect(screen.getByDisplayValue('Test Magazin')).toBeInTheDocument();

      // Update title
      const titleInput = screen.getByDisplayValue('Test Magazin');
      await user.clear(titleInput);
      await user.type(titleInput, 'Aktualisiertes Magazin');

      // Submit
      const submitButton = screen.getByText('Aktualisieren');
      await user.click(submitButton);

      await waitFor(() => {
        expect(publicationService.update).toHaveBeenCalledWith(
          'pub1',
          expect.objectContaining({
            title: 'Aktualisiertes Magazin'
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Import Modal', () => {
    it('sollte CSV-Upload und Import durchführen', async () => {
      const user = userEvent.setup();
      const { publicationService } = require('@/lib/firebase/library-service');
      
      publicationService.import.mockResolvedValue({
        created: 1,
        updated: 0,
        skipped: 0,
        errors: []
      });

      renderWithProviders(
        <PublicationImportModal 
          onClose={jest.fn()}
          onImportSuccess={jest.fn()}
        />
      );

      // Step 1: Upload file
      const file = new File(['titel,verlag\nTest,Test Verlag'], 'test.csv', { type: 'text/csv' });
      const fileInput = screen.getByLabelText(/CSV.*Excel.*Datei/i);
      await user.upload(fileInput, file);

      // Select publisher
      const publisherSelect = screen.getByLabelText('Standard-Verlag *');
      await user.click(publisherSelect);
      await user.click(screen.getByText('Test Verlag GmbH'));

      // Go to mapping step
      const nextButton = screen.getByText('Weiter');
      await user.click(nextButton);

      // Step 2: Field mapping should be visible
      await waitFor(() => {
        expect(screen.getByText('Spalten zuordnen')).toBeInTheDocument();
      });

      // Auto-mapping should work
      const autoMapButton = screen.getByText('Automatisch zuordnen');
      await user.click(autoMapButton);

      // Go to import step
      const nextButton2 = screen.getByText('Weiter');
      await user.click(nextButton2);

      // Step 3: Import
      await waitFor(() => {
        expect(screen.getByText('Import durchführen')).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import starten');
      await user.click(importButton);

      await waitFor(() => {
        expect(publicationService.import).toHaveBeenCalled();
        expect(screen.getByText('1 Publikationen erstellt')).toBeInTheDocument();
      });
    });

    it('sollte Template-Download anbieten', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      
      Object.defineProperty(document, 'createElement', {
        value: jest.fn(() => ({
          href: '',
          download: '',
          click: mockClick
        }))
      });
      
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

      renderWithProviders(
        <PublicationImportModal 
          onClose={jest.fn()}
          onImportSuccess={jest.fn()}
        />
      );

      const templateButton = screen.getByText('Vorlage herunterladen');
      await user.click(templateButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('sollte Netzwerk-Fehler korrekt anzeigen', async () => {
      const { publicationService } = require('@/lib/firebase/library-service');
      publicationService.getAll.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden/i)).toBeInTheDocument();
      });
    });

    it('sollte Validierungsfehler beim Import anzeigen', async () => {
      const user = userEvent.setup();
      const { publicationService } = require('@/lib/firebase/library-service');
      
      publicationService.import.mockResolvedValue({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [
          { row: 1, error: 'Titel ist erforderlich' }
        ]
      });

      renderWithProviders(
        <PublicationImportModal 
          onClose={jest.fn()}
          onImportSuccess={jest.fn()}
        />
      );

      // Simulate going through import process with invalid data
      const file = new File(['titel,verlag\n,Test Verlag'], 'test.csv', { type: 'text/csv' });
      const fileInput = screen.getByLabelText(/CSV.*Excel.*Datei/i);
      await user.upload(fileInput, file);

      // Select publisher and proceed through steps...
      const publisherSelect = screen.getByLabelText('Standard-Verlag *');
      await user.click(publisherSelect);
      await user.click(screen.getByText('Test Verlag GmbH'));

      // Continue through wizard...
      const nextButton = screen.getByText('Weiter');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Spalten zuordnen')).toBeInTheDocument();
      });

      const nextButton2 = screen.getByText('Weiter');
      await user.click(nextButton2);

      const importButton = screen.getByText('Import starten');
      await user.click(importButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Titel ist erforderlich/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte ARIA-Labels korrekt setzen', async () => {
      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter')).toBeInTheDocument();
        expect(screen.getByLabelText('Mehr Aktionen')).toBeInTheDocument();
      });
    });

    it('sollte Keyboard-Navigation unterstützen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      });

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toHaveAttribute('type', 'search');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Filter');
    });

    it('sollte Screen-Reader-freundliche Statusupdates haben', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PublicationsPage />);

      await waitFor(() => {
        expect(screen.getByText('2 Publikationen in Ihrer Bibliothek')).toBeInTheDocument();
      });

      // Search should update count
      const searchInput = screen.getByPlaceholderText('Publikationen durchsuchen...');
      await user.type(searchInput, 'Magazin');

      // Should update status for screen readers
      await waitFor(() => {
        // The filtered count should be reflected in the UI
        expect(screen.getByText('Test Magazin')).toBeInTheDocument();
      });
    });
  });
});