// src/lib/ai/agentic/test-data/datasets/swot-specialist.dataset.ts
// Test-Szenarien für den SWOT-Spezialisten
// 4 Haupt-Szenarien analog zum Briefing-Spezialisten

import type { AgenticTestScenario } from '../agentic-test-types';

// ============================================================================
// SZENARIO 1: Der Worthülsen-Nutzer (E-Commerce)
// Testet: Advocatus Diaboli - kritisches Nachfragen bei vagen Antworten
// ============================================================================
export const scenario1_worthuelsen_swot: AgenticTestScenario = {
  id: 'swot_worthuelsen_ecommerce',
  description: 'Testet kritisches Nachfragen bei Worthülsen - E-Commerce',
  specialistType: 'swot_specialist',
  company: { id: 'test-shopnow', name: 'ShopNow GmbH' },
  language: 'de',

  turns: [
    // Turn 1: Start - AI sollte proaktiv beginnen
    {
      userMessage: 'Starte die SWOT-Analyse',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'open',
        'Schwächen': 'open',
        'Chancen': 'open',
        'Risiken': 'open',
      },
      responseValidation: {
        mustNotContain: ['Willkommen', 'Hallo', 'Phase 1'],
        minLength: 50,
      },
    },

    // Turn 2: Vage Antwort - AI muss nachhaken
    {
      userMessage: 'Wir haben gute Qualität',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'partial', // NICHT done!
      },
      responseValidation: {
        mustContain: ['Vergleich', 'Wettbewerb', 'konkret', 'messen'], // Advocatus Diaboli nachfragen
      },
    },

    // Turn 3: Immer noch vage
    {
      userMessage: 'Wir sind innovativ',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'partial',
      },
      responseValidation: {
        mustContain: ['Innovation', 'letzten', 'Jahre', 'Beispiel'], // "Welche Innovation der letzten 2 Jahre?"
      },
    },

    // Turn 4: Jetzt konkret
    {
      userMessage: 'Eigene Logistik mit Same-Day-Delivery in 12 Städten, 98% Kundenzufriedenheit laut Trustpilot, 2024 KI-Empfehlungssystem gelauncht',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'done',
      },
      sidebarValidation: {
        mustContain: ['Same-Day', 'Trustpilot', 'KI'],
      },
    },

    // Turn 5: Schwächen - wieder vage
    {
      userMessage: 'Wir haben ein paar Probleme',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Schwächen': 'partial',
      },
      responseValidation: {
        mustContain: ['welche', 'konkret', 'Beispiel'],
      },
    },

    // Turn 6: Schwächen konkret
    {
      userMessage: 'Hohe Retourenquote von 35%, Margen unter Branchendurchschnitt, Abhängigkeit von Google Ads',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Schwächen': 'done',
      },
      sidebarValidation: {
        mustContain: ['35%', 'Margen', 'Google Ads'],
      },
      responseValidation: {
        mustContain: ['Schwächen', 'abgeschlossen', 'Chancen'],
      },
    },

    // Turn 7: Chancen - vage
    {
      userMessage: 'Der Markt wächst',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Chancen': 'partial',
      },
    },

    // Turn 8: Chancen konkret
    {
      userMessage: 'E-Commerce wächst 15% jährlich, Social Commerce boomt, Expansion nach Österreich/Schweiz möglich',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Chancen': 'done',
      },
    },

    // Turn 9: Risiken
    {
      userMessage: 'Amazon, Temu und Shein als Preiskampf-Konkurrenz, steigende Werbekosten, mögliche EU-Regulierung für Retouren',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Risiken': 'done',
      },
    },

    // Turn 10: Abschluss
    {
      userMessage: 'Fertig',
      expectedTools: ['skill_confirm'],
      forbiddenTools: ['skill_sidebar'], // Erst nach Bestätigung
    },

    // Turn 11: Bestätigung
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt', 'SWOT'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 20,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm', 'skill_suggestions'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['### Stärken', '### Schwächen', '### Chancen', '### Risiken'],
    mustContain: ['Same-Day', 'Retourenquote', 'Amazon', 'Social Commerce'],
    mustNotContain: ['Phase 1:', 'gute Qualität', 'Markt wächst'], // Worthülsen sollten ersetzt sein
    minSectionLength: 50,
  },
};

