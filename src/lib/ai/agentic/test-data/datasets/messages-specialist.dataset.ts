// src/lib/ai/agentic/test-data/datasets/messages-specialist.dataset.ts
// Test-Szenarien für den Botschaften-Spezialisten (Claim-Proof-Benefit)
import type { AgenticTestScenario } from '../agentic-test-types';

// =============================================================================
// SZENARIO 1: Worthülsen → ADVOCATUS DIABOLI Test
// User gibt nur vage Botschaften, AI muss nachfragen
// =============================================================================
export const scenario1_worthuelsen_messages: AgenticTestScenario = {
  id: 'messages_worthuelsen_test',
  description: 'Tech-Startup: User gibt nur Worthülsen wie "Wir sind innovativ", AI muss konkretisieren',
  specialistType: 'messages_specialist',
  company: { id: 'test-tech-messages', name: 'InnovateTech Solutions' },
  language: 'de',
  turns: [
    // Turn 1: Start - AI muss proaktiv starten
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Guten Tag'],
        mustContain: ['Kernbotschaft'],
      },
    },
    // Turn 2: Worthülse "innovativ" → AI fragt nach
    {
      userMessage: 'Wir sind innovativ und die Besten am Markt',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
        mustNotContain: ['done', 'abgeschlossen'],
      },
    },
    // Turn 3: Konkrete Botschaft → AI akzeptiert
    {
      userMessage: 'Claim: Einzige No-Code KI-Plattform mit DSGVO-Hosting in Deutschland. Proof: TÜV-zertifiziert, Rechenzentrum Frankfurt. Benefit: Rechtssicherheit ohne IT-Aufwand.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Zweite Botschaft
    {
      userMessage: 'Zweite Botschaft: Claim: Setup in 5 Minuten. Proof: Durchschnittliche Onboarding-Zeit 4:32 Min bei 500+ Kunden. Benefit: Sofort produktiv ohne Schulung.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Dritte Botschaft + Fertig
    {
      userMessage: 'Dritte: ROI in 30 Tagen garantiert. Proof: Geld-zurück-Garantie, 98% erreichen ROI in 3 Wochen. Benefit: Risikofrei testen. Fertig!',
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
// User liefert direkt Claim-Proof-Benefit
// =============================================================================
export const scenario2_praezise_messages: AgenticTestScenario = {
  id: 'messages_praezise_test',
  description: 'E-Commerce: User liefert präzise Botschaften mit Claim-Proof-Benefit, glatter Durchlauf',
  specialistType: 'messages_specialist',
  company: { id: 'test-ecommerce-messages', name: 'GreenStyle Fashion' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Erste Botschaft komplett
    {
      userMessage: 'Botschaft 1 - Claim: 100% nachhaltige Mode ohne Kompromisse beim Style. Proof: GOTS-zertifiziert, CO2-neutraler Versand, Recycling-Programm. Benefit: Gutes Gewissen beim Shoppen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 3: Zweite Botschaft komplett
    {
      userMessage: 'Botschaft 2 - Claim: Faire Preise durch Direktvertrieb. Proof: Keine Zwischenhändler, Fabrik-Audits veröffentlicht. Benefit: Premium-Qualität zum fairen Preis.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 4: Dritte Botschaft + Abschluss
    {
      userMessage: 'Botschaft 3 - Claim: Zeitlose Designs statt Fast Fashion. Proof: Kollektion bleibt 2 Jahre im Sortiment. Benefit: Weniger kaufen, länger tragen, mehr sparen.',
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
// User springt zwischen Claim/Proof/Benefit, AI muss Struktur geben
// =============================================================================
export const scenario3_chaotisch_messages: AgenticTestScenario = {
  id: 'messages_chaotisch_test',
  description: 'Mittelstand: User antwortet chaotisch, AI muss strukturieren',
  specialistType: 'messages_specialist',
  company: { id: 'test-mittelstand-messages', name: 'Müller Metallbau' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Starte den Chat',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: User mischt alles durcheinander
    {
      userMessage: 'Also wir sind Familienunternehmen in dritter Generation, haben ISO-Zertifikat, und die Kunden können sich auf uns verlassen, und wir liefern schnell',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI sollte nachfragen um zu strukturieren
      },
    },
    // Turn 3: User wird strukturierter
    {
      userMessage: 'Ok, Botschaft 1: Claim ist "Tradition trifft Innovation". Proof: 75 Jahre Erfahrung + modernste CNC-Technik. Benefit: Handwerksqualität mit Präzision.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Zweite Botschaft
    {
      userMessage: 'Botschaft 2: Zuverlässige Lieferung in 5 Werktagen. Proof: 99,2% pünktliche Lieferungen letztes Jahr. Benefit: Planungssicherheit für Ihre Projekte.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Dritte Botschaft + Fertig
    {
      userMessage: 'Noch eine: Persönlicher Ansprechpartner von Anfrage bis Montage. Proof: Fester Projektleiter, Handy-Nummer. Benefit: Keine Warteschleifen, direkte Kommunikation. Fertig!',
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
// User will nach einer Botschaft schon aufhören
// =============================================================================
export const scenario4_abbrecher_messages: AgenticTestScenario = {
  id: 'messages_abbrecher_test',
  description: 'Handwerk: User bricht nach erster Botschaft ab, AI respektiert das',
  specialistType: 'messages_specialist',
  company: { id: 'test-handwerk-messages', name: 'Elektro Schmidt' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Eine Botschaft
    {
      userMessage: 'Unsere Kernbotschaft: Schnellster Notdienst der Region. Proof: Durchschnittlich 28 Minuten Anfahrtszeit, 24/7 erreichbar. Benefit: Kein langes Warten im Dunkeln.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: User will aufhören
    {
      userMessage: 'Fertig! Mehr Botschaften brauchen wir als kleiner Betrieb nicht.',
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
// AI nutzt skill_dna_lookup und baut auf Positionierung/Zielgruppen auf
// =============================================================================
export const scenario5_dna_basiert_messages: AgenticTestScenario = {
  id: 'messages_dna_basiert_test',
  description: 'B2B-Software: AI soll DNA-Kontext laden und für Botschaften nutzen',
  specialistType: 'messages_specialist',
  company: { id: 'test-b2b-messages', name: 'DataSync Enterprise' },
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
    // Turn 2: User referenziert Positionierung
    {
      userMessage: 'Basierend auf unserer USP als Integrations-Spezialist: Botschaft 1 - Claim: Wir verbinden, was nicht zusammenpasst. Proof: 200+ Schnittstellen, SAP/Salesforce/Oracle-Partner. Benefit: Keine Datensilos mehr.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Zweite Botschaft aus Stärken
    {
      userMessage: 'Botschaft 2 - Claim: Migration ohne Ausfallzeit. Proof: Live-Migration-Technologie, 0 Downtime bei 50+ Enterprise-Projekten. Benefit: Business läuft weiter während der Umstellung.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
    },
    // Turn 4: Dritte + Fertig
    {
      userMessage: 'Botschaft 3 - Claim: Support der versteht, nicht nur antwortet. Proof: Alle Support-Mitarbeiter mit IT-Hintergrund, max. 2h Reaktionszeit. Benefit: Echte Lösungen statt Textbausteine. Fertig.',
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
export const messagesSpecialistDatasets = [
  scenario1_worthuelsen_messages,
  scenario2_praezise_messages,
  scenario3_chaotisch_messages,
  scenario4_abbrecher_messages,
  scenario5_dna_basiert_messages,
];
