// src/lib/ai/evaluators/pm-vorlage-story-evaluators.ts
// Story-fokussierte Evaluatoren für PM-Vorlage
// Ersetzt SEO-Metriken durch journalistische Qualitätskriterien

import { ai, gemini25FlashModel } from '../genkit-config';
import type { BaseEvalDataPoint } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// TYPEN
// ══════════════════════════════════════════════════════════════

interface PMVorlageOutput {
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
  rawText?: string;
}

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS (schnell, kostenlos)
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator: Headline ist nicht generisch
 * Prüft ob die Headline einen Hook hat, nicht nur "Firma X startet Y"
 */
export const pmHeadlineHookEvaluator = ai.defineEvaluator(
  {
    name: 'pmVorlage/headlineHook',
    displayName: 'Headline hat Hook',
    definition: 'Prüft ob Headline packend ist, nicht generisch',
    isBilled: false
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as PMVorlageOutput;
      const headline = output.headline || '';

      // Generische Patterns erkennen
      const genericPatterns = [
        /^[\w\s]+ startet [\w\s]+$/i,           // "Firma X startet Y"
        /^[\w\s]+ präsentiert [\w\s]+$/i,       // "Firma X präsentiert Y"
        /^[\w\s]+ lanciert [\w\s]+$/i,          // "Firma X lanciert Y"
        /^[\w\s]+ führt [\w\s]+ ein$/i,         // "Firma X führt Y ein"
        /^Neues? [\w\s]+ von [\w\s]+$/i,        // "Neues X von Y"
      ];

      const isGeneric = genericPatterns.some(pattern => pattern.test(headline));

      // Hook-Indikatoren (positive Signale)
      const hookIndicators = [
        /tschüss|schluss|ade|bye/i,             // Abschied von etwas
        /revolution|wandel|wende/i,             // Veränderung
        /\?/,                                    // Frage in Headline
        /:/,                                     // Doppelpunkt (oft Hook:Erklärung)
        /warum|wie|was/i,                       // W-Fragen
        /statt|anstatt|stattdessen/i,          // Kontrast
        /trotz|obwohl/i,                        // Gegen Erwartung
      ];

      const hasHook = hookIndicators.some(pattern => pattern.test(headline));

      // Score: 1 wenn Hook vorhanden und nicht generisch, 0.5 wenn nur eines, 0 wenn generisch ohne Hook
      let score = 0;
      if (hasHook && !isGeneric) score = 1;
      else if (hasHook || !isGeneric) score = 0.5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score === 1
              ? 'Headline hat Hook und ist nicht generisch'
              : score === 0.5
                ? 'Headline ist akzeptabel, könnte aber packender sein'
                : 'Headline ist zu generisch, kein Hook erkennbar',
            headline,
            isGeneric,
            hasHook
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Zitat ist authentisch
 * Prüft ob Zitat wie ein echter Mensch klingt, nicht wie Marketing
 */
export const pmQuoteAuthenticityEvaluator = ai.defineEvaluator(
  {
    name: 'pmVorlage/quoteAuthenticity',
    displayName: 'Zitat klingt authentisch',
    definition: 'Prüft ob Zitat menschlich klingt, nicht wie PR-Floskel',
    isBilled: false
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as PMVorlageOutput;
      const quoteText = output.quote?.text || '';

      // Marketing-Floskeln erkennen
      const marketingFloskeln = [
        /wir freuen uns/i,
        /stolz präsentieren/i,
        /einzigartig/i,
        /revolutionär/i,
        /innovative lösung/i,
        /führend/i,
        /weltklasse/i,
        /game.?changer/i,
        /synergien/i,
      ];

      const hasFloskeln = marketingFloskeln.some(pattern => pattern.test(quoteText));

      // Authentizitäts-Indikatoren
      const authenticityIndicators = [
        /"du"|"wir"|"uns"/i,                    // Persönliche Ansprache
        /spaß|freude|leidenschaft/i,           // Emotionen
        /glaube|denke|meine/i,                 // Persönliche Meinung
        /einladung|willkommen/i,               // Einladend
      ];

      const hasAuthenticity = authenticityIndicators.some(pattern => pattern.test(quoteText));

      // Zitat-Struktur prüfen
      const hasProperAttribution = output.quote?.person && output.quote?.role && output.quote?.company;

      let score = 0;
      if (hasAuthenticity && !hasFloskeln && hasProperAttribution) score = 1;
      else if (hasProperAttribution && !hasFloskeln) score = 0.7;
      else if (hasProperAttribution) score = 0.4;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score >= 0.7
              ? 'Zitat klingt authentisch und menschlich'
              : score >= 0.4
                ? 'Zitat hat korrekte Struktur, könnte aber authentischer sein'
                : 'Zitat wirkt wie Marketing-Floskel oder fehlt',
            quoteText: quoteText.substring(0, 100),
            hasFloskeln,
            hasAuthenticity,
            hasProperAttribution
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Story-Struktur vorhanden
 * Prüft ob der Text eine erkennbare Story-Struktur hat
 */
export const pmStoryStructureEvaluator = ai.defineEvaluator(
  {
    name: 'pmVorlage/storyStructure',
    displayName: 'Story-Struktur vorhanden',
    definition: 'Prüft ob Text eine narrative Struktur hat',
    isBilled: false
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as PMVorlageOutput;

      // Komponenten prüfen
      const hasHeadline = (output.headline?.length || 0) > 10;
      const hasLead = (output.leadParagraph?.length || 0) > 50;
      const hasBody = (output.bodyParagraphs?.length || 0) >= 2;
      const hasQuote = (output.quote?.text?.length || 0) > 20;
      const hasCta = (output.cta?.length || 0) > 10;

      // Wortanzahl prüfen (300-600 Wörter optimal)
      const fullText = [
        output.headline,
        output.leadParagraph,
        ...(output.bodyParagraphs || []),
        output.quote?.text,
        output.cta
      ].filter(Boolean).join(' ');

      const wordCount = fullText.split(/\s+/).length;
      const hasGoodLength = wordCount >= 200 && wordCount <= 800;

      // Scoring
      let score = 0;
      if (hasHeadline) score += 0.2;
      if (hasLead) score += 0.2;
      if (hasBody) score += 0.2;
      if (hasQuote) score += 0.2;
      if (hasCta) score += 0.1;
      if (hasGoodLength) score += 0.1;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score >= 0.8
              ? 'Vollständige Story-Struktur'
              : score >= 0.5
                ? 'Grundstruktur vorhanden, aber unvollständig'
                : 'Story-Struktur fehlt weitgehend',
            components: { hasHeadline, hasLead, hasBody, hasQuote, hasCta },
            wordCount,
            hasGoodLength
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Parsing-Marker vorhanden
 * Prüft ob CTA und Hashtags korrekt formatiert sind
 */
export const pmParsingMarkersEvaluator = ai.defineEvaluator(
  {
    name: 'pmVorlage/parsingMarkers',
    displayName: 'Parsing-Marker korrekt',
    definition: 'Prüft ob [[CTA:...]] und [[HASHTAGS:...]] vorhanden sind',
    isBilled: false
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as PMVorlageOutput;
      const rawText = output.rawText || '';

      const hasCtaMarker = /\[\[CTA:[^\]]+\]\]/i.test(rawText);
      const hasHashtagMarker = /\[\[HASHTAGS:[^\]]+\]\]/i.test(rawText);

      // Auch geparsed prüfen
      const hasCtaParsed = (output.cta?.length || 0) > 5;
      const hasHashtagsParsed = (output.hashtags?.length || 0) >= 1;

      let score = 0;
      if (hasCtaMarker || hasCtaParsed) score += 0.5;
      if (hasHashtagMarker || hasHashtagsParsed) score += 0.5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score === 1
              ? 'Alle Parsing-Marker korrekt'
              : score === 0.5
                ? 'Ein Marker fehlt'
                : 'Parsing-Marker fehlen',
            hasCtaMarker,
            hasHashtagMarker,
            hasCtaParsed,
            hasHashtagsParsed
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

// ══════════════════════════════════════════════════════════════
// LLM-BASED EVALUATOR (genauer, aber kostet Tokens)
// ══════════════════════════════════════════════════════════════

const STORY_QUALITY_PROMPT = `Du bist ein erfahrener PR-Redakteur. Bewerte diese Pressemeldung nach Story-Qualität.

KRITERIEN:
1. HOOK: Hat die Headline einen packenden Einstieg? (nicht generisch wie "Firma startet Produkt")
2. STORY: Erzählt der Text eine Geschichte mit rotem Faden?
3. POSITIONIERUNG: Wird klar gegen Wettbewerber/Klischees positioniert?
4. ZIELGRUPPE: Wird die Zielgruppe direkt angesprochen?
5. ZITAT: Klingt das Zitat wie ein echter Mensch oder wie Marketing?

BEWERTUNG (1-5):
5: Exzellent - Ein Journalist würde das sofort übernehmen
4: Gut - Mit minimalen Anpassungen publikationsreif
3: Akzeptabel - Solide, aber langweilig
2: Schwach - Zu generisch, kein Hook
1: Ungenügend - Liest sich wie ein Template

PRESSEMELDUNG:
{{fullText}}

Bewerte mit JSON:
{
  "score": <1-5>,
  "hookScore": <1-5>,
  "storyScore": <1-5>,
  "positioningScore": <1-5>,
  "targetGroupScore": <1-5>,
  "quoteScore": <1-5>,
  "reasoning": "<Begründung in 2-3 Sätzen>"
}`;

/**
 * Evaluator: Gesamte Story-Qualität (LLM-based)
 */
export const pmStoryQualityEvaluator = ai.defineEvaluator(
  {
    name: 'pmVorlage/storyQuality',
    displayName: 'Story-Qualität (LLM)',
    definition: 'LLM-basierte Bewertung der journalistischen Story-Qualität',
    isBilled: true
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as PMVorlageOutput;

      // Volltext zusammenbauen
      const fullText = [
        `Headline: ${output.headline}`,
        `Lead: ${output.leadParagraph}`,
        `Body:\n${(output.bodyParagraphs || []).join('\n\n')}`,
        `Zitat: "${output.quote?.text}" - ${output.quote?.person}, ${output.quote?.role}`,
        `CTA: ${output.cta}`
      ].join('\n\n');

      const prompt = STORY_QUALITY_PROMPT.replace('{{fullText}}', fullText);

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: { temperature: 0.3, maxOutputTokens: 512 }
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse JSON from LLM response');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: parsed.score / 5, // Normalisiert auf 0-1
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            subScores: {
              hook: parsed.hookScore,
              story: parsed.storyScore,
              positioning: parsed.positioningScore,
              targetGroup: parsed.targetGroupScore,
              quote: parsed.quoteScore
            },
            scale: '1-5'
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

// ══════════════════════════════════════════════════════════════
// EVALUATOR SUITE
// ══════════════════════════════════════════════════════════════

/**
 * Alle PM-Vorlage Story Evaluatoren
 */
export const pmVorlageStoryEvaluators = [
  pmHeadlineHookEvaluator,
  pmQuoteAuthenticityEvaluator,
  pmStoryStructureEvaluator,
  pmParsingMarkersEvaluator,
  pmStoryQualityEvaluator,
];
