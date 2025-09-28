// src/types/journalist-database.ts
/**
 * Type-Definitionen für die Journalisten-Datenbank
 * Premium-Feature für verifizierte Medienkontakte
 */

import { Timestamp } from 'firebase/firestore';
import {
  BaseEntity,
  InternationalAddress,
  PhoneNumber,
  StructuredName,
  CountryCode,
  LanguageCode,
  GdprConsent
} from './international';
import { ContactEnhanced, JournalistContact } from './crm-enhanced';

// ========================================
// Haupt-Datenbank Entry
// ========================================

/**
 * Master-Datenbank Entry für einen verifizierten Journalisten
 * Zentrale Wahrheitsquelle für alle Organisationen
 */
export interface JournalistDatabaseEntry extends BaseEntity {
  // Eindeutige globale ID (UUID)
  globalId: string;

  // Versionierung für Konflikt-Auflösung
  version: number;
  lastModifiedBy: 'system' | 'admin' | 'verification' | 'crowdsource';

  // ===== Persönliche Daten (GDPR-konform) =====
  personalData: {
    // Strukturierter Name
    name: StructuredName;
    displayName: string;

    // E-Mail-Adressen mit Verifizierungsstatus
    emails: Array<{
      email: string;
      type: 'business' | 'private' | 'press';
      isPrimary: boolean;
      isVerified: boolean;
      verifiedAt?: Timestamp;
      bounceCount?: number;
      lastBounce?: Timestamp;
    }>;

    // Telefonnummern
    phones?: PhoneNumber[];

    // Profilbild
    profileImage?: {
      url: string;
      source: 'upload' | 'linkedin' | 'twitter' | 'manual';
      updatedAt: Timestamp;
    };

    // Bevorzugte Sprachen
    languages: LanguageCode[];

    // Zeitzone für optimale Kontaktaufnahme
    timezone?: string;
  };

  // ===== Berufliche Daten =====
  professionalData: {
    // Aktueller Arbeitgeber
    currentEmployment: {
      mediumId?: string; // Verknüpfung zu companies_enhanced
      mediumName: string;
      position: string;
      department?: string;
      startDate?: Date;
      isFreelance: boolean;
    };

    // Frühere Arbeitgeber
    employmentHistory?: Array<{
      mediumName: string;
      position: string;
      department?: string;
      startDate: Date;
      endDate?: Date;
      wasFreelance: boolean;
    }>;

    // Fachgebiete & Themen
    expertise: {
      primaryTopics: string[]; // Haupt-Themengebiete
      secondaryTopics?: string[]; // Nebenbereiche
      industries?: string[]; // Branchen-Fokus
      geographicFocus?: CountryCode[]; // Geografischer Fokus
    };

    // Medientypen
    mediaTypes: ('print' | 'online' | 'tv' | 'radio' | 'podcast' | 'newsletter' | 'blog')[];

    // Publikationsfrequenz
    publicationFrequency?: {
      articlesPerMonth: number;
      lastPublished?: Timestamp;
      regularColumns?: string[]; // Namen regelmäßiger Kolumnen/Formate
    };

    // Auszeichnungen & Mitgliedschaften
    credentials?: {
      awards?: Array<{
        name: string;
        year: number;
        issuer: string;
      }>;
      memberships?: string[]; // Journalistenverbände, etc.
      certifications?: string[];
    };
  };

  // ===== Social Media & Online-Präsenz =====
  socialMedia: {
    profiles: Array<{
      platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'xing' | 'threads' | 'mastodon' | 'other';
      url: string;
      handle?: string;
      verified: boolean;
      followers?: number;
      engagement?: number; // Durchschnittliche Interaktionsrate
      lastChecked?: Timestamp;
    }>;

    // Aggregierte Influence-Metriken
    influence: {
      totalFollowers: number;
      influenceScore: number; // 0-100
      reachScore: number; // 0-100
      engagementScore: number; // 0-100
      lastCalculated: Timestamp;
    };

    // Eigene Website/Blog
    personalWebsite?: {
      url: string;
      rssUrl?: string;
      monthlyVisitors?: number;
    };
  };

