// src/lib/ai/agentic/skills/index.ts
// Zentrale Skill-Registry für alle Agentic Tools

export { skillRoadmap } from './skill-roadmap';
export { skillTodos } from './skill-todos';
export { skillSuggestions } from './skill-suggestions';
export { skillConfirm } from './skill-confirm';
export { skillSidebar } from './skill-sidebar';
export { skillUrlCrawler } from './skill-url-crawler';
export { skillDnaLookup } from './skill-dna-lookup';
export { skillSaveFaktenMatrix, WIZARD_FAKTEN_MATRIX_INSTRUCTION } from './skill-fakten-matrix';

// Alle Skills als Array für Flow-Registration
import { skillRoadmap } from './skill-roadmap';
import { skillTodos } from './skill-todos';
import { skillSuggestions } from './skill-suggestions';
import { skillConfirm } from './skill-confirm';
import { skillSidebar } from './skill-sidebar';
import { skillUrlCrawler } from './skill-url-crawler';
import { skillDnaLookup } from './skill-dna-lookup';
import { skillSaveFaktenMatrix } from './skill-fakten-matrix';

export const ALL_SKILLS = [
  skillRoadmap,
  skillTodos,
  skillSuggestions,
  skillConfirm,
  skillSidebar,
  skillUrlCrawler,
  skillDnaLookup,
  skillSaveFaktenMatrix,
];

// Skills nach Typ filtern (für Agent-spezifische Tool-Sets)
import { AGENT_SKILLS, type SpecialistType, type SkillName } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const skillMap: Record<SkillName, any> = {
  skill_roadmap: skillRoadmap,
  skill_todos: skillTodos,
  skill_suggestions: skillSuggestions,
  skill_confirm: skillConfirm,
  skill_sidebar: skillSidebar,
  skill_url_crawler: skillUrlCrawler,
  skill_dna_lookup: skillDnaLookup,
  skill_save_fakten_matrix: skillSaveFaktenMatrix,
};

export function getSkillsForAgent(agentType: SpecialistType) {
  const allowedSkillNames = AGENT_SKILLS[agentType];
  return allowedSkillNames.map(name => skillMap[name]);
}
