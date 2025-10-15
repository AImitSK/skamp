// src/app/dashboard/library/publications/PublicationModal/__tests__/BasicInfoSection.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BasicInfoSection } from '../BasicInfoSection';
import type { PublicationFormData } from '../types';
import type { CompanyEnhanced } from '@/types/crm-enhanced';

// Mock UI components
jest.mock('@/components/ui/language-selector', () => ({
  LanguageSelectorMulti: ({ value, onChange, placeholder }: any) => (
    <div data-testid="language-selector">
      <button onClick={() => onChange(['de', 'en'])}>{placeholder}</button>
    </div>
  ),
}));

jest.mock('@/components/ui/country-selector', () => ({
  CountrySelectorMulti: ({ value, onChange, placeholder }: any) => (
    <div data-testid="country-selector">
      <button onClick={() => onChange(['DE', 'AT'])}>{placeholder}</button>
    </div>
  ),
}));

const mockFormData: PublicationFormData = {
  title: 'Test Publication',
  subtitle: 'Test Subtitle',
  publisherId: 'pub-1',
  publisherName: 'Test Publisher',
  type: 'magazine',
  format: 'print',
  languages: ['de'],
  geographicTargets: ['DE'],
  focusAreas: ['politics', 'economy'],
  verified: false,
  status: 'active',
  metrics: {
    frequency: 'daily',
  },
  geographicScope: 'national',
  websiteUrl: 'https://example.com',
  internalNotes: 'Test notes',
};

const mockPublishers: CompanyEnhanced[] = [
  {
    id: 'pub-1',
    name: 'Test Publisher',
    officialName: 'Test Publisher GmbH',
    type: 'publisher',
    organizationId: 'org-1',
    createdBy: 'user-1',
  },
  {
    id: 'pub-2',
    name: 'Test Media House',
    officialName: 'Test Media House AG',
    type: 'media_house',
    organizationId: 'org-1',
    createdBy: 'user-1',
  },
];

describe('BasicInfoSection', () => {
  it('sollte rendern ohne Fehler', () => {
    const setFormData = jest.fn();
    const onPublisherChange = jest.fn();

    render(
      <BasicInfoSection
        formData={mockFormData}
        setFormData={setFormData}
        publishers={mockPublishers}
        loadingPublishers={false}
        onPublisherChange={onPublisherChange}
      />
    );

    expect(screen.getByText('Titel der Publikation *')).toBeInTheDocument();
    expect(screen.getByText('Untertitel / Claim')).toBeInTheDocument();
  });

  it('sollte Felder korrekt anzeigen', () => {
    const setFormData = jest.fn();
    const onPublisherChange = jest.fn();

    render(
      <BasicInfoSection
        formData={mockFormData}
        setFormData={setFormData}
        publishers={mockPublishers}
        loadingPublishers={false}
        onPublisherChange={onPublisherChange}
      />
    );

    // Check title input value
    const titleInput = screen.getByDisplayValue('Test Publication');
    expect(titleInput).toBeInTheDocument();

    // Check subtitle input value
    const subtitleInput = screen.getByDisplayValue('Test Subtitle');
    expect(subtitleInput).toBeInTheDocument();

    // Check verified checkbox (find by type since no accessible name)
    const verifiedCheckbox = screen.getByRole('checkbox');
    expect(verifiedCheckbox).not.toBeChecked();
  });

  it('sollte setFormData bei Input-Änderung aufrufen', () => {
    const setFormData = jest.fn();
    const onPublisherChange = jest.fn();

    render(
      <BasicInfoSection
        formData={mockFormData}
        setFormData={setFormData}
        publishers={mockPublishers}
        loadingPublishers={false}
        onPublisherChange={onPublisherChange}
      />
    );

    // Change title
    const titleInput = screen.getByDisplayValue('Test Publication');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    expect(setFormData).toHaveBeenCalledWith({
      ...mockFormData,
      title: 'Updated Title',
    });

    // Change verified checkbox
    const verifiedCheckbox = screen.getByRole('checkbox');
    fireEvent.click(verifiedCheckbox);

    expect(setFormData).toHaveBeenCalledWith({
      ...mockFormData,
      verified: true,
    });
  });

  it('sollte Loading-State anzeigen wenn Publishers laden', () => {
    const setFormData = jest.fn();
    const onPublisherChange = jest.fn();

    render(
      <BasicInfoSection
        formData={mockFormData}
        setFormData={setFormData}
        publishers={[]}
        loadingPublishers={true}
        onPublisherChange={onPublisherChange}
      />
    );

    // Check for loading skeleton
    const loadingDiv = screen.getByText('Verlag / Medienhaus *').parentElement;
    expect(loadingDiv?.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('sollte Warning anzeigen wenn keine Publishers vorhanden', () => {
    const setFormData = jest.fn();
    const onPublisherChange = jest.fn();

    render(
      <BasicInfoSection
        formData={mockFormData}
        setFormData={setFormData}
        publishers={[]}
        loadingPublishers={false}
        onPublisherChange={onPublisherChange}
      />
    );

    expect(
      screen.getByText(/Keine Verlage oder Medienhäuser gefunden/i)
    ).toBeInTheDocument();
  });
});
