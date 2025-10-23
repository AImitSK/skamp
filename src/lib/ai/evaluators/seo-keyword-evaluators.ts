// src/lib/ai/evaluators/seo-keyword-evaluators.ts
// Genkit Evaluators für SEO-Keyword-Analyse Flow
// Mix aus Heuristic (kostenlos) und LLM-based (kostenpflichtig) Evaluators

import { ai, gemini25FlashModel } from '../genkit-config';
import type {
  AnalyzeKeywordSEOInput,
  AnalyzeKeywordSEOOutput,
  KeywordFit,
  TargetAudience,
  Tonality
} from '../schemas/analyze-keyword-seo-schemas';
import { calculateAverageScore, scoreToKeywordFit } from '../schemas/analyze-keyword-seo-schemas';

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS (KOSTENLOS - keine AI-Calls)
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator 1: Relevance Score Reasonability
 *
 * Prüft ob semanticRelevance und contextQuality in sinnvollen Bereichen liegen
 * und ob sie miteinander korrelieren.
 *
 * LOGIC:
 * - Scores müssen zwischen 0-100 liegen
 * - Bei hoher semanticRelevance sollte contextQuality nicht zu niedrig sein
 * - Differenz > 40 Punkte ist verdächtig
 */
export const relevanceScoreReasonabilityEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/relevance-score-reasonability',
    displayName: 'Relevance Score Reasonability',
    definition: 'Prüft ob semanticRelevance und contextQuality in sinnvollen Bereichen liegen und korrelieren (0-100, Differenz < 40).',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    // Basis-Validierung: Scores im gültigen Bereich?
    if (output.semanticRelevance < 0 || output.semanticRelevance > 100) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: {
            reasoning: `❌ semanticRelevance außerhalb 0-100: ${output.semanticRelevance}`
          }
        }
      };
    }

    if (output.contextQuality < 0 || output.contextQuality > 100) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: {
            reasoning: `❌ contextQuality außerhalb 0-100: ${output.contextQuality}`
          }
        }
      };
    }

    // Korrelations-Check: Große Differenzen sind verdächtig
    const diff = Math.abs(output.semanticRelevance - output.contextQuality);

    if (diff > 40) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ Große Differenz zwischen semanticRelevance (${output.semanticRelevance}) und contextQuality (${output.contextQuality}): ${diff} Punkte`
          }
        }
      };
    }

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: 1,
        details: {
          reasoning: `✅ Scores sinnvoll: semanticRelevance=${output.semanticRelevance}, contextQuality=${output.contextQuality}, diff=${diff}`
        }
      }
    };
  }
);

/**
 * Evaluator 2: Target Audience Classification Validity
 *
 * Prüft ob targetAudience ein gültiger Enum-Wert ist.
 */
export const targetAudienceClassificationEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/target-audience-classification',
    displayName: 'Target Audience Classification Validity',
    definition: 'Prüft ob targetAudience ein gültiger Enum-Wert ist (B2B, B2C, Verbraucher, Fachpublikum, Medien, Investoren, Mitarbeiter, Öffentlichkeit, Unbekannt).',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const validAudiences: TargetAudience[] = [
      'B2B', 'B2C', 'Verbraucher', 'Fachpublikum',
      'Medien', 'Investoren', 'Mitarbeiter', 'Öffentlichkeit', 'Unbekannt'
    ];

    const isValid = validAudiences.includes(output.targetAudience);

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: isValid ? 1 : 0,
        details: {
          reasoning: isValid
            ? `✅ Gültige Zielgruppe: ${output.targetAudience}`
            : `❌ Ungültige Zielgruppe: ${output.targetAudience}`
        }
      }
    };
  }
);

/**
 * Evaluator 3: Tonality Classification Validity
 *
 * Prüft ob tonality ein gültiger Enum-Wert ist.
 */
export const tonalityClassificationEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/tonality-classification',
    displayName: 'Tonality Classification Validity',
    definition: 'Prüft ob tonality ein gültiger Enum-Wert ist (Sachlich, Emotional, Verkäuferisch, Professionell, Fachlich, Locker, Formell, Inspirierend, Neutral).',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const validTonalities: Tonality[] = [
      'Sachlich', 'Emotional', 'Verkäuferisch', 'Professionell',
      'Fachlich', 'Locker', 'Formell', 'Inspirierend', 'Neutral'
    ];

    const isValid = validTonalities.includes(output.tonality);

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: isValid ? 1 : 0,
        details: {
          reasoning: isValid
            ? `✅ Gültige Tonalität: ${output.tonality}`
            : `❌ Ungültige Tonalität: ${output.tonality}`
        }
      }
    };
  }
);

/**
 * Evaluator 4: Confidence Score Validation
 *
 * Prüft ob targetAudienceConfidence und tonalityConfidence im Bereich 0-100 liegen.
 */
export const confidenceScoreValidationEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/confidence-score-validation',
    displayName: 'Confidence Score Validation',
    definition: 'Prüft ob targetAudienceConfidence und tonalityConfidence im Bereich 0-100 liegen.',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const audienceConfValid =
      output.targetAudienceConfidence >= 0 &&
      output.targetAudienceConfidence <= 100;

    const tonalityConfValid =
      output.tonalityConfidence >= 0 &&
      output.tonalityConfidence <= 100;

    if (!audienceConfValid || !tonalityConfValid) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: {
            reasoning: `❌ Ungültige Confidence-Scores: targetAudienceConfidence=${output.targetAudienceConfidence}, tonalityConfidence=${output.tonalityConfidence}`
          }
        }
      };
    }

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: 1,
        details: {
          reasoning: `✅ Confidence-Scores gültig: targetAudienceConfidence=${output.targetAudienceConfidence}, tonalityConfidence=${output.tonalityConfidence}`
        }
      }
    };
  }
);

/**
 * Evaluator 5: KeywordFit Consistency
 *
 * Prüft ob keywordFit mit dem Durchschnitt von semanticRelevance und contextQuality übereinstimmt.
 */
export const keywordFitConsistencyEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/keyword-fit-consistency',
    displayName: 'KeywordFit Consistency',
    definition: 'Prüft ob keywordFit mit dem Durchschnitt von semanticRelevance und contextQuality übereinstimmt.',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const avgScore = calculateAverageScore(
      output.semanticRelevance,
      output.contextQuality
    );

    const expectedFit = scoreToKeywordFit(avgScore);
    const actualFit = output.keywordFit;

    const isConsistent = expectedFit === actualFit;

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: isConsistent ? 1 : 0,
        details: {
          reasoning: isConsistent
            ? `✅ KeywordFit konsistent: avgScore=${avgScore}, expected=${expectedFit}, actual=${actualFit}`
            : `❌ KeywordFit inkonsistent: avgScore=${avgScore}, expected=${expectedFit}, actual=${actualFit}`
        }
      }
    };
  }
);

/**
 * Evaluator 6: Related Terms Quality
 *
 * Prüft die Qualität der relatedTerms:
 * - Nicht mehr als 5 Terms
 * - Keine Duplikate
 * - Keine zu kurzen Terms (< 3 Zeichen)
 * - Keine häufigen Stoppwörter
 */
export const relatedTermsQualityEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/related-terms-quality',
    displayName: 'Related Terms Quality',
    definition: 'Prüft die Qualität der relatedTerms: max. 5 Terms, keine Duplikate, keine zu kurzen Terms, keine Stoppwörter.',
  },
  async (datapoint) => {
    const output = datapoint.output as AnalyzeKeywordSEOOutput;
    const terms = output.relatedTerms;

    // Check 1: Max. 5 Terms
    if (terms.length > 5) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: {
            reasoning: `❌ Zu viele Related Terms: ${terms.length} (max. 5)`
          }
        }
      };
    }

    // Check 2: Keine Duplikate
    const uniqueTerms = new Set(terms.map(t => t.toLowerCase()));
    if (uniqueTerms.size !== terms.length) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ Duplikate in Related Terms: ${terms.join(', ')}`
          }
        }
      };
    }

    // Check 3: Keine zu kurzen Terms (< 3 Zeichen)
    const tooShort = terms.filter(t => t.length < 3);
    if (tooShort.length > 0) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ Zu kurze Related Terms: ${tooShort.join(', ')}`
          }
        }
      };
    }

    // Check 4: Keine häufigen Stoppwörter
    const stopWords = ['der', 'die', 'das', 'und', 'oder', 'the', 'and', 'or', 'a', 'an'];
    const hasStopWords = terms.some(t => stopWords.includes(t.toLowerCase()));
    if (hasStopWords) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ Stoppwörter in Related Terms: ${terms.join(', ')}`
          }
        }
      };
    }

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score: 1,
        details: {
          reasoning: `✅ Related Terms qualitativ gut: ${terms.join(', ')}`
        }
      }
    };
  }
);

