import { getScoreOptimizationPrompt } from './score-optimization';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AISequenceContext {
  dnaSynthese?: string;
  kernbotschaft?: {
    occasion: string;
    goal: string;
    keyMessage: string;
  };
  industry?: string;
  toneOverride?: 'formal' | 'casual' | 'modern' | null;
  /** Zielgruppe für dieses Projekt (ZG1 = Primär, ZG2 = Sekundär, ZG3 = Multiplikatoren) */
  targetGroup?: 'ZG1' | 'ZG2' | 'ZG3';
}

/** Extrahierte DNA-Komponenten für präzise Prompt-Steuerung */
export interface ExtractedDNAComponents {
  tonalityOverride: string | null;
  blacklist: string | null;
  mustUseTerms: string | null;
  keyMessages: string | null;
  spokespersons: string | null;
  swotEssence: string | null;
}

// ============================================================================
// EXTRAKTION-FUNKTIONEN (Robuste Block-Isolation)
// ============================================================================

/**
 * Extrahiert den TONALITÄTS-OVERRIDE Block aus der DNA-Synthese
 * Sucht gezielt nach "⚡ TONALITÄTS-OVERRIDE" Block
 */
export function extractTonalityOverride(dnaSynthese: string): string | null {
  // Pattern: Suche den Block zwischen ⚡ TONALITÄTS-OVERRIDE und dem nächsten **-Header oder ###
  const pattern = /\*\*⚡ TONALITÄTS-OVERRIDE[^*]*\*\*:?\s*([\s\S]*?)(?=\*\*🚫|\*\*SWOT|###|$)/i;
  const match = dnaSynthese.match(pattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: Suche nach "IMMER:" und "NIE:" Patterns
  const fallbackPattern = /IMMER:\s*\[([^\]]+)\][\s\S]*?NIE:\s*\[([^\]]+)\]/i;
  const fallbackMatch = dnaSynthese.match(fallbackPattern);

  if (fallbackMatch) {
    return `IMMER: ${fallbackMatch[1]}\nNIE: ${fallbackMatch[2]}`;
  }

  return null;
}

/**
 * Extrahiert den BLACKLIST Block aus der DNA-Synthese
 * Sucht gezielt nach "🚫 BLACKLIST" Block
 */