// ============================================================================
// SZENARIO 2: Der Präzise Nutzer (SaaS)
// Testet: Sauberer Flow, schneller Durchlauf aller 4 Quadranten
// ============================================================================
export const scenario2_praezise_swot: AgenticTestScenario = {
  id: 'swot_praezise_saas',
  description: 'Testet sauberen Flow bei präzisen Antworten - SaaS-Unternehmen',
  specialistType: 'swot_specialist',
  company: { id: 'test-clouderp', name: 'CloudERP Solutions' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Los gehts mit der SWOT',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: Stärken - sofort konkret
    {
      userMessage: '20 Jahre Erfahrung, 500+ Kunden im DACH-Raum, 99.9% Uptime, ISO 27001 zertifiziert, eigenes Entwicklerteam mit 45 Leuten',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'done',
      },
      sidebarValidation: {
        mustContain: ['20 Jahre', '500+', 'ISO 27001'],
      },
      responseValidation: {
        mustContain: ['Stärken', 'abgeschlossen', 'Schwächen'],
      },
    },

    // Turn 3: Schwächen - präzise
    {
      userMessage: 'Legacy-Code bei älteren Modulen, lange Implementierungszeiten (6-12 Monate), hohe Einstiegshürde für KMUs',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Schwächen': 'done',
      },
      responseValidation: {
        mustContain: ['Schwächen', 'abgeschlossen', 'Chancen'],
      },
    },

    // Turn 4: Chancen - präzise
    {
      userMessage: 'KI-Integration als Differenzierungsmerkmal, Cloud-Migration Trend, Konsolidierung im ERP-Markt (Übernahmeziele)',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Chancen': 'done',
      },
      responseValidation: {
        mustContain: ['Chancen', 'abgeschlossen', 'Risiken'],
      },
    },

    // Turn 5: Risiken - präzise + damit alle Quadranten fertig
    {
      userMessage: 'SAP und Microsoft als dominante Player, Fachkräftemangel, Kundenabwanderung zu modernen Tools wie Monday.com',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions', 'skill_confirm'],
      todoStatusValidation: {
        'Risiken': 'done',
      },
    },

    // Turn 6: Bestätigung
    {
      userMessage: 'Ja, so speichern',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 14,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['### Stärken', '### Schwächen', '### Chancen', '### Risiken'],
    mustContain: ['CloudERP', 'ISO 27001', 'Legacy-Code', 'KI-Integration', 'SAP'],
    mustNotContain: ['Phase 1:', 'Phase 2:'],
  },
};