// ══════════════════════════════════════════════════════════════
// LLM-BASED EVALUATORS (KOSTENPFLICHTIG - nutzt AI)
// ══════════════════════════════════════════════════════════════

/**
 * LLM Evaluator 1: Target Audience Accuracy
 *
 * Nutzt LLM um zu beurteilen, ob die erkannte Zielgruppe korrekt ist.
 *
 * COST: 1 AI-Call pro Test-Case (ca. 200-400 tokens)
 */
export const targetAudienceAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/target-audience-accuracy',
    displayName: 'Target Audience Accuracy (LLM)',
    definition: 'LLM beurteilt ob die erkannte Zielgruppe (targetAudience) für den gegebenen Text korrekt ist.',
  },
  async (datapoint) => {
    const input = datapoint.input as AnalyzeKeywordSEOInput;
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const prompt = `Du bist ein Experte für Zielgruppen-Analyse und Marketing.

AUFGABE: Bewerte ob die erkannte Zielgruppe für den folgenden Text korrekt ist.

TEXT:
${input.text.substring(0, 1000)}

ERKANNTE ZIELGRUPPE: ${output.targetAudience}
KONFIDENZ: ${output.targetAudienceConfidence}%

ZIELGRUPPEN-DEFINITIONEN:
- B2B: Geschäftskunden, Unternehmen
- B2C: Endkunden, Konsumenten
- Verbraucher: Privatpersonen, Alltagskontext
- Fachpublikum: Experten, technische/wissenschaftliche Community
- Medien: Journalisten, Presse
- Investoren: Finanzwelt, Kapitalgeber
- Mitarbeiter: Interne Kommunikation
- Öffentlichkeit: Breite Öffentlichkeit
- Unbekannt: Nicht eindeutig erkennbar

BEWERTUNGSKRITERIEN:
1 = Perfekt zutreffend
0.75 = Gut, aber eine andere Zielgruppe wäre passender
0.5 = Teilweise zutreffend, aber deutliche Abweichung
0.25 = Falsch, klar andere Zielgruppe
0 = Komplett falsch

Antworte im JSON-Format:
{
  "score": <0.0 bis 1.0>,
  "reasoning": "<Kurze Begründung>"
}`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 256
        },
        output: {
          format: 'json',
          schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              reasoning: { type: 'string' }
            },
            required: ['score', 'reasoning']
          }
        }
      });

      const response = result.message?.content?.[0]?.text || result.text || '{}';
      const parsed = JSON.parse(response);

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: Math.max(0, Math.min(1, parsed.score || 0)),
          details: {
            reasoning: parsed.reasoning || 'Keine Begründung verfügbar'
          }
        }
      };
    } catch (error) {
      console.error('❌ LLM Evaluator Error (Target Audience):', error);
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ LLM-Auswertung fehlgeschlagen: ${error}`
          }
        }
      };
    }
  }
);

/**
 * LLM Evaluator 2: Tonality Accuracy
 *
 * Nutzt LLM um zu beurteilen, ob die erkannte Tonalität korrekt ist.
 *
 * COST: 1 AI-Call pro Test-Case (ca. 200-400 tokens)
 */
export const tonalityAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/tonality-accuracy',
    displayName: 'Tonality Accuracy (LLM)',
    definition: 'LLM beurteilt ob die erkannte Tonalität (tonality) für den gegebenen Text korrekt ist.',
  },
  async (datapoint) => {
    const input = datapoint.input as AnalyzeKeywordSEOInput;
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const prompt = `Du bist ein Experte für Textanalyse und Schreibstil-Bewertung.

AUFGABE: Bewerte ob die erkannte Tonalität für den folgenden Text korrekt ist.

TEXT:
${input.text.substring(0, 1000)}

ERKANNTE TONALITÄT: ${output.tonality}
KONFIDENZ: ${output.tonalityConfidence}%

TONALITÄTS-DEFINITIONEN:
- Sachlich: Neutral, faktenorientiert, objektiv
- Emotional: Gefühlsbetont, persönlich, storytelling
- Verkäuferisch: Werblich, überzeugend, Call-to-Actions
- Professionell: Geschäftlich, seriös, etabliert
- Fachlich: Technisch, detailliert, präzise
- Locker: Casual, entspannt, umgangssprachlich
- Formell: Offiziell, förmlich, distanziert
- Inspirierend: Motivierend, visionär, ermunternd
- Neutral: Ausgeglichen, unparteiisch

BEWERTUNGSKRITERIEN:
1 = Perfekt zutreffend
0.75 = Gut, aber Nuancen einer anderen Tonalität vorhanden
0.5 = Teilweise zutreffend, gemischte Tonalität
0.25 = Falsch, andere Tonalität dominiert
0 = Komplett falsch

Antworte im JSON-Format:
{
  "score": <0.0 bis 1.0>,
  "reasoning": "<Kurze Begründung>"
}`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 256
        },
        output: {
          format: 'json',
          schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              reasoning: { type: 'string' }
            },
            required: ['score', 'reasoning']
          }
        }
      });

      const response = result.message?.content?.[0]?.text || result.text || '{}';
      const parsed = JSON.parse(response);

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: Math.max(0, Math.min(1, parsed.score || 0)),
          details: {
            reasoning: parsed.reasoning || 'Keine Begründung verfügbar'
          }
        }
      };
    } catch (error) {
      console.error('❌ LLM Evaluator Error (Tonality):', error);
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ LLM-Auswertung fehlgeschlagen: ${error}`
          }
        }
      };
    }
  }
);

