// src/lib/ai/agentic/types.ts
// Type-Definitionen für das Agentic Chat System

import { z } from 'genkit';

// ============================================================================
// SKILL TYPES
// ============================================================================

/**
 * Status eines ToDo-Items in der Checkliste
 * - open: Noch nicht bearbeitet (○)
 * - partial: Teilweise bearbeitet (◐)
 * - done: Vollständig erledigt (●)
 */
export type TodoStatus = 'open' | 'partial' | 'done';

/**
 * Ein einzelnes ToDo-Item
 */
export interface TodoItem {
  id: string;
  label: string;
  status: TodoStatus;
  value?: string; // Optionaler Wert/Zusammenfassung
}

/**
 * Payload für skill_roadmap
 */
export interface RoadmapPayload {
  action: 'showRoadmap' | 'completePhase';
  phases?: string[];
  currentPhaseIndex?: number;
  phaseIndex?: number; // Für completePhase
}

/**
 * Payload für skill_todos
 */
export interface TodosPayload {
  items: TodoItem[];
}

/**
 * Payload für skill_suggestions
 */
export interface SuggestionsPayload {
  prompts: string[];
}

/**
 * Payload für skill_confirm
 */
export interface ConfirmPayload {
  title: string;
  summary: Record<string, string>;
}

/**
 * Payload für skill_sidebar
 */
export interface SidebarPayload {
  action: 'updateDraft' | 'finalizeDocument';
  content: string;
}

/**
 * Payload für skill_url_crawler
 */
export interface UrlCrawlerPayload {
  url: string;
}

/**
 * Payload für skill_dna_lookup
 */
export interface DnaLookupPayload {
  companyId: string;
  docType?: 'briefing' | 'swot' | 'audience' | 'positioning' | 'goals' | 'messages' | 'synthesis' | 'all';
}

// ============================================================================
// TOOL CALL TYPES (für Frontend-Rendering)
// ============================================================================

export type SkillName =
  | 'skill_roadmap'
  | 'skill_todos'
  | 'skill_suggestions'
  | 'skill_confirm'
  | 'skill_sidebar'
  | 'skill_url_crawler'
  | 'skill_dna_lookup';

export interface ToolCall {
  name: SkillName;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export type SpecialistType =
  | 'briefing_specialist'
  | 'swot_specialist'
  | 'audience_specialist'
  | 'positioning_specialist'
  | 'goals_specialist'
  | 'messages_specialist'
  | 'project_wizard'
  | 'orchestrator';

/**
 * Marken-DNA Dokumenttypen (UI-Ebene)
 */
export type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';

/**
 * Mapping: DocumentType → SpecialistType
 * Wird verwendet um vom UI-Dokumenttyp zum richtigen Spezialisten zu kommen
 */
export const DOCUMENT_TO_SPECIALIST: Record<MarkenDNADocumentType, SpecialistType> = {
  briefing: 'briefing_specialist',
  swot: 'swot_specialist',
  audience: 'audience_specialist',
  positioning: 'positioning_specialist',
  goals: 'goals_specialist',
  messages: 'messages_specialist',
};

/**
 * Helper-Funktion um den Spezialisten für einen Dokumenttyp zu bekommen
 */
export function getSpecialistForDocument(documentType: MarkenDNADocumentType): SpecialistType {
  return DOCUMENT_TO_SPECIALIST[documentType];
}

/**
 * Skill-Berechtigungen pro Agent
 */
export const AGENT_SKILLS: Record<SpecialistType, SkillName[]> = {
  orchestrator: ['skill_dna_lookup', 'skill_roadmap', 'skill_suggestions'],
  briefing_specialist: ['skill_url_crawler', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  swot_specialist: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  audience_specialist: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  positioning_specialist: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  goals_specialist: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  messages_specialist: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
  project_wizard: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar', 'skill_suggestions'],
};

// ============================================================================
// ZOD SCHEMAS (für Genkit Tools)
// ============================================================================

export const TodoItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['open', 'partial', 'done']),
  value: z.string().optional(),
});

export const RoadmapInputSchema = z.object({
  action: z.enum(['showRoadmap', 'completePhase']),
  phases: z.array(z.string()).optional(),
  currentPhaseIndex: z.number().optional(),
  phaseIndex: z.number().optional(),
});

export const TodosInputSchema = z.object({
  items: z.array(TodoItemSchema),
});

export const SuggestionsInputSchema = z.object({
  prompts: z.array(z.string()),
});

export const ConfirmInputSchema = z.object({
  title: z.string(),
  summary: z.record(z.string()),
});

export const SidebarInputSchema = z.object({
  action: z.enum(['updateDraft', 'finalizeDocument']),
  content: z.string(),
});

export const UrlCrawlerInputSchema = z.object({
  url: z.string().url(),
});

export const DnaLookupInputSchema = z.object({
  companyId: z.string(),
  docType: z.enum(['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages', 'synthesis', 'all']).optional(),
});

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface AgenticChatInput {
  specialistType: SpecialistType;
  companyId: string;
  companyName: string;
  language: 'de' | 'en';
  messages: ChatMessage[];
  documentType?: string; // Für Spezialisten
}

export interface AgenticChatOutput {
  response: string;
  toolCalls: ToolCall[];
  nextAgent?: SpecialistType; // Für Handoff
}
