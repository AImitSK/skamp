// src/lib/ai/agentic/test-data/datasets/briefing-specialist.dataset.ts
// Test-Dataset für den Briefing-Spezialisten

import type { AgenticTestScenario } from '../agentic-test-types';

/**
 * Briefing Specialist Test-Szenario (Vollständig)
 *
 * Testet den kompletten Workflow inkl. Auto-Start und klarem Ende.
 *
 * Verfügbare Skills:
 * - skill_url_crawler: Webseite analysieren
 * - skill_roadmap: Phasen anzeigen
 * - skill_todos: Checkliste aktualisieren
 * - skill_confirm: Bestätigung anfragen
 * - skill_sidebar: Dokument erstellen/aktualisieren
 * - skill_suggestions: Quick-Replies anbieten
 */
export const briefingSpecialistScenario: AgenticTestScenario = {
  id: 'briefing_specialist_full_flow',
  description: 'Kompletter Durchlauf des Briefing-Prozesses mit Auto-Start und klarem Ende',
  specialistType: 'briefing_specialist',

  company: {
    id: 'test-company-techstart',
    name: 'TechStart GmbH',
  },

  language: 'de',

  turns: [
    // Turn 1: AUTO-START - Leere/minimale Nachricht, Agent startet proaktiv
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        // KEIN "Willkommen", "Hallo" oder ähnliches
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]', 'Willkommen', 'willkommen', 'Hallo', 'hallo'],
        minLength: 50,
      },
    },

    // Turn 2: Grundlegende Firmeninfos
    {
      userMessage: 'Wir sind ein B2B SaaS-Startup im Bereich Projektmanagement. 15 Mitarbeiter, seit 2022 am Markt. Hauptprodukt heißt "ProjectFlow".',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
        minLength: 50,
      },
    },

    // Turn 3: USP und Zielgruppe
    {
      userMessage: 'Unser USP ist KI-gestützte Aufgabenpriorisierung. Zielgruppe: Mittelständische Unternehmen mit 50-500 Mitarbeitern im DACH-Raum.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
        minLength: 50,
      },
    },

    // Turn 4: Wettbewerber
    {
      userMessage: 'Hauptwettbewerber sind Asana, Monday.com und Jira. Wir differenzieren uns durch bessere KI und deutschen Datenschutz.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
        minLength: 50,
      },
    },

    // Turn 5: Abschluss anfragen - Agent sollte kurze Frage stellen, KEINE lange Zusammenfassung
    {
      userMessage: 'Das wars von meiner Seite.',
      expectedTools: ['skill_todos', 'skill_confirm'],
      responseValidation: {
        // Sollte kurze Abschluss-Frage sein, keine lange Zusammenfassung
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
        // Nicht zu lang - keine doppelte Zusammenfassung!
      },
    },

    // Turn 6: Bestätigung - Agent sollte NUR kurze Bestätigung geben
    {
      userMessage: 'Ja, fertig!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        // Sollte kurze Bestätigung enthalten
        mustContain: ['erstellt', 'Dokument'],
        // KEINE erneute Zusammenfassung
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 10,
    requiredTools: [
      'skill_roadmap',
      'skill_todos',
      'skill_sidebar',
      'skill_confirm',
      'skill_suggestions',
    ],
    shouldEndWithConfirm: false, // Confirm kommt vorher, Ende ist finalizeDocument
    shouldProduceFinalDocument: true,
  },
};

/**
 * Kurzversion des Briefing-Tests (für schnelle Smoke-Tests)
 * Testet Auto-Start und grundlegende Tool-Nutzung
 */
export const briefingSpecialistQuickScenario: AgenticTestScenario = {
  id: 'briefing_specialist_quick',
  description: 'Schneller Smoke-Test: Auto-Start und Tool-Nutzung',
  specialistType: 'briefing_specialist',

  company: {
    id: 'test-company-quicktest',
    name: 'QuickTest AG',
  },

  language: 'de',

  turns: [
    // Turn 1: Auto-Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap', 'skill_todos'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]', 'Willkommen', 'willkommen', 'Hallo', 'hallo'],
        minLength: 30,
      },
    },
    // Turn 2: Infos geben
    {
      userMessage: 'Marketingagentur, 20 Mitarbeiter. USP: datengetriebenes Marketing. Zielgruppe: E-Commerce.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 3: Abschluss
    {
      userMessage: 'Fertig, bitte abschließen.',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 5,
    requiredTools: ['skill_roadmap', 'skill_todos'],
    shouldEndWithConfirm: true,
    shouldProduceFinalDocument: false, // Quick-Test endet mit Confirm
  },
};

/**
 * Test für klares Ende ohne Dopplung
 */
export const briefingSpecialistEndingScenario: AgenticTestScenario = {
  id: 'briefing_specialist_clear_ending',
  description: 'Test für klares Ende: Kurze Bestätigung ohne doppelte Zusammenfassung',
  specialistType: 'briefing_specialist',

  company: {
    id: 'test-company-ending',
    name: 'EndTest GmbH',
  },

  language: 'de',

  turns: [
    {
      userMessage: 'Start',
      expectedTools: ['skill_roadmap'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo'],
      },
    },
    {
      userMessage: 'IT-Beratung, 50 MA, USP: Cloud-Migration, Zielgruppe: KMU',
      expectedTools: ['skill_todos'],
    },
    {
      userMessage: 'Wettbewerber: Accenture, Capgemini. Fertig!',
      expectedTools: ['skill_confirm'],
    },
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        // Kurze Bestätigung erwartet
        mustContain: ['erstellt'],
        // Response sollte KURZ sein - keine Zusammenfassung
        // Wir prüfen das über die Evaluation
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
 * Test für Korrektur-Szenario
 * User macht Fehler und korrigiert sich - Agent muss flexibel reagieren
 */
export const briefingSpecialistCorrectionScenario: AgenticTestScenario = {
  id: 'briefing_specialist_correction',
  description: 'Robustheits-Test: User korrigiert sich, Agent passt Daten an',
  specialistType: 'briefing_specialist',

  company: {
    id: 'test-company-correction',
    name: 'CorrectionTest AG',
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
    // Turn 2: Erste Infos
    {
      userMessage: 'E-Commerce Plattform, 30 MA, Zielgruppe: KMU im Einzelhandel',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 3: KORREKTUR - User ändert seine Meinung
    {
      userMessage: 'Warte, ich hab mich vertan - die Zielgruppe ist nicht KMU sondern Enterprise-Kunden mit 500+ Mitarbeitern',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
        // Wichtig: Die DATEN müssen korrekt sein (in skill_todos/sidebar), nicht der Text
      },
    },
    // Turn 4: Jetzt fertig
    {
      userMessage: 'Jetzt fertig, bitte abschließen',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 5: Bestätigung
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]', 'KMU'], // KMU sollte NICHT mehr drin sein!
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
export const briefingSpecialistDatasets = [
  briefingSpecialistScenario,
  briefingSpecialistQuickScenario,
  briefingSpecialistEndingScenario,
  briefingSpecialistCorrectionScenario,
];
