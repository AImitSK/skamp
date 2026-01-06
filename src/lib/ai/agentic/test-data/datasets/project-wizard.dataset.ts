// src/lib/ai/agentic/test-data/datasets/project-wizard.dataset.ts
// Test-Szenarien für den Projekt-Wizard (Kernbotschaft für Pressemeldungen)
import type { AgenticTestScenario } from '../agentic-test-types';

// =============================================================================
// SZENARIO 1: Worthülsen → ADVOCATUS DIABOLI Test
// User gibt nur vage Projekt-Infos, AI muss nachfragen
// =============================================================================
export const scenario1_worthuelsen_project: AgenticTestScenario = {
  id: 'project_worthuelsen_test',
  description: 'Tech-Startup: User gibt nur Worthülsen wie "Produkt-Launch", AI muss konkretisieren',
  specialistType: 'project_wizard',
  company: { id: 'test-tech-project', name: 'InnovateTech Solutions' },
  language: 'de',
  turns: [
    // Turn 1: Start - AI muss proaktiv starten
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Guten Tag'],
        mustContain: ['Anlass'],
      },
    },
    // Turn 2: Worthülse "neues Produkt" → AI fragt nach
    {
      userMessage: 'Wir launchen bald was Neues',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
        mustNotContain: ['done', 'abgeschlossen'],
      },
    },
    // Turn 3: Konkrete Anlass-Info → AI akzeptiert
    {
      userMessage: 'Am 15. März launchen wir CloudSync 3.0 mit komplett neuer KI-Engine. 50% schnellere Datenverarbeitung.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Ziel vage
    {
      userMessage: 'Mehr Bekanntheit',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI muss nachfragen
      },
    },
    // Turn 5: Ziel konkret
    {
      userMessage: 'Ziel: 500 neue Trial-Anmeldungen in den ersten 2 Wochen. Zielgruppe: IT-Leiter in DACH-Unternehmen mit 100+ Mitarbeitern.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 6: Kernbotschaft erarbeiten
    {
      userMessage: 'Die Kernbotschaft soll betonen: Datenverarbeitung wird zum Wettbewerbsvorteil. Proof: 50% schneller, TÜV-zertifiziert. Benefit: Entscheidungen in Echtzeit.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 7: Material + Fertig
    {
      userMessage: 'Material: PM, CEO-Zitat, Produktbilder, Factsheet. Fertig!',
      expectedTools: ['skill_confirm'],
    },
    // Turn 8: Bestätigung
    {
      userMessage: 'Ja, perfekt!',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 22,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm', 'skill_suggestions'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 2: Präzise Antworten → Sauberer Durchlauf
// User liefert direkt alle Infos strukturiert
// =============================================================================
export const scenario2_praezise_project: AgenticTestScenario = {
  id: 'project_praezise_test',
  description: 'E-Commerce: User liefert präzise Projekt-Infos, glatter Durchlauf',
  specialistType: 'project_wizard',
  company: { id: 'test-ecommerce-project', name: 'GreenStyle Fashion' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Anlass komplett
    {
      userMessage: 'Anlass: Launch unserer ersten 100% recycelten Kollektion am 22. April (Earth Day). 15 Teile, alle aus Ozeanplastik. Exklusive Vorab-Info für Presse.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 3: Ziel komplett
    {
      userMessage: 'Ziel: Positionierung als Nachhaltigkeits-Vorreiter. 50 Medienberichte, 10.000 Webseiten-Besucher am Launch-Tag. Zielgruppe: Modejournalisten, Nachhaltigkeits-Blogger.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Kernbotschaft komplett
    {
      userMessage: 'Kernbotschaft: Claim: Mode, die das Meer rettet. Proof: 5 Tonnen Ozeanplastik für diese Kollektion recycelt, GOTS-zertifiziert. Benefit: Stil mit gutem Gewissen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Material + Abschluss
    {
      userMessage: 'Material: PM mit Story der Fischer-Kooperation, CEO-Zitat, Designerin-Statement, Produktfotos, Infografik zum Recycling-Prozess.',
      expectedTools: ['skill_confirm'],
    },
    // Turn 6: Bestätigung
    {
      userMessage: 'Perfekt, finalisieren.',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 17,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 3: Chaotischer User
// User springt zwischen Bereichen, AI muss Struktur geben
// =============================================================================
export const scenario3_chaotisch_project: AgenticTestScenario = {
  id: 'project_chaotisch_test',
  description: 'Mittelstand: User antwortet chaotisch, AI muss strukturieren',
  specialistType: 'project_wizard',
  company: { id: 'test-mittelstand-project', name: 'Müller Metallbau' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Starte den Chat',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: User mischt alles durcheinander
    {
      userMessage: 'Also wir haben Jubiläum und wollen Pressemeldung und der Chef soll zitiert werden und neue Kunden wären auch gut',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['?'], // AI sollte nachfragen um zu strukturieren
      },
    },
    // Turn 3: User wird strukturierter - Anlass
    {
      userMessage: 'Ok, der Anlass: 75-jähriges Firmenjubiläum am 1. Juni. Familienunternehmen in 3. Generation.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
      todoStatusValidation: {
        anyHasStatus: 'done',
      },
    },
    // Turn 4: Ziel
    {
      userMessage: 'Ziel: Regionale Medien sollen berichten. Employer Branding stärken, 5 neue Auszubildende gewinnen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Kernbotschaft
    {
      userMessage: 'Kernbotschaft: Tradition trifft Innovation - 75 Jahre Müller Metallbau. Proof: 3 Generationen, 200+ Mitarbeiter, modernste CNC-Technik. Benefit: Verlässlicher Partner mit Zukunft.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 6: Material + Fertig
    {
      userMessage: 'Material brauchen wir: PM, Zitat vom Senior-Chef und Junior-Chef, Firmenfotos alt vs. neu. Fertig!',
      expectedTools: ['skill_confirm'],
    },
    // Turn 7: Bestätigung
    {
      userMessage: 'Ja, speichern',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 18,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 4: Früher Abbrecher
// User will nach zwei Bereichen schon aufhören
// =============================================================================
export const scenario4_abbrecher_project: AgenticTestScenario = {
  id: 'project_abbrecher_test',
  description: 'Handwerk: User bricht nach Anlass+Kernbotschaft ab, AI respektiert das',
  specialistType: 'project_wizard',
  company: { id: 'test-handwerk-project', name: 'Elektro Schmidt' },
  language: 'de',
  turns: [
    // Turn 1: Start
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },
    // Turn 2: Anlass direkt
    {
      userMessage: 'Anlass: Wir haben den 1000. Notdienst-Einsatz geschafft. Durchschnittlich in 28 Minuten vor Ort.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Kernbotschaft direkt
    {
      userMessage: 'Kernbotschaft: Schnellster Notdienst der Region - jetzt 1000x bewiesen. Proof: 1000 Einsätze, Ø 28 Min Anfahrt, 24/7. Benefit: Kein langes Warten im Dunkeln.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 4: User will aufhören
    {
      userMessage: 'Fertig! Die ganzen Ziele und Material-Sachen macht unser Marketingmensch. Ich brauch nur die Kernbotschaft.',
      expectedTools: ['skill_confirm'],
      responseValidation: {
        mustNotContain: ['müssen', 'sollten noch', 'unbedingt'],
      },
    },
    // Turn 5: Bestätigung
    {
      userMessage: 'Ja, genau so finalisieren',
      expectedTools: ['skill_sidebar'],
      sidebarValidation: {
        action: 'finalizeDocument',
      },
    },
  ],
  expectations: {
    minTotalToolCalls: 12,
    requiredTools: ['skill_dna_lookup', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },
};

// =============================================================================
// SZENARIO 5: DNA-basiert
// AI nutzt skill_dna_lookup und baut auf DNA-Synthese auf
// =============================================================================
export const scenario5_dna_basiert_project: AgenticTestScenario = {
  id: 'project_dna_basiert_test',
  description: 'B2B-Software: AI soll DNA-Synthese als Leitplanke nutzen',
  specialistType: 'project_wizard',
  company: { id: 'test-b2b-project', name: 'DataSync Enterprise' },
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
    // Turn 2: User referenziert DNA-Positionierung
    {
      userMessage: 'Basierend auf unserer Positionierung als Integrations-Spezialist: Anlass ist unser neues SAP S/4HANA Connector Release am 10. April.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },
    // Turn 3: Ziel aus DNA ableiten
    {
      userMessage: 'Ziel: Bestehende SAP-Kunden auf unser Angebot aufmerksam machen. 100 Anfragen für Demo. Zielgruppe: SAP-Berater und IT-Leiter.',
      expectedTools: ['skill_todos', 'skill_sidebar'],
    },
    // Turn 4: Kernbotschaft mit DNA-Tonalität
    {
      userMessage: 'Kernbotschaft: Der Brückenbauer für SAP S/4HANA. Claim: Verbinde deine Legacy-Systeme nahtlos mit SAP S/4HANA. Proof: Zertifizierter SAP-Partner, 0 Downtime Migration. Benefit: Zukunftssicher ohne Datenverlust.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap'],
    },
    // Turn 5: Material + Fertig
    {
      userMessage: 'Material: Technische PM, CTO-Zitat, Architektur-Diagramm, Kundenstimme von Pilot-Kunde. Fertig.',
      expectedTools: ['skill_confirm'],
    },
    // Turn 6: Bestätigung
    {
      userMessage: 'Ja, abschließen',
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
// EXPORT
// =============================================================================
export const projectWizardDatasets = [
  scenario1_worthuelsen_project,
  scenario2_praezise_project,
  scenario3_chaotisch_project,
  scenario4_abbrecher_project,
  scenario5_dna_basiert_project,
];
