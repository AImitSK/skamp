// src/lib/ai/evaluators/email-insights-evaluators.ts
// Genkit Evaluators für Email Insights Quality Assessment

import { genkit } from 'genkit';
import { gemini25FlashModel } from '../genkit-config';

const ai = genkit({});

// ══════════════════════════════════════════════════════════════
// HEURISTIC EVALUATORS (Free - No LLM Calls)
// ══════════════════════════════════════════════════════════════

/**
 * 1. CONFIDENCE SCORES VALIDATION
 * Prüft ob alle Confidence-Scores im gültigen Bereich (0-1) sind
 */
export const confidenceScoresValidationEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/confidence-scores-validation',
    displayName: 'Confidence Scores Validation',
    definition: 'Validates that all confidence scores are between 0 and 1'
  },
  async (testCase) => {
    const output = testCase.output as any;

    // Für Full Analysis: Prüfe alle 4 Sub-Analysen
    if (output.analysisType === 'full' && output.result) {
      const { sentiment, intent, priority, category } = output.result;

      const scores = [
        sentiment?.confidence,
        intent?.confidence,
        priority?.confidence,
        category?.confidence
      ].filter(s => s !== undefined);

      const allValid = scores.every(s => s >= 0 && s <= 1);
      const avgConfidence = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return {
        score: allValid ? 1.0 : 0.0,
        details: {
          allScoresValid: allValid,
          averageConfidence: avgConfidence,
          scores: {
            sentiment: sentiment?.confidence,
            intent: intent?.confidence,
            priority: priority?.confidence,
            category: category?.confidence
          }
        },
        rationale: allValid
          ? `All confidence scores are valid (avg: ${avgConfidence.toFixed(2)})`
          : 'Some confidence scores are out of range (0-1)'
      };
    }

    // Für einzelne Analysen
    const confidence = output.result?.confidence;
    const isValid = confidence !== undefined && confidence >= 0 && confidence <= 1;

    return {
      score: isValid ? 1.0 : 0.0,
      details: { confidence },
      rationale: isValid
        ? `Confidence score is valid: ${confidence}`
        : `Confidence score out of range: ${confidence}`
    };
  }
);

/**
 * 2. ENUM VALUES VALIDATION
 * Prüft ob sentiment, intent, priority, category gültige Enum-Werte sind
 */
export const enumValuesValidationEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/enum-values-validation',
    displayName: 'Enum Values Validation',
    definition: 'Validates that all enum fields have valid values'
  },
  async (testCase) => {
    const output = testCase.output as any;

    const validSentiments = ['positive', 'neutral', 'negative', 'urgent'];
    const validIntents = ['question', 'complaint', 'request', 'information', 'compliment', 'other'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const validCategories = ['sales', 'support', 'billing', 'partnership', 'hr', 'marketing', 'legal', 'other'];

    if (output.analysisType === 'full' && output.result) {
      const { sentiment, intent, priority, category } = output.result;

      const checks = [
        { field: 'sentiment', value: sentiment?.sentiment, valid: validSentiments },
        { field: 'intent', value: intent?.intent, valid: validIntents },
        { field: 'priority', value: priority?.priority, valid: validPriorities },
        { field: 'category', value: category?.category, valid: validCategories }
      ];

      const allValid = checks.every(c => c.valid.includes(c.value));
      const invalidFields = checks.filter(c => !c.valid.includes(c.value));

      return {
        score: allValid ? 1.0 : 0.0,
        details: {
          allEnumsValid: allValid,
          invalidFields: invalidFields.map(f => f.field),
          values: {
            sentiment: sentiment?.sentiment,
            intent: intent?.intent,
            priority: priority?.priority,
            category: category?.category
          }
        },
        rationale: allValid
          ? 'All enum values are valid'
          : `Invalid enum values in: ${invalidFields.map(f => f.field).join(', ')}`
      };
    }

    return {
      score: 1.0,
      details: { analysisType: output.analysisType },
      rationale: 'Single analysis type - enum validation skipped'
    };
  }
);

/**
 * 3. SLA CONSISTENCY CHECK
 * Prüft ob SLA-Empfehlung zur Priority passt
 */
