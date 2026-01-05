// src/lib/ai/agentic/test-data/datasets/project-wizard.dataset.ts
// Test-Dataset für den Projekt-Wizard (Kernbotschaft)

import type { AgenticTestScenario } from '../agentic-test-types';

/**
 * Project Wizard Test-Szenario
 *
 * Der Projekt-Wizard erstellt Projekt-Kernbotschaften basierend auf der DNA.
 * Er wird typischerweise im Strategie-Tab verwendet.
 *
 * Verfügbare Skills:
 * - skill_dna_lookup: DNA-Kontext laden (Synthese)
 * - skill_roadmap: Phasen anzeigen
 * - skill_todos: Checkliste aktualisieren
 * - skill_confirm: Bestätigung anfragen
 * - skill_sidebar: Dokument erstellen/aktualisieren
 * - skill_suggestions: Quick-Replies anbieten
 */
export const projectWizardScenario: AgenticTestScenario = {
  id: 'project_wizard_full_flow',
  description: 'Projekt-Kernbotschaft für Produkt-Launch erstellen',
  specialistType: 'project_wizard',

  company: {
    id: 'test-company-techstart',
    name: 'TechStart GmbH',
  },

  language: 'de',

  turns: [
    // Turn 1: Start mit Projektbeschreibung
    {
      userMessage: 'Ich brauche eine Kernbotschaft für unseren neuen Produkt-Launch. Wir launchen "ProjectFlow 2.0" mit komplett überarbeiteter KI.',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 100,
      },
    },

    // Turn 2: Projektziel erklären
    {
      userMessage: 'Das Ziel ist, bestehende Kunden zum Upgrade zu bewegen und neue Enterprise-Kunden zu gewinnen. Der Launch ist in 6 Wochen.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 100,
      },
    },

    // Turn 3: Neue Features
    {
      userMessage: 'Die Hauptfeatures von 2.0 sind: 1) Predictive Analytics für Projektrisiken, 2) Automatische Meeting-Zusammenfassungen, 3) Multi-Projekt Dashboard, 4) Slack & Teams Integration.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 100,
      },
    },

    // Turn 4: Tonalität und Zielgruppe
    {
      userMessage: 'Die Tonalität soll innovativ aber vertrauenswürdig sein. Hauptzielgruppe für den Launch sind CTOs und IT-Leiter im DACH-Raum.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 100,
      },
    },

    // Turn 5: Kernbotschaft entwickeln
    {
      userMessage: 'Entwickle jetzt die Projekt-Kernbotschaft für den Launch. Sie soll die Innovation betonen aber auch Kontinuität zeigen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 150,
      },
    },

    // Turn 6: Auswahl und Finalisierung
    {
      userMessage: 'Die erste Variante gefällt mir am besten. Finalisiere die Kernbotschaft.',
      expectedTools: ['skill_sidebar', 'skill_confirm'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
        minLength: 100,
      },
    },

    // Turn 7: Bestätigung
    {
      userMessage: 'Ja, genau so. Fertigstellen bitte.',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 9,
    requiredTools: [
      'skill_dna_lookup',
      'skill_roadmap',
      'skill_todos',
      'skill_sidebar',
    ],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

export const projectWizardDatasets = [projectWizardScenario];
