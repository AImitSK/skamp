// src/lib/ai/agentic/test-data/datasets/goals-specialist.dataset.ts
// Test-Szenarien für den Ziele-Spezialisten (Kommunikationsziele: Kopf-Herz-Hand)
import type { AgenticTestScenario } from '../agentic-test-types';

// =============================================================================
// SZENARIO 1: Worthülsen → ADVOCATUS DIABOLI Test
// User gibt nur vage Ziele, AI muss nachfragen
// =============================================================================
export const scenario1_worthuelsen_goals: AgenticTestScenario = {
  id: 'goals_worthuelsen_test',
  description: 'SaaS-Startup: User gibt nur Worthülsen wie "mehr Bekanntheit", AI muss konkretisieren',
  specialistType: 'goals_specialist',
  company: { id: 'test-saas-goals', name: 'CloudMetrics Pro' },
  language: 'de',
  turns: [
    // Turn 1: Start - AI muss proaktiv starten
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Guten Tag'],
        mustContain: ['Kopf'],
      },
    },
    // Turn 2: Worthülse "mehr Bekanntheit" → AI fragt nach
    {
      userMessage: 'Wir wollen mehr Bekanntheit',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
        mustNotContain: ['done', 'abgeschlossen'],
      },
    },
    // Turn 3: Konkrete SMART-Antwort → AI akzeptiert
    {
      userMessage: '80% der deutschen IT-Leiter sollen uns bis Q3 2025 als DSGVO-konforme Alternative kennen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Herz-Ebene - wieder vage
    {
      userMessage: 'Vertrauen aufbauen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
      },
    },
    // Turn 5: Konkret für Herz
    {
      userMessage: 'NPS von mindestens 8 bei Bestandskunden, gemessen durch quartalsweise Umfrage',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 6: Hand-Ebene konkret
    {
      userMessage: 'Hand: 30% mehr Demo-Anfragen pro Monat, 15% Conversion zu zahlenden Kunden bis Ende Q4',
      expectedTools: ['skill_confirm'],
    },
    // Turn 7: Bestätigung
    {
      userMessage: 'Ja, perfekt!',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 20,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm', 'skill_suggestions'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 2: Präzise Antworten → Sauberer Durchlauf
// User liefert direkt SMART-Ziele
// =============================================================================
export const scenario2_praezise_goals: AgenticTestScenario = {
  id: 'goals_praezise_test',
  description: 'E-Commerce: User liefert präzise SMART-Ziele, glatter Durchlauf',
  specialistType: 'goals_specialist',
  company: { id: 'test-ecommerce-goals', name: 'FashionDirect' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Kopf-Ziel komplett
    {
      userMessage: 'Kopf: 60% der Zielgruppe (Frauen 25-40, modebewusst) kennen unsere nachhaltige Kollektion bis Juni. Messung über Brand Awareness Survey.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 3: Herz-Ziel komplett
    {
      userMessage: 'Herz: Wahrnehmung als "ehrlich nachhaltig", nicht Greenwashing. Indikator: Sentiment-Analyse Social Media zeigt 70% positive Mentions. Umfrage-Wert "vertrauenswürdig" > 8/10.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Hand-Ziel komplett
    {
      userMessage: 'Hand: 25% mehr Newsletter-Anmeldungen in Q2, 40% Wiederkaufrate bei Nachhaltigkeits-Kollektion, 5000 Social Shares für Launch-Kampagne.',
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
// User springt zwischen Kopf/Herz/Hand, AI muss Struktur geben
// =============================================================================
export const scenario3_chaotisch_goals: AgenticTestScenario = {
  id: 'goals_chaotisch_test',
  description: 'Agentur: User antwortet chaotisch und springt zwischen Ebenen, AI muss strukturieren',
  specialistType: 'goals_specialist',
  company: { id: 'test-agentur-goals', name: 'Kreativ Kollektiv' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Starte den Chat',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: User springt wild zwischen Ebenen
    {
      userMessage: 'Also wir wollen mehr Kunden gewinnen, aber auch bekannter werden, und die Leute sollen uns als Premium-Agentur sehen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI sollte nachfragen um zu strukturieren
      },
    },
    // Turn 3: User wird strukturierter für Kopf
    {
      userMessage: 'Ok, Kopf: 50% der Marketing-Entscheider in Hamburg sollen uns kennen, bis Jahresende',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Herz-Ebene
    {
      userMessage: 'Herz: Als innovative aber zuverlässige Agentur wahrgenommen werden. Kundenzufriedenheit mindestens 4.5 von 5 Sternen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Hand-Ebene + Fertig
    {
      userMessage: 'Hand: 10 neue Pitches pro Quartal, 3 Neukunden pro Monat. Fertig!',
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
// User will nach einer Ebene schon aufhören
// =============================================================================
export const scenario4_abbrecher_goals: AgenticTestScenario = {
  id: 'goals_abbrecher_test',
  description: 'Handwerk: User bricht nach Kopf-Ebene ab, AI respektiert das',
  specialistType: 'goals_specialist',
  company: { id: 'test-handwerk-goals', name: 'Sanitär Meister GmbH' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Nur Kopf-Ziel
    {
      userMessage: 'Kopf: Alle Haushalte im Umkreis von 20km sollen wissen, dass wir 24/7 Notdienst haben. Messung: Anrufer-Befragung "woher kennen Sie uns?"',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: User will aufhören
    {
      userMessage: 'Fertig! Die ganzen Herz-Hand-Sachen brauchen wir als kleiner Handwerksbetrieb nicht.',
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
export const scenario5_dna_basiert_goals: AgenticTestScenario = {
  id: 'goals_dna_basiert_test',
  description: 'B2B: AI soll DNA-Kontext laden und für Ziel-Definition nutzen',
  specialistType: 'goals_specialist',
  company: { id: 'test-b2b-goals', name: 'IndustrieConnect AG' },
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
    // Turn 2: User referenziert Briefing/Stärken
    {
      userMessage: 'Basierend auf unserer Stärke bei Industrie 4.0: Kopf-Ziel ist 70% der Fertigungsleiter in DACH kennen unsere Plattform bis Q2.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Herz aus Positionierung ableiten
    {
      userMessage: 'Herz: Als "der zuverlässige Digitalisierer" wahrgenommen werden. Messung: Branchen-Award "Industrie 4.0 Partner des Jahres" gewinnen.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
    },
    // Turn 4: Hand + Fertig
    {
      userMessage: 'Hand: 50 qualifizierte Leads pro Monat, 5 Pilotprojekte bis Jahresende, Umsatzsteigerung 30%. Fertig.',
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
export const goalsSpecialistDatasets = [
  scenario1_worthuelsen_goals,
  scenario2_praezise_goals,
  scenario3_chaotisch_goals,
  scenario4_abbrecher_goals,
  scenario5_dna_basiert_goals,
];
