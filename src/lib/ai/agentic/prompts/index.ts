// src/lib/ai/agentic/prompts/index.ts
// Barrel-Exports für Prompts

// Loader-Funktionen
export {
  loadSpecialistPrompt,
  canAgentUseSkill,
  getAvailableSpecialists,
} from './prompt-loader';

// Einzelne Prompts (für direkten Zugriff falls nötig)
export { orchestratorPrompt } from './orchestrator';
export { briefingSpecialistPrompt } from './briefing-specialist';
export { swotSpecialistPrompt } from './swot-specialist';
export { audienceSpecialistPrompt } from './audience-specialist';
export { positioningSpecialistPrompt } from './positioning-specialist';
export { goalsSpecialistPrompt } from './goals-specialist';
export { messagesSpecialistPrompt } from './messages-specialist';
export { projectWizardPrompt } from './project-wizard';
