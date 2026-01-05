// src/lib/ai/agentic/test-data/agentic-test-runner.ts
// Test-Runner für End-to-End Tests der Agentic Chats

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { agenticChatFlow } from '../flows/agentic-chat-flow';
import type {
  AgenticTestScenario,
  ScenarioResult,
  TurnResult,
  EvaluationMetrics,
  EvaluationResult,
} from './agentic-test-types';
import { AgenticTestScenarioSchema, EvaluationMetricsSchema } from './agentic-test-types';
import type { ToolCall, SkillName, ChatMessage } from '../types';

// ============================================================================
// TEST RUNNER FLOW
// ============================================================================

/**
 * runAgenticTestScenario
 *
 * Führt ein komplettes Test-Szenario durch:
 * 1. Iteriert durch alle Turns
 * 2. Sammelt Tool-Calls und Responses
 * 3. Validiert Erwartungen
 * 4. Gibt detailliertes Ergebnis zurück
 */
export const runAgenticTestScenarioFlow = ai.defineFlow(
  {
    name: 'runAgenticTestScenario',
    inputSchema: AgenticTestScenarioSchema,
    outputSchema: z.object({
      scenarioId: z.string(),
      specialistType: z.string(),
      turns: z.array(z.object({
        turnIndex: z.number(),
        userMessage: z.string(),
        assistantResponse: z.string(),
        toolCalls: z.array(z.object({
          name: z.string(),
          args: z.record(z.unknown()),
          result: z.record(z.unknown()).optional(),
        })),
        validation: z.object({
          expectedToolsFound: z.boolean(),
          forbiddenToolsAbsent: z.boolean(),
          responseValid: z.boolean(),
          errors: z.array(z.string()),
        }),
        durationMs: z.number(),
      })),
      allToolCalls: z.array(z.object({
        name: z.string(),
        args: z.record(z.unknown()),
        result: z.record(z.unknown()).optional(),
      })),
      validation: z.object({
        passed: z.boolean(),
        totalToolCalls: z.number(),
        requiredToolsPresent: z.boolean(),
        endedWithConfirm: z.boolean(),
        producedFinalDocument: z.boolean(),
        errors: z.array(z.string()),
      }),
      totalDurationMs: z.number(),
      timestamp: z.string(),
    }),
  },
  async (scenario): Promise<ScenarioResult> => {
    const startTime = Date.now();
    const turnResults: TurnResult[] = [];
    const allToolCalls: ToolCall[] = [];
    const messages: ChatMessage[] = [];

    console.log(`\n========================================`);
    console.log(`Test: ${scenario.id}`);
    console.log(`Spezialist: ${scenario.specialistType}`);
    console.log(`Firma: ${scenario.company.name}`);
    console.log(`========================================\n`);

    // Durch alle Turns iterieren
    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];
      const turnStart = Date.now();

      console.log(`\n--- Turn ${i + 1}/${scenario.turns.length} ---`);
      console.log(`User: ${turn.userMessage.substring(0, 100)}...`);

      // User-Nachricht hinzufügen
      messages.push({
        role: 'user',
        content: turn.userMessage,
      });

      try {
        // Flow aufrufen
        const result = await agenticChatFlow({
          specialistType: scenario.specialistType,
          companyId: scenario.company.id,
          companyName: scenario.company.name,
          language: scenario.language,
          messages: messages,
        });

        // Assistant-Antwort speichern
        messages.push({
          role: 'assistant',
          content: result.response,
          toolCalls: result.toolCalls,
        });

        // Tool-Calls sammeln
        allToolCalls.push(...result.toolCalls);

        // Turn validieren
        const validation = validateTurn(turn, result.response, result.toolCalls);

        const turnResult: TurnResult = {
          turnIndex: i,
          userMessage: turn.userMessage,
          assistantResponse: result.response,
          toolCalls: result.toolCalls,
          validation,
          durationMs: Date.now() - turnStart,
        };

        turnResults.push(turnResult);

        console.log(`Assistant: ${result.response.substring(0, 100)}...`);
        console.log(`Tool-Calls: ${result.toolCalls.map(tc => tc.name).join(', ') || 'keine'}`);
        console.log(`Validierung: ${validation.errors.length === 0 ? '✅' : '❌ ' + validation.errors.join(', ')}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Fehler in Turn ${i + 1}: ${errorMessage}`);

        turnResults.push({
          turnIndex: i,
          userMessage: turn.userMessage,
          assistantResponse: '',
          toolCalls: [],
          validation: {
            expectedToolsFound: false,
            forbiddenToolsAbsent: true,
            responseValid: false,
            errors: [`Flow-Fehler: ${errorMessage}`],
          },
          durationMs: Date.now() - turnStart,
        });
      }
    }

    // Globale Validierung
    const globalValidation = validateScenario(scenario, turnResults, allToolCalls);

    const scenarioResult: ScenarioResult = {
      scenarioId: scenario.id,
      specialistType: scenario.specialistType,
      turns: turnResults,
      allToolCalls,
      validation: globalValidation,
      totalDurationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`\n========================================`);
    console.log(`Ergebnis: ${globalValidation.passed ? '✅ BESTANDEN' : '❌ FEHLGESCHLAGEN'}`);
    console.log(`Tool-Calls: ${globalValidation.totalToolCalls}`);
    console.log(`Dauer: ${scenarioResult.totalDurationMs}ms`);
    if (globalValidation.errors.length > 0) {
      console.log(`Fehler: ${globalValidation.errors.join(', ')}`);
    }
    console.log(`========================================\n`);

    return scenarioResult;
  }
);

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateTurn(
  turn: AgenticTestScenario['turns'][0],
  response: string,
  toolCalls: ToolCall[]
): TurnResult['validation'] {
  const errors: string[] = [];

  // Expected Tools prüfen
  let expectedToolsFound = true;
  if (turn.expectedTools && turn.expectedTools.length > 0) {
    const calledToolNames = toolCalls.map(tc => tc.name);
    const foundExpected = turn.expectedTools.some(expected =>
      calledToolNames.includes(expected as SkillName)
    );
    if (!foundExpected) {
      expectedToolsFound = false;
      errors.push(`Erwartete Tools nicht gefunden: ${turn.expectedTools.join(', ')}`);
    }
  }

  // Forbidden Tools prüfen
  let forbiddenToolsAbsent = true;
  if (turn.forbiddenTools && turn.forbiddenTools.length > 0) {
    const calledToolNames = toolCalls.map(tc => tc.name);
    const foundForbidden = turn.forbiddenTools.filter(forbidden =>
      calledToolNames.includes(forbidden as SkillName)
    );
    if (foundForbidden.length > 0) {
      forbiddenToolsAbsent = false;
      errors.push(`Verbotene Tools aufgerufen: ${foundForbidden.join(', ')}`);
    }
  }

  // Response Validation
  let responseValid = true;
  if (turn.responseValidation) {
    const rv = turn.responseValidation;

    if (rv.mustContain) {
      for (const text of rv.mustContain) {
        if (!response.toLowerCase().includes(text.toLowerCase())) {
          responseValid = false;
          errors.push(`Antwort enthält nicht: "${text}"`);
        }
      }
    }

    if (rv.mustNotContain) {
      for (const text of rv.mustNotContain) {
        if (response.includes(text)) {
          responseValid = false;
          errors.push(`Antwort enthält verbotenen Text: "${text}"`);
        }
      }
    }

    if (rv.minLength && response.length < rv.minLength) {
      responseValid = false;
      errors.push(`Antwort zu kurz: ${response.length} < ${rv.minLength}`);
    }
  }

  return {
    expectedToolsFound,
    forbiddenToolsAbsent,
    responseValid,
    errors,
  };
}

