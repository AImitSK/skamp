// src/app/dashboard/library/publications/PublicationModal/MonitoringSection.tsx
"use client";

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { MonitoringConfigState, RssDetectionStatus } from './types';
import type { Publication } from '@/types/library';
import { toastService } from '@/lib/utils/toast';

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

export const MonitoringSection = memo(function MonitoringSection({
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
  const t = useTranslations('publications.modal.monitoring');
  const tToast = useTranslations('toasts');

  // RSS Auto-Detection Function
  const handleRssAutoDetect = async () => {
    if (!monitoringConfig.websiteUrl) {
      toastService.warning(tToast('rss.urlRequired'));
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
        throw new Error(data.error || tToast('rss.detectionError'));
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
      toastService.error(tToast('rss.detectionErrorRetry'));
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
      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
        <div>
          <h4 className="font-medium text-zinc-900">{t('enableTitle')}</h4>
          <p className="text-sm text-zinc-500 mt-1">
            {t('enableDescription')}
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
          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {monitoringConfig.isEnabled && (
        <>
          {/* Website URL mit Check Button */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              {t('websiteLabel')}
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
                placeholder={t('websitePlaceholder')}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleRssAutoDetect}
                disabled={!monitoringConfig.websiteUrl || rssDetectionStatus === 'checking'}
              >
                {rssDetectionStatus === 'checking' ? t('searching') : t('searchButton')}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {t('searchHint')}
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
                      {t('rssFound.title')}
                    </h4>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <p className="font-medium mb-1">{t('rssFound.feedsLabel')}</p>
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
                  {t('rssFound.reset')}
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
                    {t('rssNotFound.title')}
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {t('rssNotFound.hint')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manuelle RSS Feed URLs (nur sichtbar wenn nicht auto-detected oder getrennt) */}
          {(showManualRssInput || rssDetectionStatus === 'not_found') && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                {t('manualRss.label')}
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
                      placeholder={t('manualRss.feedPlaceholder')}
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
                  {t('manualRss.addButton')}
                </Button>
              </div>
            </div>
          )}

          {/* Statistics (read-only) */}
          {publication && monitoringConfig.totalArticlesFound > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">{t('stats.title')}</h4>
              <p className="text-sm text-blue-700">
                {t('stats.articlesFound', { count: monitoringConfig.totalArticlesFound })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});
