// src/lib/ai/agentic/test-data/agentic-test-types.ts
// Type-Definitionen für End-to-End Tests der Agentic Chats

import { z } from 'genkit';
import type { SpecialistType, SkillName, ToolCall } from '../types';

// ============================================================================
// CONVERSATION TURN TYPES
// ============================================================================

/**
 * Ein einzelner Turn in einer simulierten Conversation
 */
export interface ConversationTurn {
  /** User-Nachricht die gesendet wird */
  userMessage: string;

  /** Erwartete Tool-Calls in diesem Turn (mindestens einer muss matchen) */
  expectedTools?: SkillName[];

  /** Tools die NICHT aufgerufen werden sollten */
  forbiddenTools?: SkillName[];

  /** Optionale Validierung der Assistant-Antwort */
  responseValidation?: {
    /** Muss diese Strings enthalten */
    mustContain?: string[];
    /** Darf diese Strings NICHT enthalten (z.B. alte Tags) */
    mustNotContain?: string[];
    /** Mindestlänge der Antwort */
    minLength?: number;
  };
}

// ============================================================================
// TEST SCENARIO TYPES
// ============================================================================

/**
 * Ein komplettes Test-Szenario für einen Spezialisten
 */
export interface AgenticTestScenario {
  /** Eindeutige ID des Tests */
  id: string;

  /** Beschreibung was getestet wird */
  description: string;

  /** Der zu testende Spezialist */
  specialistType: SpecialistType;

  /** Test-Firma Daten */
  company: {
    id: string;
    name: string;
  };

  /** Sprache des Tests */
  language: 'de' | 'en';

  /** Die Conversation-Turns die durchlaufen werden */
  turns: ConversationTurn[];

  /** Globale Erwartungen für den gesamten Test */
  expectations: {
    /** Minimale Anzahl Tool-Calls insgesamt */
    minTotalToolCalls?: number;
    /** Diese Tools MÜSSEN mindestens einmal aufgerufen werden */
    requiredTools?: SkillName[];
    /** Der letzte Turn sollte eine Confirm-Box zeigen */
    shouldEndWithConfirm?: boolean;
    /** Der letzte Turn sollte ein finales Dokument haben */
    shouldProduceFinalDocument?: boolean;
  };
}

// ============================================================================
// TEST RESULT TYPES
// ============================================================================

/**
 * Ergebnis eines einzelnen Turns
 */
export interface TurnResult {
  turnIndex: number;
  userMessage: string;
  assistantResponse: string;
  toolCalls: ToolCall[];

  /** Validierung */
  validation: {
    expectedToolsFound: boolean;
    forbiddenToolsAbsent: boolean;
    responseValid: boolean;
    errors: string[];
  };

  /** Dauer in ms */
  durationMs: number;
}

/**
 * Ergebnis eines kompletten Test-Szenarios
 */
export interface ScenarioResult {
  scenarioId: string;
  specialistType: SpecialistType;

  /** Alle Turn-Ergebnisse */
  turns: TurnResult[];

  /** Gesammelte Tool-Calls über alle Turns */
  allToolCalls: ToolCall[];

  /** Globale Validierung */
  validation: {
    passed: boolean;
    totalToolCalls: number;
    requiredToolsPresent: boolean;
    endedWithConfirm: boolean;
    producedFinalDocument: boolean;
    errors: string[];
  };

  /** Gesamtdauer in ms */
  totalDurationMs: number;

  /** Zeitstempel */
  timestamp: string;
}

// ============================================================================
// EVALUATION METRICS
// ============================================================================

/**
 * Bewertungsmetriken für einen Test
 */
export interface EvaluationMetrics {
  /** Tool-Usage Score (0-1): Wurden die richtigen Tools aufgerufen? */
  toolUsageScore: number;

  /** Response-Quality Score (0-1): Sind die Antworten sinnvoll? */
  responseQualityScore: number;

  /** Adherence Score (0-1): Hält sich der Agent an seinen Prompt? */
  adherenceScore: number;

  /** Legacy-Free Score (0-1): Keine alten Tags wie [DOCUMENT]? */
  legacyFreeScore: number;

  /** Gesamtscore (gewichteter Durchschnitt) */
  overallScore: number;

  /** Detaillierte Begründungen */
  reasoning: {
    toolUsage: string;
    responseQuality: string;
    adherence: string;
    legacyFree: string;
  };
}

/**
 * Vollständiges Evaluierungsergebnis
 */
export interface EvaluationResult {
  scenarioResult: ScenarioResult;
  metrics: EvaluationMetrics;

  /** Empfehlungen zur Verbesserung */
  recommendations: string[];
}

// ============================================================================
// ZOD SCHEMAS (für Genkit Flows)
// ============================================================================

export const ConversationTurnSchema = z.object({
  userMessage: z.string(),
  expectedTools: z.array(z.string()).optional(),
  forbiddenTools: z.array(z.string()).optional(),
  responseValidation: z.object({
    mustContain: z.array(z.string()).optional(),
    mustNotContain: z.array(z.string()).optional(),
    minLength: z.number().optional(),
  }).optional(),
});

export const AgenticTestScenarioSchema = z.object({
  id: z.string(),
  description: z.string(),
  specialistType: z.enum([
    'orchestrator',
    'briefing_specialist',
    'swot_specialist',
    'audience_specialist',
    'positioning_specialist',
    'goals_specialist',
    'messages_specialist',
    'project_wizard',
  ]),
  company: z.object({
    id: z.string(),
    name: z.string(),
  }),
  language: z.enum(['de', 'en']),
  turns: z.array(ConversationTurnSchema),
  expectations: z.object({
    minTotalToolCalls: z.number().optional(),
    requiredTools: z.array(z.string()).optional(),
    shouldEndWithConfirm: z.boolean().optional(),
    shouldProduceFinalDocument: z.boolean().optional(),
  }),
});

export const EvaluationMetricsSchema = z.object({
  toolUsageScore: z.number(),
  responseQualityScore: z.number(),
  adherenceScore: z.number(),
  legacyFreeScore: z.number(),
  overallScore: z.number(),
  reasoning: z.object({
    toolUsage: z.string(),
    responseQuality: z.string(),
    adherence: z.string(),
    legacyFree: z.string(),
  }),
});
