// src/lib/ai/agentic/test-data/datasets/positioning-specialist.dataset.ts
// Test-Szenarien für den Positionierungs-Spezialisten
import type { AgenticTestScenario } from '../agentic-test-types';

// =============================================================================
// SZENARIO 1: Worthülsen → ADVOCATUS DIABOLI Test
// User gibt nur vage Aussagen, AI muss nachfragen
// =============================================================================
export const scenario1_worthuelsen_positioning: AgenticTestScenario = {
  id: 'positioning_worthuelsen_test',
  description: 'Agentur: User gibt nur Worthülsen wie "innovativ", AI muss konkretisieren',
  specialistType: 'positioning_specialist',
  company: { id: 'test-agentur-positioning', name: 'Kreativ Agentur Berlin' },
  language: 'de',
  turns: [
    // Turn 1: Start - AI muss proaktiv starten
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Guten Tag'],
        mustContain: ['Alleinstellung'],
      },
    },
    // Turn 2: Worthülse "innovativ" → AI fragt nach
    {
      userMessage: 'Wir sind innovativ und kreativ',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
        mustNotContain: ['done', 'abgeschlossen'],
      },
    },
    // Turn 3: Konkrete Antwort → AI akzeptiert
    {
      userMessage: 'Einzige Agentur in Berlin mit eigenem KI-Design-Tool, 15 Jahre Erfahrung in Luxusmarken',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Soll-Image
    {
      userMessage: 'Soll-Image: Premium-Partner für anspruchsvolle Marken, nicht billig sondern wertvoll',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Rolle + Tonalität
    {
      userMessage: 'Rolle: Kreativer Sparringspartner. Tonalität: mutig, präzise, inspirierend',
      expectedTools: ['skill_confirm'],
    },
    // Turn 6: Bestätigung
    {
      userMessage: 'Ja, perfekt!',
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
export const scenario2_praezise_positioning: AgenticTestScenario = {
  id: 'positioning_praezise_test',
  description: 'Tech-Startup: User liefert präzise Positionierung, glatter Durchlauf',
  specialistType: 'positioning_specialist',
  company: { id: 'test-tech-positioning', name: 'DataFlow AI' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Alleinstellung komplett
    {
      userMessage: 'USP: Einzige No-Code KI-Plattform die DSGVO-konform in deutschen Rechenzentren läuft. Differenzierung durch lokale Datenhaltung und deutsche Sprach-KI.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 3: Soll-Image
    {
      userMessage: 'Soll-Image: Der sichere deutsche KI-Partner. Kernwerte: Datenschutz, Innovation, Verlässlichkeit',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 4: Rolle + Tonalität
    {
      userMessage: 'Rolle: Technologie-Enabler der KI demokratisiert. Tonalität: kompetent, vertrauenswürdig, zukunftsweisend',
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
// User springt zwischen Bereichen, AI muss Struktur geben
// =============================================================================
export const scenario3_chaotisch_positioning: AgenticTestScenario = {
  id: 'positioning_chaotisch_test',
  description: 'Mittelstand: User antwortet chaotisch, AI muss strukturieren',
  specialistType: 'positioning_specialist',
  company: { id: 'test-mittelstand-positioning', name: 'Müller Maschinenbau' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Starte den Chat',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: User springt wild zwischen Themen
    {
      userMessage: 'Also wir sind Qualitätsführer aber auch preiswert, und der Chef soll als Experte wahrgenommen werden, achso und wir sind familiär',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI sollte nachfragen um zu strukturieren
      },
    },
    // Turn 3: User wird strukturierter
    {
      userMessage: 'Ok, Alleinstellung: 50 Jahre Erfahrung, eigene Patente, Fertigung komplett in Deutschland',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Soll-Image
    {
      userMessage: 'Soll-Image: Solider deutscher Mittelständler, dem man vertraut',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Rolle + Tonalität + Abschluss
    {
      userMessage: 'Rolle ist Problemlöser, Tonalität bodenständig, kompetent, verbindlich. Fertig!',
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
// User will nach zwei Bereichen schon aufhören
// =============================================================================
export const scenario4_abbrecher_positioning: AgenticTestScenario = {
  id: 'positioning_abbrecher_test',
  description: 'Handwerk: User bricht nach USP ab, AI respektiert das',
  specialistType: 'positioning_specialist',
  company: { id: 'test-handwerk-positioning', name: 'Elektro Schulz' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Nur USP
    {
      userMessage: 'USP: Schnellster Notdienst in der Region, 24/7 erreichbar, in 30 Minuten vor Ort',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: User will aufhören
    {
      userMessage: 'Fertig! Das mit dem Image und Tonalität brauche ich nicht, wir sind ein einfacher Handwerksbetrieb.',
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
export const scenario5_dna_basiert_positioning: AgenticTestScenario = {
  id: 'positioning_dna_basiert_test',
  description: 'B2B: AI soll DNA-Kontext laden und für Positionierung nutzen',
  specialistType: 'positioning_specialist',
  company: { id: 'test-b2b-positioning', name: 'LogiSoft Solutions' },
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
    // Turn 2: User referenziert SWOT
    {
      userMessage: 'Basierend auf der SWOT: USP ist unsere Schnittstellen-Expertise, wir verbinden Altsysteme mit modernen Cloud-Lösungen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Image aus Stärken ableiten
    {
      userMessage: 'Soll-Image: Der Brückenbauer zwischen Legacy und Cloud. Kernwerte: Zuverlässigkeit, Expertise, Pragmatismus',
      expectedTools: ['skill_todos', 'skill_sidebar'],
    },
    // Turn 4: Rolle + Tonalität + Fertig
    {
      userMessage: 'Rolle: Technischer Berater auf Augenhöhe. Tonalität: sachlich, lösungsorientiert, partnerschaftlich. Fertig.',
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
export const positioningSpecialistDatasets = [
  scenario1_worthuelsen_positioning,
  scenario2_praezise_positioning,
  scenario3_chaotisch_positioning,
  scenario4_abbrecher_positioning,
  scenario5_dna_basiert_positioning,
];