export const slaConsistencyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/sla-consistency',
    displayName: 'SLA Consistency Check',
    definition: 'Validates that SLA recommendation matches priority level'
  },
  async (testCase) => {
    const output = testCase.output as any;

    const priority = output.result?.priority?.priority || output.result?.priority;
    const sla = output.result?.priority?.slaRecommendation || output.result?.slaRecommendation;

    if (!priority || !sla) {
      return {
        score: 1.0,
        details: { priority, sla },
        rationale: 'SLA or Priority not present in output'
      };
    }

    // Erwartete SLA-Mappings
    const expectedSLA: Record<string, string> = {
      'low': '48h',
      'normal': '24h',
      'high': '4h',
      'urgent': '1h'
    };

    const expected = expectedSLA[priority];
    const isConsistent = sla === expected;

    return {
      score: isConsistent ? 1.0 : 0.5,
      details: {
        priority,
        sla,
        expected,
        consistent: isConsistent
      },
      rationale: isConsistent
        ? `SLA ${sla} correctly matches priority ${priority}`
        : `SLA ${sla} does not match priority ${priority} (expected: ${expected})`
    };
  }
);

/**
 * 4. ESCALATION LOGIC CHECK
 * Prüft ob Eskalation bei urgent/negative Kombination getriggert wird
 */
export const escalationLogicEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/escalation-logic',
    displayName: 'Escalation Logic Check',
    definition: 'Validates escalation is triggered for urgent/negative scenarios'
  },
  async (testCase) => {
    const output = testCase.output as any;

    if (output.analysisType !== 'full' || !output.result) {
      return {
        score: 1.0,
        rationale: 'Not a full analysis - escalation logic not applicable'
      };
    }

    const { sentiment, priority } = output.result;
    const escalationNeeded = output.result.priority?.escalationNeeded;

    const isUrgent = sentiment?.sentiment === 'urgent' || priority?.priority === 'urgent';
    const isNegative = sentiment?.sentiment === 'negative';

    // Sollte eskaliert werden?
    const shouldEscalate = isUrgent || isNegative;

    // Wurde eskaliert?
    const didEscalate = escalationNeeded === true;

    const isCorrect = shouldEscalate === didEscalate;

    return {
      score: isCorrect ? 1.0 : 0.3,
      details: {
        sentiment: sentiment?.sentiment,
        priority: priority?.priority,
        escalationNeeded,
        shouldEscalate,
        didEscalate,
        correct: isCorrect
      },
      rationale: isCorrect
        ? `Escalation logic correct (needed: ${shouldEscalate}, triggered: ${didEscalate})`
        : `Escalation logic incorrect (needed: ${shouldEscalate}, triggered: ${didEscalate})`
    };
  }
);

/**
 * 5. ACTION REQUIRED CONSISTENCY
 * Prüft ob actionRequired bei bestimmten Intents gesetzt ist
 */
export const actionRequiredConsistencyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/action-required-consistency',
    displayName: 'Action Required Consistency',
    definition: 'Validates actionRequired flag consistency with intent'
  },
  async (testCase) => {
    const output = testCase.output as any;

    const intent = output.result?.intent?.intent || output.result?.intent;
    const actionRequired = output.result?.intent?.actionRequired ?? output.result?.actionRequired;

    if (!intent || actionRequired === undefined) {
      return {
        score: 1.0,
        rationale: 'Intent or actionRequired not present in output'
      };
    }

    // Intents die normalerweise Action erfordern
    const actionIntents = ['question', 'complaint', 'request'];
    const noActionIntents = ['information', 'compliment'];

    let isConsistent = true;
    let reasoning = '';

    if (actionIntents.includes(intent) && !actionRequired) {
      isConsistent = false;
      reasoning = `Intent "${intent}" usually requires action but actionRequired is false`;
    } else if (noActionIntents.includes(intent) && actionRequired) {
      isConsistent = false;
      reasoning = `Intent "${intent}" usually doesn't require action but actionRequired is true`;
    } else {
      reasoning = `Action required flag is consistent with intent "${intent}"`;
    }

    return {
      score: isConsistent ? 1.0 : 0.7,
      details: {
        intent,
        actionRequired,
        consistent: isConsistent
      },
      rationale: reasoning
    };
  }
);

/**
 * 6. ARRAY LENGTH VALIDATION
 * Prüft ob Arrays die maximale Länge einhalten
 */
