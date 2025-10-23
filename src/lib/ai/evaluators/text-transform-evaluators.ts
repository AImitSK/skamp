// src/lib/ai/evaluators/text-transform-evaluators.ts
// Custom Evaluators für Text-Transformation-Qualität

import { ai, gemini25FlashModel } from '../genkit-config';
import type { TextTransformOutput } from '../schemas/text-transform-schemas';
import type { BaseEvalDataPoint } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator: Rephrase Length Compliance
 *
 * Prüft, ob rephrase-Transformationen die ±5-Wörter-Regel einhalten.
 */
export const rephraseLengthEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/rephraseLength',
    displayName: 'Rephrase Length Compliance',
    definition: 'Checks if rephrase transformations stay within ±5 words of original',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für rephrase-Action relevant
      if (input?.action !== 'rephrase') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not a rephrase action)' },
          },
        };
      }

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const originalWordCount = input.text.trim().split(/\s+/).length;
      const transformedWordCount = output.transformedText.trim().split(/\s+/).length;
      const wordDiff = Math.abs(transformedWordCount - originalWordCount);

      const isCompliant = wordDiff <= 5;
      const score = isCompliant ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isCompliant
              ? `Word count difference: ${wordDiff} (within ±5 words)`
              : `Word count difference: ${wordDiff} (exceeds ±5 words limit)`,
            originalWordCount,
            transformedWordCount,
            wordDiff,
            limit: 5,
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
 * Evaluator: Shorten Length Reduction
 *
 * Prüft, ob shorten-Transformationen ~30% kürzer sind.
 */
export const shortenLengthEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/shortenLength',
    displayName: 'Shorten Length Reduction',
    definition: 'Checks if shorten transformations reduce length by ~30%',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für shorten-Action relevant
      if (input?.action !== 'shorten') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not a shorten action)' },
          },
        };
      }

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const originalWordCount = input.text.trim().split(/\s+/).length;
      const transformedWordCount = output.transformedText.trim().split(/\s+/).length;

      // Akzeptabler Bereich: 20-40% Reduktion
      const reductionPercent = ((originalWordCount - transformedWordCount) / originalWordCount) * 100;
      const isCompliant = reductionPercent >= 20 && reductionPercent <= 40;
      const score = isCompliant ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isCompliant
              ? `Reduction: ${reductionPercent.toFixed(1)}% (target: 20-40%)`
              : `Reduction: ${reductionPercent.toFixed(1)}% (outside target range 20-40%)`,
            originalWordCount,
            transformedWordCount,
            reductionPercent: parseFloat(reductionPercent.toFixed(1)),
            targetRange: '20-40%',
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
 * Evaluator: Expand Length Increase
 *
 * Prüft, ob expand-Transformationen ~50% länger sind.
 */
export const expandLengthEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/expandLength',
    displayName: 'Expand Length Increase',
    definition: 'Checks if expand transformations increase length by ~50%',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für expand-Action relevant
      if (input?.action !== 'expand') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not an expand action)' },
          },
        };
      }

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const originalWordCount = input.text.trim().split(/\s+/).length;
      const transformedWordCount = output.transformedText.trim().split(/\s+/).length;

      // Akzeptabler Bereich: 40-70% Erhöhung
      const increasePercent = ((transformedWordCount - originalWordCount) / originalWordCount) * 100;
      const isCompliant = increasePercent >= 40 && increasePercent <= 70;
      const score = isCompliant ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isCompliant
              ? `Increase: ${increasePercent.toFixed(1)}% (target: 40-70%)`
              : `Increase: ${increasePercent.toFixed(1)}% (outside target range 40-70%)`,
            originalWordCount,
            transformedWordCount,
            increasePercent: parseFloat(increasePercent.toFixed(1)),
            targetRange: '40-70%',
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
 * Evaluator: Elaborate Completeness
 *
 * Prüft, ob elaborate-Transformationen vollständige Sätze produzieren.
 */
export const elaborateCompletenessEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/elaborateCompleteness',
    displayName: 'Elaborate Sentence Completeness',
    definition: 'Checks if elaborate transformations produce complete sentences',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für elaborate-Action relevant
      if (input?.action !== 'elaborate') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not an elaborate action)' },
          },
        };
      }

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const text = output.transformedText.trim();

      // Prüfungen:
      // 1. Mindestens 8 Wörter
      // 2. Endet mit Satzzeichen (. ! ?)
      // 3. Beginnt mit Großbuchstaben
      const wordCount = text.split(/\s+/).length;
      const endsWithPunctuation = /[.!?]$/.test(text);
      const startsWithCapital = /^[A-ZÄÖÜ]/.test(text);

      const isComplete = wordCount >= 8 && endsWithPunctuation && startsWithCapital;
      const score = isComplete ? 1 : 0;

      const issues: string[] = [];
      if (wordCount < 8) issues.push('too short (<8 words)');
      if (!endsWithPunctuation) issues.push('missing sentence punctuation');
      if (!startsWithCapital) issues.push('not capitalized');

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isComplete
              ? 'Text is a complete sentence'
              : `Issues: ${issues.join(', ')}`,
            wordCount,
            endsWithPunctuation,
            startsWithCapital,
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
 * Evaluator: Word Count Change Tracking
 *
 * Prüft, ob wordCountChange korrekt berechnet wurde.
 */
