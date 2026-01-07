import { Timestamp } from 'firebase/firestore';

/**
 * FAKTEN-MATRIX - Strukturierte Fakten für Pressemeldungs-Generierung
 *
 * Die Fakten-Matrix wird vom Project-Wizard via Tool-Call (JSON) gespeichert,
 * NICHT via Regex-Parsing von Markdown!
 *
 * **Firestore-Pfad:** `projects/{projectId}/strategy/faktenMatrix`
 *
 * **Struktur:**
 * - hook: W-Fragen (Was? Wo? Wann?)
 * - details: Substanz (Delta + Beweise)
 * - quote: O-Ton (Speaker-Referenz + Kernaussage)
 *
 * **Verwendung:**
 * 1. Project-Wizard sammelt Fakten im Chat
 * 2. Bei Abschluss: Tool-Call mit strukturiertem JSON
 * 3. Wird in PM-Vorlage Flow verwendet
 */
export interface FaktenMatrix {
  /**
   * Hook - Die W-Fragen
   * Beantwortet: Was passiert? Wo? Wann?
   */
  hook: {
    /** Was passiert genau? (Ereignis/Neuigkeit) */
    event: string;

    /** Ort des Geschehens */
    location: string;

    /** Zeitpunkt (Datum/Zeitraum) */
    date: string;
  };

  /**
   * Details - Die Substanz
   * Neuigkeitswert und harte Beweise
   */
  details: {
    /** Neuigkeitswert gegenüber Status Quo (Was ist neu/anders?) */
    delta: string;

    /** Harte Beweise (Zahlen, Daten, technische Fakten) */
    evidence: string;
  };

  /**
   * Quote - Der O-Ton
   * Referenz auf DNA-Kontakt + erarbeitete Kernaussage
   */
  quote: {
    /**
     * ID des Ansprechpartners aus der Marken-DNA
     * Referenziert: companies/{companyId}/markenDNA/briefing -> Kontaktliste
     */
    speakerId: string;

    /** Die im Chat erarbeitete Kernaussage (Raw-Statement) */
    rawStatement: string;
  };

  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Daten zum Erstellen einer Fakten-Matrix
 */
export interface FaktenMatrixCreateData {
  hook: {
    event: string;
    location: string;
    date: string;
  };
  details: {
    delta: string;
    evidence: string;
  };
  quote: {
    speakerId: string;
    rawStatement: string;
  };
}

/**
 * Daten zum Aktualisieren einer Fakten-Matrix
 */
export interface FaktenMatrixUpdateData {
  hook?: {
    event?: string;
    location?: string;
    date?: string;
  };
  details?: {
    delta?: string;
    evidence?: string;
  };
  quote?: {
    speakerId?: string;
    rawStatement?: string;
  };
}
