"use client";

import { useState, useMemo, useCallback, Fragment, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { JournalistImportDialog } from "@/components/journalist/JournalistImportDialog";
import { companyTypeLabels, ContactEnhanced } from "@/types/crm-enhanced";
import {
  useGlobalJournalists,
  useImportedJournalists,
  useCreateJournalistReference,
  useRemoveJournalistReference,
  useCompanies,
  usePublications
} from '@/lib/hooks/useEditorsData';
import EmptyState from './components/shared/EmptyState';
import { toastService } from '@/lib/utils/toast';

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

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from "@/components/ui/dropdown";
import { Checkbox } from "@/components/ui/checkbox";
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
  TagIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
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

type MediaTypeOption = 'print' | 'online' | 'tv' | 'radio' | 'podcast' | string;
type VerificationStatusOption = 'verified' | 'pending' | 'unverified' | string;

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
    employment?: {
      company: {
        name: string;
        type: string;
        website?: string;
      };
      position: string;
    };
    expertise: {
      primaryTopics: string[];
      secondaryTopics?: string[];
      industries?: string[];
    };
    mediaTypes: MediaTypeOption[];
    publicationAssignments?: Array<{
      publication: {
        title: string;
        type: string;
        format?: string;
        frequency?: string;
        globalPublicationId: string;
      };
      role: string;
      isMainPublication: boolean;
    }>;
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
      status: VerificationStatusOption;
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

// Main Component
export default function EditorsPage() {
  const t = useTranslations('editors');
  const tToast = useTranslations('toasts');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // React Query Hooks
  const { data: journalists = [], isLoading: loadingJournalists } = useGlobalJournalists();
  const { data: importedIds, isLoading: loadingImported } = useImportedJournalists(currentOrganization?.id);
  const { data: companies = [] } = useCompanies(currentOrganization?.id);
  const { data: publications = [] } = usePublications(currentOrganization?.id);
  const createReference = useCreateJournalistReference();
  const removeReference = useRemoveJournalistReference();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [subscription, setSubscription] = useState<JournalistSubscription | null>(null);
  const loading = loadingJournalists || loadingImported;

  // Debounce searchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter States
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaTypeOption[]>([]);
  const [minQualityScore, setMinQualityScore] = useState<number>(0);

  // UI States
  const [detailJournalist, setDetailJournalist] = useState<JournalistDatabaseEntry | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDialogJournalist, setImportDialogJournalist] = useState<JournalistDatabaseEntry | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Initialize mock subscription
  useMemo(() => {
    if (!currentOrganization) return null;

    const mockSubscription: JournalistSubscription = {
      organizationId: currentOrganization.id,
      plan: 'professional',
      status: 'active',
      billing: {
        startDate: new Date() as any,
        currentPeriodStart: new Date() as any,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) as any
      },
      features: {
        searchEnabled: true,
        importEnabled: true,
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
    return mockSubscription;
  }, [currentOrganization]);

  // Transform CRM contacts to JournalistDatabaseEntry format
  const convertedJournalists = useMemo(() => {
    if (!journalists || !companies || !publications) return [];

    return journalists.map((contact: any) => {
      let company = companies.find((c: any) => c.id === contact.companyId);

      if (!company && contact.companyId && contact.companyName) {
        company = {
          id: contact.companyId,
          name: contact.companyName,
          type: contact.companyType || 'media_house'
        } as any;
      }

      const companyType = company?.type || 'other';
      let publicationAssignments: any[] = [];

      const directPublicationIds = contact.mediaProfile?.publicationIds || [];
      const directPublications = publications.filter((pub: any) =>
        directPublicationIds.includes(pub.id!)
      );

      if (directPublications.length > 0) {
        publicationAssignments = directPublications.map((publication: any) => ({
          publication: {
            title: publication.title || publication.name || '',
            type: publication.type,
            format: publication.format,
            frequency: publication.metrics?.frequency,
            globalPublicationId: publication.id
          },
          role: contact.position || 'reporter',
          isMainPublication: false
        }));
      } else if (company || contact.companyName) {
        const companyPublications = company ? publications.filter((pub: any) =>
          pub.companyId === company.id || pub.publisherId === company.id
        ) : [];

        if (companyPublications.length > 0) {
          publicationAssignments = companyPublications.map((publication: any) => ({
            publication: {
              title: publication.title || publication.name || '',
              type: publication.type,
              format: publication.format,
              frequency: publication.metrics?.frequency,
              globalPublicationId: publication.id
            },
            role: contact.position || 'editor',
            isMainPublication: false
          }));
        } else {
          const companyName = company?.name || contact.companyName || '';
          publicationAssignments = [{
            publication: {
              title: companyName,
              type: companyTypeLabels[companyType] || 'other',
              globalPublicationId: company ? `company-${company.id}` : `company-${contact.companyId}`
            },
            role: contact.position || 'employee',
            isMainPublication: true
          }];
        }
      }

      return {
        id: contact.id,
        globalId: contact.id,
        version: 1,
        lastModifiedBy: contact.updatedBy || '',
        organizationId: contact.organizationId || '',
        createdAt: contact.createdAt || new Date(),
        updatedAt: contact.updatedAt || new Date(),
        createdBy: contact.createdBy || '',
        updatedBy: contact.updatedBy || '',
        personalData: {
          name: {
            firstName: contact.name?.firstName || contact.displayName.split(' ')[0] || '',
            lastName: contact.name?.lastName || contact.displayName.split(' ')[1] || ''
          },
          displayName: contact.displayName,
          emails: contact.emails || [],
          phones: contact.phones || [],
          languages: contact.personalInfo?.languages || ['de']
        },
        professionalData: {
          currentEmployment: {
            mediumName: contact.companyName || '',
            position: contact.position || '',
            department: '',
            isFreelance: !contact.companyName
          },
          employment: {
            company: {
              name: contact.companyName || '',
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
            totalFollowers: 0,
            influenceScore: contact.mediaProfile?.influence?.score || 0,
            reachScore: contact.mediaProfile?.influence?.reach || 0,
            engagementScore: contact.mediaProfile?.influence?.engagement || 0,
            lastCalculated: new Date()
          }
        },
        metadata: {
          verification: {
            status: 'verified' as VerificationStatusOption,
            method: 'system',
            verifiedAt: new Date()
          },
          dataQuality: {
            completeness: 0,
            accuracy: 0,
            freshness: 0,
            overallScore: calculateQualityScore(contact)
          },
          sources: []
        },
        analytics: {
          articleMetrics: {
            totalArticles: 0,
            averageReach: 0,
            totalReach: 0,
            averageEngagement: 0
          },
          sentimentAnalysis: {
            averageSentiment: 0,
            sentimentDistribution: {
              positive: 0,
              neutral: 0,
              negative: 0
            },
            lastAnalyzed: new Date()
          },
          topicDistribution: [],
          responseMetrics: {
            responseRate: 0,
            averageResponseTime: 0
          },
          trends: {
            activityTrend: 'stable'
          }
        },
        gdpr: {
          consent: {
            status: 'unknown'
          },
          communicationPreferences: {
            allowEmails: false,
            allowDataSharing: false,
            allowProfiling: false,
            preferredLanguage: 'de'
          },
          dataRights: {}
        },
        syncInfo: {
          linkedOrganizations: [],
          masterSyncStatus: {
            pendingChanges: 0,
            syncHealth: 'healthy'
          },
          changeHistory: []
        }
      } as JournalistDatabaseEntry;
    });
  }, [journalists, companies, publications]);

  // Filter journalists
  const filteredJournalists = useMemo(() => {
    return (convertedJournalists || []).filter(journalist => {
      // Search term (debounced)
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matches =
          journalist.personalData.displayName.toLowerCase().includes(searchLower) ||
          (journalist.professionalData.employment?.company?.name || '').toLowerCase().includes(searchLower) ||
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

      // Quality score filter
      if (minQualityScore > 0) {
        if ((journalist.metadata?.dataQuality?.overallScore || 0) < minQualityScore) {
          return false;
        }
      }

      return true;
    });
  }, [convertedJournalists, debouncedSearchTerm, selectedTopics, selectedMediaTypes, minQualityScore]);

  // Paginated Data
  const paginatedJournalists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJournalists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJournalists, currentPage, itemsPerPage]);

  // Get unique topics for filter
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    (convertedJournalists || []).forEach(j => {
      if (j?.professionalData?.expertise?.primaryTopics) {
        j.professionalData.expertise.primaryTopics.forEach(topic => topicsSet.add(topic));
      }
    });
    return Array.from(topicsSet).sort();
  }, [convertedJournalists]);

  // Check if current user is SuperAdmin
  const isSuperAdmin = useMemo(() =>
    currentOrganization?.id === "superadmin-org",
    [currentOrganization?.id]
  );

  // Reference Import Handler (muss VOR handleToggleReference definiert werden)
  const handleImportReference = useCallback(async (journalist: JournalistDatabaseEntry) => {
    // SuperAdmin sollte sich nicht selbst referenzieren
    if (isSuperAdmin) {
      toastService.info(tToast('editors.superAdminNoReference'));
      return;
    }

    if (!subscription?.features.importEnabled) {
      toastService.warning(tToast('editors.importRequiresPremium'));
      return;
    }

    setImportingIds(prev => new Set([...prev, journalist.id!]));

    try {
      await createReference.mutateAsync({
        journalistId: journalist.id,
        organizationId: currentOrganization!.id,
        userId: user!.uid,
        notes: `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      });

      toastService.success(tToast('editors.journalistImported', { name: journalist.personalData.displayName }));
    } catch (error) {
      toastService.error(error instanceof Error ? tToast('editors.importFailed', { message: error.message }) : tToast('editors.importFailedGeneric'));
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id!);
        return newSet;
      });
    }
  }, [isSuperAdmin, subscription, currentOrganization, user, createReference]);

  // Reference Remove Handler
  const handleRemoveReference = useCallback(async (journalist: JournalistDatabaseEntry) => {
    if (!currentOrganization || !user) return;

    setImportingIds(prev => new Set([...prev, journalist.id!]));

    try {
      await removeReference.mutateAsync({
        journalistId: journalist.id,
        organizationId: currentOrganization.id
      });

      toastService.success(tToast('editors.referenceRemoved', { name: journalist.personalData.displayName }));
    } catch (error) {
      toastService.error(tToast('editors.referenceRemoveError'));
    } finally{
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id!);
        return newSet;
      });
    }
  }, [currentOrganization, user, removeReference]);

  // Toggle-Funktion für Import/Remove
  const handleToggleReference = useCallback(async (journalist: JournalistDatabaseEntry) => {
    const isImported = importedIds?.has(journalist.id);

    if (isImported) {
      await handleRemoveReference(journalist);
    } else {
      await handleImportReference(journalist);
    }
  }, [importedIds, handleRemoveReference, handleImportReference]);

  const handleUpgrade = useCallback((journalist: JournalistDatabaseEntry) => {
    setImportDialogJournalist(journalist);
    setShowImportDialog(true);
  }, []);

  const handleViewDetails = useCallback((journalist: JournalistDatabaseEntry) => {
    setDetailJournalist(journalist);
  }, []);

  // Filter Handlers
  const handleTopicToggle = useCallback((topic: string, checked: boolean) => {
    if (checked) {
      setSelectedTopics(prev => [...prev, topic]);
    } else {
      setSelectedTopics(prev => prev.filter(t => t !== topic));
    }
  }, []);

  const handleQualityScoreChange = useCallback((score: number) => {
    setMinQualityScore(score);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedTopics([]);
    setSelectedMediaTypes([]);
    setMinQualityScore(0);
  }, []);

  // Computed values (MUSS VOR Pagination Handlers definiert werden!)
  const activeFiltersCount = useMemo(() =>
    selectedTopics.length + selectedMediaTypes.length + (minQualityScore > 0 ? 1 : 0),
    [selectedTopics.length, selectedMediaTypes.length, minQualityScore]
  );

  const totalPages = useMemo(() =>
    Math.ceil(filteredJournalists.length / itemsPerPage),
    [filteredJournalists.length, itemsPerPage]
  );

  // Pagination Handlers
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-4">{t('loading')}</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search.placeholder')}
              className={clsx(
                'block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm',
                'placeholder:text-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                'h-10'
              )}
            />
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
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  )}
                  aria-label="Filter"
                >
                  <FunnelIcon className="h-5 w-5 stroke-2" />
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
                  <Popover.Panel className="absolute right-0 z-10 mt-2 w-[600px] origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div>
                      {/* 2-spaltiges Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Topics Filter */}
                        <div className="mb-[10px]">
                          <label className="block text-sm font-semibold text-zinc-700 mb-1">
                            {t('filters.topics')}
                          </label>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {(availableTopics || []).slice(0, 8).map((topic) => (
                              <label key={topic} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={selectedTopics.includes(topic)}
                                  onChange={(checked) => handleTopicToggle(topic, checked)}
                                />
                                <span className="text-sm text-zinc-700">
                                  {topic}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quality Score Filter - volle Breite */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">
                          {t('filters.qualityScore', { score: minQualityScore })}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={minQualityScore}
                          onChange={(e) => handleQualityScoreChange(Number(e.target.value))}
                          className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Reset Button */}
                      {activeFiltersCount > 0 && (
                        <div className="flex justify-end pt-2 border-t border-zinc-200">
                          <button
                            onClick={handleResetFilters}
                            className="text-sm text-zinc-500 hover:text-zinc-700 underline"
                          >
                            {t('filters.reset')}
                          </button>
                        </div>
                      )}
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600">
          {t('results.info', { filtered: filteredJournalists.length, total: (journalists || []).length })}
        </Text>
      </div>

      {/* Results */}
      {filteredJournalists.length > 0 ? (
        // Table View
        <div className="bg-white rounded-lg shadow-sm overflow-visible">
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center">
                <div className="flex-1 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {t('table.journalist')}
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {t('table.mediaHouse')}
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {t('table.publications')}
                </div>
                <div className="w-24 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">
                  {t('table.score')}
                </div>
                <div className="w-16 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">
                  {t('table.topics')}
                </div>
                <div className="w-40 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {t('table.contact')}
                </div>
                <div className="w-24 text-center"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-200">
              {(paginatedJournalists || []).map((journalist) => {
                const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email ||
                                    journalist.personalData.emails[0]?.email;
                const hasPhone = journalist.personalData.phones && journalist.personalData.phones.length > 0;
                const primaryPhone = journalist.personalData.phones?.find(p => p.isPrimary)?.number ||
                                    journalist.personalData.phones?.[0]?.number;
                const primaryTopics = (journalist.professionalData.expertise.primaryTopics || []).slice(0, 2);
                const canImport = subscription?.status === 'active' && subscription.features.importEnabled && !isSuperAdmin;

                return (
                  <div key={journalist.id} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center">
                      {/* Journalist Name */}
                      <div className="flex-1 px-4 min-w-0">
                        <button
                          onClick={() => handleViewDetails(journalist)}
                          className="text-sm font-semibold text-zinc-900 hover:text-primary block truncate text-left"
                        >
                          {journalist.personalData.displayName}
                        </button>
                      </div>

                      {/* Company/Medienhaus */}
                      <div className="w-48 px-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-900 truncate">
                            {journalist.professionalData.employment?.company?.name || t('labels.freelance')}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {companyTypeLabels[journalist.professionalData.employment?.company?.type as keyof typeof companyTypeLabels] || t('labels.unknown')}
                          </div>
                        </div>
                      </div>

                      {/* Publications */}
                      <div className="w-48 px-4">
                        {(journalist.professionalData.publicationAssignments || []).length > 0 ? (
                          <div className="flex items-center gap-1">
                            {(journalist.professionalData.publicationAssignments || []).slice(0, 2).map((assignment, index) => {
                              const title = assignment.publication.title;
                              const truncatedTitle = title.length > 12 ? title.substring(0, 12) + '...' : title;
                              return (
                                <Badge key={index} color="blue" className="text-xs" title={title}>
                                  {truncatedTitle}
                                </Badge>
                              );
                            })}
                            {(journalist.professionalData.publicationAssignments || []).length > 2 && (
                              <Badge color="zinc" className="text-xs">
                                +{(journalist.professionalData.publicationAssignments || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            {t('noPublications')}
                          </span>
                        )}
                      </div>


                      {/* Quality Score */}
                      <div className="w-24 px-4 text-center">
                        <div className="text-sm font-medium text-zinc-700">
                          {journalist.metadata?.dataQuality?.overallScore || 0}
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="w-16 px-4 text-center">
                        <Popover className="relative">
                          {({ open }) => (
                            <>
                              <Popover.Button className="flex items-center justify-center p-1 rounded-md hover:bg-zinc-100 transition-colors">
                                <TagIcon className="h-4 w-4 text-zinc-700" />
                                <span className="ml-1 text-xs text-zinc-500">
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
                                <Popover.Panel className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-zinc-200 p-3 min-w-[200px] left-1/2 transform -translate-x-1/2">
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-zinc-700 mb-2">
                                      {t('topicsPopover.title', { count: (journalist.professionalData.expertise.primaryTopics || []).length })}
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
                            onClick={() => handleToggleReference(journalist)}
                            disabled={importingIds.has(journalist.id!)}
                            className={`text-xs px-3 py-1.5 flex items-center gap-1 ${
                              importedIds?.has(journalist.id)
                                ? 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                                : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                            }`}
                            style={importedIds?.has(journalist.id) ? {
                              backgroundColor: '#DEDC00',
                              color: '#000000',
                              borderColor: '#DEDC00'
                            } : {
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              border: '1px solid #d1d5db'
                            }}
                            title={t('actions.importContact')}
                          >
                            {importingIds.has(journalist.id!) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              <StarIcon className={`h-3 w-3 ${
                                importedIds?.has(journalist.id) ? 'text-black' : 'text-zinc-500'
                              }`}
                              fill={importedIds?.has(journalist.id) ? 'currentColor' : 'none'} />
                            )}
                          </Button>
                        ) : isSuperAdmin ? (
                          <Button
                            disabled
                            className="!bg-zinc-100 !border !border-zinc-200 !text-zinc-400 text-xs px-3 py-1.5 cursor-not-allowed"
                          >
                            {t('actions.inCrm')}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpgrade(journalist)}
                            className="!bg-white !border !border-zinc-300 !text-zinc-700 hover:!bg-zinc-100 text-xs px-3 py-1.5"
                            title={t('actions.importContact')}
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
      ) : (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon />
              {t('pagination.previous')}
            </Button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {(() => {
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, start + maxVisible - 1);

              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    plain
                    onClick={() => handleGoToPage(i)}
                    className={currentPage === i ? 'font-semibold text-primary' : ''}
                  >
                    {i}
                  </Button>
                );
              }

              return pages;
            })()}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <Button
              plain
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {t('pagination.next')}
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
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
          toastService.success(tToast('editors.journalistAddedToCrm'));
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
                    {detailJournalist.professionalData.employment?.position || detailJournalist.personalData.name.firstName + ' ' + detailJournalist.personalData.name.lastName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('detail.score', { score: detailJournalist.metadata?.dataQuality?.overallScore || 0 })}
                  </p>
                </div>
              </div>
            </div>
          </DialogTitle>

          <DialogBody className="p-0">
            <div className="px-6 py-6 h-[500px] overflow-y-auto space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('detail.contactInfo')}</h4>
                  <div className="space-y-2">
                    {(detailJournalist.personalData.emails || []).map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4 text-zinc-400" />
                        <a href={`mailto:${email.email}`} className="text-sm text-primary hover:text-primary-hover">
                          {email.email}
                        </a>
                        {email.isPrimary && (
                          <Badge color="zinc" className="text-xs">{t('detail.primary')}</Badge>
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('detail.position')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {detailJournalist.professionalData.employment?.position ||
                         detailJournalist.personalData.name.firstName + ' ' + detailJournalist.personalData.name.lastName}
                      </span>
                    </div>
                    {detailJournalist.professionalData.currentEmployment?.department && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t('detail.department', { department: detailJournalist.professionalData.currentEmployment.department })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NEUE SECTION: Company/Medienhaus */}
              {detailJournalist.professionalData.employment?.company && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <NewspaperIcon className="h-4 w-4 mr-2 text-zinc-500" />
                    {t('detail.mediaHouse')}
                  </h4>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-zinc-900 dark:text-white">
                        {detailJournalist.professionalData.employment.company.name}
                      </h5>
                      <Badge color="blue" className="text-xs">
                        {companyTypeLabels[detailJournalist.professionalData.employment.company.type as keyof typeof companyTypeLabels] || detailJournalist.professionalData.employment.company.type}
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
                </div>
              )}

              {/* NEUE SECTION: Publikationen */}
              {detailJournalist.professionalData.publicationAssignments &&
               detailJournalist.professionalData.publicationAssignments.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <GlobeAltIcon className="h-4 w-4 mr-2 text-zinc-500" />
                    {t('detail.publications', { count: detailJournalist.professionalData.publicationAssignments.length })}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailJournalist.professionalData.publicationAssignments.map((assignment, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-zinc-900 dark:text-white truncate">
                              {assignment.publication.title}
                            </h5>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge color="green" className="text-xs">
                                {assignment.publication.type}
                              </Badge>
                              {assignment.publication.format && (
                                <Badge color="zinc" className="text-xs">
                                  {assignment.publication.format}
                                </Badge>
                              )}
                              {assignment.isMainPublication && (
                                <Badge color="yellow" className="text-xs">
                                  {t('detail.mainPublication')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {t('detail.role', { role: t(`roles.${assignment.role}`, { default: assignment.role }) })}
                          </div>
                          {assignment.publication.frequency && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              {t('detail.frequency', { frequency: t(`frequency.${assignment.publication.frequency}`, { default: assignment.publication.frequency }) })}
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {t('detail.topicsSection', { count: (detailJournalist.professionalData.expertise.primaryTopics || []).length })}
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('detail.socialMedia')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(detailJournalist.socialMedia?.profiles || []).map((profile, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-sm text-zinc-900 dark:text-white capitalize">
                            {profile.platform}
                          </div>
                          {profile.verified && (
                            <CheckBadgeIcon className="h-4 w-4 text-green-600" />
                          )}
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('detail.mediaTypes')}</h4>
                <div className="flex flex-wrap gap-2">
                  {(detailJournalist.professionalData.mediaTypes || []).map((type, index) => (
                    <Badge key={index} color="blue" className="text-sm capitalize">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogActions className="px-6 py-4">
            <Button plain onClick={() => setDetailJournalist(null)}>
              {t('detail.close')}
            </Button>
            <Button
              onClick={() => {
                handleToggleReference(detailJournalist);
                setDetailJournalist(null);
              }}
              disabled={!subscription?.features.importEnabled}
              className={`${
                importedIds?.has(detailJournalist?.id)
                  ? 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
              style={importedIds?.has(detailJournalist?.id) ? {
                backgroundColor: '#DEDC00',
                color: '#000000',
                borderColor: '#DEDC00'
              } : {
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                border: '1px solid #d1d5db'
              }}
            >
              <StarIcon className={`h-4 w-4 mr-2 ${
                importedIds?.has(detailJournalist?.id) ? 'text-black' : 'text-gray-500'
              }`}
              fill={importedIds?.has(detailJournalist?.id) ? 'currentColor' : 'none'} />
              {importedIds?.has(detailJournalist?.id) ? t('detail.removeReference') : t('detail.addReference')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}