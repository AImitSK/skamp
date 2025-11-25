// src/app/dashboard/library/publications/PublicationModal/__tests__/MonitoringSection.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonitoringSection } from '../MonitoringSection';
import type { MonitoringConfigState } from '../types';

// Mock fetch
global.fetch = jest.fn();

const mockMonitoringConfig: MonitoringConfigState = {
  isEnabled: true,
  websiteUrl: 'https://example.com',
  rssFeedUrls: ['https://example.com/feed'],
  autoDetectRss: true,
  totalArticlesFound: 0,
};

describe('MonitoringSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte rendern ohne Fehler', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="idle"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={false}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    expect(screen.getByText('Monitoring aktivieren')).toBeInTheDocument();
  });

  it('sollte Felder korrekt anzeigen wenn Monitoring aktiviert', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="idle"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={true}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    expect(screen.getByText('Website URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('sollte setMonitoringConfig bei Toggle aufrufen', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={{ ...mockMonitoringConfig, isEnabled: false }}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="idle"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={false}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    // Toggle monitoring
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(setMonitoringConfig).toHaveBeenCalledWith({
      ...mockMonitoringConfig,
      isEnabled: true,
    });
  });

  it('sollte RSS Feed hinzufügen', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="idle"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={true}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    // Add RSS feed button
    const addButton = screen.getByText('RSS Feed hinzufügen');
    fireEvent.click(addButton);

    expect(setMonitoringConfig).toHaveBeenCalledWith({
      ...mockMonitoringConfig,
      rssFeedUrls: [...mockMonitoringConfig.rssFeedUrls, ''],
    });
  });

  it('sollte RSS Auto-Detection starten', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        foundFeeds: ['https://example.com/feed1', 'https://example.com/feed2'],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="idle"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={false}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    // Click auto-detect button
    const detectButton = screen.getByText('RSS-Feed suchen');
    fireEvent.click(detectButton);

    // Should set status to checking
    expect(setRssDetectionStatus).toHaveBeenCalledWith('checking');

    // Wait for fetch to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rss-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: 'https://example.com' }),
      });
    });
  });

  it('sollte Erfolgsmeldung anzeigen wenn Feeds gefunden', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="found"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={['https://example.com/feed1', 'https://example.com/feed2']}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={false}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    expect(screen.getByText('RSS Feeds gefunden!')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/feed1')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/feed2')).toBeInTheDocument();
  });

  it('sollte Warnung anzeigen wenn keine Feeds gefunden', () => {
    const setMonitoringConfig = jest.fn();
    const setRssDetectionStatus = jest.fn();
    const setDetectedFeeds = jest.fn();
    const setShowManualRssInput = jest.fn();

    render(
      <MonitoringSection
        monitoringConfig={mockMonitoringConfig}
        setMonitoringConfig={setMonitoringConfig}
        rssDetectionStatus="not_found"
        setRssDetectionStatus={setRssDetectionStatus}
        detectedFeeds={[]}
        setDetectedFeeds={setDetectedFeeds}
        showManualRssInput={true}
        setShowManualRssInput={setShowManualRssInput}
      />
    );

    expect(screen.getByText('Keine RSS Feeds gefunden')).toBeInTheDocument();
  });
});
