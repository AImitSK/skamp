// src/lib/ai/evaluators/project-strategy-chat-evaluators.ts
// Custom Evaluators für Project Strategy Chat (Kernbotschaft) Qualität

import { ai, gemini25FlashModel } from '../genkit-config';
import type { ProjectStrategyChatOutput } from '../flows/project-strategy-chat';
import type { BaseEvalDataPoint } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface ProjectStrategyChatInput {
  projectId: string;
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: Array<{ role: string; content: string }>;
  dnaSynthese?: string;
}

interface TestReference {
  expectedTags: {
    document: boolean;
    progress: boolean;
    suggestions: boolean;
  };
  expectedProgressRange?: { min: number; max: number };
  qualityCriteria?: Record<string, boolean>;
}

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS
// ══════════════════════════════════════════════════════════════

/**
 * Evaluator: Document Tag Extraction
 *
 * Prüft, ob [DOCUMENT]...[/DOCUMENT] Tags korrekt extrahiert wurden.
 */
export const documentExtractionEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/documentExtraction',
    displayName: 'Document Tag Extraction',
    definition: 'Checks if [DOCUMENT] tags are correctly extracted for Kernbotschaft',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as ProjectStrategyChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      const expectDocument = reference?.expectedTags?.document ?? false;

      const hasDocumentInResponse = output.response?.includes('[DOCUMENT]') &&
                                     output.response?.includes('[/DOCUMENT]');
      const hasExtractedDocument = !!output.document && output.document.length > 0;

      let score = 0;
      let reasoning = '';

      if (expectDocument) {
        if (hasDocumentInResponse && hasExtractedDocument) {
          score = 1;
          reasoning = 'Kernbotschaft document correctly extracted';
        } else if (hasDocumentInResponse && !hasExtractedDocument) {
          score = 0.5;
          reasoning = 'Document tags present but extraction failed';
        } else {
          score = 0;
          reasoning = 'Expected Kernbotschaft document not present';
        }
      } else {
        // Noch kein Dokument erwartet (frühe Phase)
        if (!hasDocumentInResponse) {
          score = 1;
          reasoning = 'No document expected yet - correct for early phase';
        } else {
          score = 0.8;
          reasoning = 'Document present earlier than expected (may be OK)';
        }
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            expectDocument,
            hasDocumentInResponse,
            hasExtractedDocument,
            documentLength: output.document?.length || 0,
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
 * Evaluator: Progress Tag Extraction
 *
 * Prüft, ob [PROGRESS:XX] Tag korrekt extrahiert wurde.
 */
export const progressExtractionEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/progressExtraction',
    displayName: 'Progress Tag Extraction',
    definition: 'Checks if [PROGRESS:XX] tag is correctly extracted and in range',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as ProjectStrategyChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      const progressMatch = output.response?.match(/\[PROGRESS:(\d+)\]/);
      const hasProgressInResponse = !!progressMatch;
      const hasExtractedProgress = typeof output.progress === 'number';

      const expectedRange = reference?.expectedProgressRange;
      let inExpectedRange = true;
      if (expectedRange && hasExtractedProgress) {
        inExpectedRange = output.progress! >= expectedRange.min &&
                          output.progress! <= expectedRange.max;
      }

      let score = 0;
      let reasoning = '';

      if (!hasProgressInResponse) {
        score = 0;
        reasoning = 'No [PROGRESS:XX] tag found in response';
      } else if (!hasExtractedProgress) {
        score = 0.5;
        reasoning = 'Progress tag present but extraction failed';
      } else if (!inExpectedRange && expectedRange) {
        score = 0.7;
        reasoning = `Progress ${output.progress}% outside expected range [${expectedRange.min}-${expectedRange.max}%]`;
      } else {
        score = 1;
        reasoning = `Progress ${output.progress}% correctly extracted${expectedRange ? ' and in range' : ''}`;
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            hasProgressInResponse,
            extractedProgress: output.progress,
            expectedRange,
            inExpectedRange,
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
 * Evaluator: Suggestions Tag Extraction
 *
 * Prüft, ob [SUGGESTIONS]...[/SUGGESTIONS] Tags korrekt extrahiert wurden.
 */
export const suggestionsExtractionEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/suggestionsExtraction',
    displayName: 'Suggestions Tag Extraction',
    definition: 'Checks if [SUGGESTIONS] tags are correctly extracted',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as ProjectStrategyChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      const expectSuggestions = reference?.expectedTags?.suggestions ?? true;

      const hasSuggestionsInResponse = output.response?.includes('[SUGGESTIONS]') &&
                                        output.response?.includes('[/SUGGESTIONS]');
      const hasExtractedSuggestions = Array.isArray(output.suggestions) &&
                                       output.suggestions.length > 0;

      let score = 0;
      let reasoning = '';

      if (expectSuggestions) {
        if (hasSuggestionsInResponse && hasExtractedSuggestions) {
          score = 1;
          reasoning = `${output.suggestions!.length} suggestions correctly extracted`;
        } else if (hasSuggestionsInResponse && !hasExtractedSuggestions) {
          score = 0.5;
          reasoning = 'Suggestions tags present but extraction failed';
        } else {
          score = 0;
          reasoning = 'Expected suggestions tags not present';
        }
      } else {
        score = 1;
        reasoning = 'No suggestions expected - evaluation passed';
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            expectSuggestions,
            hasSuggestionsInResponse,
            hasExtractedSuggestions,
            suggestionsCount: output.suggestions?.length || 0,
            suggestions: output.suggestions?.slice(0, 3),
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
 * Evaluator: Response Language
 *
 * Prüft, ob die Antwort in der erwarteten Sprache ist.
 */
export const responseLanguageEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/responseLanguage',
    displayName: 'Response Language Check',
    definition: 'Checks if the response is in the expected language (de/en)',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as ProjectStrategyChatInput;
      const output = datapoint.output as ProjectStrategyChatOutput;

      const expectedLanguage = input.language || 'de';
      const responseText = output.response || '';

      const germanMarkers = ['der', 'die', 'das', 'und', 'ist', 'wir', 'Sie', 'für', 'nicht'];
      const englishMarkers = ['the', 'and', 'is', 'are', 'you', 'your', 'for', 'not', 'this'];

      const words = responseText.toLowerCase().split(/\s+/);
      const germanCount = words.filter(w => germanMarkers.includes(w)).length;
      const englishCount = words.filter(w => englishMarkers.includes(w)).length;

      let detectedLanguage: 'de' | 'en' | 'unknown' = 'unknown';
      if (germanCount > englishCount * 1.5) {
        detectedLanguage = 'de';
      } else if (englishCount > germanCount * 1.5) {
        detectedLanguage = 'en';
      }

      const isCorrectLanguage = detectedLanguage === expectedLanguage || detectedLanguage === 'unknown';
      const score = isCorrectLanguage ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: isCorrectLanguage
              ? `Response in expected language (${expectedLanguage})`
              : `Language mismatch: expected ${expectedLanguage}, detected ${detectedLanguage}`,
            expectedLanguage,
            detectedLanguage,
            germanWordCount: germanCount,
            englishWordCount: englishCount,
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
 * Evaluator: DNA Synthese Usage
 *
 * Prüft, ob die DNA Synthese im Kontext berücksichtigt wird.
 */
export const dnaSyntheseUsageEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/dnaSyntheseUsage',
    displayName: 'DNA Synthese Context Usage',
    definition: 'Checks if DNA Synthese context is considered in responses',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as ProjectStrategyChatInput;
      const output = datapoint.output as ProjectStrategyChatOutput;

      // Wenn keine DNA Synthese vorhanden, ist alles OK
      if (!input.dnaSynthese) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1,
            details: { reasoning: 'No DNA Synthese provided - skipping check' },
          },
        };
      }

      const response = output.response?.toLowerCase() || '';

      // Extrahiere Schlüsselwörter aus DNA Synthese
      const dnaKeywords = input.dnaSynthese
        .toLowerCase()
        .match(/\b[a-zäöüß]{4,}\b/g) || [];

      // Filtere häufige Wörter
      const stopWords = ['eine', 'einer', 'einem', 'einen', 'und', 'oder', 'aber', 'der', 'die', 'das', 'sind', 'wird', 'werden'];
      const relevantKeywords = dnaKeywords.filter(w => !stopWords.includes(w));
      const uniqueKeywords = [...new Set(relevantKeywords)];

      // Zähle wie viele Keywords in der Response vorkommen
      const foundKeywords = uniqueKeywords.filter(kw => response.includes(kw));
      const keywordRatio = foundKeywords.length / Math.min(uniqueKeywords.length, 10);

      let score = Math.min(1, keywordRatio * 2); // Verdopple den Ratio für bessere Scores
      let reasoning = '';

      if (keywordRatio >= 0.3) {
        reasoning = `Good DNA context usage: ${foundKeywords.length} keywords found`;
      } else if (keywordRatio >= 0.1) {
        reasoning = `Moderate DNA context usage: ${foundKeywords.length} keywords found`;
      } else {
        reasoning = `Low DNA context usage: only ${foundKeywords.length} keywords found`;
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            foundKeywords: foundKeywords.slice(0, 10),
            totalUniqueKeywords: uniqueKeywords.length,
            keywordRatio: keywordRatio.toFixed(2),
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
 * Evaluator: Iterative Questioning
 *
 * Prüft, ob die KI iterativ vorgeht (max 1-2 Fragen).
 */
export const iterativeQuestioningEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/iterativeQuestioning',
    displayName: 'Iterative Questioning Check',
    definition: 'Checks if AI asks only 1-2 questions at a time',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as ProjectStrategyChatOutput;
      const responseText = output.response || '';

      const questionCount = (responseText.match(/\?/g) || []).length;

      let score = 1;
      let reasoning = '';

      if (questionCount === 0) {
        score = 0.8;
        reasoning = 'No questions found (may be summary phase)';
      } else if (questionCount <= 2) {
        score = 1;
        reasoning = `Good: Only ${questionCount} question(s) asked`;
      } else if (questionCount <= 4) {
        score = 0.7;
        reasoning = `${questionCount} questions - slightly more than recommended`;
      } else {
        score = 0.3;
        reasoning = `Too many questions (${questionCount}) - violates iterative approach`;
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            questionCount,
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
 * Prompt für LLM-basierte Kernbotschaft Qualitätsbewertung
 */
const KERNBOTSCHAFT_QUALITY_PROMPT = `Du bist ein PR-Strategie-Experte und bewertest die Qualität einer generierten Projekt-Kernbotschaft.

UNTERNEHMEN: {{companyName}}
DNA SYNTHESE (falls vorhanden):
{{dnaSynthese}}

EXTRAHIERTE KERNBOTSCHAFT:
{{kernbotschaft}}

BEWERTUNGSKRITERIEN:
1. **Prägnanz:** Ist die Kernbotschaft kurz und einprägsam?
2. **Relevanz:** Passt sie zum Unternehmen und Projekt?
3. **Nachrichtenwert:** Hat sie News-Charakter?
4. **Quotierbarkeit:** Würde ein Journalist sie zitieren?
5. **DNA-Konformität:** Passt sie zur Marken-DNA (falls vorhanden)?

BEWERTUNGSSKALA:
- 5: Exzellent - Perfekt formuliert, sofort verwendbar
- 4: Gut - Kleine Anpassungen möglich
- 3: Akzeptabel - Überarbeitung empfohlen
- 2: Schwach - Deutliche Verbesserungen nötig
- 1: Ungenügend - Komplett neu formulieren

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "isQuotable": <boolean>,
  "strengths": ["<Stärke 1>"],
  "improvements": ["<Verbesserung 1>"],
  "reasoning": "<2-3 Sätze Begründung>"
}`;

/**
 * Evaluator: Kernbotschaft Quality (LLM-based)
 *
 * Bewertet die Qualität der extrahierten Kernbotschaft.
 */
export const kernbotschaftQualityEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/kernbotschaftQuality',
    displayName: 'Kernbotschaft Quality',
    definition: 'LLM-based assessment of Kernbotschaft quality (concise, relevant, quotable)',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as ProjectStrategyChatInput;
      const output = datapoint.output as ProjectStrategyChatOutput;

      if (!output.document) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0.5, // Neutral - noch keine Kernbotschaft
            details: { reasoning: 'No Kernbotschaft document extracted yet' },
          },
        };
      }

      const prompt = KERNBOTSCHAFT_QUALITY_PROMPT
        .replace('{{companyName}}', input.companyName)
        .replace('{{dnaSynthese}}', input.dnaSynthese || 'Nicht vorhanden')
        .replace('{{kernbotschaft}}', output.document.substring(0, 1000));

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const normalizedScore = parsed.score / 5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: normalizedScore,
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            isQuotable: parsed.isQuotable,
            strengths: parsed.strengths,
            improvements: parsed.improvements,
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
 * Prompt für LLM-basierte Chat-Strategie-Bewertung
 */
