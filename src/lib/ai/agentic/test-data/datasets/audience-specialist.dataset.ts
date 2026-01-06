// src/lib/ai/agentic/test-data/datasets/audience-specialist.dataset.ts
// Test-Szenarien für den Zielgruppen-Spezialisten
import type { AgenticTestScenario } from '../agentic-test-types';

// =============================================================================
// SZENARIO 1: Worthülsen → ADVOCATUS DIABOLI Test
// User gibt nur vage Antworten, AI muss nachfragen
// =============================================================================
export const scenario1_worthuelsen_audience: AgenticTestScenario = {
  id: 'audience_worthuelsen_test',
  description: 'E-Commerce: User gibt nur Worthülsen, AI muss nachfragen und konkretisieren',
  specialistType: 'audience_specialist',
  company: { id: 'test-ecommerce-audience', name: 'Modehaus Müller' },
  language: 'de',
  turns: [
    // Turn 1: Start - AI muss proaktiv starten
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Guten Tag'],
        mustContain: ['Empfänger'],
      },
    },
    // Turn 2: Worthülse "junge Frauen" → AI fragt nach
    {
      userMessage: 'Unsere Zielgruppe sind junge Frauen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
        mustNotContain: ['done', 'abgeschlossen'],
      },
    },
    // Turn 3: Konkrete Antwort → AI akzeptiert und geht weiter
    {
      userMessage: 'Frauen 18-30, modebewusst, Instagram-affin, urban, Einkommen 30-50k',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Mittler-Segment
    {
      userMessage: 'Modeblogger auf Instagram, Lifestyle-Magazine wie InStyle',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['[DOCUMENT]', '[PROGRESS]'],
      },
    },
    // Turn 5: Abschluss
    {
      userMessage: 'Absender ist unsere Gründerin. Das reicht erstmal.',
      expectedTools: ['skill_confirm'],
    },
    // Turn 6: Bestätigung
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 18,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm', 'skill_suggestions'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 2: Präzise Antworten → Sauberer Durchlauf
// User liefert direkt alle Infos
// =============================================================================
export const scenario2_praezise_audience: AgenticTestScenario = {
  id: 'audience_praezise_test',
  description: 'SaaS B2B: User liefert präzise Zielgruppen-Daten, glatter Durchlauf',
  specialistType: 'audience_specialist',
  company: { id: 'test-saas-audience', name: 'CloudFlow Solutions' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Alle Empfänger-Infos auf einmal
    {
      userMessage: 'Primäre Zielgruppe: IT-Leiter in mittelständischen Unternehmen, 35-50 Jahre, technikaffin, Budget 50-200k pro Jahr, Pain Point ist Legacy-Integration',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 3: Mittler komplett
    {
      userMessage: 'Mittler: Tech-Journalisten von Computerwoche, Heise, CIO-Magazin. LinkedIn-Influencer im IT-Bereich.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Absender
    {
      userMessage: 'Absender: CTO als technischer Thought Leader, CEO für strategische Themen',
      expectedTools: ['skill_confirm'],
    },
    // Turn 5: Bestätigung
    {
      userMessage: 'Perfekt, finalisieren.',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 15,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 3: Chaotischer User
// User springt zwischen Segmenten, AI muss Struktur geben
// =============================================================================
export const scenario3_chaotisch_audience: AgenticTestScenario = {
  id: 'audience_chaotisch_test',
  description: 'Startup: User antwortet chaotisch, AI muss strukturieren',
  specialistType: 'audience_specialist',
  company: { id: 'test-startup-audience', name: 'GreenTech Innovations' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Starte den Chat',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: User springt wild zwischen Themen
    {
      userMessage: 'Also wir wollen Nachhaltigkeits-Influencer ansprechen, aber eigentlich geht es um B2B-Kunden in der Industrie, ach ja und unser CEO soll das Gesicht sein',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI sollte nachfragen um zu strukturieren
      },
    },
    // Turn 3: User wird etwas strukturierter
    {
      userMessage: 'Ok, Empfänger: Einkäufer in produzierenden Unternehmen, 40-55, Fokus auf Nachhaltigkeit',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Mittler
    {
      userMessage: 'Mittler: Nachhaltigkeits-Magazine wie enorm, plus LinkedIn-Thought-Leader',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Absender + Abschluss
    {
      userMessage: 'CEO als Sprecher, fertig!',
      expectedTools: ['skill_confirm'],
    },
    // Turn 6: Bestätigung
    {
      userMessage: 'Ja, speichern',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 16,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 4: Früher Abbrecher
// User will nach einem Segment schon aufhören
// =============================================================================
export const scenario4_abbrecher_audience: AgenticTestScenario = {
  id: 'audience_abbrecher_test',
  description: 'Handwerk: User bricht nach erstem Segment ab, AI respektiert das',
  specialistType: 'audience_specialist',
  company: { id: 'test-handwerk-audience', name: 'Dachdeckerei Schmidt' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Ein Segment
    {
      userMessage: 'Hausbesitzer 45-65, Eigenheim, mittleres bis hohes Einkommen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: User will aufhören - EXPLIZIT formuliert
    {
      userMessage: 'Fertig! Ich möchte jetzt abschließen, keine weiteren Segmente.',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['müssen', 'sollten noch', 'unbedingt'],
      },
    },
    // Turn 4: Bestätigung
    {
      userMessage: 'Ja, genau so finalisieren',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 10,
    requiredTools: ['skill_dna_lookup', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 5: DNA-basiert
// AI nutzt skill_dna_lookup und baut auf Briefing/SWOT auf
// =============================================================================
export const scenario5_dna_basiert_audience: AgenticTestScenario = {
  id: 'audience_dna_basiert_test',
  description: 'Industrie: AI soll DNA-Kontext laden und nutzen',
  specialistType: 'audience_specialist',
  company: { id: 'test-industrie-audience', name: 'Maschinenbau Weber AG' },
  language: 'de',
  turns: [
    // Turn 1: Start - DNA-Lookup ist kritisch
    {
      userMessage: 'Beginne',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo'],
      },
    },
    // Turn 2: User referenziert Briefing
    {
      userMessage: 'Basierend auf unserem Briefing: Maschinenbau-Ingenieure in DACH',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Mittler mit Fachbezug
    {
      userMessage: 'Mittler: Fachzeitschriften wie MM Maschinenmarkt, Konstruktion, plus Messe-Journalisten',
      expectedTools: ['skill_todos', 'skill_sidebar'],
    },
    // Turn 4: Absender + Fertig
    {
      userMessage: 'Absender ist der Vertriebsleiter. Fertig.',
      expectedTools: ['skill_confirm'],
    },
    // Turn 5: Bestätigung
    {
      userMessage: 'Ja, abschließen',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 14,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// EXPORT
// =============================================================================
export const audienceSpecialistDatasets = [
  scenario1_worthuelsen_audience,
  scenario2_praezise_audience,
  scenario3_chaotisch_audience,
  scenario4_abbrecher_audience,
  scenario5_dna_basiert_audience,
];
