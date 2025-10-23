// src/lib/ai/evaluators/press-release-structured-evaluators.ts
// Custom Evaluators für strukturierte Pressemitteilungen

import { ai, gemini25FlashModel } from '../genkit-config';
import type { StructuredPressRelease } from '../schemas/press-release-structured-schemas';
import type { BaseEvalDataPoint } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator: Headline Length
 */
export const prHeadlineLengthEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/headlineLength', displayName: 'Headline Length (40-75 chars)', definition: 'Checks headline length', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const len = output.headline?.length || 0;
      const score = len >= 40 && len <= 75 ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: { score, details: { reasoning: `Headline: ${len} chars (expected 40-75)`, length: len } }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Lead Paragraph Length
 */
export const prLeadLengthEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/leadLength', displayName: 'Lead Length (80-200 chars)', definition: 'Checks lead paragraph length', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const len = output.leadParagraph?.length || 0;
      const score = len >= 80 && len <= 200 ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: { score, details: { reasoning: `Lead: ${len} chars (expected 80-200)`, length: len } }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Body Paragraphs Count
 */
export const prBodyCountEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/bodyCount', displayName: 'Body Paragraphs (3-4)', definition: 'Checks body paragraph count', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const count = output.bodyParagraphs?.length || 0;
      const score = count >= 3 && count <= 4 ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: { score, details: { reasoning: `${count} body paragraphs (expected 3-4)`, count } }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Quote Structure
 */
export const prQuoteStructureEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/quoteStructure', displayName: 'Quote Structure Complete', definition: 'Checks quote has person, role, company', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const quote = output.quote;
      const hasAll = quote?.text && quote?.person && quote?.role && quote?.company;
      const score = hasAll ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score === 1 ? 'Quote structure complete' : 'Missing quote fields',
            hasText: !!quote?.text,
            hasPerson: !!quote?.person,
            hasRole: !!quote?.role,
            hasCompany: !!quote?.company
          }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Hashtag Count
 */
export const prHashtagCountEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/hashtagCount', displayName: 'Hashtags (2-3)', definition: 'Checks 2-3 hashtags present', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const count = output.hashtags?.length || 0;
      const score = count >= 2 && count <= 3 ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: { score, details: { reasoning: `${count} hashtags (expected 2-3)`, count } }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

/**
 * Evaluator: Social Optimized
 */
export const prSocialOptimizedEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/socialOptimized', displayName: 'Social Media Optimized', definition: 'Checks social optimization flag', isBilled: false },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;
      const score = output.socialOptimized ? 1 : 0;
      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: { score, details: { reasoning: score === 1 ? 'Social optimized' : 'Not social optimized' } }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);

// ══════════════════════════════════════════════════════════════
// LLM-BASED EVALUATOR
// ══════════════════════════════════════════════════════════════

const PR_QUALITY_PROMPT = `Du bist ein PR-Experte. Bewerte die Qualität dieser Pressemitteilung.

KRITERIEN:
1. Journalistische Standards (dpa-Stil)
2. Vollständigkeit (Headline, Lead, Body, Zitat, CTA)
3. Faktische Präzision
4. Professionelle Sprache
5. SEO-Optimierung

BEWERTUNG (1-5):
5: Exzellent - Publikationsreif
4: Gut - Kleine Anpassungen nötig
3: Akzeptabel - Mehrere Verbesserungen nötig
2: Schwach - Signifikante Mängel
1: Ungenügend - Nicht publikationsreif

PRESSEMITTEILUNG:
Headline: {{headline}}
Lead: {{lead}}
Body: {{body}}
Zitat: "{{quoteText}}" - {{quotePerson}}, {{quoteRole}}

Bewerte mit JSON:
{ "score": <1-5>, "reasoning": "<Begründung>" }`;

/**
 * Evaluator: Overall PR Quality (LLM-based)
 */
export const prQualityEvaluator = ai.defineEvaluator(
  { name: 'pressRelease/quality', displayName: 'Overall PR Quality', definition: 'LLM-based quality assessment', isBilled: true },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as StructuredPressRelease;

      const prompt = PR_QUALITY_PROMPT
        .replace('{{headline}}', output.headline || '')
        .replace('{{lead}}', output.leadParagraph || '')
        .replace('{{body}}', output.bodyParagraphs?.join(' ').substring(0, 500) || '')
        .replace('{{quoteText}}', output.quote?.text || '')
        .replace('{{quotePerson}}', output.quote?.person || '')
        .replace('{{quoteRole}}', output.quote?.role || '');

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
          score: parsed.score / 5,
          details: { reasoning: parsed.reasoning, rawScore: parsed.score, scale: '1-5' }
        }
      };
    } catch (error: any) {
      return { testCaseId: datapoint.testCaseId || 'unknown', evaluation: { score: 0, error: error.message } };
    }
  }
);