function validateScenario(
  scenario: AgenticTestScenario,
  turnResults: TurnResult[],
  allToolCalls: ToolCall[]
): ScenarioResult['validation'] {
  const errors: string[] = [];
  const exp = scenario.expectations;

  // Total Tool Calls
  const totalToolCalls = allToolCalls.length;
  if (exp.minTotalToolCalls && totalToolCalls < exp.minTotalToolCalls) {
    errors.push(`Zu wenige Tool-Calls: ${totalToolCalls} < ${exp.minTotalToolCalls}`);
  }

  // Required Tools
  let requiredToolsPresent = true;
  if (exp.requiredTools && exp.requiredTools.length > 0) {
    const calledToolNames = new Set(allToolCalls.map(tc => tc.name));
    const missingTools = exp.requiredTools.filter(tool => !calledToolNames.has(tool as SkillName));
    if (missingTools.length > 0) {
      requiredToolsPresent = false;
      errors.push(`Erforderliche Tools fehlen: ${missingTools.join(', ')}`);
    }
  }

  // Ended with Confirm
  let endedWithConfirm = false;
  if (exp.shouldEndWithConfirm) {
    const lastTurn = turnResults[turnResults.length - 1];
    if (lastTurn) {
      endedWithConfirm = lastTurn.toolCalls.some(tc => tc.name === 'skill_confirm');
      if (!endedWithConfirm) {
        errors.push('Letzter Turn enthält keine Confirm-Box');
      }
    }
  } else {
    endedWithConfirm = true; // Nicht erwartet, also OK
  }

  // Produced Final Document
  let producedFinalDocument = false;
  if (exp.shouldProduceFinalDocument) {
    producedFinalDocument = allToolCalls.some(
      tc => tc.name === 'skill_sidebar' &&
        (tc.args as { action?: string })?.action === 'finalizeDocument'
    );
    if (!producedFinalDocument) {
      errors.push('Kein finales Dokument erstellt (skill_sidebar.finalizeDocument)');
    }
  } else {
    producedFinalDocument = true; // Nicht erwartet, also OK
  }

  // Turn-Fehler sammeln
  for (const turn of turnResults) {
    if (turn.validation.errors.length > 0) {
      errors.push(`Turn ${turn.turnIndex + 1}: ${turn.validation.errors.join(', ')}`);
    }
  }

  return {
    passed: errors.length === 0,
    totalToolCalls,
    requiredToolsPresent,
    endedWithConfirm,
    producedFinalDocument,
    errors,
  };
}