  // ===== Metadaten & Qualität =====
  metadata: {
    // Verifizierungsstatus
    verification: {
      status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
      method?: 'email' | 'manual' | 'api' | 'partner';
      verifiedAt?: Timestamp;
      verifiedBy?: string;
      expiresAt?: Timestamp;
      rejectionReason?: string;
    };

    // Datenquellen & Qualität
    dataQuality: {
      completeness: number; // 0-100 (% der ausgefüllten Felder)
      accuracy: number; // 0-100 (Konfidenz-Score)
      freshness: number; // 0-100 (basierend auf letzter Aktualisierung)
      overallScore: number; // 0-100 (gewichteter Durchschnitt)
    };

    // Herkunft der Daten
    sources: Array<{
      type: 'manual' | 'api' | 'crowdsource' | 'import' | 'partner';
      name: string; // z.B. "LinkedIn API", "Admin Manual Entry"
      contributedAt: Timestamp;
      contributedBy?: string; // organizationId oder userId
      confidence: number; // 0-100
      fields: string[]; // Welche Felder von dieser Quelle stammen
    }>;

    // Crowdsourcing-Beiträge
    crowdsourceContributions?: Array<{
      organizationId: string;
      contactId: string;
      contributedAt: Timestamp;
      matchScore: number;
      fieldsContributed: string[];
    }>;

    // API-Synchronisationen
    apiSyncs?: {
      linkedin?: {
        profileId: string;
        lastSyncedAt: Timestamp;
        syncStatus: 'success' | 'error' | 'partial';
      };
      twitter?: {
        userId: string;
        lastSyncedAt: Timestamp;
        syncStatus: 'success' | 'error' | 'partial';
      };
      kress?: {
        profileId: string;
        lastSyncedAt: Timestamp;
        syncStatus: 'success' | 'error' | 'partial';
      };
    };
  };

  // ===== Performance & Analytics =====
  analytics: {
    // Artikel-Metriken
    articleMetrics: {
      totalArticles: number;
      averageReach: number;
      totalReach: number;
      averageEngagement: number;
    };

    // Sentiment-Analyse
    sentimentAnalysis: {
      averageSentiment: number; // -1 bis 1
      sentimentDistribution: {
        positive: number;
        neutral: number;
        negative: number;
      };
      lastAnalyzed: Timestamp;
    };

    // Themen-Verteilung
    topicDistribution: Array<{
      topic: string;
      articleCount: number;
      percentage: number;
      averageSentiment: number;
    }>;

    // Response-Verhalten
    responseMetrics: {
      responseRate: number; // 0-100%
      averageResponseTime: number; // in Stunden
      preferredResponseChannel?: 'email' | 'phone' | 'social';
    };

    // Trend-Daten
    trends: {
      activityTrend: 'increasing' | 'stable' | 'decreasing';
      topicShifts?: Array<{
        fromTopic: string;
        toTopic: string;
        observedAt: Timestamp;
      }>;
    };
  };

  // ===== GDPR & Datenschutz =====
  gdpr: {
    // Einwilligungsstatus
    consent: {
      status: 'pending' | 'granted' | 'denied' | 'withdrawn';
      grantedAt?: Timestamp;
      withdrawnAt?: Timestamp;
      method?: 'email' | 'web' | 'import';
      ipAddress?: string;
      token?: string;
    };

    // Kommunikations-Präferenzen
    communicationPreferences: {
      allowEmails: boolean;
      allowDataSharing: boolean;
      allowProfiling: boolean;
      preferredLanguage: LanguageCode;
    };

    // Datenrechte
    dataRights: {
      accessRequests?: Array<{
        requestedAt: Timestamp;
        fulfilledAt?: Timestamp;
        method: 'email' | 'download';
      }>;
      deletionRequests?: Array<{
        requestedAt: Timestamp;
        scheduledFor?: Timestamp;
        status: 'pending' | 'completed' | 'cancelled';
      }>;
      portabilityRequests?: Array<{
        requestedAt: Timestamp;
        exportedAt?: Timestamp;
        format: 'json' | 'csv' | 'xml';
      }>;
    };

    // Audit-Log
    auditLog?: Array<{
      timestamp: Timestamp;
      action: 'view' | 'export' | 'update' | 'share';
      performedBy: string; // organizationId
      details?: string;
    }>;
  };

