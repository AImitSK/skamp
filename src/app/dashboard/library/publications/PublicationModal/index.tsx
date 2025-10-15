// src/app/dashboard/library/publications/PublicationModal/index.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import type { CompanyEnhanced } from "@/types/crm-enhanced";
import type { Publication } from "@/types/library";
import type { LanguageCode, CountryCode } from "@/types/international";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { interceptSave } from '@/lib/utils/global-interceptor';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { useCreatePublication, useUpdatePublication } from '@/lib/hooks/usePublicationsData';

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

  // React Query Mutations
  const createPublication = useCreatePublication();
  const updatePublication = useUpdatePublication();

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
        await updatePublication.mutateAsync({
          id: publication.id,
          organizationId: currentOrganization?.id || '',
          userId: user?.uid || '',
          publicationData: dataToSave
        });
      } else {
        await createPublication.mutateAsync({
          organizationId: currentOrganization?.id || '',
          userId: user?.uid || '',
          publicationData: dataToSave
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
    createPublication,
    updatePublication,
    onSuccess,
    onClose
  ]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-4xl">
      <DialogTitle>
        {publication ? 'Publikation bearbeiten' : 'Neue Publikation'}
      </DialogTitle>

      <DialogBody className="p-0">
        {/* Tab Navigation */}
        <div className="border-b border-zinc-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`${
                activeTab === 'basic'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              } group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap`}
            >
              Grunddaten
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`${
                activeTab === 'metrics'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              } group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap`}
            >
              Metriken
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('identifiers')}
              className={`${
                activeTab === 'identifiers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              } group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap`}
            >
              Identifikatoren & Links
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monitoring')}
              className={`${
                activeTab === 'monitoring'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              } group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap`}
            >
              Monitoring
            </button>
          </nav>
        </div>

        {/* Tab Content with fixed height */}
        <div className="px-6 py-6 h-[500px] overflow-y-auto">
          <div className="space-y-6">
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
          </div>
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !formData.publisherId}
        >
          {loading ? 'Speichern...' : publication ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
