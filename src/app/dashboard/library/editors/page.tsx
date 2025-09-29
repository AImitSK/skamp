"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { journalistDatabaseService } from "@/lib/firebase/journalist-database-service";
import { JournalistImportDialog } from "@/components/journalist/JournalistImportDialog";
import { companyTypeLabels, ContactEnhanced } from "@/types/crm-enhanced";
import { contactsEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { publicationService } from '@/lib/firebase/library-service';

// Quality Score Berechnung
function calculateQualityScore(contact: any): number {
  let score = 0;

  // Basis-Kontaktdaten (40 Punkte)
  if (contact.emails?.length) score += 15;
  if (contact.phones?.length) score += 10;
  if (contact.displayName) score += 10;
  if (contact.position) score += 5;

  // Unternehmensdaten (20 Punkte)
  if (contact.companyId) score += 10;
  if (contact.companyName) score += 10;

  // Media Profile (40 Punkte)
  if (contact.mediaProfile?.beats?.length) score += 15;
  if (contact.mediaProfile?.mediaTypes?.length) score += 10;
  if (contact.mediaProfile?.publicationIds?.length) score += 10;
  if (contact.socialProfiles?.length) score += 5;

  return Math.min(score, 100);
}

// Deutsche Übersetzungen
const roleTranslations = {
  'editor': 'Chefredakteur',
  'reporter': 'Reporter',
  'columnist': 'Kolumnist'
} as const;

const frequencyTranslations = {
  'daily': 'täglich',
  'weekly': 'wöchentlich',
  'monthly': 'monatlich',
  'occasional': 'gelegentlich'
} as const;
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
import React from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  NewspaperIcon,
  StarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import clsx from 'clsx';



interface JournalistSubscription {
  organizationId: string;
  plan: 'free' | 'professional' | 'business' | 'enterprise';
  status: 'active' | 'trial' | 'suspended';
  features: {
    searchEnabled: boolean;
    importEnabled: boolean;
    exportEnabled: boolean;
    apiAccess: boolean;
    advancedFilters: boolean;
    bulkOperations: boolean;
    customFieldMapping: boolean;
  };
  limits: {
    searchesPerMonth: number;
    importsPerMonth: number;
    exportsPerMonth: number;
    maxSyncedContacts: number;
    apiCallsPerDay: number;
  };
  usage: {
    currentPeriod: {
      searches: number;
      imports: number;
      exports: number;
      apiCalls: number;
    };
    lifetime: {
      totalSearches: number;
      totalImports: number;
      totalExports: number;
      totalContributions: number;
    };
  };
  billing: {
    startDate: any;
    currentPeriodStart: any;
    currentPeriodEnd: any;
  };
}

interface JournalistDatabaseEntry {
  id: string;
  globalId: string;
  version: number;
  lastModifiedBy: string;
  organizationId: string;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
  personalData: {
    name: {
      salutation?: string;
      firstName: string;
      lastName: string;
      title?: string;
    };
    displayName: string;
    emails: Array<{
      email: string;
      type: 'business' | 'private';
      isPrimary: boolean;
      isVerified: boolean;
      verifiedAt?: any;
    }>;
    phones?: Array<{
      number: string;
      type: string;
      isPrimary: boolean;
      countryCode: string;
    }>;
    languages: string[];
  };
  professionalData: {
    currentEmployment: {
      mediumName: string;
      position: string;
      department?: string;
      isFreelance: boolean;
    };
    expertise: {
      primaryTopics: string[];
      secondaryTopics?: string[];
      industries?: string[];
    };
    mediaTypes: MediaType[];
  };
  socialMedia: {
    profiles: Array<{
      platform: string;
      url: string;
      handle?: string;
      verified: boolean;
      followers?: number;
      engagement?: number;
    }>;
    influence: {
      totalFollowers: number;
      influenceScore: number;
      reachScore: number;
      engagementScore: number;
      lastCalculated: any;
    };
  };
  metadata: {
    verification: {
      status: VerificationStatus;
      method?: string;
      verifiedAt?: any;
      verifiedBy?: string;
    };
    dataQuality: {
      completeness: number;
      accuracy: number;
      freshness: number;
      overallScore: number;
    };
    sources: Array<{
      type: string;
      name: string;
      contributedAt: any;
      confidence: number;
      fields: string[];
    }>;
  };
  analytics: {
    articleMetrics: {
      totalArticles: number;
      averageReach: number;
      totalReach: number;
      averageEngagement: number;
    };
    sentimentAnalysis: {
      averageSentiment: number;
      sentimentDistribution: {
        positive: number;
        neutral: number;
        negative: number;
      };
      lastAnalyzed: any;
    };
    topicDistribution: Array<{
      topic: string;
      articleCount: number;
      percentage: number;
      averageSentiment: number;
    }>;
    responseMetrics: {
      responseRate: number;
      averageResponseTime: number;
      preferredResponseChannel?: string;
    };
    trends: {
      activityTrend: string;
    };
  };
  gdpr: {
    consent: {
      status: string;
      grantedAt?: any;
      method?: string;
    };
    communicationPreferences: {
      allowEmails: boolean;
      allowDataSharing: boolean;
      allowProfiling: boolean;
      preferredLanguage: string;
    };
    dataRights: any;
  };
  syncInfo: {
    linkedOrganizations: any[];
    masterSyncStatus: {
      pendingChanges: number;
      syncHealth: string;
    };
    changeHistory: any[];
  };
}

// Alert Component
function Alert({
  type = 'info',
  title,
  message,
  action
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Premium Banner Component
function PremiumBanner({
  subscription,
  onUpgrade
}: {
  subscription: JournalistSubscription | null;
  onUpgrade: () => void;
}) {
  if (subscription?.status === 'active') return null;

  return (
    <div className="mb-6 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <StarIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Verifizierte Journalisten-Datenbank
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Durchsuchen Sie über 10.000 verifizierte Medienkontakte und importieren Sie diese direkt ins CRM.
            </p>
          </div>
        </div>
        <div className="ml-6 flex-shrink-0">
          <Button
            onClick={onUpgrade}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Jetzt upgraden
          </Button>
        </div>
      </div>
    </div>
  );
}

// Journalist Card Component
function JournalistCard({
  journalist,
  onImport,
  onViewDetails,
  onUpgrade,
  subscription,
  isImporting = false
}: {
  journalist: JournalistDatabaseEntry;
  onImport: (journalist: JournalistDatabaseEntry) => void;
  onViewDetails: (journalist: JournalistDatabaseEntry) => void;
  onUpgrade: (journalist: JournalistDatabaseEntry) => void;
  subscription: JournalistSubscription | null;
  isImporting?: boolean;
}) {
  const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email ||
                      journalist.personalData.emails[0]?.email;

  const hasPhone = journalist.personalData.phones && journalist.personalData.phones.length > 0;
  const primaryTopics = (journalist.professionalData.expertise.primaryTopics || []).slice(0, 3);
  // TODO: Remove totalFollowers - not captured in CRM data
  // const totalFollowers = journalist.socialMedia?.influence?.totalFollowers || 0;

  const canImport = subscription?.status === 'active' && subscription.features.importEnabled;

  return (
    <div className="rounded-lg border bg-white overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {journalist.personalData.displayName}
              </h3>
              <p className="text-xs text-gray-500">
                {journalist.professionalData.employment.position || journalist.personalData.name.first + ' ' + journalist.personalData.name.last} bei {journalist.professionalData.employment.company?.name || 'Selbstständig'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* TODO: Remove verification status - only exists for publications, not contacts */}
            {/* {journalist.metadata?.verification?.status === 'verified' && (
              <Badge color="green" className="text-xs">
                <CheckBadgeIcon className="h-3 w-3 mr-1" />
                Verifiziert
              </Badge>
            )} */}

            <div className="text-xs text-gray-500">
              Score: {journalist.metadata?.dataQuality?.overallScore || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center text-gray-600">
            <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
            {primaryEmail ? (
              <a href={`mailto:${primaryEmail}`} className="text-primary hover:text-primary-hover truncate">
                {primaryEmail}
              </a>
            ) : (
              <span className="text-gray-400">Keine E-Mail</span>
            )}
          </div>

          <div className="flex items-center text-gray-600">
            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
            {hasPhone ? (
              <span className="text-gray-600">Verfügbar</span>
            ) : (
              <span className="text-gray-400">Nicht verfügbar</span>
            )}
          </div>
        </div>

        {/* Topics */}
        {primaryTopics.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-1">
              {(primaryTopics || []).map((topic, index) => (
                <Badge key={index} color="zinc" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {(journalist.professionalData.expertise.primaryTopics || []).length > 3 && (
                <Badge color="zinc" className="text-xs">
                  +{(journalist.professionalData.expertise.primaryTopics || []).length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Media Types & Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {(journalist.professionalData.mediaTypes || []).slice(0, 3).map((type, index) => (
                <Badge key={index} color="blue" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* TODO: Remove totalFollowers display - not captured in CRM */}
          {/* {totalFollowers > 0 && (
            <div className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              {totalFollowers >= 1000 ?
                `${Math.round(totalFollowers / 1000)}K` :
                totalFollowers.toLocaleString()
              } Follower
            </div>
          )} */}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(journalist)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Details anzeigen
          </button>

          {canImport ? (
            <Button
              onClick={() => onImport(journalist)}
              disabled={isImporting}
              className="bg-primary hover:bg-primary-hover text-white text-sm px-4 py-1.5"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Importiere...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                  Importieren
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => onUpgrade(journalist)}
              className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 text-sm px-4 py-1.5"
            >
              <StarIcon className="h-4 w-4 mr-1" />
              Premium
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Import Dialog Component
function ImportDialog({
  journalist,
  onClose,
  onConfirm,
  isLoading = false
}: {
  journalist: JournalistDatabaseEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  const [step, setStep] = useState<'preview' | 'relations' | 'mapping' | 'confirm'>('preview');
  const [fieldMapping, setFieldMapping] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    topics: '',
    notes: ''
  });

  // NEUE STATE für Relations-Management
  const [importConfig, setImportConfig] = useState<{
    companyStrategy: 'create_new' | 'use_existing' | 'merge';
    selectedCompanyId?: string;
    publicationStrategy: 'import_all' | 'import_selected' | 'skip';
    selectedPublicationIds: string[];
  }>({
    companyStrategy: 'create_new',
    publicationStrategy: 'import_all',
    selectedPublicationIds: []
  });

  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<any[]>([]);   const [existingPublications, setExistingPublications] = useState<any[]>([]); 
  // Reset state when journalist changes
  useEffect(() => {
    if (journalist) {
      setStep('preview');
      setFieldMapping({
        name: journalist.personalData.displayName,
        email: journalist.personalData.emails.find(e => e.isPrimary)?.email || journalist.personalData.emails[0]?.email || '',
        phone: journalist.personalData.phones?.[0]?.number || '',
        company: journalist.professionalData.employment.company?.name || 'Selbstständig',
        position: journalist.professionalData.employment.position || journalist.personalData.name.first + ' ' + journalist.personalData.name.last,
        topics: (journalist.professionalData.expertise.primaryTopics || []).join(', '),
        notes: `Importiert aus Journalisten-Datenbank\nScore: ${journalist.metadata?.dataQuality?.overallScore || 0}`
      });
      // TODO: Implement real duplicate detection logic
      setDuplicateWarning(false); // Math.random() > 0.7 was mock - removed
    }
  }, [journalist]);

  if (!journalist) return null;

  const handleNext = () => {
    if (step === 'preview') setStep('relations');
    else if (step === 'relations') setStep('mapping');
    else if (step === 'mapping') setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'relations') setStep('preview');
    else if (step === 'mapping') setStep('relations');
    else if (step === 'confirm') setStep('mapping');
  };

  return (
    <Dialog open={!!journalist} onClose={onClose} size="2xl">
      <DialogTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpTrayIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Journalist importieren
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Schritt {step === 'preview' ? '1' : step === 'relations' ? '2' : step === 'mapping' ? '3' : '4'} von 4
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            {['preview', 'relations', 'mapping', 'confirm'].map((s, index) => (
              <div
                key={s}
                className={`h-2 w-6 rounded-full ${
                  step === s ? 'bg-primary' :
                  ['preview', 'relations', 'mapping', 'confirm'].indexOf(step) > index ? 'bg-green-500' : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogTitle>

      <DialogBody>
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-zinc-900 dark:text-white">
                  {journalist.personalData.displayName}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {journalist.professionalData.employment.position || journalist.personalData.name.first + ' ' + journalist.personalData.name.last} bei {journalist.professionalData.employment.company?.name || 'Selbstständig'}
                </p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>Score: {journalist.metadata?.dataQuality?.overallScore || 0}</span>
                  <span>•</span>
                  <span>{(journalist.professionalData.expertise.primaryTopics || []).length} Themen</span>
                </div>
              </div>
            </div>

            {/* TODO: Implement real duplicate detection */}
            {duplicateWarning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Mögliches Duplikat erkannt
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Ein ähnlicher Kontakt könnte bereits in Ihrem CRM existieren. Bitte prüfen Sie die Feld-Zuordnung sorgfältig.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">E-Mail:</span>
                <div className="text-zinc-600 dark:text-zinc-400">
                  {journalist.personalData.emails.find(e => e.isPrimary)?.email || 'Nicht verfügbar'}
                </div>
              </div>
              <div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Telefon:</span>
                <div className="text-zinc-600 dark:text-zinc-400">
                  {journalist.personalData.phones?.[0]?.number || 'Nicht verfügbar'}
                </div>
              </div>
            </div>

            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300 text-sm">Themen:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {(journalist.professionalData.expertise.primaryTopics || []).slice(0, 6).map((topic, index) => (
                  <Badge key={index} color="zinc" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {(journalist.professionalData.expertise.primaryTopics || []).length > 6 && (
                  <span className="text-xs text-zinc-500">
                    +{(journalist.professionalData.expertise.primaryTopics || []).length - 6} weitere
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NEUER RELATIONS-STEP */}
        {step === 'relations' && (
          <div className="space-y-6">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Definieren Sie, wie Medienhaus und Publikationen importiert werden sollen:
            </div>

            {/* Company/Medienhaus Strategy */}
            {journalist.professionalData.employment?.company && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h4 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center">
                  <NewspaperIcon className="h-4 w-4 mr-2" />
                  Medienhaus: {journalist.professionalData.employment.company.name}
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="companyStrategy"
                      value="create_new"
                      checked={importConfig.companyStrategy === 'create_new'}
                      onChange={(e) => setImportConfig({
                        ...importConfig,
                        companyStrategy: e.target.value as any
                      })}
                      className="text-primary"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                        Neue Firma anlegen
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Erstellt "{journalist.professionalData.employment.company.name}" als neue Firma im CRM
                      </div>
                    </div>
                  </label>

                  {existingCompanies.length > 0 && (
                    <>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="companyStrategy"
                          value="use_existing"
                          checked={importConfig.companyStrategy === 'use_existing'}
                          onChange={(e) => setImportConfig({
                            ...importConfig,
                            companyStrategy: e.target.value as any
                          })}
                          className="text-primary"
                        />
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            Mit bestehender Firma verknüpfen
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Journalist wird einer bereits existierenden Firma zugeordnet
                          </div>
                        </div>
                      </label>

                      {importConfig.companyStrategy === 'use_existing' && (
                        <div className="ml-6 mt-2">
                          <select
                            value={importConfig.selectedCompanyId || ''}
                            onChange={(e) => setImportConfig({
                              ...importConfig,
                              selectedCompanyId: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800"
                          >
                            <option value="">Firma auswählen...</option>
                            {existingCompanies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="companyStrategy"
                          value="merge"
                          checked={importConfig.companyStrategy === 'merge'}
                          onChange={(e) => setImportConfig({
                            ...importConfig,
                            companyStrategy: e.target.value as any
                          })}
                          className="text-primary"
                        />
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            Mit bestehender Firma zusammenführen
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Premium-Daten werden in bestehende Firmendaten eingearbeitet
                          </div>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Publications Strategy */}
            {journalist.professionalData.publicationAssignments &&
             journalist.professionalData.publicationAssignments.length > 0 && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h4 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center">
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  Publikationen ({journalist.professionalData.publicationAssignments.length})
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="publicationStrategy"
                      value="import_all"
                      checked={importConfig.publicationStrategy === 'import_all'}
                      onChange={(e) => setImportConfig({
                        ...importConfig,
                        publicationStrategy: e.target.value as any,
                        selectedPublicationIds: journalist.professionalData.publicationAssignments?.map(a => a.publication.globalPublicationId) || []
                      })}
                      className="text-primary"
                    />
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">
                      Alle Publikationen importieren
                    </div>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="publicationStrategy"
                      value="import_selected"
                      checked={importConfig.publicationStrategy === 'import_selected'}
                      onChange={(e) => setImportConfig({
                        ...importConfig,
                        publicationStrategy: e.target.value as any
                      })}
                      className="text-primary"
                    />
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">
                      Ausgewählte Publikationen importieren
                    </div>
                  </label>

                  {importConfig.publicationStrategy === 'import_selected' && (
                    <div className="ml-6 mt-2 space-y-2">
                      {journalist.professionalData.publicationAssignments.map((assignment, index) => (
                        <label key={index} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={importConfig.selectedPublicationIds.includes(assignment.publication.globalPublicationId)}
                            onChange={(e) => {
                              const pubId = assignment.publication.globalPublicationId;
                              const newSelected = e.target.checked
                                ? [...importConfig.selectedPublicationIds, pubId]
                                : importConfig.selectedPublicationIds.filter(id => id !== pubId);
                              setImportConfig({
                                ...importConfig,
                                selectedPublicationIds: newSelected
                              });
                            }}
                            className="text-primary"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-zinc-900 dark:text-white">
                              {assignment.publication.title}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {roleTranslations[assignment.role as keyof typeof roleTranslations] || assignment.role} • {assignment.publication.type}
                              {assignment.isMainPublication && ' • Haupt-Publikation'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="publicationStrategy"
                      value="skip"
                      checked={importConfig.publicationStrategy === 'skip'}
                      onChange={(e) => setImportConfig({
                        ...importConfig,
                        publicationStrategy: e.target.value as any,
                        selectedPublicationIds: []
                      })}
                      className="text-primary"
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                        Keine Publikationen importieren
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Nur den Journalisten ohne Publications-Verknüpfungen importieren
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Import Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Import-Zusammenfassung
              </h5>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <div>• 1 Journalist wird importiert</div>
                {importConfig.companyStrategy === 'create_new' && (
                  <div>• 1 neue Firma wird erstellt</div>
                )}
                {importConfig.companyStrategy === 'use_existing' && importConfig.selectedCompanyId && (
                  <div>• Journalist wird bestehender Firma zugeordnet</div>
                )}
                {importConfig.publicationStrategy === 'import_all' && (
                  <div>• {journalist.professionalData.publicationAssignments?.length || 0} Publikationen werden importiert</div>
                )}
                {importConfig.publicationStrategy === 'import_selected' && (
                  <div>• {importConfig.selectedPublicationIds.length} ausgewählte Publikationen werden importiert</div>
                )}
                {importConfig.publicationStrategy === 'skip' && (
                  <div>• Keine Publikationen werden importiert</div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Ordnen Sie die Daten den entsprechenden Feldern in Ihrem CRM zu:
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={fieldMapping.name}
                  onChange={(e) => setFieldMapping({...fieldMapping, name: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={fieldMapping.email}
                    onChange={(e) => setFieldMapping({...fieldMapping, email: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={fieldMapping.phone}
                    onChange={(e) => setFieldMapping({...fieldMapping, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Unternehmen
                  </label>
                  <input
                    type="text"
                    value={fieldMapping.company}
                    onChange={(e) => setFieldMapping({...fieldMapping, company: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={fieldMapping.position}
                    onChange={(e) => setFieldMapping({...fieldMapping, position: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Themen/Tags
                </label>
                <input
                  type="text"
                  value={fieldMapping.topics}
                  onChange={(e) => setFieldMapping({...fieldMapping, topics: e.target.value})}
                  placeholder="Komma-getrennte Liste"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notizen
                </label>
                <textarea
                  value={fieldMapping.notes}
                  onChange={(e) => setFieldMapping({...fieldMapping, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckBadgeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                  Bereit zum Import
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                Diese Daten werden importiert:
              </h4>

              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {fieldMapping.name}</div>
                  <div><strong>E-Mail:</strong> {fieldMapping.email}</div>
                  <div><strong>Telefon:</strong> {fieldMapping.phone || 'Nicht angegeben'}</div>
                  <div><strong>Unternehmen:</strong> {fieldMapping.company}</div>
                  <div><strong>Position:</strong> {fieldMapping.position}</div>
                  <div><strong>Themen:</strong> {fieldMapping.topics}</div>
                </div>
                {fieldMapping.notes && (
                  <div className="text-sm pt-2 border-t border-zinc-200 dark:border-zinc-600">
                    <strong>Notizen:</strong>
                    <div className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                      {fieldMapping.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Abbrechen
        </Button>
        <div className="flex space-x-2">
          {step !== 'preview' && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Zurück
            </Button>
          )}
          {step !== 'confirm' ? (
            <Button
              onClick={handleNext}
              disabled={!fieldMapping.name || !fieldMapping.email}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              Weiter
            </Button>
          ) : (
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importiere...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Import bestätigen
                </>
              )}
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}

// Main Component
export default function EditorsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [journalists, setJournalists] = useState<JournalistDatabaseEntry[]>([]);
  const [companies, setCompanies] = useState<CompanyEnhanced[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscription, setSubscription] = useState<JournalistSubscription | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter States
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaType[]>([]);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<VerificationStatus[]>([]);
  const [minQualityScore, setMinQualityScore] = useState<number>(0);

  // UI States
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [selectedJournalist, setSelectedJournalist] = useState<JournalistDatabaseEntry | null>(null);
  const [detailJournalist, setDetailJournalist] = useState<JournalistDatabaseEntry | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDialogJournalist, setImportDialogJournalist] = useState<JournalistDatabaseEntry | null>(null);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Load mock data (replace with real API calls)
  const loadData = useCallback(async () => {
    if (!user || !currentOrganization) return;

    setLoading(true);
    try {
      const mockSubscription: JournalistSubscription = {
        organizationId: currentOrganization.id,
        plan: 'professional', // Set to professional for testing
        status: 'active',
        billing: {
          startDate: new Date() as any,
          currentPeriodStart: new Date() as any,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) as any
        },
        features: {
          searchEnabled: true,
          importEnabled: false, // Set to true for premium
          exportEnabled: false,
          apiAccess: false,
          advancedFilters: false,
          bulkOperations: false,
          customFieldMapping: false
        },
        limits: {
          searchesPerMonth: 10,
          importsPerMonth: 0,
          exportsPerMonth: 0,
          maxSyncedContacts: 0,
          apiCallsPerDay: 0
        },
        usage: {
          currentPeriod: {
            searches: 3,
            imports: 0,
            exports: 0,
            apiCalls: 0
          },
          lifetime: {
            totalSearches: 15,
            totalImports: 0,
            totalExports: 0,
            totalContributions: 0
          }
        }
      };

      setSubscription(mockSubscription);

      // Load ALLE globalen Journalisten aus CRM (quer über alle Organisationen)
      console.log('🔍 Loading global journalists from CRM...');

      // Direkte Firestore-Query für ALLE globalen Kontakte
      const globalContactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('isGlobal', '==', true)
      );
      const snapshot = await getDocs(globalContactsQuery);
      const allContacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactEnhanced[];
      const globalJournalists = allContacts.filter(c =>
        c.isGlobal && c.mediaProfile?.isJournalist
      );

      console.log('📊 Global journalists found:', {
        totalGlobal: allContacts.length,
        journalists: globalJournalists.length
      });


      // Load companies for type lookup
      const companiesData = await companiesEnhancedService.getAll(currentOrganization.id);

      // Load publications for assignments
      const publicationsData = await publicationService.getAll(currentOrganization.id);

      // Konvertiere CRM-Kontakte zu JournalistDatabaseEntry Format
      const convertedJournalists = await Promise.all(globalJournalists.map(async (contact) => {
        // Company Type Lookup
        const company = companiesData.find(c => c.id === contact.companyId);
        const companyType = company?.type || 'other';

        // Publications Lookup
        const publicationIds = contact.mediaProfile?.publicationIds || [];
        const contactPublications = publicationsData.filter(pub =>
          publicationIds.includes(pub.id!)
        );

        const publicationAssignments = contactPublications.map(publication => ({
          publication: {
            title: publication.title,
            type: publication.type,
            globalPublicationId: publication.id
          },
          role: 'reporter', // Default role from CRM
          isMainPublication: false
        }));

        return {
          id: contact.id,
          personalData: {
            name: {
              first: contact.name?.firstName || contact.displayName.split(' ')[0] || '',
              last: contact.name?.lastName || contact.displayName.split(' ')[1] || ''
            },
            displayName: contact.displayName,
            emails: contact.emails || [],
            phones: contact.phones || [],
            languages: contact.personalInfo?.languages || ['de']
          },
          professionalData: {
            employment: {
              company: {
                name: contact.companyName || 'Selbstständig',
                type: companyType
              },
              position: contact.position || ''
            },
            expertise: {
              primaryTopics: contact.mediaProfile?.beats || []
            },
            mediaTypes: contact.mediaProfile?.mediaTypes || [],
            publicationAssignments: publicationAssignments
          },
          socialMedia: {
            profiles: contact.socialProfiles || [],
            influence: {
              totalFollowers: 0, // Not tracked
              influenceScore: contact.mediaProfile?.influence?.score || 0,
              reachScore: contact.mediaProfile?.influence?.reach || 0,
              engagementScore: contact.mediaProfile?.influence?.engagement || 0,
              lastCalculated: new Date()
            }
          },
          metadata: {
            dataQuality: {
              overallScore: calculateQualityScore(contact)
            }
          }
        };
      }));

      setJournalists(convertedJournalists as any);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization, showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter journalists
  const filteredJournalists = useMemo(() => {
    return (journalists || []).filter(journalist => {
      // Search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches =
          journalist.personalData.displayName.toLowerCase().includes(searchLower) ||
          (journalist.professionalData.employment.company?.name || 'Selbstständig').toLowerCase().includes(searchLower) ||
          (journalist.professionalData.expertise.primaryTopics || []).some(t => t.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Topics filter
      if (selectedTopics.length > 0) {
        const hasMatchingTopic = (journalist.professionalData.expertise.primaryTopics || []).some(topic =>
          selectedTopics.includes(topic)
        );
        if (!hasMatchingTopic) return false;
      }

      // Media types filter
      if (selectedMediaTypes.length > 0) {
        const hasMatchingMediaType = (journalist.professionalData.mediaTypes || []).some(type =>
          selectedMediaTypes.includes(type)
        );
        if (!hasMatchingMediaType) return false;
      }

      // TODO: Remove verification status filter - not available for contacts
      // if (selectedVerificationStatus.length > 0) {
      //   if (!selectedVerificationStatus.includes(journalist.metadata?.verification?.status)) {
      //     return false;
      //   }
      // }

      // Quality score filter
      if (minQualityScore > 0) {
        if ((journalist.metadata?.dataQuality?.overallScore || 0) < minQualityScore) {
          return false;
        }
      }

      return true;
    });
  }, [journalists, searchTerm, selectedTopics, selectedMediaTypes, selectedVerificationStatus, minQualityScore]);

  // Get unique topics for filter
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    (journalists || []).forEach(j => {
      if (j?.professionalData?.expertise?.primaryTopics) {
        j.professionalData.expertise.primaryTopics.forEach(topic => topicsSet.add(topic));
      }
    });
    return Array.from(topicsSet).sort();
  }, [journalists]);

  // Import handlers
  const handleImport = (journalist: JournalistDatabaseEntry) => {
    if (!subscription?.features.importEnabled) {
      showAlert('warning', 'Premium-Feature', 'Das Importieren von Journalisten ist nur mit einem Premium-Abo verfügbar.');
      return;
    }
    setSelectedJournalist(journalist);
  };

  const handleConfirmImport = async () => {
    if (!selectedJournalist) return;

    setImportingIds(prev => new Set([...prev, selectedJournalist.id!]));

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      showAlert('success', 'Import erfolgreich', `${selectedJournalist.personalData.displayName} wurde in Ihr CRM importiert.`);
      setSelectedJournalist(null);
    } catch (error) {
      showAlert('error', 'Import fehlgeschlagen', 'Bitte versuchen Sie es erneut.');
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedJournalist.id!);
        return newSet;
      });
    }
  };

  const handleUpgrade = (journalist: JournalistDatabaseEntry) => {
    setImportDialogJournalist(journalist);
    setShowImportDialog(true);
  };

  const handleViewDetails = (journalist: JournalistDatabaseEntry) => {
    setDetailJournalist(journalist);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">Lade Journalisten-Datenbank...</Text>
        </div>
      </div>
    );
  }

  const activeFiltersCount = selectedTopics.length + selectedMediaTypes.length + selectedVerificationStatus.length + (minQualityScore > 0 ? 1 : 0);

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Namen, Medium oder Themen suchen..."
            className="flex-1"
          />

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`
                px-3 py-2 text-sm font-medium rounded-l-lg transition-colors
                ${viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
              title="Tabellen-Ansicht"
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`
                px-3 py-2 text-sm font-medium border-l border-gray-300 rounded-r-lg transition-colors
                ${viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
              title="Grid-Ansicht"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Button */}
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  className={clsx(
                    'inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10',
                    activeFiltersCount > 0
                      ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  )}
                  aria-label="Filter"
                >
                  <FunnelIcon className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Filter</h3>
                        {activeFiltersCount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedTopics([]);
                              setSelectedMediaTypes([]);
                              setSelectedVerificationStatus([]);
                              setMinQualityScore(0);
                            }}
                            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            Zurücksetzen
                          </button>
                        )}
                      </div>

                      {/* Topics Filter */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Themen
                        </label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {(availableTopics || []).slice(0, 8).map((topic) => (
                            <label key={topic} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedTopics.includes(topic)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTopics([...selectedTopics, topic]);
                                  } else {
                                    setSelectedTopics(selectedTopics.filter(t => t !== topic));
                                  }
                                }}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {topic}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Verification Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Verifizierungsstatus
                        </label>
                        <div className="space-y-2">
                          {(['verified', 'pending', 'unverified'] as VerificationStatus[]).map((status) => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedVerificationStatus.includes(status)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVerificationStatus([...selectedVerificationStatus, status]);
                                  } else {
                                    setSelectedVerificationStatus(selectedVerificationStatus.filter(s => s !== status));
                                  }
                                }}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {status === 'verified' ? 'Verifiziert' :
                                 status === 'pending' ? 'Ausstehend' : 'Nicht verifiziert'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Quality Score Filter */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Mindest-Qualitätsscore: {minQualityScore}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={minQualityScore}
                          onChange={(e) => setMinQualityScore(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>

      {/* Premium Banner */}
      <PremiumBanner subscription={subscription} onUpgrade={handleUpgrade} />

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredJournalists.length} von {(journalists || []).length} Journalisten
          {subscription && (
            <span className="ml-2">
              • {subscription.usage.currentPeriod.searches}/{subscription.limits.searchesPerMonth} Suchen diesen Monat
            </span>
          )}
        </Text>
      </div>

      {/* Results */}
      {filteredJournalists.length > 0 ? (
        viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(filteredJournalists || []).map((journalist) => (
              <JournalistCard
                key={journalist.id}
                journalist={journalist}
                onImport={handleImport}
                onViewDetails={handleViewDetails}
                onUpgrade={handleUpgrade}
                subscription={subscription}
                isImporting={importingIds.has(journalist.id!)}
              />
            ))}
          </div>
        ) : (
          // Table View
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm overflow-visible">
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center">
                <div className="flex-1 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Journalist
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Medienhaus
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Publikationen
                </div>
                <div className="w-36 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="w-24 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Score
                </div>
                <div className="w-16 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Themen
                </div>
                <div className="w-40 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Kontakt
                </div>
                <div className="w-24"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(filteredJournalists || []).map((journalist) => {
                const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email ||
                                    journalist.personalData.emails[0]?.email;
                const hasPhone = journalist.personalData.phones && journalist.personalData.phones.length > 0;
                const primaryPhone = journalist.personalData.phones?.find(p => p.isPrimary)?.number ||
                                    journalist.personalData.phones?.[0]?.number;
                const primaryTopics = (journalist.professionalData.expertise.primaryTopics || []).slice(0, 2);
                // TODO: Remove totalFollowers - not captured in CRM
                // const totalFollowers = journalist.socialMedia?.influence?.totalFollowers || 0;
                const canImport = subscription?.status === 'active' && subscription.features.importEnabled;

                return (
                  <div key={journalist.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center">
                      {/* Journalist Name & Position */}
                      <div className="flex-1 px-4 min-w-0">
                        <button
                          onClick={() => handleViewDetails(journalist)}
                          className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary block truncate text-left"
                        >
                          {journalist.personalData.displayName}
                        </button>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                          {journalist.professionalData.employment.position || journalist.personalData.name.first + ' ' + journalist.personalData.name.last}
                        </div>
                      </div>

                      {/* Company/Medienhaus */}
                      <div className="w-48 px-4">
                        <div className="flex items-center space-x-2">
                          <NewspaperIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                              {journalist.professionalData.employment.company?.name || 'Selbstständig'}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {companyTypeLabels[journalist.professionalData.employment?.company?.type as keyof typeof companyTypeLabels] || 'Medienhaus'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Publications */}
                      <div className="w-48 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(journalist.professionalData.publicationAssignments || []).slice(0, 2).map((assignment, index) => (
                            <Badge key={index} color="blue" className="text-xs">
                              {assignment.publication.title}
                            </Badge>
                          ))}
                          {(journalist.professionalData.publicationAssignments || []).length > 2 && (
                            <Badge color="zinc" className="text-xs">
                              +{(journalist.professionalData.publicationAssignments || []).length - 2}
                            </Badge>
                          )}
                          {(!journalist.professionalData.publicationAssignments || journalist.professionalData.publicationAssignments.length === 0) && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                              Keine Publikationen
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TODO: Remove Verification Status - only exists for publications */}
                      {/* <div className="w-36 px-4">
                        {journalist.metadata?.verification?.status === 'verified' ? (
                          <Badge color="green" className="text-xs">
                            <CheckBadgeIcon className="h-3 w-3 mr-1" />
                            Verifiziert
                          </Badge>
                        ) : journalist.metadata?.verification?.status === 'pending' ? (
                          <Badge color="yellow" className="text-xs">
                            Ausstehend
                          </Badge>
                        ) : (
                          <Badge color="gray" className="text-xs">
                            Nicht verifiziert
                          </Badge>
                        )}
                      </div> */}

                      {/* Quality Score */}
                      <div className="w-24 px-4 text-center">
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {journalist.metadata?.dataQuality?.overallScore || 0}
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="w-16 px-4 text-center">
                        <Popover className="relative">
                          {({ open }) => (
                            <>
                              <Popover.Button className="flex items-center justify-center p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                <TagIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  {(journalist.professionalData.expertise.primaryTopics || []).length}
                                </span>
                              </Popover.Button>
                              <Transition
                                as={React.Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in duration-150"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                              >
                                <Popover.Panel className="absolute z-50 mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 p-3 min-w-[200px] left-1/2 transform -translate-x-1/2">
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                      Themen ({(journalist.professionalData.expertise.primaryTopics || []).length})
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {(journalist.professionalData.expertise.primaryTopics || []).map((topic, index) => (
                                        <Badge key={index} color="zinc" className="text-xs">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </Popover.Panel>
                              </Transition>
                            </>
                          )}
                        </Popover>
                      </div>

                      {/* Contact */}
                      <div className="w-40 px-4">
                        <div className="flex items-center space-x-2 text-xs">
                          {primaryEmail && (
                            <a href={`mailto:${primaryEmail}`} className="text-primary hover:text-primary-hover">
                              <EnvelopeIcon className="h-4 w-4" />
                            </a>
                          )}
                          {hasPhone && primaryPhone && (
                            <a href={`tel:${primaryPhone}`} className="text-primary hover:text-primary-hover">
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="w-24 px-4">
                        {canImport ? (
                          <Button
                            onClick={() => handleImport(journalist)}
                            disabled={importingIds.has(journalist.id!)}
                            className="bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1.5"
                          >
                            {importingIds.has(journalist.id!) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <ArrowUpTrayIcon className="h-3 w-3" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpgrade(journalist)}
                            className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 text-xs px-3 py-1.5"
                          >
                            <StarIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Journalisten gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            Versuchen Sie andere Suchbegriffe oder Filter.
          </p>
        </div>
      )}

      {/* Import Dialog - Relations aware */}
      <JournalistImportDialog
        isOpen={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setImportDialogJournalist(null);
        }}
        journalist={importDialogJournalist}
        organizationId={currentOrganization?.id || ''}
        onSuccess={() => {
          showAlert('success', 'Import erfolgreich', 'Journalist wurde zu Ihrem CRM hinzugefügt');
          loadData(); // Reload data
        }}
      />

      {/* Detail Modal */}
      {detailJournalist && (
        <Dialog open={!!detailJournalist} onClose={() => setDetailJournalist(null)} size="4xl">
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {detailJournalist.personalData.displayName}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {detailJournalist.professionalData.employment.position || journalist.personalData.name.first + ' ' + journalist.personalData.name.last}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* TODO: Remove verification status - only exists for publications */}
                {/* {detailJournalist.metadata?.verification?.status === 'verified' && (
                  <Badge color="green" className="text-xs">
                    <CheckBadgeIcon className="h-3 w-3 mr-1" />
                    Verifiziert
                  </Badge>
                )} */}
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Score: {detailJournalist.metadata?.dataQuality?.overallScore || 0}
                </div>
              </div>
            </div>
          </DialogTitle>

          <DialogBody>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Kontaktinformationen</h4>
                  <div className="space-y-2">
                    {(detailJournalist.personalData.emails || []).map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4 text-zinc-400" />
                        <a href={`mailto:${email.email}`} className="text-sm text-primary hover:text-primary-hover">
                          {email.email}
                        </a>
                        {email.isPrimary && (
                          <Badge color="zinc" className="text-xs">Primär</Badge>
                        )}
                      </div>
                    ))}
                    {detailJournalist.personalData.phones?.map((phone, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <PhoneIcon className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{phone.number}</span>
                        <Badge color="zinc" className="text-xs">{phone.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Position</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {detailJournalist.professionalData.employment?.position ||
                         detailJournalist.professionalData.employment.position ||
                         journalist.personalData.name.first + ' ' + journalist.personalData.name.last}
                      </span>
                    </div>
                    {detailJournalist.professionalData.employment?.department && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Abteilung: {detailJournalist.professionalData.employment.department}
                      </div>
                    )}
                    {detailJournalist.professionalData.employment?.startDate && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Seit: {new Date(detailJournalist.professionalData.employment.startDate).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NEUE SECTION: Company/Medienhaus */}
              {detailJournalist.professionalData.employment?.company && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center">
                    <NewspaperIcon className="h-4 w-4 mr-2 text-zinc-500" />
                    Medienhaus & Arbeitgeber
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-zinc-900 dark:text-white">
                            {detailJournalist.professionalData.employment.company.name}
                          </h5>
                          <Badge color="blue" className="text-xs">
                            {detailJournalist.professionalData.employment.company.type}
                          </Badge>
                        </div>
                        {detailJournalist.professionalData.employment.company.website && (
                          <a
                            href={detailJournalist.professionalData.employment.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary-hover"
                          >
                            {detailJournalist.professionalData.employment.company.website}
                          </a>
                        )}
                      </div>

                      <div>
                        {detailJournalist.professionalData.employment.company.mediaInfo && (
                          <div className="space-y-1">
                            {detailJournalist.professionalData.employment.company.mediaInfo.targetAudience && (
                              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                Zielgruppe: {detailJournalist.professionalData.employment.company.mediaInfo.targetAudience}
                              </div>
                            )}
                            {detailJournalist.professionalData.employment.company.mediaInfo.reach && (
                              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                Reichweite: {detailJournalist.professionalData.employment.company.mediaInfo.reach.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Import-Button für Company falls nicht im lokalen CRM vorhanden */}
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <Button
                        size="sm"
                        color="zinc"
                        className="text-xs"
                        disabled={false}
                      >
                        Medienhaus ins CRM importieren
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* NEUE SECTION: Publikationen */}
              {detailJournalist.professionalData.publicationAssignments &&
               detailJournalist.professionalData.publicationAssignments.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center">
                    <GlobeAltIcon className="h-4 w-4 mr-2 text-zinc-500" />
                    Publikationen ({detailJournalist.professionalData.publicationAssignments.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailJournalist.professionalData.publicationAssignments.map((assignment, index) => (
                      <div key={index} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-zinc-900 dark:text-white truncate">
                              {assignment.publication.title}
                            </h5>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge color="green" className="text-xs">
                                {assignment.publication.type}
                              </Badge>
                              <Badge color="zinc" className="text-xs">
                                {assignment.publication.format}
                              </Badge>
                              {assignment.isMainPublication && (
                                <Badge color="yellow" className="text-xs">
                                  Haupt-Publikation
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            Rolle: <span className="font-medium">{roleTranslations[assignment.role as keyof typeof roleTranslations] || assignment.role}</span>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            Häufigkeit: {frequencyTranslations[assignment.contributionFrequency as keyof typeof frequencyTranslations] || assignment.contributionFrequency}
                          </div>
                          {assignment.publication.frequency && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Erscheinung: {frequencyTranslations[assignment.publication.frequency as keyof typeof frequencyTranslations] || assignment.publication.frequency}
                            </div>
                          )}
                        </div>

                        {/* Spezifische Themen für diese Publikation */}
                        {assignment.topics && assignment.topics.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                              Themen für diese Publikation:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {assignment.topics.slice(0, 3).map((topic, topicIndex) => (
                                <Badge key={topicIndex} color="blue" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                              {assignment.topics.length > 3 && (
                                <Badge color="zinc" className="text-xs">
                                  +{assignment.topics.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Import-Checkbox für diese Publikation */}
                        <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                          <label className="flex items-center space-x-2 text-xs">
                            <input
                              type="checkbox"
                              defaultChecked={assignment.isMainPublication}
                              className="rounded border-zinc-300 text-primary"
                            />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              Diese Publikation mit importieren
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              <div>
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
                  Themen ({(detailJournalist.professionalData.expertise.primaryTopics || []).length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(detailJournalist.professionalData.expertise.primaryTopics || []).map((topic, index) => (
                    <Badge key={index} color="zinc" className="text-sm">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Social Media */}
              {(detailJournalist.socialMedia?.profiles || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Social Media</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(detailJournalist.socialMedia?.profiles || []).map((profile, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <div>
                          <div className="font-medium text-sm text-zinc-900 dark:text-white capitalize">
                            {profile.platform}
                          </div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {(profile.followerCount || profile.followers || 0).toLocaleString()} Follower
                          </div>
                        </div>
                        <a
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover"
                        >
                          <GlobeAltIcon className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Types */}
              <div>
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Medientypen</h4>
                <div className="flex flex-wrap gap-2">
                  {(detailJournalist.professionalData.mediaTypes || []).map((type, index) => (
                    <Badge key={index} color="blue" className="text-sm capitalize">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* TODO: Remove Verification Info - only exists for publications */}
              {/* {detailJournalist.metadata?.verification?.status === 'verified' && detailJournalist.metadata?.verification?.verifiedAt && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckBadgeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-200">
                        Verifiziert
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Verifiziert am: {new Date(detailJournalist.metadata.verification.verifiedAt).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </DialogBody>

          <DialogActions>
            <Button variant="outline" onClick={() => setDetailJournalist(null)}>
              Schließen
            </Button>
            <Button
              onClick={() => {
                handleImport(detailJournalist);
                setDetailJournalist(null);
              }}
              disabled={!subscription?.features.importEnabled}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Importieren
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}