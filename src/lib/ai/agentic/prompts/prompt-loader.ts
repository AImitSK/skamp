// src/lib/ai/agentic/prompts/prompt-loader.ts
// Lädt System-Prompts für Spezialisten-Agenten

import type { SpecialistType } from '../types';
import { AGENT_SKILLS } from '../types';

// Prompt-Imports (eine Datei pro Spezialist)
import { orchestratorPrompt } from './orchestrator';
import { briefingSpecialistPrompt } from './briefing-specialist';
import { swotSpecialistPrompt } from './swot-specialist';
import { audienceSpecialistPrompt } from './audience-specialist';
import { positioningSpecialistPrompt } from './positioning-specialist';
import { goalsSpecialistPrompt } from './goals-specialist';
import { messagesSpecialistPrompt } from './messages-specialist';
import { projectWizardPrompt } from './project-wizard';

// ============================================================================
// PROMPT REGISTRY
// ============================================================================

type PromptMap = Record<SpecialistType, { de: string; en: string }>;

const PROMPTS: PromptMap = {
  orchestrator: orchestratorPrompt,
  briefing_specialist: briefingSpecialistPrompt,
  swot_specialist: swotSpecialistPrompt,
  audience_specialist: audienceSpecialistPrompt,
  positioning_specialist: positioningSpecialistPrompt,
  goals_specialist: goalsSpecialistPrompt,
  messages_specialist: messagesSpecialistPrompt,
  project_wizard: projectWizardPrompt,
};

// ============================================================================
// PROMPT LOADER
// ============================================================================

/**
 * Lädt den System-Prompt für einen Spezialisten
 *
 * @param specialistType - Der Agent-Typ
 * @param language - Sprache (de/en)
 * @param companyName - Firmenname für Kontext
 * @returns Vollständiger System-Prompt mit Kontext
 */
export async function loadSpecialistPrompt(
  specialistType: SpecialistType,
  language: 'de' | 'en',
  companyName: string
): Promise<string> {
  const prompt = PROMPTS[specialistType];

  if (!prompt) {
    throw new Error(`Unknown specialist type: ${specialistType}`);
  }

  const basePrompt = prompt[language];

  // Kontext hinzufügen
  const contextBlock = language === 'de'
    ? `\n\nKONTEXT:\n- Unternehmen: ${companyName}\n- Sprache: Deutsch`
    : `\n\nCONTEXT:\n- Company: ${companyName}\n- Language: English`;

  return basePrompt + contextBlock;
}

/**
 * Prüft ob ein Agent einen bestimmten Skill nutzen darf
 *
 * @param agentType - Der Agent-Typ
 * @param skillName - Name des Skills
 * @returns true wenn erlaubt
 */
export function canAgentUseSkill(agentType: SpecialistType, skillName: string): boolean {
  return AGENT_SKILLS[agentType]?.includes(skillName as never) ?? false;
}

/**
 * Gibt alle verfügbaren Spezialisten-Typen zurück
 */
export function getAvailableSpecialists(): SpecialistType[] {
  return Object.keys(PROMPTS) as SpecialistType[];
}
