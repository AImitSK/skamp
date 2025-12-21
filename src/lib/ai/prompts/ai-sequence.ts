import { getScoreOptimizationPrompt } from './score-optimization';

export interface AISequenceContext {
  dnaSynthese?: string;
  kernbotschaft?: {
    occasion: string;
    goal: string;
    keyMessage: string;
  };
  industry?: string;
  toneOverride?: 'formal' | 'casual' | 'modern' | null;
}

/**
 * Baut den vollständigen AI Sequenz Prompt mit drei Ebenen:
 * EBENE 1: Marken-DNA (höchste Priorität)
 * EBENE 2: Score-Regeln (journalistisches Handwerk)
 * EBENE 3: Projekt-Kontext (aktuelle Fakten)
 */
export function buildAISequencePrompt(context: AISequenceContext): string {
  let prompt = '';

  // EBENE 1: MARKEN-DNA
  if (context.dnaSynthese) {
    const extractedTone = extractToneFromDNA(context.dnaSynthese);
    const effectiveTone = context.toneOverride || extractedTone;

    prompt += `
═══════════════════════════════════════════════════════════════════
EBENE 1: MARKEN-DNA (Höchste Priorität)
═══════════════════════════════════════════════════════════════════

${context.dnaSynthese}

EXTRAHIERTE TONALITÄT: ${effectiveTone || 'nicht definiert'}
${context.toneOverride ? `⚠️ TONALITÄTS-OVERRIDE AKTIV: "${context.toneOverride}" überschreibt DNA-Vorgabe` : ''}

WICHTIG:
- Die Tonalität aus dieser DNA hat VORRANG vor allen anderen Regeln
- USP, Kernbotschaften und No-Go-Words sind bindend
- Zielgruppe bestimmt Sprache und Komplexität

`;
  }

  // EBENE 2: SCORE-REGELN
  prompt += `
═══════════════════════════════════════════════════════════════════
${getScoreOptimizationPrompt(context.industry)}
═══════════════════════════════════════════════════════════════════

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

  prompt += `
═══════════════════════════════════════════════════════════════════
KONFLIKT-AUFLÖSUNG
═══════════════════════════════════════════════════════════════════

Bei Konflikten zwischen den Ebenen gilt folgende Priorität:
1. EBENE 1 (Marken-DNA) überschreibt IMMER Ebene 2
2. EBENE 2 (Score-Regeln) ist Standard, wenn Ebene 1 nichts anderes fordert
3. EBENE 3 (Projekt-Kontext) liefert die aktuellen Fakten

Beispiel: Wenn die DNA "casual und modern" vorgibt, dann nutze NICHT die formelle
Branchensprache aus Ebene 2, sondern passe die Score-Regeln an die DNA-Tonalität an.

ZIEL: PR-SEO Score von 85-95% erreichen, ohne die Marken-DNA zu verletzen.
`;

  return prompt;
}

/**
 * Extrahiert Tonalität aus DNA Synthese
 */
export function extractToneFromDNA(dnaSynthese: string): string | null {
  const toneKeywords = {
    formal: ['formell', 'professionell', 'seriös', 'sachlich'],
    casual: ['casual', 'locker', 'entspannt', 'freundlich', 'nahbar'],
    modern: ['modern', 'innovativ', 'frisch', 'jung', 'dynamisch'],
  };

  const lowerDNA = dnaSynthese.toLowerCase();

  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    if (keywords.some(keyword => lowerDNA.includes(keyword))) {
      return tone;
    }
  }

  return null;
}