/**
 * LLM Evaluator 3: Semantic Relevance Accuracy
 *
 * Nutzt LLM um zu beurteilen, ob der semanticRelevance Score angemessen ist.
 *
 * COST: 1 AI-Call pro Test-Case (ca. 300-500 tokens)
 */
export const semanticRelevanceAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'seo-keyword/semantic-relevance-accuracy',
    displayName: 'Semantic Relevance Accuracy (LLM)',
    definition: 'LLM beurteilt ob der semanticRelevance Score (0-100) für das Keyword im Text angemessen ist.',
  },
  async (datapoint) => {
    const input = datapoint.input as AnalyzeKeywordSEOInput;
    const output = datapoint.output as AnalyzeKeywordSEOOutput;

    const prompt = `Du bist ein SEO-Experte und Keyword-Analyst.

AUFGABE: Bewerte ob der semanticRelevance Score für das Keyword im Text angemessen ist.

KEYWORD: "${input.keyword}"

TEXT:
${input.text.substring(0, 1000)}

VERGEBENER SCORE: ${output.semanticRelevance}/100
KONTEXT-QUALITÄT: ${output.contextQuality}/100

BEWERTUNGSSKALA SEMANTISCHE RELEVANZ:
90-100: Keyword ist zentrales Thema, mehrfach prominent genannt
70-89: Keyword passt sehr gut, ist klar relevant
50-69: Keyword passt moderat, thematisch verbunden
30-49: Keyword tangential oder randständig
0-29: Keyword irrelevant oder fehlt

BEWERTUNGSKRITERIEN:
1 = Score perfekt angemessen (±10 Punkte Toleranz)
0.75 = Score gut, aber leicht daneben (±20 Punkte)
0.5 = Score deutlich zu hoch oder zu niedrig (±30 Punkte)
0.25 = Score stark abweichend (±40 Punkte)
0 = Score komplett unangemessen (>40 Punkte Abweichung)

Antworte im JSON-Format:
{
  "score": <0.0 bis 1.0>,
  "reasoning": "<Begründung mit deiner Einschätzung des korrekten Scores>"
}`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 512
        },
        output: {
          format: 'json',
          schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              reasoning: { type: 'string' }
            },
            required: ['score', 'reasoning']
          }
        }
      });

      const response = result.message?.content?.[0]?.text || result.text || '{}';
      const parsed = JSON.parse(response);

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: Math.max(0, Math.min(1, parsed.score || 0)),
          details: {
            reasoning: parsed.reasoning || 'Keine Begründung verfügbar'
          }
        }
      };
    } catch (error) {
      console.error('❌ LLM Evaluator Error (Semantic Relevance):', error);
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0.5,
          details: {
            reasoning: `⚠️ LLM-Auswertung fehlgeschlagen: ${error}`
          }
        }
      };
    }
  }
);

