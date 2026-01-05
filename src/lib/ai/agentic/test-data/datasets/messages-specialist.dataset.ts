// src/lib/ai/agentic/test-data/datasets/messages-specialist.dataset.ts
import type { AgenticTestScenario } from '../agentic-test-types';

export const messagesSpecialistClearEnding: AgenticTestScenario = {
  id: 'messages_specialist_clear_ending',
  description: 'Vollständiger Test: Kernbotschaften mit klarem Ende',
  specialistType: 'messages_specialist',
  company: { id: 'test-messages', name: 'MessagesTest GmbH' },
  language: 'de',
  turns: [
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: { mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Kernbotschaft: Wir machen KI einfach. Claim: Komplexe Technik, simple Bedienung. Proof: 5-Minuten-Setup.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Benefit: Zeit sparen, schneller starten. Fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: { mustNotContain: ['[DOCUMENT]', '[PROGRESS]'] },
    },
    {
      userMessage: 'Ja, genau so!',
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

export const messagesSpecialistDatasets = [messagesSpecialistClearEnding];