const CHAT_STRATEGY_PROMPT = `Du bist ein PR-Methodologie-Experte und bewertest das strategische Vorgehen eines KI-Assistenten bei der Kernbotschaft-Entwicklung.

UNTERNEHMEN: {{companyName}}
LETZTE USER-NACHRICHT:
{{userMessage}}

KI-ANTWORT:
{{response}}

BEWERTUNGSKRITERIEN:
1. **Fragetechnik:** Stellt die KI die richtigen Fragen? (Anlass, Ziel, Teilbotschaft, Material)
2. **Iteratives Vorgehen:** Max 1-2 Fragen auf einmal?
3. **Zusammenfassung:** Spiegelt die KI das Verständnis?
4. **Weiterführung:** Sind die Suggestions hilfreich?
5. **Professionalität:** Klingt die KI wie ein Senior PR-Stratege?

BEWERTUNGSSKALA:
- 5: Exzellent - Vorbildliches strategisches Vorgehen
- 4: Gut - Professionell mit kleinen Verbesserungsmöglichkeiten
- 3: Akzeptabel - Grundlegende Methodik erkennbar
- 2: Schwach - Methodik nicht klar
- 1: Ungenügend - Kein strategisches Vorgehen

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "methodologyFollowed": <boolean>,
  "strengths": ["<Stärke 1>"],
  "improvements": ["<Verbesserung 1>"],
  "reasoning": "<2-3 Sätze Begründung>"
}`;

