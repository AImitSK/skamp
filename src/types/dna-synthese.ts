import { Timestamp } from 'firebase/firestore';

/**
 * DNA Synthese - KI-optimierte Kurzform der 6 Marken-DNA Dokumente
 *
 * Die DNA Synthese ist eine kompakte, KI-optimierte Zusammenfassung aller 6 Marken-DNA
 * Dokumente eines Kunden. Sie reduziert ~5.000 Tokens auf ~500 Tokens und dient als
 * effizienter Kontext fuer KI-gestuetzte Textgenerierung.
 *
 * **Firestore-Pfad:** `companies/{companyId}/markenDNA/synthesis`
 *
 * **Zweck:**
 * - Token-Ersparnis: 6 Dokumente (~5.000 Tokens) → Synthese (~500 Tokens)
 * - KI-optimiert: Strukturiert fuer schnelle Verarbeitung
 * - Fokus auf Textgenerierung: Tonalitaet, Kernbotschaften, Do's & Don'ts
 *
 * **Icon:** BeakerIcon (Erlenmeyerkolben) 🧪
 */
export interface DNASynthese {
  /** Eindeutige ID (Firestore Document ID) */
  id: string;

  /** Referenz auf Company (type: 'customer') */
  companyId: string;

  /** Organisation ID (Multi-Tenancy) */
  organizationId: string;

  // ===== Inhalt (KI-optimierte Kurzform) =====

  /** HTML-formatierter Inhalt fuer Anzeige in der UI */
  content: string;

  /** Plain-Text fuer KI-Uebergabe (~500 Tokens) */
  plainText: string;

  // ===== Tracking & Aktualitaets-Check =====

  /** Zeitpunkt der Synthetisierung */
  synthesizedAt: Timestamp;

  /** IDs der 6 Marken-DNA Dokumente, aus denen synthetisiert wurde */
  synthesizedFrom: string[];

  /**
   * Hash-Version der Marken-DNA zum Aenderungs-Tracking
   *
   * **Hash-Tracking-Workflow:**
   *
   * Bei Synthese-Erstellung:
   *   1. Hash ueber alle 6 Marken-DNA Dokumente berechnen
   *   2. Hash in markenDNAVersion speichern
   *
   * Spaeter im Projekt:
   *   1. Aktuellen Hash der 6 Dokumente berechnen
   *   2. Vergleich mit gespeichertem markenDNAVersion
   *   3. Bei Mismatch: "⚠️ Marken-DNA wurde geaendert. Neu synthetisieren?"
   *
   * **Hash-Berechnung:**
   * ```typescript
   * const combined = documents
   *   .sort((a, b) => a.type.localeCompare(b.type))
   *   .map(d => `${d.type}:${d.updatedAt.toMillis()}`)
   *   .join('|');
   * return sha256(combined).substring(0, 16);
   * ```
   */
  markenDNAVersion: string;

  /** Wurde manuell vom User angepasst? (keine automatische Re-Synthese) */
  manuallyEdited: boolean;

  // ===== Audit-Felder =====

  /** Zeitpunkt der Erstellung */
  createdAt: Timestamp;

  /** Zeitpunkt der letzten Aktualisierung */
  updatedAt: Timestamp;

  /** User ID des Erstellers */
  createdBy: string;

  /** User ID des letzten Bearbeiters */
  updatedBy: string;
}

/**
 * Daten zum Erstellen einer neuen DNA Synthese
 */
export interface DNASyntheseCreateData {
  /** Referenz auf Company (type: 'customer') */
  companyId: string;

  /** HTML-formatierter Inhalt */
  content: string;

  /** Plain-Text fuer KI (~500 Tokens) */
  plainText: string;

  /** IDs der 6 Marken-DNA Dokumente */
  synthesizedFrom: string[];

  /** Hash-Version der Marken-DNA */
  markenDNAVersion: string;
}

/**
 * Daten zum Aktualisieren einer DNA Synthese
 */
export interface DNASyntheseUpdateData {
  /** HTML-formatierter Inhalt */
  content?: string;

  /** Plain-Text fuer KI */
  plainText?: string;

  /** IDs der 6 Marken-DNA Dokumente */
  synthesizedFrom?: string[];

  /** Hash-Version der Marken-DNA */
  markenDNAVersion?: string;

  /** Manuell bearbeitet Flag */
  manuallyEdited?: boolean;
}
