"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from "@/components/ui/dropdown";
import { Popover, Transition } from '@headlessui/react';
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
  CrownIcon
} from "@heroicons/react/24/outline";
import clsx from 'clsx';
import {
  JournalistDatabaseEntry,
  JournalistSearchParams,
  JournalistSubscription,
  MediaType,
  VerificationStatus
} from "@/types/journalist-database";
import { journalistDatabaseService } from "@/lib/firebase/journalist-database-service";

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
            <CrownIcon className="h-6 w-6 text-yellow-600" />
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
  subscription,
  isImporting = false
}: {
  journalist: JournalistDatabaseEntry;
  onImport: (journalist: JournalistDatabaseEntry) => void;
  onViewDetails: (journalist: JournalistDatabaseEntry) => void;
  subscription: JournalistSubscription | null;
  isImporting?: boolean;
}) {
  const primaryEmail = journalist.personalData.emails.find(e => e.isPrimary)?.email ||
                      journalist.personalData.emails[0]?.email;

  const hasPhone = journalist.personalData.phones && journalist.personalData.phones.length > 0;
  const primaryTopics = journalist.professionalData.expertise.primaryTopics.slice(0, 3);
  const totalFollowers = journalist.socialMedia.influence.totalFollowers;

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
                {journalist.professionalData.currentEmployment.position} bei {journalist.professionalData.currentEmployment.mediumName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {journalist.metadata.verification.status === 'verified' && (
              <Badge color="green" className="text-xs">
                <CheckBadgeIcon className="h-3 w-3 mr-1" />
                Verifiziert
              </Badge>
            )}

            <div className="text-xs text-gray-500">
              Score: {journalist.metadata.dataQuality.overallScore}
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
              {primaryTopics.map((topic, index) => (
                <Badge key={index} color="zinc" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {journalist.professionalData.expertise.primaryTopics.length > 3 && (
                <Badge color="zinc" className="text-xs">
                  +{journalist.professionalData.expertise.primaryTopics.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Media Types & Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {journalist.professionalData.mediaTypes.slice(0, 3).map((type, index) => (
                <Badge key={index} color="blue" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {totalFollowers > 0 && (
            <div className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              {totalFollowers >= 1000 ?
                `${Math.round(totalFollowers / 1000)}K` :
                totalFollowers.toLocaleString()
              } Follower
            </div>
          )}
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
              onClick={onUpgrade}
              className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100 text-sm px-4 py-1.5"
            >
              <CrownIcon className="h-4 w-4 mr-1" />
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
  if (!journalist) return null;

  return (
    <Dialog open={!!journalist} onClose={onClose}>
      <div className="p-6">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
            <ArrowUpTrayIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <DialogTitle>Journalist importieren</DialogTitle>
            <DialogBody className="mt-2">
              <Text>
                Möchten Sie <strong>{journalist.personalData.displayName}</strong> aus der
                Journalisten-Datenbank in Ihr CRM importieren?
              </Text>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-700 w-20">Position:</span>
                  <span className="text-gray-600">
                    {journalist.professionalData.currentEmployment.position} bei {journalist.professionalData.currentEmployment.mediumName}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-700 w-20">E-Mail:</span>
                  <span className="text-gray-600">
                    {journalist.personalData.emails.find(e => e.isPrimary)?.email ||
                     journalist.personalData.emails[0]?.email || 'Nicht verfügbar'}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-700 w-20">Themen:</span>
                  <span className="text-gray-600">
                    {journalist.professionalData.expertise.primaryTopics.slice(0, 3).join(', ')}
                    {journalist.professionalData.expertise.primaryTopics.length > 3 && ' ...'}
                  </span>
                </div>
              </div>
            </DialogBody>
          </div>
        </div>

        <DialogActions className="mt-5 sm:mt-4">
          <Button plain onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
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
              'Jetzt importieren'
            )}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}

// Main Component
export default function EditorsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [journalists, setJournalists] = useState<JournalistDatabaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subscription, setSubscription] = useState<JournalistSubscription | null>(null);

  // Filter States
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaType[]>([]);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<VerificationStatus[]>([]);
  const [minQualityScore, setMinQualityScore] = useState<number>(0);

  // UI States
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [selectedJournalist, setSelectedJournalist] = useState<JournalistDatabaseEntry | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

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
      // Mock subscription check
      const mockSubscription: JournalistSubscription = {
        organizationId: currentOrganization.id,
        plan: 'free', // Change to 'professional' to test premium features
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

      // Mock search results
      const mockJournalists: JournalistDatabaseEntry[] = [
        {
          id: '1',
          globalId: 'journalist-001',
          version: 1,
          lastModifiedBy: 'system',
          organizationId: 'system',
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          createdBy: 'system',
          updatedBy: 'system',
          personalData: {
            name: {
              salutation: 'Frau',
              firstName: 'Anna',
              lastName: 'Schmidt',
              title: 'Dr.'
            },
            displayName: 'Dr. Anna Schmidt',
            emails: [{
              email: 'anna.schmidt@spiegel.de',
              type: 'business',
              isPrimary: true,
              isVerified: true,
              verifiedAt: new Date() as any
            }],
            phones: [{
              number: '+49 40 1234567',
              type: 'business',
              isPrimary: true,
              countryCode: 'DE'
            }],
            languages: ['de', 'en']
          },
          professionalData: {
            currentEmployment: {
              mediumName: 'Der Spiegel',
              position: 'Redakteurin',
              department: 'Politik',
              isFreelance: false
            },
            expertise: {
              primaryTopics: ['Politik', 'Europäische Union', 'Wirtschaftspolitik'],
              secondaryTopics: ['Klimapolitik'],
              industries: ['Medien', 'Politik']
            },
            mediaTypes: ['online', 'print']
          },
          socialMedia: {
            profiles: [{
              platform: 'twitter',
              url: 'https://twitter.com/anna_schmidt',
              handle: '@anna_schmidt',
              verified: true,
              followers: 15000,
              engagement: 3.2
            }],
            influence: {
              totalFollowers: 15000,
              influenceScore: 78,
              reachScore: 82,
              engagementScore: 65,
              lastCalculated: new Date() as any
            }
          },
          metadata: {
            verification: {
              status: 'verified',
              method: 'email',
              verifiedAt: new Date() as any,
              verifiedBy: 'admin'
            },
            dataQuality: {
              completeness: 95,
              accuracy: 92,
              freshness: 88,
              overallScore: 92
            },
            sources: [{
              type: 'manual',
              name: 'Admin Entry',
              contributedAt: new Date() as any,
              confidence: 95,
              fields: ['personalData', 'professionalData']
            }]
          },
          analytics: {
            articleMetrics: {
              totalArticles: 156,
              averageReach: 25000,
              totalReach: 3900000,
              averageEngagement: 2.8
            },
            sentimentAnalysis: {
              averageSentiment: 0.2,
              sentimentDistribution: {
                positive: 45,
                neutral: 35,
                negative: 20
              },
              lastAnalyzed: new Date() as any
            },
            topicDistribution: [
              { topic: 'Politik', articleCount: 89, percentage: 57, averageSentiment: 0.1 },
              { topic: 'EU', articleCount: 34, percentage: 22, averageSentiment: 0.3 },
              { topic: 'Wirtschaft', articleCount: 33, percentage: 21, averageSentiment: 0.2 }
            ],
            responseMetrics: {
              responseRate: 78,
              averageResponseTime: 4.5,
              preferredResponseChannel: 'email'
            },
            trends: {
              activityTrend: 'stable'
            }
          },
          gdpr: {
            consent: {
              status: 'granted',
              grantedAt: new Date() as any,
              method: 'email'
            },
            communicationPreferences: {
              allowEmails: true,
              allowDataSharing: true,
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
        }
      ];

      setJournalists(mockJournalists);
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
    return journalists.filter(journalist => {
      // Search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches =
          journalist.personalData.displayName.toLowerCase().includes(searchLower) ||
          journalist.professionalData.currentEmployment.mediumName.toLowerCase().includes(searchLower) ||
          journalist.professionalData.expertise.primaryTopics.some(t => t.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Topics filter
      if (selectedTopics.length > 0) {
        const hasMatchingTopic = journalist.professionalData.expertise.primaryTopics.some(topic =>
          selectedTopics.includes(topic)
        );
        if (!hasMatchingTopic) return false;
      }

      // Media types filter
      if (selectedMediaTypes.length > 0) {
        const hasMatchingMediaType = journalist.professionalData.mediaTypes.some(type =>
          selectedMediaTypes.includes(type)
        );
        if (!hasMatchingMediaType) return false;
      }

      // Verification status filter
      if (selectedVerificationStatus.length > 0) {
        if (!selectedVerificationStatus.includes(journalist.metadata.verification.status)) {
          return false;
        }
      }

      // Quality score filter
      if (minQualityScore > 0) {
        if (journalist.metadata.dataQuality.overallScore < minQualityScore) {
          return false;
        }
      }

      return true;
    });
  }, [journalists, searchTerm, selectedTopics, selectedMediaTypes, selectedVerificationStatus, minQualityScore]);

  // Get unique topics for filter
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    journalists.forEach(j => {
      j.professionalData.expertise.primaryTopics.forEach(topic => topicsSet.add(topic));
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
      // Mock import - replace with real API call
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

  const handleUpgrade = () => {
    showAlert('info', 'Premium-Upgrade', 'Upgrade-Funktionalität wird in Kürze verfügbar sein.');
  };

  const handleViewDetails = (journalist: JournalistDatabaseEntry) => {
    showAlert('info', 'Details', `Detail-Ansicht für ${journalist.personalData.displayName} wird implementiert.`);
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

      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>Journalisten-Datenbank</Heading>
        <Text className="mt-2 text-gray-600">
          Durchsuchen Sie unsere kuratierte Datenbank mit verifizierten Medienkontakten
        </Text>
      </div>

      {/* Premium Banner */}
      <PremiumBanner subscription={subscription} onUpgrade={handleUpgrade} />

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
                  <Popover.Panel className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-white/10">
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
                          {availableTopics.slice(0, 8).map((topic) => (
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

      {/* Results Info */}
      <div className="mb-4">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          {filteredJournalists.length} von {journalists.length} Journalisten
          {subscription && (
            <span className="ml-2">
              • {subscription.usage.currentPeriod.searches}/{subscription.limits.searchesPerMonth} Suchen diesen Monat
            </span>
          )}
        </Text>
      </div>

      {/* Results Grid */}
      {filteredJournalists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJournalists.map((journalist) => (
            <JournalistCard
              key={journalist.id}
              journalist={journalist}
              onImport={handleImport}
              onViewDetails={handleViewDetails}
              subscription={subscription}
              isImporting={importingIds.has(journalist.id!)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Journalisten gefunden</h3>
          <p className="mt-1 text-sm text-gray-500">
            Versuchen Sie andere Suchbegriffe oder Filter.
          </p>
        </div>
      )}

      {/* Import Dialog */}
      <ImportDialog
        journalist={selectedJournalist}
        onClose={() => setSelectedJournalist(null)}
        onConfirm={handleConfirmImport}
        isLoading={importingIds.has(selectedJournalist?.id || '')}
      />
    </div>
  );
}