  // ===== Synchronisation & Verknüpfung =====
  syncInfo: {
    // Verknüpfte Organisationen
    linkedOrganizations: Array<{
      organizationId: string;
      organizationName?: string;
      localContactId: string;
      linkCreatedAt: Timestamp;
      linkCreatedBy: string; // userId
      syncEnabled: boolean;
      syncDirection: 'bidirectional' | 'fromDatabase' | 'toDatabase' | 'none';
      lastSyncedAt?: Timestamp;
      syncStatus?: 'success' | 'error' | 'conflict';
      customFieldMapping?: Record<string, string>; // Mapping lokaler Felder
    }>;

    // Master-Sync-Status
    masterSyncStatus: {
      lastFullSync?: Timestamp;
      lastIncrementalSync?: Timestamp;
      pendingChanges: number;
      syncHealth: 'healthy' | 'degraded' | 'error';
    };

    // Änderungshistorie
    changeHistory: Array<{
      timestamp: Timestamp;
      changeType: 'create' | 'update' | 'merge' | 'verify';
      changedFields: string[];
      changedBy: string; // organizationId oder 'system'
      changeSource: 'manual' | 'api' | 'sync' | 'crowdsource';
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
    }>;
  };

  // ===== Erweiterte Felder für Premium-Features =====
  premiumData?: {
    // Direkter Draht (Persönliche Kontaktinfos)
    directContact?: {
      mobilePhone?: string;
      privateEmail?: string;
      assistant?: {
        name: string;
        email?: string;
        phone?: string;
      };
    };

    // Bevorzugte PR-Agentur-Kontakte
    preferredPRContacts?: Array<{
      agencyName: string;
      contactPerson: string;
      relationship: 'excellent' | 'good' | 'neutral' | 'difficult';
      notes?: string;
    }>;

    // Exklusive Insights
    insights?: {
      bestPitchApproach?: string;
      doNotPitchTopics?: string[];
      successfulPitches?: Array<{
        date: Timestamp;
        topic: string;
        outcome: string;
      }>;
    };
  };
}

// ========================================
// Matching & Kandidaten
// ========================================

/**
 * Kandidat für die Journalisten-Datenbank
 * Entsteht durch Crowdsourcing-Matching
 */
export interface JournalistCandidate {
  id: string;

  // Matching-Informationen
  matching: {
    algorithm: 'fuzzy' | 'exact' | 'ml';
    averageScore: number; // 0-100
    sourceCount: number; // Anzahl übereinstimmender Quellen
    firstSeen: Timestamp;
    lastUpdated: Timestamp;
  };

  // Aggregierte Daten aus allen Quellen
  aggregatedData: {
    // Konsolidierte Felder (Most Common / Most Recent)
    name?: StructuredName;
    emails?: Array<{
      email: string;
      frequency: number; // Wie oft diese E-Mail vorkam
      sources: string[]; // organizationIds
    }>;
    medium?: string;
    position?: string;
    topics?: Array<{
      topic: string;
      frequency: number;
    }>;
  };

  // Einzelne Beiträge
  contributions: Array<{
    organizationId: string;
    contactId: string;
    contributedAt: Timestamp;
    data: Partial<ContactEnhanced>;
    matchScore: number;
    matchDetails: {
      emailMatch: boolean;
      nameMatch: boolean;
      mediumMatch: boolean;
      phoneMatch?: boolean;
    };
  }>;

  // Review-Status
  review: {
    status: 'pending' | 'approved' | 'rejected' | 'merged';
    reviewedBy?: string; // adminId
    reviewedAt?: Timestamp;
    decision?: {
      action: 'create_new' | 'merge_with_existing' | 'reject';
      targetJournalistId?: string; // Bei Merge
      reason?: string;
    };
  };

  // Qualitäts-Indikatoren
  qualityIndicators: {
    hasVerifiedEmail: boolean;
    hasCompleteName: boolean;
    hasMultipleSources: boolean;
    dataCompleteness: number; // 0-100
    conflictingData: boolean;
    conflictDetails?: string[];
  };
}

// ========================================
// Sync-Konfiguration
// ========================================

/**
 * Konfiguration für die Synchronisation zwischen
 * lokalem CRM und Journalisten-Datenbank
 */