export const arrayLengthValidationEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/array-length-validation',
    displayName: 'Array Length Validation',
    definition: 'Validates that arrays do not exceed maximum lengths'
  },
  async (testCase) => {
    const output = testCase.output as any;

    if (!output.result) {
      return { score: 1.0, rationale: 'No result to validate' };
    }

    const checks = [];

    // Check suggestedActions (max 3)
    const suggestedActions = output.result.intent?.suggestedActions || output.result.suggestedActions;
    if (suggestedActions && Array.isArray(suggestedActions)) {
      checks.push({
        field: 'suggestedActions',
        length: suggestedActions.length,
        max: 3,
        valid: suggestedActions.length <= 3
      });
    }

    // Check keyInsights (max 5)
    const keyInsights = output.result.keyInsights;
    if (keyInsights && Array.isArray(keyInsights)) {
      checks.push({
        field: 'keyInsights',
        length: keyInsights.length,
        max: 5,
        valid: keyInsights.length <= 5
      });
    }

    // Check urgencyFactors (max 5)
    const urgencyFactors = output.result.priority?.urgencyFactors;
    if (urgencyFactors && Array.isArray(urgencyFactors)) {
      checks.push({
        field: 'urgencyFactors',
        length: urgencyFactors.length,
        max: 5,
        valid: urgencyFactors.length <= 5
      });
    }

    // Check keywords (max 5)
    const keywords = output.result.category?.keywords;
    if (keywords && Array.isArray(keywords)) {
      checks.push({
        field: 'keywords',
        length: keywords.length,
        max: 5,
        valid: keywords.length <= 5
      });
    }

    const allValid = checks.every(c => c.valid);
    const invalidFields = checks.filter(c => !c.valid);

    return {
      score: allValid ? 1.0 : 0.5,
      details: {
        checks,
        allValid,
        invalidFields: invalidFields.map(f => f.field)
      },
      rationale: allValid
        ? 'All arrays are within length limits'
        : `Arrays exceeded limits: ${invalidFields.map(f => `${f.field} (${f.length}/${f.max})`).join(', ')}`
    };
  }
);

// ══════════════════════════════════════════════════════════════
// LLM-BASED EVALUATORS (Paid - Uses Gemini API)
// ══════════════════════════════════════════════════════════════

/**
 * 7. SENTIMENT ACCURACY (LLM-based)
 * Bewertet ob das erkannte Sentiment korrekt ist
 */
export const sentimentAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/sentiment-accuracy-llm',
    displayName: 'Sentiment Accuracy (LLM)',
    definition: 'LLM judges whether the detected sentiment is accurate'
  },
  async (testCase) => {
    const input = testCase.input as any;
    const output = testCase.output as any;

    const sentiment = output.result?.sentiment?.sentiment || output.result?.sentiment;
    const confidence = output.result?.sentiment?.confidence || output.result?.confidence;

    if (!sentiment) {
      return { score: 0, rationale: 'No sentiment detected in output' };
    }

    const prompt = `Bewerte die Sentiment-Analyse dieser Email:

EMAIL:
Betreff: ${input.subject}
Von: ${input.fromEmail}
Inhalt: ${input.emailContent.substring(0, 1000)}

ERKANNTES SENTIMENT: ${sentiment}
CONFIDENCE: ${confidence}

Ist das Sentiment korrekt erkannt? Bewerte von 0-100:
- 90-100: Perfekt erkannt
- 70-89: Gut erkannt, kleine Nuancen fehlen
- 50-69: Teilweise korrekt
- 30-49: Fragwürdig
- 0-29: Falsch

Antworte nur mit einer Zahl 0-100.`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: { temperature: 0.3 }
      });

      const scoreText = result.text.trim();
      const score = parseInt(scoreText, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        return {
          score: 0.5,
          rationale: 'LLM response was not a valid score'
        };
      }

      return {
        score: score / 100,
        details: { llmScore: score, sentiment, confidence },
        rationale: `LLM scored sentiment accuracy as ${score}/100`
      };
    } catch (error) {
      return {
        score: 0.5,
        rationale: 'LLM evaluation failed'
      };
    }
  }
);

/**
 * 8. INTENT ACCURACY (LLM-based)
 * Bewertet ob der erkannte Intent korrekt ist
 */
export const intentAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/intent-accuracy-llm',
    displayName: 'Intent Accuracy (LLM)',
    definition: 'LLM judges whether the detected intent is accurate'
  },
  async (testCase) => {
    const input = testCase.input as any;
    const output = testCase.output as any;

    const intent = output.result?.intent?.intent || output.result?.intent;
    const confidence = output.result?.intent?.confidence || output.result?.confidence;

    if (!intent) {
      return { score: 0, rationale: 'No intent detected in output' };
    }

    const prompt = `Bewerte die Intent-Analyse dieser Email:

EMAIL:
Betreff: ${input.subject}
Von: ${input.fromEmail}
Inhalt: ${input.emailContent.substring(0, 1000)}

ERKANNTER INTENT: ${intent}
CONFIDENCE: ${confidence}

Mögliche Intents: question, complaint, request, information, compliment, other

Ist der Intent korrekt erkannt? Bewerte von 0-100:
- 90-100: Perfekt erkannt
- 70-89: Gut erkannt
- 50-69: Teilweise korrekt
- 30-49: Fragwürdig
- 0-29: Falsch

Antworte nur mit einer Zahl 0-100.`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: { temperature: 0.3 }
      });

      const scoreText = result.text.trim();
      const score = parseInt(scoreText, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        return {
          score: 0.5,
          rationale: 'LLM response was not a valid score'
        };
      }

      return {
        score: score / 100,
        details: { llmScore: score, intent, confidence },
        rationale: `LLM scored intent accuracy as ${score}/100`
      };
    } catch (error) {
      return {
        score: 0.5,
        rationale: 'LLM evaluation failed'
      };
    }
  }
);

