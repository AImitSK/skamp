// src/lib/ai/evaluators/marken-dna-chat-evaluators.ts
// Custom Evaluators für Marken-DNA Chat Qualität

import { ai, gemini25FlashModel } from '../genkit-config';
import type { MarkenDNAChatOutput } from '../flows/marken-dna-chat';
import type { BaseEvalDataPoint } from 'genkit/evaluator';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface MarkenDNAChatInput {
  documentType: string;
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: Array<{ role: string; content: string }>;
  existingDocument?: string;
}

interface TestReference {
  expectedTags: {
    document: boolean;
    progress: boolean;
    suggestions: boolean;
    status?: boolean; // Optional: true wenn [STATUS:...] erwartet wird
  };
  expectedProgressRange?: { min: number; max: number };
  expectedStatus?: 'draft' | 'completed'; // Optional: erwarteter Status-Wert
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
    name: 'markenDNA/documentExtraction',
    displayName: 'Document Tag Extraction',
    definition: 'Checks if [DOCUMENT] tags are correctly extracted when expected',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      // Prüfe ob Dokument erwartet wird
      const expectDocument = reference?.expectedTags?.document ?? true;

      // Prüfe ob Dokument im Response vorhanden ist (auch wenn nicht extrahiert)
      const hasDocumentInResponse = output.response?.includes('[DOCUMENT]') &&
                                     output.response?.includes('[/DOCUMENT]');

      // Prüfe ob Dokument korrekt extrahiert wurde
      const hasExtractedDocument = !!output.document && output.document.length > 0;

      let score = 0;
      let reasoning = '';

