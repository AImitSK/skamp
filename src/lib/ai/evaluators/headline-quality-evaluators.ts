// src/lib/ai/evaluators/headline-quality-evaluators.ts
// Custom Evaluators für Headlines-Qualität

import { ai, gemini25FlashModel } from '../genkit-config';
import type { GenerateHeadlinesOutput } from '../schemas/headline-schemas';
import type { BaseEvalDataPoint, Score } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator: Headline Length
 *
 * Prüft, ob alle Headlines zwischen 40-75 Zeichen lang sind.
 */
export const headlineLengthEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/length',
    displayName: 'Headline Length',
    definition: 'Checks if all headlines are between 40-75 characters',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines || output.headlines.length === 0) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      const violations = output.headlines.filter(
        (h) => h.length < 40 || h.length > 75
      );
      const score = violations.length === 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning:
              violations.length === 0
                ? 'All headlines have valid length (40-75 chars)'
                : `${violations.length} headline(s) outside range: ${violations
                    .map((h) => `"${h.headline}" (${h.length})`)
                    .join(', ')}`,
            totalHeadlines: output.headlines.length,
            violations: violations.map((h) => ({
              headline: h.headline,
              length: h.length,
            })),
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);

/**
 * Evaluator: Active Verbs
 *
 * Prüft, ob mindestens eine Headline ein aktives Verb enthält.
 */
export const activeVerbEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/activeVerbs',
    displayName: 'Active Verbs Presence',
    definition: 'Checks if at least one headline contains an active verb',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines || output.headlines.length === 0) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      const headlinesWithActiveVerbs = output.headlines.filter(
        (h) => h.hasActiveVerb
      );
      const score = headlinesWithActiveVerbs.length > 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning:
              score === 1
                ? `${headlinesWithActiveVerbs.length} headline(s) with active verbs`
                : 'No headlines with active verbs found',
            headlinesWithActiveVerbs: headlinesWithActiveVerbs.length,
            totalHeadlines: output.headlines.length,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);

/**
 * Evaluator: No Duplicates
 *
 * Prüft, ob alle Headlines unterschiedlich sind.
 */
export const noDuplicatesEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/noDuplicates',
    displayName: 'No Duplicate Headlines',
    definition: 'Checks if all headlines are unique',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines || output.headlines.length === 0) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      const headlines = output.headlines.map((h) =>
        h.headline.toLowerCase().trim()
      );
      const uniqueHeadlines = new Set(headlines);
      const hasDuplicates = headlines.length !== uniqueHeadlines.size;
      const score = hasDuplicates ? 0 : 1;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: hasDuplicates
              ? 'Duplicate headlines found'
              : 'All headlines are unique',
            totalHeadlines: headlines.length,
            uniqueHeadlines: uniqueHeadlines.size,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);

/**
 * Evaluator: Style Diversity
 *
 * Prüft, ob alle 3 erwarteten Stile vorhanden sind.
 */
export const styleDiversityEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/styleDiversity',
    displayName: 'Style Diversity',
    definition: 'Checks if all 3 expected styles are present',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines || output.headlines.length === 0) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      const expectedStyles = [
        'Faktisch-Direkt',
        'Nutzen-Orientiert',
        'Kontext-Reich',
      ];
      const actualStyles = output.headlines.map((h) => h.style);
      const uniqueStyles = new Set(actualStyles);

      const missingStyles = expectedStyles.filter(
        (style) => !uniqueStyles.has(style)
      );
      const score = missingStyles.length === 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning:
              score === 1
                ? 'All 3 expected styles present'
                : `Missing styles: ${missingStyles.join(', ')}`,
            expectedStyles,
            actualStyles,
            missingStyles,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);

/**
 * Evaluator: Headline Count
 *
 * Prüft, ob genau 3 Headlines generiert wurden.
 */
export const headlineCountEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/count',
    displayName: 'Headline Count',
    definition: 'Checks if exactly 3 headlines were generated',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      const count = output.headlines.length;
      const score = count === 3 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning:
              score === 1
                ? 'Exactly 3 headlines generated'
                : `Expected 3 headlines, got ${count}`,
            expectedCount: 3,
            actualCount: count,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);

// ══════════════════════════════════════════════════════════════
// LLM-BASED EVALUATOR
// ══════════════════════════════════════════════════════════════

/**
 * Prompt für LLM-basierte Headline-Qualitätsbewertung
 */
const HEADLINE_QUALITY_PROMPT = `Du bist ein PR-Experte und Journalist. Bewerte die Qualität der generierten Headlines.

BEWERTUNGSKRITERIEN:
1. Nachrichtenwert (newsworthy)
2. Präzision und Klarheit
3. SEO-Optimierung (Keywords am Anfang)
4. Professionelle Formulierung
5. Unterschiedliche Ansätze (verschiedene Stile erkennbar)

BEWERTUNGSSKALA:
- 5: Exzellent - Alle Kriterien erfüllt, professionelle Qualität
- 4: Gut - Die meisten Kriterien erfüllt, kleine Verbesserungen möglich
- 3: Akzeptabel - Grundlegende Anforderungen erfüllt, aber Verbesserungsbedarf
- 2: Schwach - Mehrere Kriterien nicht erfüllt
- 1: Ungenügend - Fundamentale Probleme

CONTENT:
{{content}}

GENERIERTE HEADLINES:
{{headlines}}

Bewerte die Headlines mit einer Zahl von 1-5 und gib eine kurze Begründung (max. 2 Sätze).

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "reasoning": "<Kurze Begründung>"
}`;

/**
 * Evaluator: Headline Quality (LLM-based)
 *
 * Nutzt ein Judge-LLM um die Gesamtqualität der Headlines zu bewerten.
 */
export const headlineQualityEvaluator = ai.defineEvaluator(
  {
    name: 'headlines/quality',
    displayName: 'Overall Headline Quality',
    definition:
      'LLM-based assessment of headline quality (newsworthy, clear, professional)',
    isBilled: true, // Nutzt LLM → kostenpflichtig
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as GenerateHeadlinesOutput;

      if (!output?.headlines || output.headlines.length === 0) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No headlines found in output' },
          },
        };
      }

      // Prepare prompt
      const content = input?.content || 'Unknown content';
      const headlinesText = output.headlines
        .map((h, i) => `${i + 1}. [${h.style}] ${h.headline}`)
        .join('\n');

      const prompt = HEADLINE_QUALITY_PROMPT.replace(
        '{{content}}',
        content.substring(0, 500)
      ).replace('{{headlines}}', headlinesText);

      // Call Judge LLM
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      const responseText =
        result.message?.content?.[0]?.text || result.text || '';

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Normalize score to 0-1 (from 1-5 scale)
      const normalizedScore = parsed.score / 5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: normalizedScore,
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            scale: '1-5',
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: 0,
          error: error.message,
        },
      };
    }
  }
);