export const wordCountChangeEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/wordCountChange',
    displayName: 'Word Count Change Accuracy',
    definition: 'Validates that wordCountChange metric is correctly calculated',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const originalWordCount = input.text.trim().split(/\s+/).length;
      const transformedWordCount = output.transformedText.trim().split(/\s+/).length;
      const expectedChange = transformedWordCount - originalWordCount;

      const reportedChange = output.wordCountChange || 0;
      const isAccurate = reportedChange === expectedChange;
      const score = isAccurate ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isAccurate
              ? 'wordCountChange metric is accurate'
              : `wordCountChange mismatch: expected ${expectedChange}, got ${reportedChange}`,
            expectedChange,
            reportedChange,
            originalWordCount,
            transformedWordCount,
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
 * Evaluator: No HTML/Markdown Artifacts
 *
 * Prüft, ob der Output frei von HTML/Markdown-Artefakten ist.
 */
export const noArtifactsEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/noArtifacts',
    displayName: 'No HTML/Markdown Artifacts',
    definition: 'Checks if output is free from HTML tags, markdown, or PM-structures',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as TextTransformOutput;

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      const text = output.transformedText;

      // Prüfe auf verschiedene Artefakte
      const artifacts: string[] = [];

      if (/<[^>]+>/.test(text)) artifacts.push('HTML tags');
      if (/\*\*[^*]+\*\*/.test(text)) artifacts.push('bold markdown');
      if (/\*[^*]+\*/.test(text)) artifacts.push('italic markdown');
      if (/^#{1,6}\s/.test(text)) artifacts.push('heading markers');
      if (/```/.test(text)) artifacts.push('code blocks');
      if (/\[.+\]\(.+\)/.test(text)) artifacts.push('markdown links');

      const isClean = artifacts.length === 0;
      const score = isClean ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isClean
              ? 'Output is free from formatting artifacts'
              : `Found artifacts: ${artifacts.join(', ')}`,
            artifacts,
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
// LLM-BASED EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Prompt für LLM-basierte Meaning Preservation Bewertung
 */
const MEANING_PRESERVATION_PROMPT = `Du bist ein Linguistik-Experte. Bewerte, ob der transformierte Text dieselbe Bedeutung wie der Original-Text hat.

BEWERTUNGSKRITERIEN:
1. Kernaussage erhalten
2. Keine Informationen verloren
3. Keine neuen Informationen hinzugefügt (außer bei expand/elaborate)
4. Kontextuelle Konsistenz

BEWERTUNGSSKALA:
- 5: Perfekt - Identische Bedeutung
- 4: Gut - Gleiche Bedeutung, minimale Nuancenunterschiede
- 3: Akzeptabel - Hauptbedeutung erhalten, aber kleinere Abweichungen
- 2: Problematisch - Bedeutungsverschiebung
- 1: Ungenügend - Bedeutung verändert oder verloren

ACTION: {{action}}

ORIGINAL:
{{original}}

TRANSFORMIERT:
{{transformed}}

{{contextInfo}}

Bewerte die Bedeutungserhaltung mit einer Zahl von 1-5 und gib eine kurze Begründung (max. 2 Sätze).

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "reasoning": "<Kurze Begründung>"
}`;

/**
 * Evaluator: Meaning Preservation (LLM-based)
 *
 * Nutzt ein Judge-LLM um zu prüfen, ob die Bedeutung erhalten bleibt.
 */
export const meaningPreservationEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/meaningPreservation',
    displayName: 'Meaning Preservation',
    definition: 'LLM-based check if original meaning is preserved in transformation',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      if (!output?.transformedText) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No transformed text found in output' },
          },
        };
      }

      // Context Info für expand/elaborate
      const contextInfo =
        input.action === 'expand' || input.action === 'elaborate'
          ? 'HINWEIS: Bei expand/elaborate dürfen zusätzliche Details hinzugefügt werden, solange sie zur Kernaussage passen.'
          : '';

      const prompt = MEANING_PRESERVATION_PROMPT.replace('{{action}}', input.action)
        .replace('{{original}}', input.text)
        .replace('{{transformed}}', output.transformedText)
        .replace('{{contextInfo}}', contextInfo);

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

/**
 * Prompt für LLM-basierte Tone Accuracy Bewertung
 */
const TONE_ACCURACY_PROMPT = `Du bist ein Linguistik-Experte. Bewerte, ob der transformierte Text die gewünschte Tonalität trifft.

ZIEL-TONALITÄT: {{targetTone}}

TONALITÄTS-DEFINITIONEN:
- formal: Geschäftlich, distanziert, Sie-Form, keine Umgangssprache
- casual: Locker, Du-Form, umgangssprachlich, persönlich
- professional: Professionell aber zugänglich, klare Fachsprache
- friendly: Warm, einladend, positiv, nahbar
- confident: Selbstbewusst, assertiv, keine Zweifel, stark

BEWERTUNGSSKALA:
- 5: Perfekt - Tonalität exakt getroffen
- 4: Gut - Tonalität weitgehend korrekt, minimale Abweichungen
- 3: Akzeptabel - Tonalität erkennbar, aber nicht durchgehend
- 2: Problematisch - Tonalität teilweise verfehlt
- 1: Ungenügend - Falsche Tonalität

TRANSFORMIERTER TEXT:
{{transformed}}

Bewerte die Tonalität mit einer Zahl von 1-5 und gib eine kurze Begründung (max. 2 Sätze).

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "reasoning": "<Kurze Begründung>"
}`;

/**
 * Evaluator: Tone Accuracy (LLM-based)
 *
 * Nutzt ein Judge-LLM um zu prüfen, ob die Tonalität korrekt umgesetzt wurde.
 */
export const toneAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/toneAccuracy',
    displayName: 'Tone Accuracy',
    definition: 'LLM-based check if change-tone transformations achieve target tone',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für change-tone-Action relevant
      if (input?.action !== 'change-tone') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not a change-tone action)' },
          },
        };
      }

      if (!output?.transformedText || !input?.tone) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'Missing transformed text or target tone' },
          },
        };
      }

      const prompt = TONE_ACCURACY_PROMPT.replace('{{targetTone}}', input.tone).replace(
        '{{transformed}}',
        output.transformedText
      );

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
            targetTone: input.tone,
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
 * Prompt für LLM-basierte Instruction Following Bewertung
 */
const INSTRUCTION_FOLLOWING_PROMPT = `Du bist ein Qualitätsprüfer. Bewerte, ob die Custom Instruction präzise befolgt wurde.