// ══════════════════════════════════════════════════════════════
// EXPORT ALL EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Alle SEO-Keyword Evaluators exportieren
 *
 * HEURISTIC (6 Evaluators, kostenlos):
 * - relevanceScoreReasonabilityEvaluator
 * - targetAudienceClassificationEvaluator
 * - tonalityClassificationEvaluator
 * - confidenceScoreValidationEvaluator
 * - keywordFitConsistencyEvaluator
 * - relatedTermsQualityEvaluator
 *
 * LLM-BASED (3 Evaluators, kostenpflichtig):
 * - targetAudienceAccuracyEvaluator
 * - tonalityAccuracyEvaluator
 * - semanticRelevanceAccuracyEvaluator
 *
 * TOTAL: 9 Evaluators
 */
export const seoKeywordEvaluators = {
  // Heuristic
  relevanceScoreReasonability: relevanceScoreReasonabilityEvaluator,
  targetAudienceClassification: targetAudienceClassificationEvaluator,
  tonalityClassification: tonalityClassificationEvaluator,
  confidenceScoreValidation: confidenceScoreValidationEvaluator,
  keywordFitConsistency: keywordFitConsistencyEvaluator,
  relatedTermsQuality: relatedTermsQualityEvaluator,

  // LLM-based
  targetAudienceAccuracy: targetAudienceAccuracyEvaluator,
  tonalityAccuracy: tonalityAccuracyEvaluator,
  semanticRelevanceAccuracy: semanticRelevanceAccuracyEvaluator
};
