/**
 * Types für das Reference-System
 *
 * Das Reference-System erstellt VERWEISE auf globale Journalisten,
 * KEINE Kopien der Daten!
 */

// ========================================
// CORE REFERENCE TYPES
// ========================================

/**
 * Ein Verweis auf einen globalen Journalisten
 * Wird in der Organisation des Kunden gespeichert
 */
export interface JournalistReference {
  /** Eindeutige ID der Reference */
  id?: string;

  /** ID der Organisation die den Verweis erstellt hat */
  organizationId: string;

  /** ID des globalen Journalisten (bei SuperAdmin) */
  globalJournalistId: string;

  // Lokale Daten (editierbar von Kunde)
  /** Lokale Notizen des Kunden */
  localNotes?: string;

  /** Lokale Tags des Kunden */
  localTags?: string[];

  /** Eigenes Label für den Journalisten */
  customLabel?: string;

  // Meta-Daten
  /** Wann wurde der Verweis erstellt */
  addedAt: any; // Firestore Timestamp

  /** Wer hat den Verweis erstellt */
  addedBy: string;

  /** Letzte lokale Änderung */
  lastModified?: any; // Firestore Timestamp

  /** Ist der Verweis aktiv */
  isActive: boolean;

  /** Wann wurde der Verweis entfernt (Soft Delete) */
  removedAt?: any; // Firestore Timestamp
}

/**
 * Kombinierte Ansicht: Globale Daten + lokale Reference-Daten
 * So wird ein referenzierter Journalist im UI angezeigt
 */
export interface ReferencedJournalist {
  // Globale Daten (read-only, vom SuperAdmin)
  /** ID des globalen Journalisten */
  id: string;

  /** Name des Journalisten */
  displayName: string;

  /** Primäre E-Mail */
  email?: string;

  /** Primäre Telefonnummer */
  phone?: string;

  /** Name des Medienhauses */
  companyName?: string;

  /** Position beim Medienhaus */
  position?: string;

  /** IDs der Publikationen */
  publicationIds?: string[];

  /** Themen/Beats */
  beats?: string[];

  /** Medientypen */
  mediaTypes?: string[];

  /** Ist global (immer true für referenzierte) */
  isGlobal: boolean;

  // Reference-spezifische Daten
  /** Kennzeichnung als Reference */
  _isReference: true;

  /** ID der Reference (für Updates/Delete) */
  _referenceId: string;

  /** Lokale Metadaten */
  _localMeta: {
    /** Lokale Notizen */
    notes?: string;

    /** Lokale Tags */
    tags?: string[];

    /** Eigenes Label */
    customLabel?: string;

    /** Wann hinzugefügt */
    addedAt: Date;
  };
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

/**
 * Request für das Erstellen einer Reference
 */
export interface CreateReferenceRequest {
  /** ID des globalen Journalisten */
  globalJournalistId: string;

  /** ID der Organisation */
  organizationId: string;

  /** User der den Verweis erstellt */
  userId: string;

  /** Optionale initiale Notizen */
  initialNotes?: string;
}

/**
 * Request für das Update von lokalen Reference-Daten
 */
export interface UpdateReferenceRequest {
  /** ID der Reference */
  referenceId: string;

  /** ID der Organisation */
  organizationId: string;

  /** Updates für lokale Daten */
  updates: {
    localNotes?: string;
    localTags?: string[];
    customLabel?: string;
  };
}

/**
 * Batch-Import Request für mehrere References
 */
export interface BatchCreateReferencesRequest {
  /** IDs der globalen Journalisten */
  journalistIds: string[];

  /** ID der Organisation */
  organizationId: string;

  /** User der den Import durchführt */
  userId: string;
}

/**
 * Response für Batch-Import
 */
export interface BatchCreateReferencesResponse {
  /** Erfolgreich erstellte References */
  successful: string[];

  /** Fehlgeschlagene Versuche */
  failed: Array<{
    id: string;
    error: string;
  }>;

  /** Zusammenfassung */
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// ========================================
// UI-SPECIFIC TYPES
// ========================================

/**
 * UI-Status für Reference-Import
 */
export interface ReferenceImportStatus {
  /** Wird gerade importiert */
  isImporting: boolean;

  /** IDs die gerade importiert werden */
  importingIds: Set<string>;

  /** Letzte Fehlermeldung */
  lastError?: string;

  /** Letzter Erfolg */
  lastSuccess?: string;
}

/**
 * Filter für referenzierte Journalisten
 */
export interface ReferenceFilters {
  /** Nach lokalen Tags filtern */
  localTags?: string[];

  /** Nur mit lokalen Notizen */
  withNotes?: boolean;

  /** Zeitraum hinzugefügt */
  addedDateRange?: {
    from: Date;
    to: Date;
  };

  /** Nach Hinzufüger filtern */
  addedBy?: string;
}

/**
 * Sortierung für References
 */
export interface ReferenceSorting {
  /** Sortierfeld */
  field: 'addedAt' | 'displayName' | 'companyName' | 'lastModified';

  /** Sortierrichtung */
  direction: 'asc' | 'desc';
}

// ========================================
// BUSINESS LOGIC TYPES
// ========================================

/**
 * Reference-Statistiken für Dashboard
 */
export interface ReferenceStats {
  /** Anzahl aktiver References */
  totalReferences: number;

  /** Diese Woche hinzugefügt */
  addedThisWeek: number;

  /** Mit lokalen Notizen */
  withNotes: number;

  /** Top verwendete Tags */
  topTags: Array<{
    tag: string;
    count: number;
  }>;

  /** References nach Medientyp */
  byMediaType: Array<{
    type: string;
    count: number;
  }>;
}

/**
 * Reference-Berechtigung
 */
export interface ReferencePermissions {
  /** Kann References erstellen */
  canCreate: boolean;

  /** Kann eigene References bearbeiten */
  canEdit: boolean;

  /** Kann References entfernen */
  canRemove: boolean;

  /** Maximale Anzahl References */
  maxReferences?: number;

  /** Aktuelle Anzahl */
  currentCount: number;
}

// ========================================
// EXPORT ALL
// ========================================
// All interfaces are already exported above with 'export interface'