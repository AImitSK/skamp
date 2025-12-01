// src/app/dashboard/library/publications/PublicationModal/__tests__/MetricsSection.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricsSection } from '../MetricsSection';
import type { PublicationFormData, MetricsState } from '../types';

const mockFormDataPrint: PublicationFormData = {
  title: 'Test Publication',
  subtitle: '',
  publisherId: 'pub-1',
  publisherName: 'Test Publisher',
  type: 'magazine',
  format: 'print',
  languages: ['de'],
  geographicTargets: ['DE'],
  focusAreas: [],
  verified: false,
  status: 'active',
  metrics: { frequency: 'daily' },
  geographicScope: 'national',
  websiteUrl: '',
  internalNotes: '',
};

const mockFormDataOnline: PublicationFormData = {
  ...mockFormDataPrint,
  format: 'online',
};

const mockMetrics: MetricsState = {
  frequency: 'daily',
  targetAudience: 'Business professionals',
  targetAgeGroup: '25-49',
  targetGender: 'all',
  print: {
    circulation: '50000',
    circulationType: 'distributed',
    pricePerIssue: '3.50',
    subscriptionPriceMonthly: '29.90',
    subscriptionPriceAnnual: '299.00',
    pageCount: '64',
    paperFormat: 'A4',
  },
  online: {
    monthlyUniqueVisitors: '100000',
    monthlyPageViews: '500000',
    avgSessionDuration: '3.5',
    bounceRate: '45.5',
    registeredUsers: '50000',
    paidSubscribers: '5000',
    newsletterSubscribers: '25000',
    domainAuthority: '70',
    hasPaywall: false,
    hasMobileApp: true,
  },
  broadcast: {
    viewership: '',
    marketShare: '',
    broadcastArea: '',
  },
  audio: {
    monthlyDownloads: '',
    monthlyListeners: '',
    episodeCount: '',
    avgEpisodeDuration: '',
  },
};

describe('MetricsSection', () => {
  it('sollte rendern ohne Fehler', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataPrint}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    expect(screen.getByText('Erscheinungsfrequenz')).toBeInTheDocument();
    expect(screen.getByText('Zielgruppe')).toBeInTheDocument();
  });

  it('sollte Felder korrekt anzeigen', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataPrint}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    // Check target audience input
    const audienceInput = screen.getByDisplayValue('Business professionals');
    expect(audienceInput).toBeInTheDocument();

    // Check target age group input
    const ageInput = screen.getByDisplayValue('25-49');
    expect(ageInput).toBeInTheDocument();
  });

  it('sollte setMetrics bei Input-Änderung aufrufen', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataPrint}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    // Change target audience
    const audienceInput = screen.getByDisplayValue('Business professionals');
    fireEvent.change(audienceInput, { target: { value: 'General public' } });

    expect(setMetrics).toHaveBeenCalledWith({
      ...mockMetrics,
      targetAudience: 'General public',
    });
  });

  it('sollte Print-Metriken anzeigen wenn Format print oder both', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataPrint}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    expect(screen.getByText('Print-Metriken')).toBeInTheDocument();
    expect(screen.getByText('Auflage')).toBeInTheDocument();
  });

  it('sollte Online-Metriken anzeigen wenn Format online oder both', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataOnline}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    expect(screen.getByText('Online-Metriken')).toBeInTheDocument();
    expect(screen.getByText('Monatliche Unique Visitors')).toBeInTheDocument();
    expect(screen.getByText('Hat Paywall')).toBeInTheDocument();
    expect(screen.getByText('Hat Mobile App')).toBeInTheDocument();
  });

  it('sollte Checkbox-Änderungen korrekt verarbeiten', () => {
    const setMetrics = jest.fn();

    render(
      <MetricsSection
        formData={mockFormDataOnline}
        metrics={mockMetrics}
        setMetrics={setMetrics}
      />
    );

    // Toggle paywall checkbox
    const paywallCheckbox = screen.getByRole('checkbox', { name: /Hat Paywall/i });
    fireEvent.click(paywallCheckbox);

    expect(setMetrics).toHaveBeenCalledWith({
      ...mockMetrics,
      online: {
        ...mockMetrics.online,
        hasPaywall: true,
      },
    });
  });
});