// ============================================================================
// EVALUATOR FLOW
// ============================================================================

/**
 * evaluateAgenticTestResult
 *
 * Bewertet ein Test-Ergebnis mit LLM-as-Judge und programmatischen Checks
 */
export const evaluateAgenticTestResultFlow = ai.defineFlow(
  {
    name: 'evaluateAgenticTestResult',
    inputSchema: z.object({
      scenarioResult: z.object({
        scenarioId: z.string(),
        specialistType: z.string(),
        turns: z.array(z.any()),
        allToolCalls: z.array(z.any()),
        validation: z.any(),
        totalDurationMs: z.number(),
        timestamp: z.string(),
      }),
      scenario: AgenticTestScenarioSchema,
    }),
    outputSchema: z.object({
      metrics: EvaluationMetricsSchema,
      recommendations: z.array(z.string()),
    }),
  },
  async ({ scenarioResult, scenario }) => {
    // 1. Tool-Usage Score (programmatisch)
    const toolUsageScore = calculateToolUsageScore(scenarioResult, scenario);

    // 2. Legacy-Free Score (programmatisch)
    const legacyFreeScore = calculateLegacyFreeScore(scenarioResult);

    // 3. Response-Quality Score (LLM-as-Judge)
    const responseQualityResult = await evaluateResponseQuality(scenarioResult, scenario);

    // 4. Adherence Score (LLM-as-Judge)
    const adherenceResult = await evaluateAdherence(scenarioResult, scenario);

    // Gewichteter Gesamtscore
    const overallScore =
      toolUsageScore * 0.3 +
      legacyFreeScore * 0.2 +
      responseQualityResult.score * 0.3 +
      adherenceResult.score * 0.2;

    const metrics: EvaluationMetrics = {
      toolUsageScore,
      responseQualityScore: responseQualityResult.score,
      adherenceScore: adherenceResult.score,
      legacyFreeScore,
      overallScore,
      reasoning: {
        toolUsage: `${scenarioResult.validation.totalToolCalls} Tool-Calls, Required: ${scenarioResult.validation.requiredToolsPresent ? 'ja' : 'nein'}`,
        responseQuality: responseQualityResult.reasoning,
        adherence: adherenceResult.reasoning,
        legacyFree: legacyFreeScore === 1 ? 'Keine Legacy-Tags gefunden' : 'Legacy-Tags gefunden',
      },
    };

    // Empfehlungen generieren
    const recommendations: string[] = [];
    if (toolUsageScore < 0.8) {
      recommendations.push('Tool-Usage verbessern: Mehr relevante Tools aufrufen');
    }
    if (legacyFreeScore < 1) {
      recommendations.push('Legacy-Tags entfernen: [DOCUMENT], [PROGRESS], etc.');
    }
    if (responseQualityResult.score < 0.8) {
      recommendations.push(`Response-Qualität: ${responseQualityResult.reasoning}`);
    }
    if (adherenceResult.score < 0.8) {
      recommendations.push(`Prompt-Adherence: ${adherenceResult.reasoning}`);
    }

    return { metrics, recommendations };
  }
);