      if (expectDocument) {
        if (hasDocumentInResponse && hasExtractedDocument) {
          score = 1;
          reasoning = 'Document tags present and correctly extracted';
        } else if (hasDocumentInResponse && !hasExtractedDocument) {
          score = 0.5;
          reasoning = 'Document tags present but extraction failed';
        } else if (!hasDocumentInResponse) {
          score = 0;
          reasoning = 'Expected document tags not present in response';
        }
      } else {
        // Wenn kein Dokument erwartet wird
        if (!hasDocumentInResponse) {
          score = 1;
          reasoning = 'No document expected and none present - correct behavior';
        } else {
          score = 0.5;
          reasoning = 'Document present but not expected (early stage)';
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
 * Prüft, ob [PROGRESS:XX] Tag korrekt extrahiert wurde und im erwarteten Bereich liegt.
 */
export const progressExtractionEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/progressExtraction',
    displayName: 'Progress Tag Extraction',
    definition: 'Checks if [PROGRESS:XX] tag is correctly extracted and in expected range',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      // Prüfe ob Progress im Response vorhanden ist
      const progressMatch = output.response?.match(/\[PROGRESS:(\d+)\]/);
      const hasProgressInResponse = !!progressMatch;
      const progressInResponse = progressMatch ? parseInt(progressMatch[1], 10) : null;

      // Prüfe ob Progress korrekt extrahiert wurde
      const hasExtractedProgress = typeof output.progress === 'number';

      // Prüfe ob Progress im erwarteten Bereich liegt
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
        reasoning = `Progress ${output.progress}% correctly extracted${expectedRange ? ` and in expected range` : ''}`;
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            hasProgressInResponse,
            progressInResponse,
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
    name: 'markenDNA/suggestionsExtraction',
    displayName: 'Suggestions Tag Extraction',
    definition: 'Checks if [SUGGESTIONS] tags are correctly extracted',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      const expectSuggestions = reference?.expectedTags?.suggestions ?? true;

      // Prüfe ob Suggestions im Response vorhanden sind
      const hasSuggestionsInResponse = output.response?.includes('[SUGGESTIONS]') &&
                                        output.response?.includes('[/SUGGESTIONS]');

      // Prüfe ob Suggestions korrekt extrahiert wurden
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
        } else if (!hasSuggestionsInResponse) {
          score = 0;
          reasoning = 'Expected suggestions tags not present in response';
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
            suggestions: output.suggestions?.slice(0, 3), // Nur erste 3 für Details
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
 * Evaluator: Status Tag Extraction
 *
 * Prüft, ob [STATUS:XX] Tag korrekt extrahiert wurde.
 */
export const statusExtractionEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/statusExtraction',
    displayName: 'Status Tag Extraction',
    definition: 'Checks if [STATUS:XX] tag is correctly extracted (draft/completed)',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const reference = datapoint.reference as TestReference | undefined;

      // Prüfe ob Status im Response vorhanden ist
      const statusMatch = output.response?.match(/\[STATUS:(\w+)\]/i);
      const hasStatusInResponse = !!statusMatch;
      const statusInResponse = statusMatch ? statusMatch[1].toLowerCase() : null;

      // Prüfe ob Status korrekt extrahiert wurde
      const hasExtractedStatus = output.status === 'draft' || output.status === 'completed';

      // Erwarteter Status aus Reference
      const expectedStatus = reference?.expectedTags?.status;

      let score = 0;
      let reasoning = '';

      if (expectedStatus === true) {
        // Status wird erwartet
        if (hasStatusInResponse && hasExtractedStatus) {
          score = 1;
          reasoning = `Status "${output.status}" correctly extracted`;
        } else if (hasStatusInResponse && !hasExtractedStatus) {
          score = 0.5;
          reasoning = 'Status tag present but extraction failed';
        } else if (!hasStatusInResponse) {
          score = 0;
          reasoning = 'Expected status tag not present in response';
        }
      } else if (expectedStatus === false) {
        // Kein Status erwartet (frühe Phase)
        if (!hasStatusInResponse) {
          score = 1;
          reasoning = 'No status expected and none present - correct behavior';
        } else {
          score = 0.7;
          reasoning = 'Status present but not expected (early stage)';
        }
      } else {
        // expectedStatus nicht definiert - neutral bewerten
        if (hasStatusInResponse && hasExtractedStatus) {
          score = 1;
          reasoning = `Status "${output.status}" correctly extracted (no expectation defined)`;
        } else if (!hasStatusInResponse) {
          score = 1;
          reasoning = 'No status tag present (no expectation defined)';
        } else {
          score = 0.5;
          reasoning = 'Status tag present but extraction may have failed';
        }
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            expectedStatus,
            hasStatusInResponse,
            statusInResponse,
            extractedStatus: output.status,
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
    name: 'markenDNA/responseLanguage',
    displayName: 'Response Language Check',
    definition: 'Checks if the response is in the expected language (de/en)',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as MarkenDNAChatInput;
      const output = datapoint.output as MarkenDNAChatOutput;

      const expectedLanguage = input.language || 'de';
      const responseText = output.response || '';

      // Einfache Heuristik für Spracherkennung
      // Deutsche Marker
      const germanMarkers = ['der', 'die', 'das', 'und', 'ist', 'wir', 'Sie', 'Ihr', 'für', 'nicht'];
      // Englische Marker
      const englishMarkers = ['the', 'and', 'is', 'are', 'you', 'your', 'for', 'not', 'have', 'this'];

      const words = responseText.toLowerCase().split(/\s+/);
      const germanCount = words.filter(w => germanMarkers.includes(w)).length;
      const englishCount = words.filter(w => englishMarkers.includes(w)).length;

      let detectedLanguage: 'de' | 'en' | 'unknown' = 'unknown';
      if (germanCount > englishCount * 1.5) {
        detectedLanguage = 'de';
      } else if (englishCount > germanCount * 1.5) {
        detectedLanguage = 'en';
      } else if (germanCount > englishCount) {
        detectedLanguage = 'de';
      } else if (englishCount > germanCount) {
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
              ? `Response appears to be in expected language (${expectedLanguage})`
              : `Response appears to be in ${detectedLanguage}, expected ${expectedLanguage}`,
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
 * Evaluator: Iterative Questioning
 *
 * Prüft, ob die KI iterativ vorgeht (max 1-2 Fragen auf einmal).
 */
export const iterativeQuestioningEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/iterativeQuestioning',
    displayName: 'Iterative Questioning Check',
    definition: 'Checks if the AI asks only 1-2 questions at a time as required',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const responseText = output.response || '';

      // Zähle Fragezeichen (einfache Heuristik)
      const questionCount = (responseText.match(/\?/g) || []).length;

      // Zähle strukturierte Fragen (nummerierte Listen mit ?)
      const numberedQuestionPattern = /\d+\.\s+[^?]*\?/g;
      const numberedQuestions = (responseText.match(numberedQuestionPattern) || []).length;

      // Wenn nummerierte Fragen vorhanden, zähle diese
      const effectiveQuestionCount = numberedQuestions > 0 ? numberedQuestions : questionCount;

      let score = 1;
      let reasoning = '';

      if (effectiveQuestionCount === 0) {
        score = 0.8; // Keine Fragen ist ok, wenn Zusammenfassung
        reasoning = 'No questions found (may be a summary phase)';
      } else if (effectiveQuestionCount <= 2) {
        score = 1;
        reasoning = `Good: Only ${effectiveQuestionCount} question(s) asked (iterative approach)`;
      } else if (effectiveQuestionCount <= 4) {
        score = 0.7;
        reasoning = `${effectiveQuestionCount} questions asked - slightly more than recommended 1-2`;
      } else {
        score = 0.3;
        reasoning = `Too many questions (${effectiveQuestionCount}) - violates iterative approach`;
      }

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning,
            totalQuestionMarks: questionCount,
            numberedQuestions,
            effectiveQuestionCount,
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
 * Evaluator: Document Structure
 *
 * Prüft, ob das extrahierte Dokument gut strukturiert ist (Markdown-Headings, Listen).
 */
export const documentStructureEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/documentStructure',
    displayName: 'Document Structure Quality',
    definition: 'Checks if the extracted document has proper Markdown structure',
    isBilled: false,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const output = datapoint.output as MarkenDNAChatOutput;
      const document = output.document;

      if (!document) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 1, // Kein Dokument ist ok wenn nicht erwartet
            details: { reasoning: 'No document to evaluate' },
          },
        };
      }

      // Prüfe Struktur-Elemente
      const hasHeadings = /^##?\s+.+$/m.test(document);
      const hasBulletPoints = /^[-*]\s+.+$/m.test(document);
      const hasNumberedList = /^\d+\.\s+.+$/m.test(document);
      const hasBoldText = /\*\*[^*]+\*\*/.test(document);

      // Berechne Score
      let structurePoints = 0;
      if (hasHeadings) structurePoints += 1;
      if (hasBulletPoints || hasNumberedList) structurePoints += 1;
      if (hasBoldText) structurePoints += 0.5;

      const score = Math.min(1, structurePoints / 2);

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score,
          details: {
            reasoning: score >= 0.8
              ? 'Document is well-structured with Markdown formatting'
              : 'Document could benefit from better structure',
            hasHeadings,
            hasBulletPoints,
            hasNumberedList,
            hasBoldText,
            documentLength: document.length,
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
 * Prompt für LLM-basierte Marken-DNA Chat Qualitätsbewertung
 */
const MARKEN_DNA_QUALITY_PROMPT = `Du bist ein Experte für PR-Strategie und bewertest die Qualität einer KI-Antwort in einem Marken-DNA Erstellungsprozess.

DOKUMENTTYP: {{documentType}}
UNTERNEHMEN: {{companyName}}

LETZTE USER-NACHRICHT:
{{userMessage}}

KI-ANTWORT:
{{response}}

BEWERTUNGSKRITERIEN:
1. **Fachliche Tiefe:** Stellt die KI die richtigen strategischen Fragen?
2. **Iteratives Vorgehen:** Werden max. 1-2 Fragen auf einmal gestellt?
3. **Fakten-Fokus:** Werden vage Aussagen hinterfragt?
4. **Professioneller Ton:** Ist der Ton eines Senior-PR-Strategen erkennbar?
5. **Strukturierung:** Wird der Fortschritt klar dokumentiert?

BEWERTUNGSSKALA:
- 5: Exzellent - Vorbildliche strategische Beratung
- 4: Gut - Professionelle Qualität mit kleinen Verbesserungsmöglichkeiten
- 3: Akzeptabel - Grundlegende Anforderungen erfüllt
- 2: Schwach - Mehrere Kriterien nicht erfüllt
- 1: Ungenügend - Nicht brauchbar

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "reasoning": "<2-3 Sätze Begründung>",
  "strengths": ["<Stärke 1>", "<Stärke 2>"],
  "improvements": ["<Verbesserung 1>"]
}`;

/**
 * Evaluator: Overall Chat Quality (LLM-based)
 *
 * Nutzt ein Judge-LLM um die Gesamtqualität der Marken-DNA Antwort zu bewerten.
 */
export const chatQualityEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/chatQuality',
    displayName: 'Overall Chat Quality',
    definition: 'LLM-based assessment of Marken-DNA chat quality (strategic depth, iterative approach)',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as MarkenDNAChatInput;
      const output = datapoint.output as MarkenDNAChatOutput;

      if (!output.response) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0,
            details: { reasoning: 'No response to evaluate' },
          },
        };
      }

      // Letzte User-Nachricht extrahieren
      const lastUserMessage = input.messages
        .filter(m => m.role === 'user')
        .pop()?.content || 'N/A';

      // Prompt vorbereiten
      const prompt = MARKEN_DNA_QUALITY_PROMPT
        .replace('{{documentType}}', input.documentType)
        .replace('{{companyName}}', input.companyName)
        .replace('{{userMessage}}', lastUserMessage.substring(0, 500))
        .replace('{{response}}', output.response.substring(0, 1500));

      // Judge-LLM aufrufen
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';

      // JSON parsen
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Score normalisieren (1-5 -> 0-1)
      const normalizedScore = parsed.score / 5;

      return {
        testCaseId: datapoint.testCaseId || 'unknown',
        evaluation: {
          score: normalizedScore,
          details: {
            reasoning: parsed.reasoning,
            rawScore: parsed.score,
            scale: '1-5',
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
 * Prompt für LLM-basierte Dokumenten-Vollständigkeitsprüfung
 */
const DOCUMENT_COMPLETENESS_PROMPT = `Du bist ein Qualitätsprüfer für Marken-DNA Dokumente.

DOKUMENTTYP: {{documentType}}
ERWARTETE STRUKTUR FÜR {{documentType}}:
{{expectedStructure}}

EXTRAHIERTES DOKUMENT:
{{document}}

Prüfe ob alle erwarteten Sektionen vorhanden und sinnvoll ausgefüllt sind.

Antworte im JSON-Format:
{
  "score": <number 1-5>,
  "completenessPercent": <number 0-100>,
  "presentSections": ["<Sektion 1>", "<Sektion 2>"],
  "missingSections": ["<Fehlende Sektion>"],
  "reasoning": "<Kurze Begründung>"
}`;

const EXPECTED_STRUCTURES: Record<string, string> = {
  briefing: `- Unternehmensprofil (Branche, Größe, Gründungsjahr)
- Kernprodukte / Dienstleistungen
- Kommunikationsanlass
- Wettbewerber`,
  swot: `- Stärken (Strengths)
- Schwächen (Weaknesses)
- Chancen (Opportunities)
- Risiken (Threats)
- Analytisches Fazit`,
  audience: `- Empfänger (Endkunden/B2B-Entscheider)
- Mittler (Journalisten/Multiplikatoren)
- Absender (Interne Stakeholder)`,
  positioning: `- USP (Alleinstellung)
- Soll-Image
- Strategische Rolle
- Tonalität & Sound (inkl. No-Go-Words)`,
  goals: `- Wahrnehmungsziele (Kopf/Wissen)
- Einstellungsziele (Herz/Gefühl)
- Verhaltensziele (Hand/Aktion)`,
  messages: `- Kernbotschaften (3-5)
  - Jeweils: Kern, Beweis, Nutzen`,
};

/**
 * Evaluator: Document Completeness (LLM-based)
 *
 * Prüft ob das Dokument alle erwarteten Sektionen enthält.
 */
export const documentCompletenessEvaluator = ai.defineEvaluator(
  {
    name: 'markenDNA/documentCompleteness',
    displayName: 'Document Completeness',
    definition: 'LLM-based check if document contains all expected sections',
    isBilled: true,
  },
  async (datapoint: BaseEvalDataPoint) => {
    try {
      const input = datapoint.input as MarkenDNAChatInput;
      const output = datapoint.output as MarkenDNAChatOutput;

      if (!output.document) {
        return {
          testCaseId: datapoint.testCaseId || 'unknown',
          evaluation: {
            score: 0.5, // Neutral - kein Dokument kann ok sein
            details: { reasoning: 'No document extracted yet' },
          },
        };
      }

      const expectedStructure = EXPECTED_STRUCTURES[input.documentType] || 'Unknown structure';

      const prompt = DOCUMENT_COMPLETENESS_PROMPT
        .replace(/\{\{documentType\}\}/g, input.documentType)
        .replace('{{expectedStructure}}', expectedStructure)
        .replace('{{document}}', output.document.substring(0, 2000));

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [{ text: prompt }],
        config: {
          temperature: 0.2,
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
            completenessPercent: parsed.completenessPercent,
            presentSections: parsed.presentSections,
            missingSections: parsed.missingSections,
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