export function extractBlacklist(dnaSynthese: string): string | null {
  // Pattern: Suche den Block zwischen 🚫 BLACKLIST und dem nächsten **-Header oder ###
  const pattern = /\*\*🚫 BLACKLIST[^*]*\*\*:?\s*([\s\S]*?)(?=\*\*SWOT|###|$)/i;
  const match = dnaSynthese.match(pattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: Suche nach VERBOTEN Pattern
  const fallbackPattern = /VERBOTEN:\s*\[([^\]]+)\]/i;
  const fallbackMatch = dnaSynthese.match(fallbackPattern);

  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  return null;
}

/**
 * Extrahiert PFLICHT-BEGRIFFE aus der DNA-Synthese
 */
export function extractMustUseTerms(dnaSynthese: string): string | null {
  const pattern = /PFLICHT-BEGRIFFE:\s*\[([^\]]+)\]/i;
  const match = dnaSynthese.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extrahiert KERNBOTSCHAFTEN mit Zielgruppen-Zuordnung
 */
export function extractKeyMessages(dnaSynthese: string): string | null {
  const pattern = /\*\*KERNBOTSCHAFTEN[^*]*\*\*:?\s*([\s\S]*?)(?=\*\*KOMMUNIKATIONSZIELE|\*\*⚡|###|$)/i;
  const match = dnaSynthese.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extrahiert ANSPRECHPARTNER Block
 */
export function extractSpokespersons(dnaSynthese: string): string | null {
  const pattern = /\*\*ANSPRECHPARTNER[^*]*\*\*:?\s*([\s\S]*?)(?=###|$)/i;
  const match = dnaSynthese.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extrahiert alle relevanten DNA-Komponenten
 */
export function extractDNAComponents(dnaSynthese: string): ExtractedDNAComponents {
  return {
    tonalityOverride: extractTonalityOverride(dnaSynthese),
    blacklist: extractBlacklist(dnaSynthese),
    mustUseTerms: extractMustUseTerms(dnaSynthese),
    keyMessages: extractKeyMessages(dnaSynthese),
    spokespersons: extractSpokespersons(dnaSynthese),
    swotEssence: null, // Optional für spätere Erweiterung
  };
}

/**
 * Extrahiert Tonalität aus DNA Synthese (Legacy-Funktion für Rückwärtskompatibilität)
 */
export function extractToneFromDNA(dnaSynthese: string): string | null {
  // Zuerst: Versuche TONALITÄTS-OVERRIDE Block zu extrahieren
  const override = extractTonalityOverride(dnaSynthese);
  if (override) {
    // Extrahiere erstes IMMER-Adjektiv
    const immerMatch = override.match(/IMMER:\s*([^,\n]+)/i);
    if (immerMatch) {
      const firstAdjective = immerMatch[1].trim().toLowerCase();
      if (firstAdjective.includes('selbstbewusst') || firstAdjective.includes('direkt')) {
        return 'modern';
      }
      if (firstAdjective.includes('seriös') || firstAdjective.includes('professionell')) {
        return 'formal';
      }
      if (firstAdjective.includes('locker') || firstAdjective.includes('freundlich')) {
        return 'casual';
      }
    }
  }

  // Fallback: Keyword-Suche im Gesamttext
  const toneKeywords = {
    formal: ['formell', 'professionell', 'seriös', 'sachlich'],
    casual: ['casual', 'locker', 'entspannt', 'freundlich', 'nahbar'],
    modern: ['modern', 'innovativ', 'frisch', 'jung', 'dynamisch', 'selbstbewusst'],
  };

  const lowerDNA = dnaSynthese.toLowerCase();

  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    if (keywords.some(keyword => lowerDNA.includes(keyword))) {
      return tone;
    }
  }

  return null;
}

// ============================================================================
// MAIN PROMPT BUILDER
// ============================================================================

/**
 * Baut den vollständigen AI Sequenz Prompt mit drei Ebenen:
 * EBENE 1: Marken-DNA (höchste Priorität) - HARTE REGELN
 * EBENE 2: Score-Regeln (journalistisches Handwerk)
 * EBENE 3: Projekt-Kontext (aktuelle Fakten)
 */
export function buildAISequencePrompt(context: AISequenceContext): string {
  let prompt = '';
  let dnaComponents: ExtractedDNAComponents | null = null;

  // EBENE 1: MARKEN-DNA
  if (context.dnaSynthese) {
    dnaComponents = extractDNAComponents(context.dnaSynthese);
    const extractedTone = extractToneFromDNA(context.dnaSynthese);
    const effectiveTone = context.toneOverride || extractedTone;

    prompt += `
═══════════════════════════════════════════════════════════════════
EBENE 1: MARKEN-DNA (Höchste Priorität - NICHT VERHANDELBAR)
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

───────────────────────────────────────────────────────────────────
🔒 HARTE REGELN (Diese haben IMMER Vorrang vor Ebene 2)
───────────────────────────────────────────────────────────────────

EXTRAHIERTE TONALITÄT: ${effectiveTone || 'nicht definiert'}
${context.toneOverride ? `⚠️ MANUELLER OVERRIDE AKTIV: "${context.toneOverride}"` : ''}

${dnaComponents.tonalityOverride ? `
⚡ TONALITÄTS-OVERRIDE (Priorität 1):
${dnaComponents.tonalityOverride}
` : ''}

${dnaComponents.blacklist ? `
🚫 BLACKLIST (NIEMALS verwenden):
${dnaComponents.blacklist}

ACHTUNG: Diese Begriffe dürfen unter KEINEN Umständen im Text erscheinen -
auch nicht, wenn Score-Regeln aus Ebene 2 sie nahelegen würden!
` : ''}

${dnaComponents.mustUseTerms ? `
✅ PFLICHT-BEGRIFFE (MÜSSEN im Text vorkommen):
${dnaComponents.mustUseTerms}

Falls eine journalistische Regel (z.B. Headline-Länge) die Verwendung eines
Pflicht-Begriffs verhindert, hat die Marken-DNA IMMER Vorrang!
` : ''}

📋 BEHAUPTUNG → BEWEIS REGEL:
Jede Behauptung im Text MUSS mit einem Beweis aus der DNA-Synthese untermauert werden.
Nutze die [Behauptung] → Beweis: [Fakt] Struktur aus den Kernbotschaften.
Erfinde NIEMALS Zahlen oder Fakten - nur das, was in der DNA steht!

`;
  }

  // ZIELGRUPPEN-ROUTING
  if (context.targetGroup && dnaComponents?.keyMessages) {
    prompt += `
───────────────────────────────────────────────────────────────────
🎯 ZIELGRUPPEN-ROUTING (Aktive Zielgruppe: ${context.targetGroup})
───────────────────────────────────────────────────────────────────

Die aktuelle Zielgruppe für dieses Projekt ist: ${context.targetGroup}
${context.targetGroup === 'ZG1' ? '(Primäre Zielgruppe - z.B. Endkunden, B2B-Entscheider)' : ''}
${context.targetGroup === 'ZG2' ? '(Sekundäre Zielgruppe - z.B. Partner, Interessenten)' : ''}
${context.targetGroup === 'ZG3' ? '(Multiplikatoren - Journalisten, Influencer, Fachpresse)' : ''}

ANWEISUNG:
- Verwende BEVORZUGT Kernbotschaften, die mit "→ FÜR: ${context.targetGroup}" markiert sind
- Passe Sprachkomplexität und Fachbegriffe an diese Zielgruppe an
- Bei ${context.targetGroup === 'ZG3' ? 'Journalisten: Fokus auf Nachrichtenwert und Zitierbarkeit' : 'Endkunden: Fokus auf Nutzen und Problemlösung'}

`;
  }

  // ZITIER-STRATEGIE
  if (dnaComponents?.spokespersons) {
    prompt += `
───────────────────────────────────────────────────────────────────
💬 ZITIER-STRATEGIE (Position → Expertise Matching)
───────────────────────────────────────────────────────────────────

Wähle den passenden Ansprechpartner basierend auf dem Thema:

THEMA → PASSENDER ZITATGEBER:
- Strategie, Vision, Wachstum, M&A → CEO/Geschäftsführer
- Technik, Produkt, Innovation → CTO/Technikleiter
- Marketing, Marke, Kampagnen → CMO/Marketingleiter
- Zahlen, Investitionen, ROI → CFO/Finanzleiter
- Prozesse, Effizienz, Skalierung → COO/Betriebsleiter
- Kunden, Markt, Vertrieb → Vertriebsleiter
- Kultur, Team, Employer Branding → HR-Leiter
- Fachspezifisches Detail → Fachexperte/Spezialist

Nutze die Zitier-Expertise aus der DNA-Synthese, um den richtigen Sprecher auszuwählen.
Das Zitat muss zur Expertise der Person passen!

`;
  }

  // EBENE 2: SCORE-REGELN
  prompt += `
═══════════════════════════════════════════════════════════════════
${getScoreOptimizationPrompt(context.industry)}
═══════════════════════════════════════════════════════════════════

⚠️ WICHTIG: Diese Regeln gelten NUR, wenn sie NICHT mit Ebene 1 (Marken-DNA) kollidieren!
Bei Konflikten hat IMMER die Marken-DNA Vorrang.

`;

  // EBENE 3: PROJEKT-KONTEXT
  if (context.kernbotschaft) {
    prompt += `
═══════════════════════════════════════════════════════════════════
EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
═══════════════════════════════════════════════════════════════════

ANLASS (Warum jetzt?)
${context.kernbotschaft.occasion}

ZIEL (Was soll erreicht werden?)
${context.kernbotschaft.goal}

KERNBOTSCHAFT FÜR DIESES PROJEKT
${context.kernbotschaft.keyMessage}

`;
  }

  // KONFLIKT-MANAGEMENT
  prompt += `
═══════════════════════════════════════════════════════════════════
⚖️ KONFLIKT-AUFLÖSUNG (Verbindliche Hierarchie)
═══════════════════════════════════════════════════════════════════

Bei Konflikten zwischen den Ebenen gilt IMMER diese Priorität:

1️⃣ EBENE 1 (Marken-DNA) überschreibt ALLES
   - BLACKLIST-Begriffe: NIEMALS verwenden, egal was Ebene 2 sagt
   - PFLICHT-BEGRIFFE: IMMER verwenden, auch wenn Headline zu lang wird
   - TONALITÄT: Bestimmt den Sound, Score-Regeln passen sich an

2️⃣ EBENE 2 (Score-Regeln) ist Standard
   - Gilt nur, wenn Ebene 1 nichts anderes fordert
   - Headline-Länge ist flexibel, wenn Pflicht-Begriff sonst fehlt
   - Branchenregeln weichen der DNA-Tonalität

3️⃣ EBENE 3 (Projekt-Kontext) liefert Fakten
   - Aktuelle Informationen für diesen spezifischen Text
   - Nutze Fakten aus Ebene 3, aber formuliere nach Ebene 1

BEISPIEL-KONFLIKT:
Wenn DNA sagt "casual und modern" aber Score-Regel sagt "formelle Branchensprache"
→ LÖSUNG: Nutze casual-modernen Ton (Ebene 1 gewinnt)

Wenn Headline-Regel sagt "max 75 Zeichen" aber Pflicht-Begriff macht 80 Zeichen
→ LÖSUNG: 80 Zeichen sind OK (Pflicht-Begriff hat Vorrang)

ZIEL: PR-SEO Score von 85-95% erreichen, OHNE die Marken-DNA zu verletzen.
Die DNA ist die Identität - sie darf niemals kompromittiert werden!
`;

  return prompt;
}
