// src/types/glossary.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Flexible Timestamp Type - kann Firestore Timestamp, Date oder String sein
 */
type FlexibleTimestamp = Timestamp | Date | string;

/**
 * Glossar-Eintrag für kundenspezifische Begriffe und deren Übersetzungen
 *
 * Firestore Collection: `organizations/{orgId}/customer_glossary`
 *
 * @example
 * ```typescript
 * const entry: CustomerGlossaryEntry = {
 *   id: 'abc123',
 *   organizationId: 'org123',
 *   customerId: 'company456',
 *   translations: {
 *     de: 'Künstliche Intelligenz',
 *     en: 'Artificial Intelligence',
 *     fr: 'Intelligence Artificielle'
 *   },
 *   context: 'Technischer Begriff für KI-Produkte',
 *   isApproved: true,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   createdBy: 'user789'
 * };
 * ```
 */
export interface CustomerGlossaryEntry {
  /** Eindeutige ID des Eintrags */
  id: string;

  /** Organization ID (für Multi-Tenancy) */
  organizationId: string;

  /** Customer/Company ID zu der dieser Glossar-Eintrag gehört */
  customerId: string;

  /**
   * Übersetzungen des Begriffs in verschiedenen Sprachen
   * Key: Sprachcode (z.B. 'de', 'en', 'fr')
   * Value: Übersetzter Begriff
   */
  translations: Record<string, string>;

  /** Optionaler Kontext/Beschreibung für den Begriff */
  context?: string;

  /** Ob der Eintrag freigegeben/bestätigt wurde */
  isApproved: boolean;

  /** Erstellungszeitpunkt */
  createdAt: FlexibleTimestamp;

  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: FlexibleTimestamp;

  /** User ID des Erstellers */
  createdBy: string;
}

/**
 * Input-Type für das Erstellen eines neuen Glossar-Eintrags
 */
export interface CreateGlossaryEntryInput {
  customerId: string;
  translations: Record<string, string>;
  context?: string;
}

/**
 * Input-Type für das Aktualisieren eines Glossar-Eintrags
 */
export interface UpdateGlossaryEntryInput {
  translations?: Record<string, string>;
  context?: string;
  isApproved?: boolean;
}

/**
 * Filter-Optionen für Glossar-Abfragen
 */
export interface GlossaryFilterOptions {
  /** Filter nach Kunde */
  customerId?: string;

  /** Suchbegriff (sucht in allen Übersetzungen) */
  searchQuery?: string;

  /** Nur freigegebene Einträge */
  approvedOnly?: boolean;

  /** Pagination: Anzahl pro Seite */
  limit?: number;

  /** Pagination: Offset */
  offset?: number;
}
