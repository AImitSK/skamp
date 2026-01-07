import { Timestamp } from 'firebase/firestore';

/**
 * PM-VORLAGE - Generierte Pressemeldungs-Vorlage
 *
 * Die PM-Vorlage ist das Ergebnis der DNA-basierten Pressemeldungs-Generierung.
 * Sie wird im Strategie-Tab angezeigt und kann auf den Editor angewendet werden.
 *
 * **Firestore-Pfad:** `projects/{projectId}/strategy/pmVorlage`
 *
 * **Generierungs-Flow:**
 * 1. User hat DNA-Synthese + Fakten-Matrix erstellt
 * 2. Wählt Zielgruppe (ZG1/ZG2/ZG3)
 * 3. Flow generiert PM-Vorlage mit Expert-Prompt
 * 4. Hash-basierte Änderungserkennung für DNA + Fakten
 * 5. History für letzte 3 Versionen (Undo)
 *
 * **Hash-Tracking:**
 * - markenDNAHash: Hash der DNA-Synthese zum Zeitpunkt der Generierung
 * - faktenMatrixHash: Hash der Fakten-Matrix zum Zeitpunkt der Generierung
 * - Bei Änderungen: Status 'outdated' → Neu-Generierung anbieten
 */
export interface PMVorlage {
  /** Headline (40-75 Zeichen, SEO-optimiert) */
  headline: string;

  /** Lead-Paragraph (5 W-Fragen, 80-200 Zeichen) */
  leadParagraph: string;

  /** Body-Paragraphs (3-4 Absätze, je 150-400 Zeichen) */
  bodyParagraphs: string[];

  /**
   * Quote - Zitat mit vollständiger Attribution
   * Basiert auf speakerId aus Fakten-Matrix + DNA-Kontakten
   */
  quote: {
    /** Zitat-Text (ausformuliert vom Flow) */
    text: string;

    /** Name der zitierten Person */
    person: string;

    /** Position/Rolle der Person */
    role: string;

    /** Unternehmen der Person */
    company: string;
  };

  /** Call-to-Action mit Kontaktdaten */
  cta: string;

  /** 2-3 relevante Hashtags für Social Media */
  hashtags: string[];

  /** Fertig formatierter HTML-Content für den Editor */
  htmlContent: string;

  // === Metadata ===

  /** Zeitpunkt der Generierung */
  generatedAt: Timestamp;

  /** Zielgruppe für die diese Vorlage generiert wurde */
  targetGroup: 'ZG1' | 'ZG2' | 'ZG3';

  // === Hash-basierte Änderungserkennung ===

  /**
   * Hash der Marken-DNA zum Zeitpunkt der Generierung
   * Ermöglicht Erkennung von DNA-Änderungen
   */
  markenDNAHash: string;

  /**
   * Hash der Fakten-Matrix zum Zeitpunkt der Generierung
   * Ermöglicht Erkennung von Fakten-Änderungen
   */
  faktenMatrixHash: string;

  // === History für Undo (letzte 3 Versionen) ===

  /**
   * History-Array mit den letzten 3 Versionen
   * Ermöglicht Undo-Funktionalität
   */
  history?: PMVorlageHistoryEntry[];
}

/**
 * History-Entry für PM-Vorlage Versionen
 */
export interface PMVorlageHistoryEntry {
  /** Content der Version */
  content: PMVorlageContent;

  /** Zeitpunkt der Generierung dieser Version */
  generatedAt: Timestamp;
}

/**
 * Content-Teil der PM-Vorlage (für History)
 * Enthält nur die versionierbaren Inhalte
 */
export interface PMVorlageContent {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta: string;
  hashtags: string[];
  htmlContent: string;
}

/**
 * PM-Vorlage Status
 * Union-Type für verschiedene Zustände der PM-Vorlage
 */
export type PMVorlageStatus =
  /** Keine DNA-Synthese vorhanden */
  | { status: 'missing_dna' }
  /** Keine Fakten-Matrix vorhanden */
  | { status: 'missing_fakten' }
  /** Vorlage veraltet (DNA oder Fakten geändert) */
  | { status: 'outdated'; reason: 'dna_changed' | 'fakten_changed' }
  /** Vorlage verfügbar (optional mit Daten) */
  | { status: 'available'; vorlage?: PMVorlage };

/**
 * Daten zum Erstellen einer PM-Vorlage
 */
export interface PMVorlageCreateData {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta: string;
  hashtags: string[];
  htmlContent: string;
  targetGroup: 'ZG1' | 'ZG2' | 'ZG3';
  markenDNAHash: string;
  faktenMatrixHash: string;
  history?: PMVorlageHistoryEntry[];
}

/**
 * Daten zum Aktualisieren einer PM-Vorlage
 */
export interface PMVorlageUpdateData {
  headline?: string;
  leadParagraph?: string;
  bodyParagraphs?: string[];
  quote?: {
    text?: string;
    person?: string;
    role?: string;
    company?: string;
  };
  cta?: string;
  hashtags?: string[];
  htmlContent?: string;
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3';
  markenDNAHash?: string;
  faktenMatrixHash?: string;
  history?: PMVorlageHistoryEntry[];
}