export interface JournalistSyncConfig {
  organizationId: string;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Sync-Einstellungen
  settings: {
    // Richtung
    direction: 'bidirectional' | 'fromDatabase' | 'toDatabase' | 'manual';

    // Automatisierung
    autoSync: boolean;
    syncInterval?: 'realtime' | 'hourly' | 'daily' | 'weekly';
    lastAutoSync?: Timestamp;
    nextScheduledSync?: Timestamp;

    // Konflikt-Auflösung
    conflictResolution: {
      strategy: 'localWins' | 'databaseWins' | 'newest' | 'manual' | 'merge';
      autoResolveMinorConflicts: boolean;
      notifyOnConflict: boolean;
    };
  };

  // Filter-Kriterien
  filters: {
    // Nur bestimmte Journalisten synchronisieren
    onlyVerified?: boolean;
    minQualityScore?: number;
    includeTopics?: string[];
    excludeTopics?: string[];
    includeMediaTypes?: string[];

    // Lokale Filter
    localFilters?: {
      tagIds?: string[];
      companyIds?: string[];
      minRelationshipScore?: number;
    };
  };

  // Feld-Mapping
  fieldMapping: {
    // Standard-Mapping verwenden
    useDefaultMapping: boolean;

    // Überschreibungen
    customMappings?: Array<{
      databaseField: string;
      localField: string;
      transform?: 'none' | 'uppercase' | 'lowercase' | 'trim';
      syncDirection?: 'both' | 'toLocal' | 'toDatabase';
    }>;

    // Felder ausschließen
    excludeFields?: string[];

    // Felder schreibschützen
    readOnlyFields?: string[];
  };

  // Berechtigungen
  permissions: {
    canImport: boolean;
    canExport: boolean;
    canDelete: boolean;
    canOverwrite: boolean;
    requireApproval: boolean;
    approvers?: string[]; // userIds
  };

  // Quotas & Limits
  quotas: {
    maxImportsPerMonth: number;
    maxExportsPerMonth: number;
    maxSyncedContacts: number;

    // Aktueller Verbrauch
    currentUsage: {
      importsThisMonth: number;
      exportsThisMonth: number;
      totalSyncedContacts: number;
      lastReset: Timestamp;
    };
  };

  // Sync-Historie
  syncHistory?: Array<{
    timestamp: Timestamp;
    type: 'manual' | 'auto' | 'scheduled';
    direction: 'import' | 'export' | 'bidirectional';
    contactsAffected: number;
    successCount: number;
    errorCount: number;
    duration: number; // in ms
    performedBy?: string; // userId
    errors?: Array<{
      contactId: string;
      error: string;
    }>;
  }>;
}

// ========================================
// Import/Export Interfaces
// ========================================

/**
 * Request für den Import von Journalisten aus der Datenbank
 */
export interface JournalistImportRequest {
  journalistIds: string[];
  organizationId: string;
  userId: string;

  options: {
    // Import-Verhalten
    overwriteExisting?: boolean;
    mergeData?: boolean;
    skipDuplicates?: boolean;

    // Sync-Einstellungen
    enableSync?: boolean;
    syncDirection?: 'bidirectional' | 'fromDatabase' | 'none';

    // Feld-Auswahl
    includeFields?: string[];
    excludeFields?: string[];

    // Ziel-Einstellungen
    targetCompanyId?: string; // Alle zu dieser Firma zuordnen
    addTags?: string[]; // Diese Tags hinzufügen
    assignToUser?: string; // Diesem User zuweisen
  };
}

/**
 * Response vom Import-Prozess
 */
export interface JournalistImportResponse {
  success: boolean;
  summary: {
    requested: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
  };

  results: Array<{
    journalistId: string;
    status: 'imported' | 'updated' | 'skipped' | 'failed';
    localContactId?: string;
    error?: string;
    details?: string;
  }>;

  quotaInfo: {
    used: number;
    remaining: number;
    resetDate: Timestamp;
  };
}

/**
 * Export-Request für Crowdsourcing
 */
export interface JournalistExportRequest {
  contactIds: string[];
  organizationId: string;
  userId: string;

  options: {
    anonymize: boolean; // Für Crowdsourcing
    includeMetrics?: boolean;
    contributeToMatching?: boolean;
  };
}

// ========================================
// Such-Interfaces
// ========================================