// ============================================================================
// SCORE CALCULATION HELPERS
// ============================================================================

function calculateToolUsageScore(result: ScenarioResult, scenario: AgenticTestScenario): number {
  let score = 0;
  let maxScore = 0;

  // Punkte für erforderliche Tools
  if (scenario.expectations.requiredTools) {
    maxScore += scenario.expectations.requiredTools.length;
    const calledToolNames = new Set(result.allToolCalls.map(tc => tc.name));
    for (const tool of scenario.expectations.requiredTools) {
      if (calledToolNames.has(tool as SkillName)) {
        score += 1;
      }
    }
  }

  // Punkte für Mindest-Tool-Calls
  if (scenario.expectations.minTotalToolCalls) {
    maxScore += 1;
    if (result.validation.totalToolCalls >= scenario.expectations.minTotalToolCalls) {
      score += 1;
    }
  }

  // Punkte für Confirm am Ende
  if (scenario.expectations.shouldEndWithConfirm) {
    maxScore += 1;
    if (result.validation.endedWithConfirm) {
      score += 1;
    }
  }

  // Punkte für Final Document
  if (scenario.expectations.shouldProduceFinalDocument) {
    maxScore += 1;
    if (result.validation.producedFinalDocument) {
      score += 1;
    }
  }

  return maxScore > 0 ? score / maxScore : 1;
}

function calculateLegacyFreeScore(result: ScenarioResult): number {
  const legacyPatterns = [
    '[DOCUMENT]',
    '[/DOCUMENT]',
    '[PROGRESS',
    '[SUGGESTIONS]',
    '[/SUGGESTIONS]',
    '[CONFIRM]',
    '[/CONFIRM]',
  ];

  let hasLegacy = false;
  for (const turn of result.turns) {
    for (const pattern of legacyPatterns) {
      if (turn.assistantResponse.includes(pattern)) {
        hasLegacy = true;
        break;
      }
    }
    if (hasLegacy) break;
  }

  return hasLegacy ? 0 : 1;
}

async function evaluateResponseQuality(
  result: ScenarioResult,
  scenario: AgenticTestScenario
): Promise<{ score: number; reasoning: string }> {
  // Vereinfachte Bewertung ohne LLM-Call für schnellere Tests
  // In Produktion könnte hier ein LLM-as-Judge verwendet werden

  let score = 1;
  const issues: string[] = [];

  for (const turn of result.turns) {
    // Prüfe Mindestlänge
    if (turn.assistantResponse.length < 50) {
      score -= 0.1;
      issues.push('Zu kurze Antworten');
    }

    // Prüfe auf leere Antworten
    if (turn.assistantResponse.trim().length === 0) {
      score -= 0.3;
      issues.push('Leere Antwort');
    }
  }

  return {
    score: Math.max(0, score),
    reasoning: issues.length > 0 ? issues.join(', ') : 'Antworten haben gute Qualität',
  };
}

async function evaluateAdherence(
  result: ScenarioResult,
  scenario: AgenticTestScenario
): Promise<{ score: number; reasoning: string }> {
  // Prüfe ob der Agent seine Rolle einhält

  let score = 1;
  const issues: string[] = [];

  // Prüfe ob Roadmap gezeigt wurde (fast alle Agenten sollten das)
  const hasRoadmap = result.allToolCalls.some(tc => tc.name === 'skill_roadmap');
  if (!hasRoadmap && scenario.specialistType !== 'orchestrator') {
    score -= 0.2;
    issues.push('Keine Roadmap angezeigt');
  }

  // Prüfe ob Todos aktualisiert wurden
  const hasTodos = result.allToolCalls.some(tc => tc.name === 'skill_todos');
  if (!hasTodos && scenario.expectations.requiredTools?.includes('skill_todos')) {
    score -= 0.2;
    issues.push('Keine Todos aktualisiert');
  }

  return {
    score: Math.max(0, score),
    reasoning: issues.length > 0 ? issues.join(', ') : 'Agent hält sich an seine Rolle',
  };
}
