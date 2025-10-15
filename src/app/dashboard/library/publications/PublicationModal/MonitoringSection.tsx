// src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx
"use client";

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { MonitoringConfigState, RssDetectionStatus } from './types';
import type { Publication } from '@/types/library';

interface MonitoringSectionProps {
  monitoringConfig: MonitoringConfigState;
  setMonitoringConfig: (config: MonitoringConfigState) => void;
  rssDetectionStatus: RssDetectionStatus;
  setRssDetectionStatus: (status: RssDetectionStatus) => void;
  detectedFeeds: string[];
  setDetectedFeeds: (feeds: string[]) => void;
  showManualRssInput: boolean;
  setShowManualRssInput: (show: boolean) => void;
  publication?: Publication;
}

export function MonitoringSection({
  monitoringConfig,
  setMonitoringConfig,
  rssDetectionStatus,
  setRssDetectionStatus,
  detectedFeeds,
  setDetectedFeeds,
  showManualRssInput,
  setShowManualRssInput,
  publication
}: MonitoringSectionProps) {
  // RSS Auto-Detection Function
  const handleRssAutoDetect = async () => {
    if (!monitoringConfig.websiteUrl) {
      alert('Bitte geben Sie zuerst eine Website URL ein.');
      return;
    }

    setRssDetectionStatus('checking');
    setDetectedFeeds([]);

    try {
      // Rufe Server-Side API für RSS Detection auf
      const response = await fetch('/api/rss-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: monitoringConfig.websiteUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der RSS Feed Erkennung');
      }

      if (data.foundFeeds && data.foundFeeds.length > 0) {
        setDetectedFeeds(data.foundFeeds);
        setMonitoringConfig({
          ...monitoringConfig,
          rssFeedUrls: data.foundFeeds
        });
        setRssDetectionStatus('found');
        setShowManualRssInput(false);
      } else {
        setRssDetectionStatus('not_found');
        setShowManualRssInput(true);
      }
    } catch (error) {
      console.error('RSS Auto-Detection Error:', error);
      alert('Fehler bei der RSS Feed Erkennung. Bitte versuchen Sie es erneut.');
      setRssDetectionStatus('not_found');
      setShowManualRssInput(true);
    }
  };

  // Trennen-Funktion (Auto-Detected Feeds entfernen)
  const handleDisconnectAutoFeeds = () => {
    setDetectedFeeds([]);
    setRssDetectionStatus('idle');
    setShowManualRssInput(true);
    setMonitoringConfig({
      ...monitoringConfig,
      rssFeedUrls: []
    });
  };

  return (
    <div className="space-y-6">
      {/* Enable Monitoring */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Monitoring aktivieren</h4>
          <p className="text-sm text-gray-500 mt-1">
            Überwache automatisch neue Veröffentlichungen dieser Publikation
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={monitoringConfig.isEnabled}
            onChange={(e) => setMonitoringConfig({
              ...monitoringConfig,
              isEnabled: e.target.checked
            })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005fab]"></div>
        </label>
      </div>

      {monitoringConfig.isEnabled && (
        <>
          {/* Website URL mit Check Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={monitoringConfig.websiteUrl}
                onChange={(e) => {
                  setMonitoringConfig({
                    ...monitoringConfig,
                    websiteUrl: e.target.value
                  });
                  // Reset detection status when URL changes
                  if (rssDetectionStatus !== 'idle') {
                    setRssDetectionStatus('idle');
                    setDetectedFeeds([]);
                  }
                }}
                placeholder="https://www.example.com"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleRssAutoDetect}
                disabled={!monitoringConfig.websiteUrl || rssDetectionStatus === 'checking'}
              >
                {rssDetectionStatus === 'checking' ? 'Suche...' : 'RSS-Feed suchen'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Klicken Sie "RSS-Feed suchen" um automatisch Feeds zu erkennen
            </p>
          </div>

          {/* Erfolgsmeldung */}
          {rssDetectionStatus === 'found' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-green-900">
                      RSS Feeds gefunden!
                    </h4>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <p className="font-medium mb-1">Gefundene Feeds:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {detectedFeeds.map((feed, index) => (
                        <li key={index} className="text-xs">{feed}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  type="button"
                  plain
                  onClick={handleDisconnectAutoFeeds}
                  className="ml-4"
                >
                  Zurücksetzen
                </Button>
              </div>
            </div>
          )}

          {/* Keine Feeds gefunden */}
          {rssDetectionStatus === 'not_found' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <XMarkIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">
                    Keine RSS Feeds gefunden
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Sie können die Feed URLs unten manuell eintragen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manuelle RSS Feed URLs (nur sichtbar wenn nicht auto-detected oder getrennt) */}
          {(showManualRssInput || rssDetectionStatus === 'not_found') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RSS Feed URLs (manuell)
              </label>
              <div className="space-y-2">
                {monitoringConfig.rssFeedUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const updated = [...monitoringConfig.rssFeedUrls];
                        updated[index] = e.target.value;
                        setMonitoringConfig({
                          ...monitoringConfig,
                          rssFeedUrls: updated
                        });
                      }}
                      placeholder="https://www.example.com/feed"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      plain
                      onClick={() => {
                        const updated = monitoringConfig.rssFeedUrls.filter((_, i) => i !== index);
                        setMonitoringConfig({
                          ...monitoringConfig,
                          rssFeedUrls: updated
                        });
                      }}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  plain
                  onClick={() => {
                    setMonitoringConfig({
                      ...monitoringConfig,
                      rssFeedUrls: [...monitoringConfig.rssFeedUrls, '']
                    });
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  RSS Feed hinzufügen
                </Button>
              </div>
            </div>
          )}

          {/* Check Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prüf-Frequenz
            </label>
            <Select
              value={monitoringConfig.checkFrequency}
              onChange={(e) => setMonitoringConfig({
                ...monitoringConfig,
                checkFrequency: e.target.value as 'daily' | 'twice_daily'
              })}
            >
              <option value="daily">Täglich</option>
              <option value="twice_daily">Zweimal täglich</option>
            </Select>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords (optional)
            </label>
            <div className="space-y-2">
              {monitoringConfig.keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      const updated = [...monitoringConfig.keywords];
                      updated[index] = e.target.value;
                      setMonitoringConfig({
                        ...monitoringConfig,
                        keywords: updated
                      });
                    }}
                    placeholder="z.B. Technologie, Politik"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    plain
                    onClick={() => {
                      const updated = monitoringConfig.keywords.filter((_, i) => i !== index);
                      setMonitoringConfig({
                        ...monitoringConfig,
                        keywords: updated
                      });
                    }}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                plain
                onClick={() => {
                  setMonitoringConfig({
                    ...monitoringConfig,
                    keywords: [...monitoringConfig.keywords, '']
                  });
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Keyword hinzufügen
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Optionale Filter für relevante Artikel (zusätzlich zur Kampagnen-basierten Suche)
            </p>
          </div>

          {/* Statistics (read-only) */}
          {publication && monitoringConfig.totalArticlesFound > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Statistiken</h4>
              <p className="text-sm text-blue-700">
                {monitoringConfig.totalArticlesFound} Artikel gefunden
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