/**
 * Evaluator: Chat Strategy Quality (LLM-based)
 *
 * Bewertet das strategische Vorgehen im Chat.
 */
export const chatStrategyEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/chatStrategy',
    displayName: 'Chat Strategy Quality',
    definition: 'LLM-based assessment of strategic chat approach',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as ProjectStrategyChatInput;
      const output = datapoint.output as ProjectStrategyChatOutput;

      if (!output.response) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No response to evaluate' },
          },
        };
      }

      const lastUserMessage = input.messages
        .filter(m => m.role === 'user')
        .pop()?.content || 'N/A';

      const prompt = CHAT_STRATEGY_PROMPT
        .replace('{{companyName}}', input.companyName)
        .replace('{{userMessage}}', lastUserMessage.substring(0, 500))
        .replace('{{response}}', output.response.substring(0, 1500));

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const normalizedScore = parsed.score / 5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: normalizedScore,
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            methodologyFollowed: parsed.methodologyFollowed,
            strengths: parsed.strengths,
            improvements: parsed.improvements,
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
 * Prompt für News-Hook-Erkennung
 */
const NEWS_HOOK_PROMPT = `Du bist ein PR-Nachrichtenexperte. Bewerte, ob die KI den News-Hook (Nachrichtenanlass) korrekt erkannt hat.

USER-NACHRICHT:
{{userMessage}}

KI-ANTWORT:
{{response}}

Prüfe:
1. Hat die KI den Nachrichtenanlass erkannt?
2. Hat sie relevante Follow-up-Fragen gestellt?
3. Wurde die Nachrichtenrelevanz angemessen eingeordnet?

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "newsHookIdentified": <boolean>,
  "newsType": "<produktlaunch|personalie|partnerschaft|event|auszeichnung|krise|sonstiges>",
  "reasoning": "<2 Sätze>"
}`;

/**
 * Evaluator: News Hook Recognition (LLM-based)
 *
 * Prüft, ob der News-Hook korrekt erkannt wurde.
 */
export const newsHookRecognitionEvaluator = ai.defineEvaluator(
  {
    name: 'projectStrategy/newsHookRecognition',
    displayName: 'News Hook Recognition',
    definition: 'LLM-based check if news hook (occasion) is correctly identified',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as ProjectStrategyChatInput;
      const output = datapoint.output as ProjectStrategyChatOutput;

      if (!output.response) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No response to evaluate' },
          },
        };
      }

      const lastUserMessage = input.messages
        .filter(m => m.role === 'user')
        .pop()?.content || 'N/A';

      const prompt = NEWS_HOOK_PROMPT
        .replace('{{userMessage}}', lastUserMessage.substring(0, 500))
        .replace('{{response}}', output.response.substring(0, 1000));

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const normalizedScore = parsed.score / 5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: normalizedScore,
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            newsHookIdentified: parsed.newsHookIdentified,
            newsType: parsed.newsType,
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
