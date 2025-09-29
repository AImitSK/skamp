// src/app/dashboard/library/publications/PublicationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import type { CompanyEnhanced } from "@/types/crm-enhanced";
import type { Publication, PublicationType, PublicationFormat, PublicationFrequency } from "@/types/library";
import { publicationService } from "@/lib/firebase/library-service";
import type { BaseEntity, CountryCode, LanguageCode } from "@/types/international";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LanguageSelectorMulti } from "@/components/ui/language-selector";
import { CountrySelectorMulti } from "@/components/ui/country-selector";
import { interceptSave } from '@/lib/utils/global-interceptor';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';

import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  GlobeAltIcon,
  LanguageIcon,
  BuildingOfficeIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication?: Publication;
  onSuccess: () => void;
  preselectedPublisherId?: string;
}

// Alert Component
function Alert({ 
  type = 'info', 
  message 
}: { 
  type?: 'info' | 'warning';
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-yellow-50 text-yellow-700'
  };

  const icons = {
    info: InformationCircleIcon,
    warning: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          <p className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

const publicationTypes = [
  { value: 'newspaper', label: 'Zeitung' },
  { value: 'magazine', label: 'Magazin' },
  { value: 'website', label: 'Website' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'trade_journal', label: 'Fachzeitschrift' },
  { value: 'press_agency', label: 'Nachrichtenagentur' },
  { value: 'social_media', label: 'Social Media' }
];

const frequencies = [
  { value: 'continuous', label: 'Durchgehend' },
  { value: 'multiple_daily', label: 'Mehrmals täglich' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'bimonthly', label: 'Zweimonatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'biannual', label: 'Halbjährlich' },
  { value: 'annual', label: 'Jährlich' },
  { value: 'irregular', label: 'Unregelmäßig' }
];

const circulationTypes = [
  { value: 'distributed', label: 'Verbreitete Auflage' },
  { value: 'sold', label: 'Verkaufte Auflage' },
  { value: 'printed', label: 'Gedruckte Auflage' },
  { value: 'subscribers', label: 'Abonnenten' },
  { value: 'audited_ivw', label: 'IVW geprüft' }
];

const geographicScopes = [
  { value: 'local', label: 'Lokal' },
  { value: 'regional', label: 'Regional' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global', label: 'Global' }
];

// Tag Input Component
function TagInput({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag
      onChange(value.slice(0, -1));
    }
  };

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="min-h-[42px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:border-[#005fab] focus-within:ring-1 focus-within:ring-[#005fab]">
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((tag, index) => (
          <Badge key={index} color="blue" className="inline-flex items-center gap-1 pl-2 pr-1 py-1">
            <span className="text-xs">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm"
        />
      </div>
    </div>
  );
}

export function PublicationModal({ isOpen, onClose, publication, onSuccess, preselectedPublisherId }: PublicationModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { autoGlobalMode } = useAutoGlobal();
  const [loading, setLoading] = useState(false);
const [publishers, setPublishers] = useState<CompanyEnhanced[]>([]);
const [loadingPublishers, setLoadingPublishers] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'metrics' | 'identifiers'>('basic');
  
  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    subtitle: string;
    publisherId: string;
    publisherName: string;
    type: PublicationType;
    format: PublicationFormat;
    languages: LanguageCode[];
    geographicTargets: CountryCode[];
    focusAreas: string[];
    verified: boolean;
    status: 'active' | 'inactive' | 'discontinued' | 'planned';
    metrics: {
      frequency: PublicationFrequency;
      targetAudience?: string;
      targetAgeGroup?: string;
      targetGender?: 'all' | 'predominantly_male' | 'predominantly_female';
    };
    geographicScope: 'local' | 'regional' | 'national' | 'international' | 'global';
    websiteUrl?: string;
    internalNotes?: string;
  }>({
    title: '',
    subtitle: '',
    publisherId: '',
    publisherName: '',
    type: 'website',
    format: 'online',
    languages: [],
    geographicTargets: [],
    focusAreas: [],
    verified: false,
    status: 'active',
    metrics: {
      frequency: 'daily'
    },
    geographicScope: 'national'
  });

  // Metriken State
  const [metrics, setMetrics] = useState({
    frequency: 'daily' as PublicationFrequency,
    targetAudience: '',
    targetAgeGroup: '',
    targetGender: 'all' as 'all' | 'predominantly_male' | 'predominantly_female',
    print: {
      circulation: '',
      circulationType: 'distributed' as 'distributed' | 'sold' | 'printed' | 'subscribers' | 'audited_ivw',
      pricePerIssue: '',
      subscriptionPriceMonthly: '',
      subscriptionPriceAnnual: '',
      pageCount: '',
      paperFormat: ''
    },
    online: {
      monthlyUniqueVisitors: '',
      monthlyPageViews: '',
      avgSessionDuration: '',
      bounceRate: '',
      registeredUsers: '',
      paidSubscribers: '',
      newsletterSubscribers: '',
      domainAuthority: '',
      hasPaywall: false,
      hasMobileApp: false
    }
  });

  // Identifikatoren State
  const [identifiers, setIdentifiers] = useState<Array<{ 
    type: 'ISSN' | 'ISBN' | 'DOI' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'OTHER'; 
    value: string;
    description?: string;
  }>>([
    { type: 'ISSN', value: '' }
  ]);

  // Social Media URLs
  const [socialMediaUrls, setSocialMediaUrls] = useState<Array<{
    platform: string;
    url: string;
  }>>([]);

  // Load publishers on mount
  useEffect(() => {
    loadPublishers();
  }, [user]);

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
          frequency: publication.metrics.frequency,
          targetAudience: publication.metrics.targetAudience,
          targetAgeGroup: publication.metrics.targetAgeGroup,
          targetGender: publication.metrics.targetGender
        },
        geographicScope: publication.geographicScope,
        websiteUrl: publication.websiteUrl,
        internalNotes: publication.internalNotes
      });

      // Metriken
      if (publication.metrics) {
        setMetrics({
          frequency: publication.metrics.frequency || 'daily',
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

      // Identifikatoren
      if (publication.identifiers) {
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
    }
  }, [publication]);

const loadPublishers = async () => {
  if (!user) return;
  
  try {
    setLoadingPublishers(true);
    
    const allCompanies = await companiesEnhancedService.getAll(currentOrganization?.id || '');
    
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
  } finally {
    setLoadingPublishers(false);
  }
};

  const handlePublisherChange = (publisherId: string) => {
    const selectedPublisher = publishers.find(p => p.id === publisherId);
    setFormData({
      ...formData,
      publisherId,
      publisherName: selectedPublisher?.name || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validierung
    if (!formData.publisherId) {
      alert("Bitte wählen Sie einen Verlag aus.");
      return;
    }

    setLoading(true);
    try {
      // Helper function to remove undefined values
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return undefined;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== undefined && value !== null) {
              if (typeof value === 'object' && !Array.isArray(value)) {
                const cleaned = removeUndefined(value);
                if (cleaned !== undefined && Object.keys(cleaned).length > 0) {
                  newObj[key] = cleaned;
                }
              } else if (Array.isArray(value)) {
                const cleaned = removeUndefined(value);
                if (cleaned.length > 0) {
                  newObj[key] = cleaned;
                }
              } else {
                newObj[key] = value;
              }
            }
          });
          return newObj;
        }
        
        return obj;
      };

      // Bereite Metriken vor
      const preparedMetrics: any = {
        frequency: metrics.frequency
      };
      
      // Nur optionale Felder hinzufügen wenn vorhanden
      if (metrics.targetAudience) {
        preparedMetrics.targetAudience = metrics.targetAudience;
      }
      if (metrics.targetAgeGroup) {
        preparedMetrics.targetAgeGroup = metrics.targetAgeGroup;
      }
      if (metrics.targetGender && metrics.targetGender !== 'all') {
        preparedMetrics.targetGender = metrics.targetGender;
      }

      // Nur Print-Metriken hinzufügen, wenn vorhanden
      if ((formData.format === 'print' || formData.format === 'both') && metrics.print.circulation) {
        preparedMetrics.print = {
          circulation: parseInt(metrics.print.circulation),
          circulationType: metrics.print.circulationType
        };
        
        if (metrics.print.pricePerIssue) {
          preparedMetrics.print.pricePerIssue = {
            amount: parseFloat(metrics.print.pricePerIssue),
            currency: 'EUR'
          };
        }
        
        if (metrics.print.subscriptionPriceMonthly || metrics.print.subscriptionPriceAnnual) {
          preparedMetrics.print.subscriptionPrice = {};
          if (metrics.print.subscriptionPriceMonthly) {
            preparedMetrics.print.subscriptionPrice.monthly = {
              amount: parseFloat(metrics.print.subscriptionPriceMonthly),
              currency: 'EUR'
            };
          }
          if (metrics.print.subscriptionPriceAnnual) {
            preparedMetrics.print.subscriptionPrice.annual = {
              amount: parseFloat(metrics.print.subscriptionPriceAnnual),
              currency: 'EUR'
            };
          }
        }
        
        if (metrics.print.pageCount) {
          preparedMetrics.print.pageCount = parseInt(metrics.print.pageCount);
        }
        if (metrics.print.paperFormat) {
          preparedMetrics.print.paperFormat = metrics.print.paperFormat;
        }
      }

      // Nur Online-Metriken hinzufügen, wenn vorhanden
      if ((formData.format === 'online' || formData.format === 'both') && metrics.online.monthlyUniqueVisitors) {
        preparedMetrics.online = {
          monthlyUniqueVisitors: parseInt(metrics.online.monthlyUniqueVisitors),
          hasPaywall: metrics.online.hasPaywall,
          hasMobileApp: metrics.online.hasMobileApp
        };
        
        if (metrics.online.monthlyPageViews) {
          preparedMetrics.online.monthlyPageViews = parseInt(metrics.online.monthlyPageViews);
        }
        if (metrics.online.avgSessionDuration) {
          preparedMetrics.online.avgSessionDuration = parseFloat(metrics.online.avgSessionDuration);
        }
        if (metrics.online.bounceRate) {
          preparedMetrics.online.bounceRate = parseFloat(metrics.online.bounceRate);
        }
        if (metrics.online.registeredUsers) {
          preparedMetrics.online.registeredUsers = parseInt(metrics.online.registeredUsers);
        }
        if (metrics.online.paidSubscribers) {
          preparedMetrics.online.paidSubscribers = parseInt(metrics.online.paidSubscribers);
        }
        if (metrics.online.newsletterSubscribers) {
          preparedMetrics.online.newsletterSubscribers = parseInt(metrics.online.newsletterSubscribers);
        }
        if (metrics.online.domainAuthority) {
          preparedMetrics.online.domainAuthority = parseInt(metrics.online.domainAuthority);
        }
      }

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
        identifiers: identifiers.filter(id => id.value).map(id => {
          const identifier: any = {
            type: id.type,
            value: id.value
          };
          if (id.description) {
            identifier.description = id.description;
          }
          return identifier;
        }),
        socialMediaUrls: socialMediaUrls.filter(s => s.url),
        verified: formData.verified,
        status: formData.status
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
  };

  const addIdentifier = () => {
    setIdentifiers([...identifiers, { type: 'URL', value: '' }]);
  };

  const removeIdentifier = (index: number) => {
    setIdentifiers(identifiers.filter((_, i) => i !== index));
  };

  const addSocialMedia = () => {
    setSocialMediaUrls([...socialMediaUrls, { platform: '', url: '' }]);
  };

  const removeSocialMedia = (index: number) => {
    setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== index));
  };

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
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          {/* Grunddaten Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel der Publikation *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="z.B. Süddeutsche Zeitung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Untertitel / Claim
                  </label>
                  <Input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="z.B. Die große Tageszeitung"
                  />
                </div>
              </div>

              {/* Publisher Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
                  Verlag / Medienhaus *
                </label>
                {loadingPublishers ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ) : publishers.length === 0 ? (
                  <div>
                    <Alert 
                      type="warning" 
                      message="Keine Verlage oder Medienhäuser gefunden. Bitte legen Sie zuerst eine Firma vom Typ 'Verlag', 'Medienhaus' oder 'Partner' im CRM an."
                    />
                    <Button
                      type="button"
                      plain
                      onClick={() => window.location.href = '/dashboard/contacts/crm?tab=companies'}
                      className="mt-2 text-sm"
                    >
                      Zum CRM →
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.publisherId}
                    onChange={(e) => handlePublisherChange(e.target.value)}
                    required
                  >
                    <option value="">Bitte wählen...</option>
                    {publishers.map(publisher => (
                      <option key={publisher.id} value={publisher.id}>
                        {publisher.name}
                        {publisher.type === 'publisher' && ' (Verlag)'}
                        {publisher.type === 'media_house' && ' (Medienhaus)'}
                        {publisher.type === 'partner' && ' (Partner)'}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <Input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reichweite
                  </label>
                  <Select
                    value={formData.geographicScope}
                    onChange={(e) => setFormData({ ...formData, geographicScope: e.target.value as any })}
                  >
                    {geographicScopes.map(scope => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ *
                  </label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    {publicationTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <Select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as PublicationFormat })}
                  >
                    <option value="print">Print</option>
                    <option value="online">Digital</option>
                    <option value="both">Print & Digital</option>
                    <option value="broadcast">Broadcast</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                    <option value="discontinued">Eingestellt</option>
                    <option value="planned">Geplant</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <LanguageIcon className="inline h-4 w-4 mr-1" />
                  Sprachen *
                </label>
                <LanguageSelectorMulti
                  value={formData.languages}
                  onChange={(languages) => setFormData({ ...formData, languages })}
                  placeholder="Sprachen auswählen..."
                  multiple
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <GlobeAltIcon className="inline h-4 w-4 mr-1" />
                  Geografische Zielgebiete *
                </label>
                <CountrySelectorMulti
                  value={formData.geographicTargets}
                  onChange={(countries) => setFormData({ ...formData, geographicTargets: countries })}
                  placeholder="Länder auswählen..."
                  multiple
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Themenbereiche
                </label>
                <TagInput
                  value={formData.focusAreas}
                  onChange={(tags) => setFormData({ ...formData, focusAreas: tags })}
                  placeholder="Tippen Sie und drücken Sie Enter..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Geben Sie Themenbereiche ein und drücken Sie Enter oder Komma
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="h-4 w-4 text-[#005fab] focus:ring-[#005fab] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Publikation ist verifiziert
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interne Notizen
                </label>
                <Textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  rows={2}
                  placeholder="Interne Anmerkungen..."
                />
              </div>
            </div>
          )}

          {/* Metriken Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Erscheinungsfrequenz
                  </label>
                  <Select
                    value={metrics.frequency}
                    onChange={(e) => setMetrics({ ...metrics, frequency: e.target.value as PublicationFrequency })}
                  >
                    {frequencies.map(freq => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zielgruppe
                  </label>
                  <Input
                    type="text"
                    value={metrics.targetAudience}
                    onChange={(e) => setMetrics({ ...metrics, targetAudience: e.target.value })}
                    placeholder="z.B. Entscheider, Fachpublikum..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Altersgruppe
                  </label>
                  <Input
                    type="text"
                    value={metrics.targetAgeGroup}
                    onChange={(e) => setMetrics({ ...metrics, targetAgeGroup: e.target.value })}
                    placeholder="z.B. 25-49, 50+"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geschlechterverteilung
                  </label>
                  <Select
                    value={metrics.targetGender}
                    onChange={(e) => setMetrics({ ...metrics, targetGender: e.target.value as any })}
                  >
                    <option value="all">Ausgeglichen</option>
                    <option value="predominantly_male">Überwiegend männlich</option>
                    <option value="predominantly_female">Überwiegend weiblich</option>
                  </Select>
                </div>
              </div>

              {/* Print Metriken */}
              {(formData.format === 'print' || formData.format === 'both') && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Print-Metriken</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auflage
                      </label>
                      <Input
                        type="number"
                        value={metrics.print.circulation}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, circulation: e.target.value }
                        })}
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auflagentyp
                      </label>
                      <Select
                        value={metrics.print.circulationType}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, circulationType: e.target.value as any }
                        })}
                      >
                        {circulationTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preis pro Ausgabe (€)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={metrics.print.pricePerIssue}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, pricePerIssue: e.target.value }
                        })}
                        placeholder="3.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Abo-Preis Monat (€)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={metrics.print.subscriptionPriceMonthly}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, subscriptionPriceMonthly: e.target.value }
                        })}
                        placeholder="29.90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Format
                      </label>
                      <Input
                        type="text"
                        value={metrics.print.paperFormat}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, paperFormat: e.target.value }
                        })}
                        placeholder="z.B. A4, Tabloid"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seitenanzahl
                      </label>
                      <Input
                        type="number"
                        value={metrics.print.pageCount}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          print: { ...metrics.print, pageCount: e.target.value }
                        })}
                        placeholder="64"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Online Metriken */}
              {(formData.format === 'online' || formData.format === 'both') && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Online-Metriken</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monatliche Unique Visitors
                      </label>
                      <Input
                        type="number"
                        value={metrics.online.monthlyUniqueVisitors}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, monthlyUniqueVisitors: e.target.value }
                        })}
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monatliche Page Views
                      </label>
                      <Input
                        type="number"
                        value={metrics.online.monthlyPageViews}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, monthlyPageViews: e.target.value }
                        })}
                        placeholder="500000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ø Sitzungsdauer (Minuten)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={metrics.online.avgSessionDuration}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, avgSessionDuration: e.target.value }
                        })}
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bounce Rate (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={metrics.online.bounceRate}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, bounceRate: e.target.value }
                        })}
                        placeholder="45.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registrierte Nutzer
                      </label>
                      <Input
                        type="number"
                        value={metrics.online.registeredUsers}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, registeredUsers: e.target.value }
                        })}
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Newsletter-Abonnenten
                      </label>
                      <Input
                        type="number"
                        value={metrics.online.newsletterSubscribers}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, newsletterSubscribers: e.target.value }
                        })}
                        placeholder="25000"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 pt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={metrics.online.hasPaywall}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, hasPaywall: e.target.checked }
                        })}
                        className="h-4 w-4 text-[#005fab] focus:ring-[#005fab] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">Hat Paywall</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={metrics.online.hasMobileApp}
                        onChange={(e) => setMetrics({
                          ...metrics,
                          online: { ...metrics.online, hasMobileApp: e.target.checked }
                        })}
                        className="h-4 w-4 text-[#005fab] focus:ring-[#005fab] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">Hat Mobile App</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Identifikatoren Tab */}
          {activeTab === 'identifiers' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Identifikatoren</h4>
                <div className="space-y-2">
                  {identifiers.map((identifier, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Select
                          value={identifier.type}
                          onChange={(e) => {
                            const updated = [...identifiers];
                            updated[index] = { ...updated[index], type: e.target.value as any };
                            setIdentifiers(updated);
                          }}
                        >
                          <option value="ISSN">ISSN</option>
                          <option value="ISBN">ISBN</option>
                          <option value="DOI">DOI</option>
                          <option value="URL">URL</option>
                          <option value="DOMAIN">Domain</option>
                          <option value="SOCIAL_HANDLE">Social Handle</option>
                          <option value="OTHER">Sonstiges</option>
                        </Select>
                      </div>
                      <div className="col-span-8">
                        <Input
                          type="text"
                          value={identifier.value}
                          onChange={(e) => {
                            const updated = [...identifiers];
                            updated[index].value = e.target.value;
                            setIdentifiers(updated);
                          }}
                          placeholder="Wert eingeben..."
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          plain
                          onClick={() => removeIdentifier(index)}
                          disabled={identifiers.length === 1}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" plain onClick={addIdentifier}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Identifikator hinzufügen
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Social Media Profile</h4>
                <div className="space-y-2">
                  {socialMediaUrls.map((social, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        value={social.platform}
                        onChange={(e) => {
                          const updated = [...socialMediaUrls];
                          updated[index].platform = e.target.value;
                          setSocialMediaUrls(updated);
                        }}
                        placeholder="Platform (z.B. Twitter)"
                        className="w-40"
                      />
                      <Input
                        type="url"
                        value={social.url}
                        onChange={(e) => {
                          const updated = [...socialMediaUrls];
                          updated[index].url = e.target.value;
                          setSocialMediaUrls(updated);
                        }}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        plain
                        onClick={() => removeSocialMedia(index)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" plain onClick={addSocialMedia}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Social Media hinzufügen
                  </Button>
                </div>
              </div>
            </div>
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