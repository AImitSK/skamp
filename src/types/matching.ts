/**
 * Types für das Matching-Kandidaten Feature
 *
 * Dieses System identifiziert Journalisten, die von mehreren Organisationen
 * unabhängig erfasst wurden (Crowd-Sourcing Quality Indicator)
 */

import { Timestamp } from 'firebase/firestore';
import { ContactEnhanced } from './crm-enhanced';

// ========================================
// MATCHING CANDIDATE TYPES
// ========================================

/**
 * Ein Matching-Kandidat: Journalist der von 2+ Orgs erfasst wurde
 */
export interface MatchingCandidate {
  /** Eindeutige ID */
  id?: string;

  // Match-Information
  /** Match-Key (E-Mail oder normalisierter Name) */
  matchKey: string;

  /** Matching-Strategie */
  matchType: 'email' | 'name';

  /** Qualitäts-Score (0-100) */
  score: number;

  // Gefundene Varianten (2+ Organisationen)
  /** Array von Kontakt-Varianten aus verschiedenen Orgs */
  variants: MatchingCandidateVariant[];

  // Review-Status
  /** Aktueller Status */
  status: 'pending' | 'imported' | 'skipped' | 'rejected';

  // Import-Info (wenn imported)
  /** ID des importierten globalen Kontakts */
  importedGlobalContactId?: string;

  /** Zeitpunkt des Imports */
  importedAt?: Timestamp;

  // Review-Info
  /** User ID des SuperAdmin der reviewed hat */
  reviewedBy?: string;

  /** Zeitpunkt des Reviews */
  reviewedAt?: Timestamp;

  /** Review-Notizen */
  reviewNotes?: string;

  // Meta
  /** Erstellungszeitpunkt */
  createdAt: Timestamp;

  /** Letzte Aktualisierung */
  updatedAt: Timestamp;

  // Scan-Info
  /** ID des Scan-Jobs der diesen Kandidaten erstellt hat */
  scanJobId?: string;

  /** Zeitpunkt des letzten Scans */
  lastScannedAt?: Timestamp;
}

/**
 * Eine Variante eines Kandidaten (Kontakt aus einer Organisation)
 */
export interface MatchingCandidateVariant {
  /** ID der Organisation */
  organizationId: string;

  /** Name der Organisation (Cache für UI) */
  organizationName: string;

  /** ID des Kontakts in dieser Organisation */
  contactId: string;

  /** Snapshot der Kontakt-Daten */
  contactData: MatchingCandidateContactData;

  /** Verwendungs-Statistik (optional) */
  usageStats?: {
    /** Letzte Verwendung in Kampagne */
    lastUsedInCampaign?: Timestamp;

    /** Anzahl Kampagnen in denen verwendet */
    campaignCount?: number;

    /** Wurde in den letzten 90 Tagen verwendet */
    isActive: boolean;
  };
}

/**
 * Kontakt-Daten Snapshot (Subset von ContactEnhanced)
 */
export interface MatchingCandidateContactData {
  // Basis-Identifikation
  name: {
    firstName: string;
    lastName: string;
    title?: string;
    suffix?: string;
  };

  displayName: string;

  // Kontakt-Informationen
  emails: Array<{
    email: string;
    type: 'business' | 'private' | 'other';
    isPrimary?: boolean;
    isVerified?: boolean;
  }>;

  phones?: Array<{
    number: string;
    type: 'business' | 'mobile' | 'private' | 'other';
    isPrimary?: boolean;
  }>;

  // Geschäftliche Zuordnung
  position?: string;
  department?: string;
  companyName?: string;
  companyId?: string;

  // Media-Profil Info
  hasMediaProfile: boolean;
  beats?: string[];
  mediaTypes?: Array<'print' | 'online' | 'tv' | 'radio' | 'podcast'>;
  publications?: string[]; // Namen der Publikationen

  // Social Media
  socialProfiles?: Array<{
    platform: string;
    url: string;
    handle?: string;
  }>;

  // Qualitäts-Indikatoren
  photoUrl?: string;
  website?: string;
}

// ========================================
// SCAN JOB TYPES
// ========================================

/**
 * Ein Scan-Job der nach Matching-Kandidaten sucht
 */
export interface MatchingScanJob {
  /** Eindeutige ID */
  id?: string;