/**
 * 9. PRIORITY ACCURACY (LLM-based)
 * Bewertet ob die erkannte Priority korrekt ist
 */
export const priorityAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/priority-accuracy-llm',
    displayName: 'Priority Accuracy (LLM)',
    definition: 'LLM judges whether the priority assessment is accurate'
  },
  async (testCase) => {
    const input = testCase.input as any;
    const output = testCase.output as any;

    const priority = output.result?.priority?.priority || output.result?.priority;
    const sla = output.result?.priority?.slaRecommendation || output.result?.slaRecommendation;
    const escalation = output.result?.priority?.escalationNeeded;

    if (!priority) {
      return { score: 0, rationale: 'No priority detected in output' };
    }

    const prompt = `Bewerte die Priority-Analyse dieser Email:

EMAIL:
Betreff: ${input.subject}
Von: ${input.fromEmail}
Inhalt: ${input.emailContent.substring(0, 1000)}

ERKANNTE PRIORITY: ${priority}
SLA-EMPFEHLUNG: ${sla}
ESKALATION NÖTIG: ${escalation}

Mögliche Priorities: low, normal, high, urgent

Ist die Priority korrekt bewertet? Bewerte von 0-100:
- 90-100: Perfekt bewertet
- 70-89: Gut bewertet
- 50-69: Teilweise korrekt
- 30-49: Fragwürdig
- 0-29: Falsch

Antworte nur mit einer Zahl 0-100.`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: { temperature: 0.3 }
      });

      const scoreText = result.text.trim();
      const score = parseInt(scoreText, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        return {
          score: 0.5,
          rationale: 'LLM response was not a valid score'
        };
      }

      return {
        score: score / 100,
        details: { llmScore: score, priority, sla, escalation },
        rationale: `LLM scored priority accuracy as ${score}/100`
      };
    } catch (error) {
      return {
        score: 0.5,
        rationale: 'LLM evaluation failed'
      };
    }
  }
);

/**
 * 10. CATEGORY ACCURACY (LLM-based)
 * Bewertet ob die erkannte Category korrekt ist
 */
export const categoryAccuracyEvaluator = ai.defineEvaluator(
  {
    name: 'email-insights/category-accuracy-llm',
    displayName: 'Category Accuracy (LLM)',
    definition: 'LLM judges whether the category classification is accurate'
  },
  async (testCase) => {
    const input = testCase.input as any;
    const output = testCase.output as any;

    const category = output.result?.category?.category || output.result?.category;
    const department = output.result?.category?.suggestedDepartment;
    const assignee = output.result?.category?.suggestedAssignee;

    if (!category) {
      return { score: 0, rationale: 'No category detected in output' };
    }

    const prompt = `Bewerte die Category-Analyse dieser Email:

EMAIL:
Betreff: ${input.subject}
Von: ${input.fromEmail}
Inhalt: ${input.emailContent.substring(0, 1000)}

ERKANNTE CATEGORY: ${category}
DEPARTMENT: ${department || 'nicht angegeben'}
ASSIGNEE: ${assignee || 'nicht angegeben'}

Mögliche Categories: sales, support, billing, partnership, hr, marketing, legal, other

Ist die Category korrekt klassifiziert? Bewerte von 0-100:
- 90-100: Perfekt klassifiziert
- 70-89: Gut klassifiziert
- 50-69: Teilweise korrekt
- 30-49: Fragwürdig
- 0-29: Falsch

Antworte nur mit einer Zahl 0-100.`;

    try {
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt,
        config: { temperature: 0.3 }
      });

      const scoreText = result.text.trim();
      const score = parseInt(scoreText, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        return {
          score: 0.5,
          rationale: 'LLM response was not a valid score'
        };
      }

      return {
        score: score / 100,
        details: { llmScore: score, category, department, assignee },
        rationale: `LLM scored category accuracy as ${score}/100`
      };
    } catch (error) {
      return {
        score: 0.5,
        rationale: 'LLM evaluation failed'
      };
    }
  }
);
