// src/types/translation.ts
import { Timestamp } from 'firebase-admin/firestore';
import { LanguageCode } from './international';

/**
 * Flexible Timestamp Type - kann Firestore Timestamp, Date oder String sein
 */
type FlexibleTimestamp = Timestamp | Date | string;

/**
 * Status einer Projekt-Übersetzung
 */
export type TranslationStatus = 'generating' | 'generated' | 'reviewed' | 'approved';

/**
 * KI-generierte Übersetzung einer Pressemitteilung
 *
 * Firestore Collection: `organizations/{orgId}/projects/{projectId}/translations`
 *
 * @example
 * ```typescript
 * const translation: ProjectTranslation = {
 *   id: 'trans123',
 *   organizationId: 'org123',
 *   projectId: 'proj456',
 *   campaignId: 'camp789',
 *   language: 'en',
 *   title: 'New Product Launch',
 *   content: '<p><strong>Company XY announces...</strong></p>',
 *   status: 'generated',
 *   generatedAt: new Date(),
 *   generatedBy: 'ai',
 *   modelUsed: 'gemini-2.5-flash',
 *   glossaryEntriesUsed: ['gloss1', 'gloss2'],
 *   sourceVersion: 1,
 *   isOutdated: false,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 * ```
 */
export interface ProjectTranslation {
  /** Eindeutige ID der Übersetzung */
  id: string;

  /** Organization ID (für Multi-Tenancy) */
  organizationId: string;

  /** Projekt ID zu dem diese Übersetzung gehört */
  projectId: string;

  /** Kampagnen ID (falls mit Kampagne verknüpft) */
  campaignId?: string;

  /** Zielsprache der Übersetzung (ISO 639-1) */
  language: LanguageCode;

  /** Übersetzter Titel */
  title?: string;

  /** Übersetzter HTML-Content */
  content: string;

  /** Status der Übersetzung */
  status: TranslationStatus;

  /** Zeitpunkt der Generierung */
  generatedAt: FlexibleTimestamp;

  /** Wer hat generiert ('ai' für KI-Übersetzungen) */
  generatedBy: 'ai' | string;

  /** Verwendetes KI-Modell */
  modelUsed?: string;

  /** IDs der verwendeten Glossar-Einträge */
  glossaryEntriesUsed: string[];

  /** Version des Original-Contents bei Erstellung */
  sourceVersion: number;

  /** True wenn Original geändert wurde seit Übersetzung */
  isOutdated: boolean;

  /** Übersetzte Boilerplate-Sections */
  translatedBoilerplates?: Array<{
    id: string;
    translatedContent: string;
    translatedTitle?: string | null;
  }> | null;

  /** Review-Informationen (optional) */
  reviewedBy?: string;
  reviewedAt?: FlexibleTimestamp;

  /** Erstellungszeitpunkt */
  createdAt: FlexibleTimestamp;

  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: FlexibleTimestamp;
}

/**
 * Input-Type für das Erstellen einer neuen Übersetzung
 */
export interface CreateTranslationInput {
  /** Projekt ID */
  projectId: string;

  /** Kampagnen ID (optional) */
  campaignId?: string;

  /** Zielsprache */
  language: LanguageCode;

  /** Übersetzter Titel */
  title?: string;

  /** Übersetzter Content */
  content: string;

  /** Verwendetes Modell */
  modelUsed?: string;

  /** Verwendete Glossar-Einträge */
  glossaryEntriesUsed?: string[];

  /** Version des Originals */
  sourceVersion: number;
}

/**
 * Input-Type für das Aktualisieren einer Übersetzung
 */
export interface UpdateTranslationInput {
  /** Neuer Titel */
  title?: string;

  /** Neuer Content */
  content?: string;

  /** Neuer Status */
  status?: TranslationStatus;

  /** Als veraltet markieren */
  isOutdated?: boolean;

  /** Review-Informationen */
  reviewedBy?: string;
  reviewedAt?: FlexibleTimestamp;
}

/**
 * Filter-Optionen für Übersetzungs-Abfragen
 */
export interface TranslationFilterOptions {
  /** Filter nach Sprache */
  language?: LanguageCode;

  /** Filter nach Status */
  status?: TranslationStatus;

  /** Nur veraltete Übersetzungen */
  outdatedOnly?: boolean;

  /** Pagination: Anzahl pro Seite */
  limit?: number;

  /** Pagination: Offset */
  offset?: number;
}

/**
 * Zusammenfassung der Übersetzungen eines Projekts
 */
export interface TranslationSummary {
  /** Projekt ID */
  projectId: string;

  /** Anzahl verfügbarer Übersetzungen */
  totalCount: number;

  /** Verfügbare Sprachen mit Status */
  languages: {
    code: LanguageCode;
    status: TranslationStatus;
    isOutdated: boolean;
    generatedAt: FlexibleTimestamp;
  }[];

  /** Anzahl veralteter Übersetzungen */
  outdatedCount: number;
}