  /** Job-Status */
  status: 'running' | 'completed' | 'failed';

  // Statistik
  /** Scan-Statistiken */
  stats: MatchingScanJobStats;

  // Timing
  /** Start-Zeitpunkt */
  startedAt: Timestamp;

  /** Ende-Zeitpunkt */
  completedAt?: Timestamp;

  /** Dauer in Millisekunden */
  duration?: number;

  // Fehler
  /** Fehler-Nachricht (wenn failed) */
  error?: string;

  /** Detaillierte Fehler-Info */
  errorDetails?: any;

  // Meta
  /** Trigger-Quelle ('auto' oder User ID) */
  triggeredBy?: string;

  /** Erstellungszeitpunkt */
  createdAt: Timestamp;

  // Optionen
  /** Scan-Optionen */
  options?: MatchingScanOptions;
}

/**
 * Statistiken eines Scan-Jobs
 */
export interface MatchingScanJobStats {
  /** Anzahl gescannter Organisationen */
  organizationsScanned: number;

  /** Anzahl gescannter Kontakte */
  contactsScanned: number;

  /** Anzahl neu erstellter Kandidaten */
  candidatesCreated: number;

  /** Anzahl aktualisierter Kandidaten */
  candidatesUpdated: number;

  /** Anzahl Fehler */
  errors: number;

  /** Anzahl übersprungener Kontakte (bereits References) */
  skippedReferences?: number;

  /** Anzahl Kontakte ohne E-Mail */
  skippedNoEmail?: number;
}

/**
 * Optionen für einen Scan
 */
export interface MatchingScanOptions {
  /** Nur bestimmte Organisationen scannen */
  organizationIds?: string[];

  /** Minimaler Score (Standard: 60) */
  minScore?: number;

  /** Minimale Anzahl Organisationen (Standard: 2) */
  minOrganizations?: number;

  /** Auch bestehende Kandidaten neu bewerten */
  forceRescan?: boolean;

  /** Development-Modus (niedrigere Schwellwerte) */
  developmentMode?: boolean;
}

// ========================================
// FILTER & QUERY TYPES
// ========================================

/**
 * Filter für Kandidaten-Suche
 */
export interface MatchingCandidateFilters {
  /** Nach Status filtern */
  status?: MatchingCandidate['status'][];

  /** Minimaler Score */
  minScore?: number;

  /** Maximaler Score */
  maxScore?: number;

  /** Minimale Anzahl Varianten */
  minVariants?: number;

  /** Nur mit bestimmtem Match-Type */
  matchType?: MatchingCandidate['matchType'];

  /** Suche in Namen/E-Mails */
  searchQuery?: string;

  /** Zeitraum (erstellt zwischen) */
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Sortierung für Kandidaten
 */
export interface MatchingCandidateSorting {
  /** Sortierfeld */
  field: 'score' | 'createdAt' | 'updatedAt' | 'variantCount' | 'matchKey';

  /** Sortierrichtung */
  direction: 'asc' | 'desc';
}

/**
 * Pagination
 */
export interface MatchingCandidatePagination {
  /** Anzahl pro Seite */
  limit: number;

  /** Offset */
  offset: number;
}

// ========================================
// ANALYTICS TYPES
// ========================================

/**
 * Analytics für Dashboard
 */
export interface MatchingAnalytics {
  /** Gesamt-Anzahl Kandidaten */
  total: number;

  /** Anzahl pro Status */
  byStatus: Record<MatchingCandidate['status'], number>;

  /** Top Organisationen (meiste Kandidaten) */
  topOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    candidateCount: number;
    averageScore: number;
  }>;

  /** Durchschnittlicher Score */
  averageScore: number;

  /** Score-Verteilung */
  scoreDistribution: Array<{
    range: string; // "60-70", "70-80", etc.
    count: number;
  }>;

  /** Letzte Scan-Info */
  lastScan?: {
    jobId: string;
    completedAt: Timestamp;
    candidatesCreated: number;
  };

  /** Import-Rate (imported / total) */
  importRate: number;

  /** Zeitreihe (Kandidaten über Zeit) */
  timeline?: Array<{
    date: string; // YYYY-MM-DD
    created: number;
    imported: number;
  }>;
}