// ============================================================================
// SZENARIO 3: Der Chaotische Nutzer (Startup)
// Testet: User mischt Quadranten wild durcheinander, AI sortiert korrekt ein
// ============================================================================
export const scenario3_chaotisch_swot: AgenticTestScenario = {
  id: 'swot_chaotisch_startup',
  description: 'Testet Robustheit bei gemischten Quadranten - Startup',
  specialistType: 'swot_specialist',
  company: { id: 'test-disruptify', name: 'Disruptify' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'SWOT-Analyse bitte',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: User mischt alles wild durcheinander
    {
      userMessage: 'Wir sind super innovativ (Stärke), haben aber kein Geld (Schwäche). Der Markt wächst stark (Chance) und Google könnte uns kopieren (Risiko).',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      sidebarValidation: {
        // AI sollte alles richtig einsortieren
        mustContain: ['innovativ', 'Geld', 'Markt', 'Google'],
      },
      responseValidation: {
        mustNotContain: ['Fehler', 'verstehe nicht'],
      },
    },

    // Turn 3: Noch mehr gemischt
    {
      userMessage: 'Unser Team ist genial aber unerfahren. VC-Funding ist möglich aber wir haben noch keine Traktion. Konkurrenz schläft nicht.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      // AI sollte erkennen: Team genial = Stärke, unerfahren = Schwäche, VC = Chance, keine Traktion = Schwäche, Konkurrenz = Risiko
    },

    // Turn 4: Korrektur!
    {
      userMessage: 'Moment, ich hatte was falsch: Wir haben doch schon 100k MRR, das ist eigentlich eine Stärke!',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      sidebarValidation: {
        mustContain: ['100k MRR'],
        mustNotContain: ['keine Traktion'], // Sollte korrigiert sein
      },
    },

    // Turn 5: Ergänzungen
    {
      userMessage: 'Stärke noch: First-Mover im deutschen Markt. Risiko: Regulierung könnte uns treffen. Chance: Exit an strategischen Käufer.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    // Turn 6: Abschluss
    {
      userMessage: 'Reicht das so?',
      expectedTools: ['skill_confirm'],
    },

    {
      userMessage: 'Ja!',
      expectedTools: ['skill_sidebar'],
    },
  ],

  expectations: {
    minTotalToolCalls: 14,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['### Stärken', '### Schwächen', '### Chancen', '### Risiken'],
    mustContain: ['innovativ', 'First-Mover', '100k MRR', 'VC', 'Regulierung'],
    mustNotContain: ['keine Traktion', 'Phase 1:'], // Korrektur und keine Phase-Labels
  },
};

// ============================================================================
// SZENARIO 4: Der Abbrecher (Handwerk)
// Testet: Vorzeitiges Ende, AI respektiert den User-Wunsch
// ============================================================================
export const scenario4_abbrecher_swot: AgenticTestScenario = {
  id: 'swot_abbrecher_handwerk',
  description: 'Testet vorzeitiges Beenden - Handwerksbetrieb',
  specialistType: 'swot_specialist',
  company: { id: 'test-meisterbau', name: 'Meisterbau Schmidt' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Kurze SWOT-Analyse',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: Nur Stärken
    {
      userMessage: 'Stärke: 40 Jahre Erfahrung, Meisterbetrieb, guter Ruf in der Region',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Stärken': 'done',
      },
    },

    // Turn 3: User will abbrechen!
    {
      userMessage: 'Das reicht mir erstmal, hab keine Zeit mehr',
      expectedTools: ['skill_confirm'], // Sollte zum Abschluss gehen
      forbiddenTools: ['skill_todos'], // Nicht nach Schwächen weiterfragen!
      responseValidation: {
        mustNotContain: ['Schwächen', 'Chancen', 'Risiken', 'weiter', 'müssen noch'],
        mustContain: ['abschließen', 'zusammenfassen', 'speichern'],
      },
    },

    // Turn 4: Bestätigung
    {
      userMessage: 'Ja, speichern',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt', 'SWOT'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 8,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['### Stärken'],
    mustContain: ['Meisterbau', '40 Jahre', 'Meisterbetrieb'],
    mustNotContain: ['Phase 1:'],
    // Schwächen, Chancen, Risiken können leer sein - das ist OK bei Abbruch
  },
};

// ============================================================================
// SZENARIO 5: DNA-basierte SWOT (Prüft skill_dna_lookup)
// Testet: AI nutzt Marken-DNA als Basis für SWOT
// ============================================================================
export const scenario5_dna_basiert_swot: AgenticTestScenario = {
  id: 'swot_dna_basiert_industrie',
  description: 'Testet DNA-Lookup als Basis für SWOT - Industrieunternehmen',
  specialistType: 'swot_specialist',
  company: { id: 'test-industrial', name: 'TechnoIndustrie AG' },
  language: 'de',

  turns: [
    // Turn 1: Start - AI MUSS skill_dna_lookup aufrufen
    {
      userMessage: 'Start',
      expectedTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_suggestions'],
      // skill_dna_lookup ist PFLICHT beim Start!
    },

    // Turn 2: User erwartet dass AI auf DNA-Daten aufbaut
    {
      userMessage: 'Was weißt du schon über uns?',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      responseValidation: {
        // AI sollte Daten aus DNA nennen können
        minLength: 100,
      },
    },

    // Turn 3: Stärken basierend auf DNA + User-Input
    {
      userMessage: 'Ergänze: ISO-Zertifizierungen und 200 Mitarbeiter',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    // Turn 4: Schnell durchlaufen
    {
      userMessage: 'Schwächen: Alte IT-Systeme. Chancen: Digitalisierung der Branche. Risiken: Fachkräftemangel.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    // Turn 5: Fertig
    {
      userMessage: 'Fertig',
      expectedTools: ['skill_confirm'],
    },

    {
      userMessage: 'Ja',
      expectedTools: ['skill_sidebar'],
    },
  ],

  expectations: {
    minTotalToolCalls: 10,
    requiredTools: ['skill_dna_lookup', 'skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const swotSpecialistDatasets = [
  scenario1_worthuelsen_swot,
  scenario2_praezise_swot,
  scenario3_chaotisch_swot,
  scenario4_abbrecher_swot,
  scenario5_dna_basiert_swot,
];