/**
 * Such-Parameter für die Journalisten-Datenbank
 */
export interface JournalistSearchParams {
  // Text-Suche
  query?: string;

  // Filter
  filters: {
    // Basis-Filter
    verificationStatus?: ('verified' | 'unverified' | 'pending')[];
    mediaTypes?: string[];
    topics?: string[];
    languages?: LanguageCode[];
    countries?: CountryCode[];

    // Qualitäts-Filter
    minQualityScore?: number;
    minInfluenceScore?: number;
    hasVerifiedEmail?: boolean;
    hasLinkedIn?: boolean;

    // Aktivitäts-Filter
    lastActiveAfter?: Date;
    minArticlesPerMonth?: number;

    // Beziehungs-Filter
    isLinkedToOrganization?: boolean;
    excludeLinkedContacts?: boolean;
  };

  // Sortierung
  sortBy?: 'relevance' | 'qualityScore' | 'influenceScore' | 'lastActive' | 'name';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Such-Ergebnis
 */
export interface JournalistSearchResult {
  journalists: Array<JournalistDatabaseEntry>;
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;

  facets?: {
    mediaTypes: Array<{ value: string; count: number }>;
    topics: Array<{ value: string; count: number }>;
    verificationStatus: Array<{ value: string; count: number }>;
  };

  suggestions?: {
    alternativeQueries?: string[];
    relatedTopics?: string[];
  };
}

// ========================================
// Subscription & Billing
// ========================================

/**
 * Subscription-Status für Journalisten-Datenbank-Zugriff
 */
export interface JournalistSubscription {
  organizationId: string;
  plan: 'free' | 'professional' | 'business' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';

  // Zeitraum
  billing: {
    startDate: Timestamp;
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    trialEndsAt?: Timestamp;
    cancelledAt?: Timestamp;
  };

  // Features & Limits
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

  // Aktueller Verbrauch
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

  // Payment-Info (Referenz zu Stripe, etc.)
  payment?: {
    customerId: string;
    subscriptionId: string;
    paymentMethod: 'card' | 'invoice' | 'sepa';
    nextPaymentDate?: Timestamp;
    amount: number;
    currency: string;
  };
}

// ========================================
// Helper Types & Enums
// ========================================

/**
 * Verifizierungsstatus
 */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';

/**
 * Datenquellen
 */
export type DataSource = 'manual' | 'api' | 'crowdsource' | 'import' | 'partner';

/**
 * Medientypen
 */
export type MediaType = 'print' | 'online' | 'tv' | 'radio' | 'podcast' | 'newsletter' | 'blog';

/**
 * Sync-Richtungen
 */
export type SyncDirection = 'bidirectional' | 'fromDatabase' | 'toDatabase' | 'none';

/**
 * Konflikt-Strategien
 */
export type ConflictStrategy = 'localWins' | 'databaseWins' | 'newest' | 'manual' | 'merge';

// ========================================
// Utility Functions Type Guards
// ========================================

/**
 * Type Guard: Ist ein Kontakt ein verifizierter Journalist?
 */
export function isVerifiedJournalist(entry: JournalistDatabaseEntry): boolean {
  return entry.metadata.verification.status === 'verified';
}

/**
 * Type Guard: Hat ein Kontakt Premium-Daten?
 */
export function hasPremiumData(entry: JournalistDatabaseEntry): entry is JournalistDatabaseEntry & { premiumData: NonNullable<JournalistDatabaseEntry['premiumData']> } {
  return entry.premiumData !== undefined && entry.premiumData !== null;
}

/**
 * Type Guard: Ist ein Kontakt mit einer Organisation verknüpft?
 */
export function isLinkedToOrganization(entry: JournalistDatabaseEntry, organizationId: string): boolean {
  return entry.syncInfo.linkedOrganizations.some(link => link.organizationId === organizationId);
}

// ========================================
// Export für Service-Integration
// ========================================

export type {
  JournalistDatabaseEntry as JournalistDB,
  JournalistCandidate as Candidate,
  JournalistSyncConfig as SyncConfig,
  JournalistImportRequest as ImportRequest,
  JournalistImportResponse as ImportResponse,
  JournalistSearchParams as SearchParams,
  JournalistSearchResult as SearchResult,
  JournalistSubscription as Subscription
};