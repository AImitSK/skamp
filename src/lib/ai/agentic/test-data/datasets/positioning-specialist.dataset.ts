// src/lib/ai/agentic/test-data/datasets/positioning-specialist.dataset.ts
import type { AgenticTestScenario } from '../agentic-test-types';

export const positioningSpecialistClearEnding: AgenticTestScenario = {
  id: 'positioning_specialist_clear_ending',
  description: 'Vollständiger Test: Positionierung mit klarem Ende',
  specialistType: 'positioning_specialist',
  company: { id: 'test-positioning', name: 'PositionTest GmbH' },
  language: 'de',
  turns: [
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: { mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Alleinstellung: Einziger Anbieter mit KI-Echtzeit-Analyse. Soll-Image: Innovationsführer.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Rolle: Smarter Berater. Tonalität: professionell, modern, nahbar. Fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Ja!',
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

export const positioningSpecialistDatasets = [positioningSpecialistClearEnding];
