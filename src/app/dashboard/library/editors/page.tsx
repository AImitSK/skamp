"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { multiEntityService } from "@/lib/firebase/multi-entity-reference-service";
import { JournalistImportDialog } from "@/components/journalist/JournalistImportDialog";
import { companyTypeLabels, ContactEnhanced } from "@/types/crm-enhanced";
import { contactsEnhancedService, companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
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
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
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

  // Filter States
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaType[]>([]);
  const [minQualityScore, setMinQualityScore] = useState<number>(0);

  // UI States
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [detailJournalist, setDetailJournalist] = useState<JournalistDatabaseEntry | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedJournalistIds, setImportedJournalistIds] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDialogJournalist, setImportDialogJournalist] = useState<JournalistDatabaseEntry | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

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
          importEnabled: true, // Aktiviert für Reference-System Testing
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


      // Load companies for type lookup (lokale + globale)
      let companiesData = [];
      try {
        // Lokale Companies der aktuellen Organisation
        const localCompanies = await companiesEnhancedService.getAll(currentOrganization.id);

        // Globale Companies für globale Journalisten
        // Versuche verschiedene Ansätze für globale Companies
        let globalCompanies = [];

        // 1. Versuche mit isGlobal flag
        try {
          const globalCompaniesQuery = query(
            collection(db, 'companies_enhanced'),
            where('isGlobal', '==', true)
          );
          const globalSnapshot = await getDocs(globalCompaniesQuery);
          globalCompanies = globalSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as CompanyEnhanced[];
        } catch (e) {
          console.error('Fehler beim Laden globaler Companies mit isGlobal:', e);
        }

        // 2. Falls keine gefunden, versuche Companies von SuperAdmin zu laden
        if (globalCompanies.length === 0) {
          try {
            globalCompanies = await companiesEnhancedService.getAll('superadmin-org');
          } catch (e) {
            console.error('Fehler beim Laden von SuperAdmin Companies:', e);
          }
        }

        // Kombiniere beide ohne Duplikate
        const allCompanies = [...localCompanies];
        globalCompanies.forEach(globalComp => {
          if (!allCompanies.find(localComp => localComp.id === globalComp.id)) {
            allCompanies.push(globalComp);
          }
        });

        companiesData = allCompanies;
      } catch (error) {
        console.error('❌ Error loading companies:', error);
      }

      // Load publications for assignments (lokale + globale via References)
      let publicationsData = [];
      try {
        // ✅ publicationService lädt automatisch lokale + referenced publications
        const allPublications = await publicationService.getAll(currentOrganization.id);

        publicationsData = allPublications;
      } catch (error) {
        console.error('❌ Error loading publications:', error);
      }

      // Konvertiere CRM-Kontakte zu JournalistDatabaseEntry Format
      const convertedJournalists = globalJournalists.map((contact) => {
        // Company Type Lookup
        let company = companiesData.find(c => c.id === contact.companyId);

        // Fallback: Erstelle Company-Objekt aus Contact-Daten wenn nicht gefunden
        if (!company && contact.companyId && contact.companyName) {
          company = {
            id: contact.companyId,
            name: contact.companyName,
            type: contact.companyType || 'media_house', // Vermutlich ein Medienhaus
            isGlobal: true
          } as CompanyEnhanced;

          // Füge zur companiesData hinzu für weitere Verwendung
          companiesData.push(company);
        }

        const companyType = company?.type || 'other';

        // Publications Lookup - Hierarchie: Company -> Publications -> Redakteure
        let publicationAssignments = [];

        // 1. Direkte Publication-IDs (falls vorhanden)
        const directPublicationIds = contact.mediaProfile?.publicationIds || [];
        const directPublications = publicationsData.filter(pub =>
          directPublicationIds.includes(pub.id!)
        );

        if (directPublications.length > 0) {
          publicationAssignments = directPublications.map(publication => ({
            publication: {
              title: publication.title || (publication as any).name || 'Unbekannt',
              type: publication.type,
              format: publication.format,
              frequency: publication.metrics?.frequency,
              globalPublicationId: publication.id
            },
            role: contact.position || 'reporter',
            isMainPublication: false
          }));
        }
        // 2. Fallback: Erstelle aus Company/Contact-Daten wenn keine Publications gefunden
        else if (company || contact.companyName) {
          // Finde Publications, die zu dieser Company gehören
          const companyPublications = company ? publicationsData.filter(pub =>
            pub.companyId === company.id || pub.publisherId === company.id
          ) : [];

          if (companyPublications.length > 0) {
            publicationAssignments = companyPublications.map(publication => ({
              publication: {
                title: publication.title || (publication as any).name || 'Unbekannt',
                type: publication.type,
                format: publication.format,
                frequency: publication.metrics?.frequency,
                globalPublicationId: publication.id
              },
              role: contact.position || 'Redakteur',
              isMainPublication: false
            }));
          } else {
            // Erstelle Placeholder-Publication aus Company-Daten
            const companyName = company?.name || contact.companyName || 'Unbekannt';
            publicationAssignments = [{
              publication: {
                title: companyName,
                type: companyTypeLabels[companyType] || 'Sonstige',
                globalPublicationId: company ? `company-${company.id}` : `company-${contact.companyId}`
              },
              role: contact.position || 'Mitarbeiter',
              isMainPublication: true
            }];
          }
        }

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
      });

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

      // Quality score filter
      if (minQualityScore > 0) {
        if ((journalist.metadata?.dataQuality?.overallScore || 0) < minQualityScore) {
          return false;
        }
      }

      return true;
    });
  }, [journalists, searchTerm, selectedTopics, selectedMediaTypes, minQualityScore]);

  // Paginated Data
  const paginatedJournalists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJournalists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJournalists, currentPage, itemsPerPage]);

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

  // Check if current user is SuperAdmin
  const isSuperAdmin = currentOrganization?.id === "superadmin-org";

  // Lade importierte Journalist-IDs
  const loadImportedJournalists = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const references = await multiEntityService.getAllContactReferences(currentOrganization.id);
      const importedIds = new Set(references.map(ref => ref._globalJournalistId));
      setImportedJournalistIds(importedIds);
    } catch (error) {
      console.error('Fehler beim Laden der importierten Journalisten:', error);
    }
  }, [currentOrganization]);

  // Lade importierte Journalisten beim Mount und bei Organization-Wechsel
  useEffect(() => {
    loadImportedJournalists();
  }, [loadImportedJournalists]);

  // Reference Remove Handler
  const handleRemoveReference = async (journalist: JournalistDatabaseEntry) => {
    if (!currentOrganization || !user) return;

    setImportingIds(prev => new Set([...prev, journalist.id!]));

    try {
      await multiEntityService.removeJournalistReference(
        journalist.id,
        currentOrganization.id
      );

      setImportedJournalistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id);
        return newSet;
      });

      showAlert('success', 'Verweis entfernt',
        `${journalist.personalData.displayName} wurde aus Ihren Verweisen entfernt.`);
    } catch (error) {
      console.error('Fehler beim Entfernen der Reference:', error);
      showAlert('error', 'Fehler', 'Der Verweis konnte nicht entfernt werden.');
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id!);
        return newSet;
      });
    }
  };

  // Toggle-Funktion für Import/Remove
  const handleToggleReference = async (journalist: JournalistDatabaseEntry) => {
    const isImported = importedJournalistIds.has(journalist.id);

    if (isImported) {
      await handleRemoveReference(journalist);
    } else {
      await handleImportReference(journalist);
    }
  };

  // Reference Import handlers
  const handleImportReference = async (journalist: JournalistDatabaseEntry) => {
    // SuperAdmin sollte sich nicht selbst referenzieren
    if (isSuperAdmin) {
      showAlert('info', 'SuperAdmin-Hinweis', 'Als SuperAdmin verwalten Sie diese Journalisten direkt im CRM. Ein Verweis ist nicht nötig.');
      return;
    }

    if (!subscription?.features.importEnabled) {
      showAlert('warning', 'Premium-Feature', 'Das Importieren von Journalisten ist nur mit einem Premium-Abo verfügbar.');
      return;
    }

    setImportingIds(prev => new Set([...prev, journalist.id!]));

    try {
      // Multi-Entity Reference erstellen (Company + Publications + Journalist)
      const result = await multiEntityService.createJournalistReference(
        journalist.id,
        currentOrganization!.id,
        user!.uid,
        `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      );

      if (result.success) {
        // State sofort aktualisieren
        setImportedJournalistIds(prev => new Set([...prev, journalist.id]));

        showAlert('success', 'Multi-Entity Verweis erstellt',
          `${journalist.personalData.displayName} wurde mit Company und Publications als Verweis hinzugefügt.`);
      } else {
        showAlert('error', 'Import fehlgeschlagen',
          result.errors?.join(', ') || 'Unbekannter Fehler');
      }
    } catch (error) {
      showAlert('error', 'Import fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(journalist.id!);
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

  const activeFiltersCount = selectedTopics.length + selectedMediaTypes.length + (minQualityScore > 0 ? 1 : 0);
  const totalPages = Math.ceil(filteredJournalists.length / itemsPerPage);

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
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
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
                            Themen
                          </label>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {(availableTopics || []).slice(0, 8).map((topic) => (
                              <label key={topic} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={selectedTopics.includes(topic)}
                                  onChange={(checked) => {
                                    if (checked) {
                                      setSelectedTopics([...selectedTopics, topic]);
                                    } else {
                                      setSelectedTopics(selectedTopics.filter(t => t !== topic));
                                    }
                                  }}
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
                          Mindest-Qualitätsscore: {minQualityScore}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={minQualityScore}
                          onChange={(e) => setMinQualityScore(Number(e.target.value))}
                          className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Reset Button */}
                      {activeFiltersCount > 0 && (
                        <div className="flex justify-end pt-2 border-t border-zinc-200">
                          <button
                            onClick={() => {
                              setSelectedTopics([]);
                              setSelectedMediaTypes([]);
                              setMinQualityScore(0);
                            }}
                            className="text-sm text-zinc-500 hover:text-zinc-700 underline"
                          >
                            Zurücksetzen
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
          {filteredJournalists.length} von {(journalists || []).length} Journalisten
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
                  Journalist
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Medienhaus
                </div>
                <div className="w-48 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Publikationen
                </div>
                <div className="w-24 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">
                  Score
                </div>
                <div className="w-16 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">
                  Themen
                </div>
                <div className="w-40 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Kontakt
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
                        <div className="flex items-center space-x-2">
                          <NewspaperIcon className="h-4 w-4 text-zinc-700 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-900 truncate">
                              {journalist.professionalData.employment.company?.name || 'Selbstständig'}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {companyTypeLabels[journalist.professionalData.employment?.company?.type as keyof typeof companyTypeLabels] || 'Medienhaus'}
                            </div>
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
                            Keine Publikationen
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
                            onClick={() => handleToggleReference(journalist)}
                            disabled={importingIds.has(journalist.id!)}
                            className={`text-xs px-3 py-1.5 flex items-center gap-1 ${
                              importedJournalistIds.has(journalist.id)
                                ? 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                                : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200'
                            }`}
                            style={importedJournalistIds.has(journalist.id) ? {
                              backgroundColor: '#DEDC00',
                              color: '#000000',
                              borderColor: '#DEDC00'
                            } : {
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              border: '1px solid #d1d5db'
                            }}
                            title="Kontakt importieren"
                          >
                            {importingIds.has(journalist.id!) ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              <StarIcon className={`h-3 w-3 ${
                                importedJournalistIds.has(journalist.id) ? 'text-black' : 'text-zinc-500'
                              }`}
                              fill={importedJournalistIds.has(journalist.id) ? 'currentColor' : 'none'} />
                            )}
                          </Button>
                        ) : isSuperAdmin ? (
                          <Button
                            disabled
                            className="!bg-zinc-100 !border !border-zinc-200 !text-zinc-400 text-xs px-3 py-1.5 cursor-not-allowed"
                          >
                            Im CRM
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpgrade(journalist)}
                            className="!bg-white !border !border-zinc-300 !text-zinc-700 hover:!bg-zinc-100 text-xs px-3 py-1.5"
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
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-2 text-sm font-medium text-zinc-900">Keine Journalisten gefunden</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Versuchen Sie andere Suchbegriffe oder Filter.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon />
              Zurück
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
                    onClick={() => setCurrentPage(i)}
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
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Weiter
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
                    {detailJournalist.professionalData.employment.position || detailJournalist.personalData.name.first + ' ' + detailJournalist.personalData.name.last}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Score: {detailJournalist.metadata?.dataQuality?.overallScore || 0}
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Kontaktinformationen</h4>
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Position</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {detailJournalist.professionalData.employment?.position ||
                         detailJournalist.professionalData.employment.position ||
                         detailJournalist.personalData.name.first + ' ' + detailJournalist.personalData.name.last}
                      </span>
                    </div>
                    {detailJournalist.professionalData.employment?.department && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Abteilung: {detailJournalist.professionalData.employment.department}
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
                    Medienhaus & Arbeitgeber
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
                    Publikationen ({detailJournalist.professionalData.publicationAssignments.length})
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
                          {assignment.publication.frequency && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Erscheinung: {frequencyTranslations[assignment.publication.frequency as keyof typeof frequencyTranslations] || assignment.publication.frequency}
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Social Media</h4>
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Medientypen</h4>
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
            <Button variant="outline" onClick={() => setDetailJournalist(null)}>
              Schließen
            </Button>
            <Button
              onClick={() => {
                handleToggleReference(detailJournalist);
                setDetailJournalist(null);
              }}
              disabled={!subscription?.features.importEnabled}
              className={`${
                importedJournalistIds.has(detailJournalist?.id)
                  ? 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
              style={importedJournalistIds.has(detailJournalist?.id) ? {
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
                importedJournalistIds.has(detailJournalist?.id) ? 'text-black' : 'text-gray-500'
              }`}
              fill={importedJournalistIds.has(detailJournalist?.id) ? 'currentColor' : 'none'} />
              {importedJournalistIds.has(detailJournalist?.id) ? 'Verweis entfernen' : 'Als Verweis hinzufügen'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}