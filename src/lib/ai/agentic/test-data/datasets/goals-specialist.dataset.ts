// src/lib/ai/agentic/test-data/datasets/goals-specialist.dataset.ts
import type { AgenticTestScenario } from '../agentic-test-types';

export const goalsSpecialistClearEnding: AgenticTestScenario = {
  id: 'goals_specialist_clear_ending',
  description: 'Vollständiger Test: Kommunikationsziele mit klarem Ende',
  specialistType: 'goals_specialist',
  company: { id: 'test-goals', name: 'GoalsTest GmbH' },
  language: 'de',
  turns: [
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: { mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Kopf: 80% sollen uns als KI-Experten kennen. Herz: Vertrauen aufbauen.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Hand: 20% mehr Demo-Anfragen in Q2. Fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Perfekt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: { mustContain: ['erstellt'], mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
  ],
  expectations: {
    minTotalToolCalls: 6,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

export const goalsSpecialistDatasets = [goalsSpecialistClearEnding];
