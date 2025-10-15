// src/app/dashboard/library/publications/PublicationModal/index.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import type { CompanyEnhanced } from "@/types/crm-enhanced";
import type { Publication } from "@/types/library";
import type { LanguageCode, CountryCode } from "@/types/international";
import { publicationService } from "@/lib/firebase/library-service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { interceptSave } from '@/lib/utils/global-interceptor';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';

import { BasicInfoSection } from './BasicInfoSection';
import { MetricsSection } from './MetricsSection';
import { IdentifiersSection } from './IdentifiersSection';
import { MonitoringSection } from './MonitoringSection';

import type {
  PublicationFormData,
  MetricsState,
  IdentifierItem,
  SocialMediaItem,
  MonitoringConfigState,
  RssDetectionStatus,
  TabType
} from './types';

import {
  createDefaultFormData,
  createDefaultMetrics,
  createDefaultMonitoringConfig
} from './types';

import {
  removeUndefined,
  prepareMetrics,
  prepareIdentifiers,
  prepareSocialMediaUrls
} from './utils';

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication?: Publication;
  onSuccess: () => void;
  preselectedPublisherId?: string;
}

export function PublicationModal({
  isOpen,
  onClose,
  publication,
  onSuccess,
  preselectedPublisherId
}: PublicationModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();

  // State
  const [loading, setLoading] = useState(false);
  const [publishers, setPublishers] = useState<CompanyEnhanced[]>([]);
  const [loadingPublishers, setLoadingPublishers] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  // Form State
  const [formData, setFormData] = useState<PublicationFormData>(createDefaultFormData());
  const [metrics, setMetrics] = useState<MetricsState>(createDefaultMetrics());
  const [identifiers, setIdentifiers] = useState<IdentifierItem[]>([{ type: 'ISSN', value: '' }]);
  const [socialMediaUrls, setSocialMediaUrls] = useState<SocialMediaItem[]>([]);
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfigState>(createDefaultMonitoringConfig());

  // RSS Detection State
  const [rssDetectionStatus, setRssDetectionStatus] = useState<RssDetectionStatus>('idle');
  const [detectedFeeds, setDetectedFeeds] = useState<string[]>([]);
  const [showManualRssInput, setShowManualRssInput] = useState(false);

  // Load publishers function with useCallback
  const loadPublishers = useCallback(async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      setLoadingPublishers(true);

      const allCompanies = await companiesEnhancedService.getAll(currentOrganization.id);

      const publisherCompanies = allCompanies.filter(company =>
        ['publisher', 'media_house', 'partner'].includes(company.type)
      );

      // Temporär: Falls keine Publisher gefunden, zeige alle Firmen
      if (publisherCompanies.length === 0 && allCompanies.length > 0) {
        setPublishers(allCompanies);
      } else {
        setPublishers(publisherCompanies);
      }
    } catch (error) {
      // Silent error
    } finally {
      setLoadingPublishers(false);
    }
  }, [user, currentOrganization?.id]);

  // Load publishers on mount
  useEffect(() => {
    loadPublishers();
  }, [loadPublishers]);

  // Set preselected publisher if provided
  useEffect(() => {
    if (preselectedPublisherId && publishers.length > 0) {
      const publisher = publishers.find(p => p.id === preselectedPublisherId);
      if (publisher) {
        setFormData(prev => ({
          ...prev,
          publisherId: preselectedPublisherId,
          publisherName: publisher.name
        }));
      }
    }
  }, [preselectedPublisherId, publishers]);

  // Load existing publication
  useEffect(() => {
    if (publication) {
      // Lade bestehende Publikation
      setFormData({
        title: publication.title,
        subtitle: publication.subtitle || '',
        publisherId: publication.publisherId || '',
        publisherName: publication.publisherName || '',
        type: publication.type,
        format: publication.format || 'online',
        languages: publication.languages as LanguageCode[] || [],
        geographicTargets: publication.geographicTargets as CountryCode[] || [],
        focusAreas: publication.focusAreas || [],
        verified: publication.verified || false,
        status: publication.status,
        metrics: {
          frequency: publication.metrics?.frequency || 'monthly',
          targetAudience: publication.metrics?.targetAudience,
          targetAgeGroup: publication.metrics?.targetAgeGroup,
          targetGender: publication.metrics?.targetGender
        },
        geographicScope: publication.geographicScope,
        websiteUrl: publication.websiteUrl,
        internalNotes: publication.internalNotes
      });

      // Metriken
      if (publication.metrics) {
        setMetrics({
          frequency: publication.metrics?.frequency || 'daily',
          targetAudience: publication.metrics.targetAudience || '',
          targetAgeGroup: publication.metrics.targetAgeGroup || '',
          targetGender: publication.metrics.targetGender || 'all',
          print: {
            circulation: publication.metrics.print?.circulation?.toString() || '',
            circulationType: publication.metrics.print?.circulationType || 'distributed',
            pricePerIssue: publication.metrics.print?.pricePerIssue?.amount.toString() || '',
            subscriptionPriceMonthly: publication.metrics.print?.subscriptionPrice?.monthly?.amount.toString() || '',
            subscriptionPriceAnnual: publication.metrics.print?.subscriptionPrice?.annual?.amount.toString() || '',
            pageCount: publication.metrics.print?.pageCount?.toString() || '',
            paperFormat: publication.metrics.print?.paperFormat || ''
          },
          online: {
            monthlyUniqueVisitors: publication.metrics.online?.monthlyUniqueVisitors?.toString() || '',
            monthlyPageViews: publication.metrics.online?.monthlyPageViews?.toString() || '',
            avgSessionDuration: publication.metrics.online?.avgSessionDuration?.toString() || '',
            bounceRate: publication.metrics.online?.bounceRate?.toString() || '',
            registeredUsers: publication.metrics.online?.registeredUsers?.toString() || '',
            paidSubscribers: publication.metrics.online?.paidSubscribers?.toString() || '',
            newsletterSubscribers: publication.metrics.online?.newsletterSubscribers?.toString() || '',
            domainAuthority: publication.metrics.online?.domainAuthority?.toString() || '',
            hasPaywall: publication.metrics.online?.hasPaywall || false,
            hasMobileApp: publication.metrics.online?.hasMobileApp || false
          }
        });
      }

      // Identifikatoren (SICHER als Array behandeln)
      if (publication.identifiers && Array.isArray(publication.identifiers)) {
        setIdentifiers(publication.identifiers.map(id => ({
          type: id.type,
          value: id.value,
          description: id.description
        })));
      }

      // Social Media URLs
      if (publication.socialMediaUrls) {
        setSocialMediaUrls(publication.socialMediaUrls);
      }

      // Monitoring Config
      if (publication.monitoringConfig) {
        const savedRssFeeds = publication.monitoringConfig.rssFeedUrls || [];

        setMonitoringConfig({
          isEnabled: publication.monitoringConfig.isEnabled ?? true,
          websiteUrl: publication.monitoringConfig.websiteUrl || '',
          rssFeedUrls: savedRssFeeds,
          autoDetectRss: publication.monitoringConfig.autoDetectRss ?? true,
          checkFrequency: publication.monitoringConfig.checkFrequency || 'daily',
          keywords: publication.monitoringConfig.keywords || [],
          totalArticlesFound: publication.monitoringConfig.totalArticlesFound || 0
        });

        // Wenn RSS Feeds gespeichert sind, setze Detection Status auf "found"
        if (savedRssFeeds.length > 0) {
          setDetectedFeeds(savedRssFeeds);
          setRssDetectionStatus('found');
          setShowManualRssInput(false);
        } else {
          setDetectedFeeds([]);
          setRssDetectionStatus('idle');
          setShowManualRssInput(false);
        }
      }
    }
  }, [publication]);

  // Fix Publisher-ID Inkonsistenz: Suche Publisher nach Name wenn ID nicht gefunden
  useEffect(() => {
    if (publication && publishers.length > 0) {
      const currentPublisherId = formData.publisherId;
      const currentPublisherName = formData.publisherName;

      // Prüfe ob Publisher-ID in der Liste existiert
      const publisherById = publishers.find(p => p.id === currentPublisherId);

      if (!publisherById && currentPublisherName) {
        // Suche Publisher nach Name
        const publisherByName = publishers.find(p =>
          p.name === currentPublisherName
        );

        if (publisherByName) {
          setFormData(prev => ({
            ...prev,
            publisherId: publisherByName.id!,
            publisherName: publisherByName.name || ''
          }));
        }
      }
    }
  }, [publication, publishers, formData.publisherId, formData.publisherName]);

  // Handler functions with useCallback for performance
  const handlePublisherChange = useCallback((publisherId: string) => {
    const selectedPublisher = publishers.find(p => p.id === publisherId);
    setFormData(prev => ({
      ...prev,
      publisherId,
      publisherName: selectedPublisher?.name || ''
    }));
  }, [publishers]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validierung
    if (!formData.publisherId) {
      alert("Bitte wählen Sie einen Verlag aus.");
      return;
    }

    setLoading(true);
    try {
      // Bereite Metriken vor
      const preparedMetrics = prepareMetrics(metrics, formData.format);

      // Bereite Daten vor
      const publicationData: any = {
        title: formData.title,
        publisherId: formData.publisherId,
        publisherName: formData.publisherName,
        type: formData.type,
        format: formData.format,
        languages: formData.languages,
        geographicTargets: formData.geographicTargets,
        geographicScope: formData.geographicScope,
        focusAreas: formData.focusAreas,
        metrics: preparedMetrics,
        identifiers: prepareIdentifiers(identifiers),
        socialMediaUrls: prepareSocialMediaUrls(socialMediaUrls),
        verified: formData.verified,
        status: formData.status,
        monitoringConfig: {
          isEnabled: monitoringConfig.isEnabled,
          websiteUrl: monitoringConfig.websiteUrl || '',
          rssFeedUrls: monitoringConfig.rssFeedUrls.filter(url => url.trim() !== ''),
          autoDetectRss: monitoringConfig.autoDetectRss,
          checkFrequency: monitoringConfig.checkFrequency,
          keywords: monitoringConfig.keywords.filter(k => k.trim() !== ''),
          totalArticlesFound: monitoringConfig.totalArticlesFound || 0
        }
      };

      // Optionale Felder nur hinzufügen wenn vorhanden
      if (formData.subtitle) {
        publicationData.subtitle = formData.subtitle;
      }
      if (formData.websiteUrl) {
        publicationData.websiteUrl = formData.websiteUrl;
      }
      if (formData.internalNotes) {
        publicationData.internalNotes = formData.internalNotes;
      }

      // Clean the object to remove any remaining undefined values
      const cleanedData = removeUndefined(publicationData);

      // Apply global interceptor if in autoGlobalMode
      const dataToSave = interceptSave(cleanedData, 'publication', user, {
        autoGlobalMode,
        liveMode: true
      });

      if (publication?.id) {
        await publicationService.update(publication.id, dataToSave, {
          organizationId: currentOrganization?.id || '',
          userId: user?.uid || ''
        });
      } else {
        await publicationService.create(dataToSave, {
          organizationId: currentOrganization?.id || '',
          userId: user?.uid || ''
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert("Fehler beim Speichern der Publikation");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    formData,
    metrics,
    identifiers,
    socialMediaUrls,
    monitoringConfig,
    publication,
    currentOrganization,
    autoGlobalMode,
    onSuccess,
    onClose
  ]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {publication ? 'Publikation bearbeiten' : 'Neue Publikation'}
          </h3>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`${
                activeTab === 'basic'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Grunddaten
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`${
                activeTab === 'metrics'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Metriken
            </button>
            <button
              onClick={() => setActiveTab('identifiers')}
              className={`${
                activeTab === 'identifiers'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Identifikatoren & Links
            </button>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`${
                activeTab === 'monitoring'
                  ? 'border-[#005fab] text-[#005fab]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Monitoring
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          {/* Grunddaten Tab */}
          {activeTab === 'basic' && (
            <BasicInfoSection
              formData={formData}
              setFormData={setFormData}
              publishers={publishers}
              loadingPublishers={loadingPublishers}
              onPublisherChange={handlePublisherChange}
            />
          )}

          {/* Metriken Tab */}
          {activeTab === 'metrics' && (
            <MetricsSection
              formData={formData}
              metrics={metrics}
              setMetrics={setMetrics}
            />
          )}

          {/* Identifikatoren Tab */}
          {activeTab === 'identifiers' && (
            <IdentifiersSection
              identifiers={identifiers}
              setIdentifiers={setIdentifiers}
              socialMediaUrls={socialMediaUrls}
              setSocialMediaUrls={setSocialMediaUrls}
            />
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <MonitoringSection
              monitoringConfig={monitoringConfig}
              setMonitoringConfig={setMonitoringConfig}
              rssDetectionStatus={rssDetectionStatus}
              setRssDetectionStatus={setRssDetectionStatus}
              detectedFeeds={detectedFeeds}
              setDetectedFeeds={setDetectedFeeds}
              showManualRssInput={showManualRssInput}
              setShowManualRssInput={setShowManualRssInput}
              publication={publication}
            />
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !formData.publisherId} className="px-6 py-2">
              {loading ? 'Speichern...' : publication ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