// ========================================
// ACTION TYPES
// ========================================

/**
 * Import-Aktion Request
 */
export interface ImportCandidateRequest {
  /** ID des Kandidaten */
  candidateId: string;

  /** Ausgewählte Variante (Index) */
  selectedVariantIndex: number;

  /** User ID des SuperAdmin */
  userId: string;

  /** Optionale Anpassungen an Kontakt-Daten */
  overrides?: Partial<ContactEnhanced>;
}

/**
 * Import-Aktion Response
 */
export interface ImportCandidateResponse {
  /** Erfolg */
  success: boolean;

  /** ID des erstellten globalen Kontakts */
  globalContactId: string;

  /** Fehlermeldung (falls nicht erfolgreich) */
  error?: string;
}

/**
 * Skip-Aktion Request
 */
export interface SkipCandidateRequest {
  /** ID des Kandidaten */
  candidateId: string;

  /** User ID des SuperAdmin */
  userId: string;

  /** Grund für Skip (optional) */
  reason?: string;
}

/**
 * Reject-Aktion Request
 */
export interface RejectCandidateRequest {
  /** ID des Kandidaten */
  candidateId: string;

  /** User ID des SuperAdmin */
  userId: string;

  /** Grund für Ablehnung (erforderlich) */
  reason: string;
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Match-Key Generator Result
 */
export interface MatchKeyResult {
  /** Generierter Match-Key */
  key: string;

  /** Verwendete Strategie */
  type: 'email' | 'name';

  /** Rohdaten die verwendet wurden */
  source: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Score-Berechnung Details
 */
export interface ScoreCalculation {
  /** Gesamt-Score */
  total: number;

  /** Score-Komponenten */
  breakdown: {
    /** Basis-Score (Anzahl Organisationen) */
    organizationCount: number;

    /** Bonus für Media-Profile */
    mediaProfile: number;

    /** Bonus für verifizierte E-Mail */
    verifiedEmail: number;

    /** Bonus für Telefon */
    phoneNumber: number;

    /** Bonus für Beats */
    beats: number;

    /** Bonus für Social Media */
    socialMedia: number;

    /** Malus für unvollständige Daten */
    completeness: number;
  };
}

/**
 * Candidate-Recommendation (welche Variante ist die beste)
 */
export interface CandidateRecommendation {
  /** Empfohlener Varianten-Index */
  recommendedIndex: number;

  /** Grund für Empfehlung */
  reason: string;

  /** Score der empfohlenen Variante */
  score: number;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Status-Labels für UI
 */
export const MATCHING_STATUS_LABELS: Record<MatchingCandidate['status'], string> = {
  pending: 'Pending',
  imported: 'Importiert',
  skipped: 'Übersprungen',
  rejected: 'Abgelehnt'
};

/**
 * Status-Farben für Badges
 */
export const MATCHING_STATUS_COLORS: Record<MatchingCandidate['status'], 'zinc' | 'green' | 'yellow' | 'red'> = {
  pending: 'yellow',
  imported: 'green',
  skipped: 'zinc',
  rejected: 'red'
};

/**
 * Match-Type Labels
 */
export const MATCH_TYPE_LABELS: Record<MatchingCandidate['matchType'], string> = {
  email: 'E-Mail',
  name: 'Name'
};

/**
 * Standard-Einstellungen
 */
export const MATCHING_DEFAULTS = {
  /** Minimaler Score für Kandidaten */
  MIN_SCORE: 60,

  /** Minimale Anzahl Organisationen */
  MIN_ORGANIZATIONS: 2,

  /** Development-Modus Schwellwerte */
  DEV_MIN_SCORE: 40,
  DEV_MIN_ORGANIZATIONS: 1,

  /** Pagination */
  DEFAULT_PAGE_SIZE: 20,

  /** Score-Ranges für Verteilung */
  SCORE_RANGES: [
    { min: 0, max: 50, label: '0-50' },
    { min: 50, max: 60, label: '50-60' },
    { min: 60, max: 70, label: '60-70' },
    { min: 70, max: 80, label: '70-80' },
    { min: 80, max: 90, label: '80-90' },
    { min: 90, max: 100, label: '90-100' }
  ]
} as const;

// ========================================
// EXPORT ALL
// ========================================
// All interfaces are already exported above