INSTRUCTION:
{{instruction}}

ORIGINAL:
{{original}}

TRANSFORMIERT:
{{transformed}}

BEWERTUNGSKRITERIEN:
1. Wurde die Anweisung exakt ausgeführt?
2. Wurden NUR die angeforderten Änderungen gemacht?
3. Wurde der Rest des Textes unverändert gelassen?
4. Ist das Ergebnis natürlich integriert?

BEWERTUNGSSKALA:
- 5: Perfekt - Anweisung präzise befolgt, minimale Änderung
- 4: Gut - Anweisung befolgt, kleine zusätzliche Anpassungen
- 3: Akzeptabel - Anweisung befolgt, aber unnötige Änderungen
- 2: Problematisch - Anweisung nur teilweise befolgt
- 1: Ungenügend - Anweisung nicht oder falsch befolgt

Bewerte mit einer Zahl von 1-5 und gib eine kurze Begründung (max. 2 Sätze).

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "reasoning": "<Kurze Begründung>"
}`;

/**
 * Evaluator: Instruction Following (LLM-based)
 *
 * Nutzt ein Judge-LLM um zu prüfen, ob Custom Instructions befolgt wurden.
 */
export const instructionFollowingEvaluator = ai.defineEvaluator(
  {
    name: 'text-transform/instructionFollowing',
    displayName: 'Instruction Following',
    definition: 'LLM-based check if custom instructions were precisely followed',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as any;
      const output = datapoint.output as TextTransformOutput;

      // Nur für custom-Action relevant
      if (input?.action !== 'custom') {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'Not applicable (not a custom action)' },
          },
        };
      }

      if (!output?.transformedText || !input?.instruction) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'Missing transformed text or instruction' },
          },
        };
      }

      const prompt = INSTRUCTION_FOLLOWING_PROMPT.replace(
        '{{instruction}}',
        input.instruction
      )
        .replace('{{original}}', input.text)
        .replace('{{transformed}}', output.transformedText);

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
            instruction: input.instruction,
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
