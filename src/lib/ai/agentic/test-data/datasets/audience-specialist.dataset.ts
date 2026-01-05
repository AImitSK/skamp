// src/lib/ai/agentic/test-data/datasets/audience-specialist.dataset.ts
import type { AgenticTestScenario } from '../agentic-test-types';

export const audienceSpecialistClearEnding: AgenticTestScenario = {
  id: 'audience_specialist_clear_ending',
  description: 'Vollständiger Test: Zielgruppen mit klarem Ende',
  specialistType: 'audience_specialist',
  company: { id: 'test-audience', name: 'AudienceTest GmbH' },
  language: 'de',
  turns: [
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: { mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Empfänger: Marketing-Entscheider, 35-55 Jahre. Mittler: Fachpresse, LinkedIn.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Absender: Innovativer Tech-Partner. Fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Ja, passt!',
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

export const audienceSpecialistDatasets = [audienceSpecialistClearEnding];
