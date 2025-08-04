// src/__tests__/features/library-advertisements-ui.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { AdvertisementModal } from '@/app/dashboard/library/advertisements/AdvertisementModal';
import { advertisementService } from '@/lib/firebase/library-service';
import type { Advertisement, Publication } from '@/types/library';

// Mock Firebase Service
jest.mock('@/lib/firebase/library-service', () => ({
  advertisementService: {
    create: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn(),
  },
}));

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
    isAuthenticated: true,
  }),
}));

// Mock Organization Context
jest.mock('@/context/OrganizationContext', () => ({
  useOrganization: () => ({
    organization: { id: 'test-org', name: 'Test Organization' },
  }),
}));

// Mock Data
const mockPublications: Publication[] = [
  {
    id: 'pub-1',
    organizationId: 'test-org',
    title: 'Test Magazine',
    subtitle: 'Premium Lifestyle',
    publisherId: 'publisher-1',
    publisherName: 'Test Publisher',
    type: 'magazine',
    format: 'print',
    languages: ['de'],
    geographicTargets: ['DE'],
    focusAreas: ['lifestyle', 'fashion'],
    status: 'active',
    verified: true,
    metrics: {
      print: { circulation: 50000, readership: 150000 },
      online: { monthlyUniqueVisitors: 100000, monthlyPageViews: 500000 }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'pub-2',
    organizationId: 'test-org',
    title: 'Online News Portal',
    publisherId: 'publisher-2',
    publisherName: 'Digital Media Group',
    type: 'online_portal',
    format: 'digital',
    languages: ['de'],
    geographicTargets: ['DE', 'AT'],
    focusAreas: ['business', 'technology'],
    status: 'active',
    verified: false,
    metrics: {
      online: { monthlyUniqueVisitors: 250000, monthlyPageViews: 1200000 }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  }
];

const mockAdvertisement: Advertisement = {
  id: 'test-ad-1',
  organizationId: 'test-org',
  name: 'Premium Banner',
  displayName: 'Premium Display Banner',
  type: 'display_banner',
  status: 'active',
  publicationIds: ['pub-1'],
  description: 'Ein hochwertiger Display-Banner',
  specifications: {
    format: 'digital',
    digitalSpecs: {
      dimensions: { width: 728, height: 90 },
      fileFormats: ['jpg', 'png'],
      maxFileSize: 150
    }
  },
  pricing: {
    priceModel: 'cpm',
    listPrice: { amount: 12.50, currency: 'EUR' }
  },
  availability: {},
  materials: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1'
};

describe('AdvertisementModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Modal für neues Werbemittel rendern', () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Neues Werbemittel erstellen')).toBeInTheDocument();
    expect(screen.getByText('Grunddaten')).toBeInTheDocument();
    expect(screen.getByText('Spezifikationen')).toBeInTheDocument();
    expect(screen.getByText('Preisgestaltung')).toBeInTheDocument();
    expect(screen.getByText('Verfügbarkeit')).toBeInTheDocument();
  });

  it('sollte Modal für Bearbeitung mit vorausgefüllten Daten rendern', () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        advertisement={mockAdvertisement}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Werbemittel bearbeiten')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Premium Banner')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Premium Display Banner')).toBeInTheDocument();
  });

  it('sollte Pflichtfelder validieren', async () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Versuche zu speichern ohne Pflichtfelder
    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);

    // Sollte Validierungsfehlermeldungen anzeigen
    await waitFor(() => {
      expect(screen.getByText(/Name ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('sollte neues Werbemittel erstellen', async () => {
    const createSpy = jest.mocked(advertisementService.create).mockResolvedValue('new-ad-id');

    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Fülle Grunddaten aus
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Test Banner' }
    });

    fireEvent.change(screen.getByLabelText(/Anzeigename/i), {
      target: { value: 'Test Display Banner' }
    });

    // Wähle Typ
    const typeSelect = screen.getByLabelText(/Typ/i);
    fireEvent.change(typeSelect, { target: { value: 'display_banner' } });

    // Wähle Publikation
    const publicationCheckbox = screen.getByLabelText(/Test Magazine/i);
    fireEvent.click(publicationCheckbox);

    // Gehe zu Preisgestaltung Tab
    fireEvent.click(screen.getByText('Preisgestaltung'));

    // Setze Preis
    fireEvent.change(screen.getByLabelText(/Listenpreis/i), {
      target: { value: '15.00' }
    });

    // Speichre
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Banner',
          displayName: 'Test Display Banner',
          type: 'display_banner',
          publicationIds: ['pub-1']
        }),
        expect.any(Object)
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('sollte Werbemittel aktualisieren', async () => {
    const updateSpy = jest.mocked(advertisementService.update).mockResolvedValue();

    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        advertisement={mockAdvertisement}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Ändere Name
    const nameInput = screen.getByDisplayValue('Premium Banner');
    fireEvent.change(nameInput, {
      target: { value: 'Updated Premium Banner' }
    });

    // Speichre
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'test-ad-1',
        expect.objectContaining({
          name: 'Updated Premium Banner'
        }),
        expect.any(Object)
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('sollte Tab-Navigation korrekt funktionieren', () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Sollte auf Grunddaten Tab starten
    expect(screen.getByText('Name *')).toBeInTheDocument();

    // Wechsle zu Spezifikationen
    fireEvent.click(screen.getByText('Spezifikationen'));
    expect(screen.getByText('Format *')).toBeInTheDocument();

    // Wechsle zu Preisgestaltung
    fireEvent.click(screen.getByText('Preisgestaltung'));
    expect(screen.getByText('Preismodell *')).toBeInTheDocument();

    // Wechsle zu Verfügbarkeit
    fireEvent.click(screen.getByText('Verfügbarkeit'));
    expect(screen.getByText('Verfügbar von')).toBeInTheDocument();
  });

  it('sollte Publikationen korrekt anzeigen und auswählen lassen', () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Sollte beide Publikationen anzeigen
    expect(screen.getByText('Test Magazine')).toBeInTheDocument();
    expect(screen.getByText('Online News Portal')).toBeInTheDocument();

    // Sollte Verlag und Status anzeigen
    expect(screen.getByText('Test Publisher')).toBeInTheDocument();
    expect(screen.getByText('Digital Media Group')).toBeInTheDocument();
    expect(screen.getByText('Verifiziert')).toBeInTheDocument();
    expect(screen.getByText('Nicht verifiziert')).toBeInTheDocument();
  });

  it('sollte Modal schließen beim Klick auf Abbrechen', () => {
    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('sollte Loading-State während Speichern anzeigen', async () => {
    // Mock slow API call
    jest.mocked(advertisementService.create).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('new-id'), 1000))
    );

    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Fülle minimal erforderliche Felder aus
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Test Ad' }
    });

    const publicationCheckbox = screen.getByLabelText(/Test Magazine/i);
    fireEvent.click(publicationCheckbox);

    fireEvent.click(screen.getByText('Preisgestaltung'));
    fireEvent.change(screen.getByLabelText(/Listenpreis/i), {
      target: { value: '10.00' }
    });

    // Klick Speichern
    fireEvent.click(screen.getByText('Speichern'));

    // Sollte Loading-State anzeigen
    expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
  });

  it('sollte Fehler-State bei API-Fehlern anzeigen', async () => {
    const createSpy = jest.mocked(advertisementService.create).mockRejectedValue(
      new Error('API Error')
    );

    render(
      <AdvertisementModal
        isOpen={true}
        onClose={mockOnClose}
        publications={mockPublications}
        onSuccess={mockOnSuccess}
      />
    );

    // Fülle Felder aus und speichere
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Test Ad' }
    });

    const publicationCheckbox = screen.getByLabelText(/Test Magazine/i);
    fireEvent.click(publicationCheckbox);

    fireEvent.click(screen.getByText('Preisgestaltung'));
    fireEvent.change(screen.getByLabelText(/Listenpreis/i), {
      target: { value: '10.00' }
    });

    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Speichern/i)).toBeInTheDocument();
    });
  });
});