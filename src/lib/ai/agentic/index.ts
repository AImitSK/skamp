// src/lib/ai/agentic/index.ts
// Zentrale Exports für das Agentic Chat System

// Types
export * from './types';

// Skills
export {
  skillRoadmap,
  skillTodos,
  skillSuggestions,
  skillConfirm,
  skillSidebar,
  skillUrlCrawler,
  skillDnaLookup,
  ALL_SKILLS,
  getSkillsForAgent,
} from './skills';

// Flow
export {
  agenticChatFlow,
  type AgenticChatInput,
  type AgenticChatOutput,
} from './flows/agentic-chat-flow';

// Prompts
export { loadSpecialistPrompt, canAgentUseSkill } from './prompts/prompt-loader';
