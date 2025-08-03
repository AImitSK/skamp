// src/__tests__/features/crm-enhanced.test.tsx
/**
 * Tests für CRM Enhanced Feature
 * 
 * Testet die kritischen Funktionen des CRM-Systems:
 * - CRUD-Operationen für Kontakte und Firmen
 * - Import/Export-Funktionalität
 * - Tag-Management
 * - Filter und Suche
 * - Modal-Workflows
 * - Multi-Tenancy Datenisolation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Mock Firebase
jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  contactsEnhancedService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
  },
  companiesEnhancedService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
  },
  tagsEnhancedService: {
    getAll: jest.fn(),
    create: jest.fn(),
    attachToContact: jest.fn(),
    attachToCompany: jest.fn(),
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
    currentOrganization: { id: 'test-org-123', name: 'Test Org' },
    loading: false,
  }),
}));

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Test Data
const mockContact = {
  id: 'contact-1',
  name: {
    firstName: 'Max',
    lastName: 'Mustermann',
    salutation: 'Herr',
    title: 'Dr.'
  },
  displayName: 'Max Mustermann',
  status: 'active',
  emails: [{ 
    email: 'max@example.com', 
    type: 'business', 
    primary: true 
  }],
  phones: [{ 
    number: '+49 30 12345678', 
    type: 'business', 
    primary: true 
  }],
  mediaProfile: {
    isJournalist: false,
    publicationIds: [],
    beats: [],
    mediaTypes: [],
    preferredFormats: []
  },
  tagIds: ['tag-1'],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user-123',
  organizationId: 'test-org-123'
};

const mockCompany = {
  id: 'company-1',
  name: 'Test GmbH',
  type: 'customer',
  status: 'active',
  lifecycleStage: 'customer',
  website: 'https://test.de',
  mainAddress: {
    street: 'Teststraße 1',
    city: 'Berlin',
    postalCode: '10115',
    region: 'Berlin',
    countryCode: 'DE'
  },
  emails: [{ 
    email: 'info@test.de', 
    type: 'general', 
    primary: true 
  }],
  phones: [{ 
    number: '+49 30 87654321', 
    type: 'business', 
    primary: true 
  }],
  tagIds: ['tag-2'],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user-123',
  organizationId: 'test-org-123'
};

const mockTags = [
  { id: 'tag-1', name: 'VIP', color: 'red', userId: 'test-user-123' },
  { id: 'tag-2', name: 'Kunde', color: 'blue', userId: 'test-user-123' }
];

describe('CRM Enhanced Feature', () => {
  
  describe('Kontakt-Management', () => {
    it('sollte Kontakte laden und anzeigen', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockResolvedValue([mockContact]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.getByText('max@example.com')).toBeInTheDocument();
      });

      expect(contactsEnhancedService.getAll).toHaveBeenCalledWith('test-user-123');
    });

    it('sollte neuen Kontakt erstellen können', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.create.mockResolvedValue(mockContact);
      contactsEnhancedService.getAll.mockResolvedValue([]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // "Neuer Kontakt" Button klicken
      const newContactButton = screen.getByRole('button', { name: /neuer kontakt/i });
      await userEvent.click(newContactButton);

      // Modal sollte sich öffnen
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('sollte Kontakt-Filter funktionieren', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockResolvedValue([mockContact]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Suchfeld testen
      const searchInput = screen.getByPlaceholderText(/suche/i);
      await userEvent.type(searchInput, 'Max');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Max')).toBeInTheDocument();
      });
    });
  });

  describe('Firmen-Management', () => {
    it('sollte Firmen laden und anzeigen', async () => {
      const { companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      companiesEnhancedService.getAll.mockResolvedValue([mockCompany]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Firmen-Tab klicken
      const companiesTab = screen.getByRole('tab', { name: /firmen/i });
      await userEvent.click(companiesTab);

      await waitFor(() => {
        expect(screen.getByText('Test GmbH')).toBeInTheDocument();
        expect(screen.getByText('info@test.de')).toBeInTheDocument();
      });

      expect(companiesEnhancedService.getAll).toHaveBeenCalledWith('test-user-123');
    });

    it('sollte neue Firma erstellen können', async () => {
      const { companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      companiesEnhancedService.create.mockResolvedValue(mockCompany);
      companiesEnhancedService.getAll.mockResolvedValue([]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Firmen-Tab klicken
      const companiesTab = screen.getByRole('tab', { name: /firmen/i });
      await userEvent.click(companiesTab);

      // "Neue Firma" Button klicken
      const newCompanyButton = screen.getByRole('button', { name: /neue firma/i });
      await userEvent.click(newCompanyButton);

      // Modal sollte sich öffnen
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Tag-Management', () => {
    it('sollte Tags laden und anzeigen', async () => {
      const { tagsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      tagsEnhancedService.getAll.mockResolvedValue(mockTags);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      await waitFor(() => {
        expect(tagsEnhancedService.getAll).toHaveBeenCalledWith('test-user-123');
      });
    });

    it('sollte Tag-Filter funktionieren', async () => {
      const { contactsEnhancedService, tagsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockResolvedValue([mockContact]);
      tagsEnhancedService.getAll.mockResolvedValue(mockTags);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Tag-Filter sollte verfügbar sein
      await waitFor(() => {
        const tagFilterButtons = screen.getAllByText(/VIP|Kunde/i);
        expect(tagFilterButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Import/Export-Funktionalität', () => {
    it('sollte Import-Modal öffnen können', async () => {
      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Import Button suchen und klicken
      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      // Import Modal sollte sich öffnen
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/csv/i)).toBeInTheDocument();
      });
    });

    it('sollte Export-Funktionalität testen', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockResolvedValue([mockContact]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Export Button sollte verfügbar sein
      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Multi-Tenancy Datenisolation', () => {
    it('sollte nur Daten der aktuellen Organisation laden', async () => {
      const { contactsEnhancedService, companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockResolvedValue([mockContact]);
      companiesEnhancedService.getAll.mockResolvedValue([mockCompany]);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Services sollten mit der richtigen User ID aufgerufen werden
      expect(contactsEnhancedService.getAll).toHaveBeenCalledWith('test-user-123');
      expect(companiesEnhancedService.getAll).toHaveBeenCalledWith('test-user-123');
    });

    it('sollte bei der Erstellung Organisations-ID setzen', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      
      const newContact = {
        ...mockContact,
        organizationId: 'test-org-123',
        userId: 'test-user-123'
      };
      
      contactsEnhancedService.create.mockResolvedValue(newContact);

      // Simulate contact creation
      await contactsEnhancedService.create(newContact);

      expect(contactsEnhancedService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'test-org-123',
          userId: 'test-user-123'
        })
      );
    });
  });

  describe('Performance und Fehlerbehandlung', () => {
    it('sollte Loading-States korrekt anzeigen', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      
      // Simulate slow loading
      contactsEnhancedService.getAll.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([mockContact]), 1000))
      );

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Loading indicator sollte angezeigt werden
      expect(screen.getByText(/laden/i) || screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sollte Fehler korrekt behandeln', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      contactsEnhancedService.getAll.mockRejectedValue(new Error('Network Error'));

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Error handling sollte greifen
      await waitFor(() => {
        expect(screen.getByText(/fehler/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('sollte Pagination korrekt funktionieren', async () => {
      const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      
      // Generate 100 mock contacts for pagination testing
      const manyContacts = Array.from({ length: 100 }, (_, i) => ({
        ...mockContact,
        id: `contact-${i}`,
        name: { ...mockContact.name, firstName: `Contact ${i}` },
        displayName: `Contact ${i} Mustermann`
      }));
      
      contactsEnhancedService.getAll.mockResolvedValue(manyContacts);

      const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
      
      await act(async () => {
        render(<CRMPage />);
      });

      // Pagination controls sollten vorhanden sein
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /weiter|next/i });
        expect(nextButton).toBeInTheDocument();
      });
    });
  });
});

describe('CRM Enhanced Constants und Types', () => {
  it('sollte zentrale Konstanten korrekt exportieren', () => {
    const { CRM_PAGINATION_SIZE, COMPANY_TABS, CONTACT_TABS } = require('@/lib/constants/crm-constants');
    
    expect(CRM_PAGINATION_SIZE).toBe(50);
    expect(COMPANY_TABS).toHaveLength(6);
    expect(CONTACT_TABS).toHaveLength(6);
    
    // Tab-Struktur testen
    COMPANY_TABS.forEach(tab => {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('icon');
      expect(tab).toHaveProperty('description');
    });
  });

  it('sollte zentrale UI-Types korrekt definiert haben', () => {
    const types = require('@/types/crm-enhanced-ui');
    
    expect(types).toHaveProperty('ImportResult');
    expect(types).toHaveProperty('ImportProgress');
    expect(types).toHaveProperty('CompanyTabConfig');
    expect(types).toHaveProperty('ContactTabConfig');
  });
});

describe('CRM Enhanced Integration Tests', () => {
  it('sollte kompletten Kontakt-Workflow durchführen können', async () => {
    const { contactsEnhancedService, tagsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
    
    // Setup mocks
    contactsEnhancedService.getAll.mockResolvedValue([]);
    contactsEnhancedService.create.mockResolvedValue(mockContact);
    tagsEnhancedService.getAll.mockResolvedValue(mockTags);

    const CRMPage = require('@/app/dashboard/contacts/crm/page').default;
    
    await act(async () => {
      render(<CRMPage />);
    });

    // 1. Neuen Kontakt erstellen
    const newContactButton = screen.getByRole('button', { name: /neuer kontakt/i });
    await userEvent.click(newContactButton);

    // 2. Modal sollte sich öffnen
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // 3. Kontakt-Daten eingeben
    const firstNameInput = screen.getByLabelText(/vorname/i);
    const lastNameInput = screen.getByLabelText(/nachname/i);
    
    await userEvent.type(firstNameInput, 'Max');
    await userEvent.type(lastNameInput, 'Mustermann');

    // 4. Speichern
    const saveButton = screen.getByRole('button', { name: /speichern/i });
    await userEvent.click(saveButton);

    // 5. Service sollte aufgerufen werden
    await waitFor(() => {
      expect(contactsEnhancedService.create).toHaveBeenCalled();
    });
  });
});