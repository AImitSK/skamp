// src/lib/ai/agentic/test-data/datasets/swot-specialist.dataset.ts
// Test-Dataset für den SWOT-Spezialisten

import type { AgenticTestScenario } from '../agentic-test-types';

/**
 * SWOT Specialist - Vollständiger Test
 * Prüft: Proaktiver Start, Tool-Usage, Fertig respektieren, finalizeDocument
 */
export const swotSpecialistClearEnding: AgenticTestScenario = {
  id: 'swot_specialist_clear_ending',
  description: 'Vollständiger Test: SWOT-Analyse mit klarem Ende',
  specialistType: 'swot_specialist',

  company: {
    id: 'test-company-swot',
    name: 'SwotTest GmbH',
  },

  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 2: Stärken + Schwächen
    {
      userMessage: 'Stärken: Innovative Technologie, starkes Team. Schwächen: Geringe Markenbekanntheit, kleines Budget.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 3: Chancen + Risiken + Fertig
    {
      userMessage: 'Chancen: Wachsender Markt, Remote-Work Trend. Risiken: Starke Konkurrenz, Fachkräftemangel. Fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 4: Bestätigung
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 6,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

/**
 * SWOT Specialist - Korrektur-Test
 * Prüft: Agent verarbeitet Korrekturen korrekt
 */
export const swotSpecialistCorrection: AgenticTestScenario = {
  id: 'swot_specialist_correction',
  description: 'Robustheits-Test: User korrigiert Eingabe',
  specialistType: 'swot_specialist',

  company: {
    id: 'test-company-swot-correction',
    name: 'SwotCorrect AG',
  },

  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', '[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 2: Erste Eingabe
    {
      userMessage: 'Stärken: Guter Kundenservice. Schwächen: Hohe Kosten.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 3: KORREKTUR
    {
      userMessage: 'Moment, ich hab was vergessen - bei Stärken noch: Patentierte Technologie. Und Schwächen war falsch, wir haben eigentlich niedrige Kosten!',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 4: Rest + Fertig
    {
      userMessage: 'Chancen: Neue Märkte. Risiken: Regulierung. Jetzt fertig!',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 5: Bestätigung
    {
      userMessage: 'Ja!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 8,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_confirm', 'skill_sidebar'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// Export alle Szenarien
export const swotSpecialistDatasets = [
  swotSpecialistClearEnding,
  swotSpecialistCorrection,
];
