// src/lib/ai/prompts/press-release/expert-builder.ts
// EXPERT BUILDER: Baut fokussierten Prompt aus DNA + Fakten-Matrix

import {
  extractTonalityOverride,
  extractBlacklist,
  extractKeyMessages
} from '../ai-sequence';

/**
 * EXPERT BUILDER
 *
 * Baut fokussierten Prompt aus DNA + Fakten-Matrix.
 * Wird geladen wenn: if (dnaSynthese && faktenMatrix) { useExpertBuilder(); }
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * DNA-Kontakt-Struktur für Zitatgeber
 */
export interface DNAContact {
  id: string;
  name: string;
  position: string;
  expertise?: string;
  email?: string;
  phone?: string;
}

/**
 * OPTIMIERTES FaktenMatrix Interface
 *
 * Änderungen:
 * - speakerId statt vollständigem Zitatgeber-Objekt
 * - Der expert-builder referenziert über speakerId die DNA-Kontakte
 * - Strukturiert für JSON-Output vom Wizard (kein Regex-Parsing!)
 */
export interface FaktenMatrix {
  hook: {
    event: string;      // Was passiert genau?
    location: string;   // Ort des Geschehens
    date: string;       // Zeitpunkt
  };
  details: {
    delta: string;      // Neuigkeitswert gegenüber Status Quo
    evidence: string;   // Harte Beweise (Zahlen, Daten, technische Fakten)
  };
  quote: {
    speakerId: string;    // ID des Ansprechpartners aus der Marken-DNA
    rawStatement: string; // Die im Chat erarbeitete Kernaussage
  };
  // Metadata
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

// ============================================================================
// EXPERT BUILDER HAUPTFUNKTION
// ============================================================================

/**
 * Baut den Experten-Prompt aus DNA-Synthese und Fakten-Matrix
 *
 * @param dnaSynthese - Komprimierte Marken-DNA vom DNA-Synthesizer
 * @param faktenMatrix - Strukturierte Fakten aus Project-Wizard
 * @param dnaContacts - Kontakte aus DNA für speakerId-Lookup
 * @param targetGroup - Optionale Zielgruppe (ZG1, ZG2, ZG3)
 * @returns Formatierter Experten-Prompt
 */
export function buildExpertPrompt(
  dnaSynthese: string,
  faktenMatrix: FaktenMatrix,
  dnaContacts: DNAContact[],
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3'
): string {
  // 1. DNA-Extraktion (nur relevante Teile)
  const tonality = extractTonalityOverride(dnaSynthese);
  const blacklist = extractBlacklist(dnaSynthese);
  const keyMessages = extractKeyMessagesForTargetGroup(dnaSynthese, targetGroup);
  const companyData = extractCompanyMasterData(dnaSynthese);

  // 2. Zitatgeber aus DNA-Kontakten auflösen via speakerId (mit Fallback)
  let speaker = dnaContacts.find(c => c.id === faktenMatrix.quote.speakerId);
  if (!speaker) {
    // Fallback: Name/Position aus speakerId extrahieren (Format: "contact_vorname_nachname_position")
    const speakerId = faktenMatrix.quote.speakerId;
    const parts = speakerId.replace('contact_', '').split('_');
    const fallbackName = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Sprecher';
    const fallbackPosition = parts[parts.length - 1]?.toUpperCase() || 'Geschäftsführer';
    speaker = {
      id: speakerId,
      name: fallbackName,
      position: fallbackPosition,
    };
  }

  // 3. Fokussierter Prompt bauen
  return `
═══════════════════════════════════════════════════════════════════
MARKEN-DNA (Diese Regeln haben IMMER Vorrang)
═══════════════════════════════════════════════════════════════════

${tonality ? `
⚡ TONALITÄTS-OVERRIDE:
${tonality}
` : ''}

${keyMessages ? `
📋 KERNBOTSCHAFTEN FÜR ${targetGroup || 'ALLE'}:
${keyMessages}
` : ''}

═══════════════════════════════════════════════════════════════════
FAKTEN FÜR DIESE PRESSEMELDUNG (aus Wizard)
═══════════════════════════════════════════════════════════════════

**Ereignis:** ${faktenMatrix.hook.event}
**Ort:** ${faktenMatrix.hook.location}
**Datum:** ${faktenMatrix.hook.date}
**Das Delta:** ${faktenMatrix.details.delta}
**Beweis-Daten:** ${faktenMatrix.details.evidence}

═══════════════════════════════════════════════════════════════════
ZITATGEBER (aus DNA - FEST, NICHT ÄNDERN!)
═══════════════════════════════════════════════════════════════════

Name: ${speaker.name}
Position: ${speaker.position}
${speaker.expertise ? `Expertise: ${speaker.expertise}` : ''}
Kern-Aussage für Zitat: ${faktenMatrix.quote.rawStatement}

ANWEISUNG: Formuliere ein Zitat basierend auf dieser Kern-Aussage.
Der Name und die Position sind FEST und dürfen nicht geändert werden!

${companyData ? `
═══════════════════════════════════════════════════════════════════
FIRMENSTAMMDATEN (EXAKT ÜBERNEHMEN)
═══════════════════════════════════════════════════════════════════

${companyData}

WICHTIG: Diese Daten exakt so verwenden - nicht abändern!
` : ''}

${blacklist ? `
═══════════════════════════════════════════════════════════════════
🚫 BLACKLIST (NIEMALS VERWENDEN - HARD CONSTRAINT)
═══════════════════════════════════════════════════════════════════

${blacklist}

Diese Begriffe sind VERBOTEN - auch wenn sie inhaltlich passen würden!
` : ''}
  `.trim();
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Extrahiert Kernbotschaften für spezifische Zielgruppe
 *
 * Filtert nach "→ FÜR: ZG1" etc.
 */
function extractKeyMessagesForTargetGroup(
  dnaSynthese: string,
  targetGroup?: string
): string | null {
  const allMessages = extractKeyMessages(dnaSynthese);
  if (!allMessages || !targetGroup) return allMessages;

  // Filter nach "→ FÜR: ZG1" etc.
  const lines = allMessages.split('\n');
  const filtered = lines.filter(line =>
    line.includes(`FÜR: ${targetGroup}`) ||
    !line.includes('FÜR:')  // Zeilen ohne Zielgruppe immer inkludieren
  );

  return filtered.join('\n') || allMessages;
}

/**
 * Extrahiert Firmenstammdaten aus DNA-Synthese
 *
 * Sucht nach "📍 FIRMENSTAMMDATEN" Block
 */
function extractCompanyMasterData(dnaSynthese: string): string | null {
  const pattern = /\*\*📍 FIRMENSTAMMDATEN[^*]*\*\*:?\s*([\s\S]*?)(?=\*\*|###|$)/i;
  const match = dnaSynthese.match(pattern);
  return match ? match[1].trim() : null;
}
