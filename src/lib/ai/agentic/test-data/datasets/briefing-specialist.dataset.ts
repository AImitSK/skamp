// src/lib/ai/agentic/test-data/datasets/briefing-specialist.dataset.ts
// Test-Szenarien für den Briefing-Spezialisten
// 5 Haupt-Szenarien mit unterschiedlichen Branchen und Verhaltensweisen

import type { AgenticTestScenario } from '../agentic-test-types';

// ============================================================================
// SZENARIO 1: Der Worthülsen-Nutzer (Baubranche)
// Testet: Kritisches Nachfragen bei vagen Antworten, partial-Status
// ============================================================================
export const scenario1_worthuelsen: AgenticTestScenario = {
  id: 'briefing_worthuelsen_bau',
  description: 'Testet kritisches Nachfragen bei Worthülsen - Baubranche',
  specialistType: 'briefing_specialist',
  company: { id: 'test-baupro', name: 'BauPro GmbH' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Lass uns loslegen',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustNotContain: ['Phase 1', 'Phase 2', 'Phase 3'],
        minLength: 50,
      },
    },

    // Turn 2: Vage Antwort - AI muss nachhaken
    {
      userMessage: 'Wir machen Software',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'partial', // NICHT done!
      },
      responseValidation: {
        mustContain: ['konkret', 'genau', 'welche', 'Beispiel'], // Muss nachfragen
      },
    },

    // Turn 3: Etwas besser, aber immer noch vage
    {
      userMessage: 'B2B Software für die Baubranche',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'partial', // Immer noch nicht konkret genug
      },
      responseValidation: {
        mustContain: ['Problem', 'lösen', 'Funktion'], // Nachfrage nach Details
      },
    },

    // Turn 4: Jetzt konkret
    {
      userMessage: 'Projektmanagement-Software für Bauunternehmen. Terminplanung, Ressourcenverwaltung, Bautagebuch digital.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'done', // Jetzt konkret genug
      },
    },

    // Turn 5: USP - wieder vage
    {
      userMessage: 'Hohe Qualität',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Alleinstellungsmerkmale (USPs)': 'partial',
      },
      responseValidation: {
        mustContain: ['Woran', 'konkret', 'Beispiel', 'fest'],
      },
    },

    // Turn 6: USP konkret
    {
      userMessage: 'ISO 27001 zertifiziert, 99.9% Uptime-Garantie, deutscher Serverstandort, DSGVO-konform',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Alleinstellungsmerkmale (USPs)': 'done',
      },
      sidebarValidation: {
        mustContain: ['## Unternehmen', 'ISO 27001'],
        mustNotContain: ['Phase 1:', 'hohe Qualität'],
      },
    },

    // Turn 7: Abschnitt Aufgabe - Kommunikationsziel vage
    {
      userMessage: 'Mehr Kunden',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Kommunikationsziel': 'partial',
      },
      responseValidation: {
        mustContain: ['welche', 'Zielgruppe', 'Region', 'genau'],
      },
    },

    // Turn 8: Kommunikationsziel konkret
    {
      userMessage: 'Neukundengewinnung bei mittelständischen Bauunternehmen (50-500 MA) im DACH-Raum',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kommunikationsziel': 'done',
      },
    },

    // Turn 9: Kernbotschaft
    {
      userMessage: 'Digitalisieren Sie Ihre Baustelle - effizient, sicher, nachvollziehbar',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kernbotschaft': 'done',
      },
    },

    // Turn 10: Zielgruppe
    {
      userMessage: 'Bauleiter und Projektmanager in Bauunternehmen, technisch affin, 35-55 Jahre',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Zielgruppe': 'done',
      },
    },

    // Turn 11: Markt - Wettbewerber
    {
      userMessage: 'PlanRadar, Fieldwire, Procore als Hauptwettbewerber',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Wettbewerber': 'done',
      },
    },

    // Turn 12: Positionierung
    {
      userMessage: 'Der deutsche Spezialist für mittelständische Bauunternehmen - im Gegensatz zu den US-Lösungen',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Positionierung': 'done',
      },
    },

    // Turn 13: Trends
    {
      userMessage: 'BIM wird Standard, mobiles Arbeiten auf der Baustelle, Fachkräftemangel erfordert Effizienz',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Trends': 'done',
      },
    },

    // Turn 14: Abschluss
    {
      userMessage: 'Das wars',
      expectedTools: ['skill_confirm'],
      forbiddenTools: ['skill_sidebar'], // Erst nach Bestätigung
    },

    // Turn 15: Bestätigung
    {
      userMessage: 'Ja, passt!',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt', 'Dokument'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 25,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm', 'skill_suggestions'],
    shouldEndWithConfirm: false,
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['## Unternehmen', '## Aufgabe', '## Markt'],
    mustContain: ['BauPro', 'ISO 27001', 'DACH-Raum', 'Bauleiter'],
    mustNotContain: ['Phase 1:', 'Phase 2:', 'hohe Qualität', 'Mehr Kunden'],
    minSectionLength: 100,
  },
};

// ============================================================================
// SZENARIO 2: Der Präzise Nutzer (IT-Dienstleister)
// Testet: Sauberer Flow, schneller Fortschritt, korrekter Abschnitt-Wechsel
// ============================================================================
export const scenario2_praezise: AgenticTestScenario = {
  id: 'briefing_praezise_it',
  description: 'Testet sauberen Flow bei präzisen Antworten - IT-Dienstleister',
  specialistType: 'briefing_specialist',
  company: { id: 'test-cloudfirst', name: 'CloudFirst AG' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Lass uns loslegen',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: Umfassende erste Antwort
    {
      userMessage: 'CloudFirst ist ein IT-Dienstleister spezialisiert auf Cloud-Migration für den Mittelstand. Wir migrieren On-Premise-Systeme zu AWS, Azure und Google Cloud. 45 Mitarbeiter, seit 2018 am Markt, Hauptsitz München.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'done',
      },
    },

    // Turn 3: USPs direkt konkret
    {
      userMessage: 'USPs: Festpreisgarantie für Migrationsprojekte, eigenes Migrations-Tool "CloudShift", zertifizierte Partner aller drei Hyperscaler, durchschnittlich 40% Kostenersparnis für Kunden.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Alleinstellungsmerkmale (USPs)': 'done',
      },
      responseValidation: {
        mustContain: ['Abschnitt', 'Unternehmen', 'abgeschlossen', 'Aufgabe'],
      },
    },

    // Turn 4: Aufgabe komplett
    {
      userMessage: 'Kommunikationsziel: Thought Leadership im Bereich Cloud-Migration etablieren. Kernbotschaft: "Von der Legacy zur Cloud - sicher, planbar, wirtschaftlich". Zielgruppe: IT-Leiter und CIOs in Unternehmen mit 100-1000 MA.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
      todoStatusValidation: {
        'Kommunikationsziel': 'done',
        'Kernbotschaft': 'done',
        'Zielgruppe': 'done',
      },
      responseValidation: {
        mustContain: ['Abschnitt', 'Aufgabe', 'abgeschlossen', 'Markt'],
      },
    },

    // Turn 5: Markt komplett
    {
      userMessage: 'Wettbewerber: Accenture (zu teuer für Mittelstand), lokale Systemhäuser (weniger Cloud-Expertise). Positionierung: Der Mittelstands-Spezialist zwischen den Großen und den Kleinen. Trends: Multi-Cloud wird Standard, Security-Anforderungen steigen, Fachkräftemangel treibt Outsourcing.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Wettbewerber': 'done',
        'Positionierung': 'done',
        'Trends': 'done',
      },
    },

    // Turn 6: Abschluss
    {
      userMessage: 'Fertig',
      expectedTools: ['skill_confirm'],
    },

    // Turn 7: Bestätigung
    {
      userMessage: 'Ja',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 15,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['## Unternehmen', '## Aufgabe', '## Markt'],
    mustContain: ['CloudFirst', 'CloudShift', 'Festpreisgarantie', 'IT-Leiter'],
    mustNotContain: ['Phase 1:', 'Phase 2:'],
  },
};

// ============================================================================
// SZENARIO 3: Der Chaotische Nutzer (Werbeagentur)
// Testet: URL-Crawling, Korrekturen, Themenwechsel
// ============================================================================
export const scenario3_chaotisch: AgenticTestScenario = {
  id: 'briefing_chaotisch_agentur',
  description: 'Testet Robustheit bei chaotischem Nutzerverhalten - Werbeagentur',
  specialistType: 'briefing_specialist',
  company: { id: 'test-kreativkraft', name: 'KreativKraft' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Lass uns loslegen',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: URL statt Antwort
    {
      userMessage: 'Schau dir mal unsere Webseite an: https://www.kreativkraft-beispiel.de',
      expectedTools: ['skill_url_crawler', 'skill_todos', 'skill_sidebar'],
    },

    // Turn 3: Korrektur!
    {
      userMessage: 'Oh warte, das ist die falsche Firma. Wir sind gar keine Werbeagentur, sondern eine PR-Agentur!',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      sidebarValidation: {
        mustContain: ['PR-Agentur'],
        mustNotContain: ['Werbeagentur'],
      },
    },

    // Turn 4: Springt zu USPs ohne Kerngeschäft fertig
    {
      userMessage: 'Unser USP ist übrigens dass wir auf Krisenkommunikation spezialisiert sind',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      // AI sollte trotzdem weiterfragen nach Kerngeschäft
    },

    // Turn 5: Zurück zu Kerngeschäft
    {
      userMessage: 'Also Kerngeschäft: PR-Beratung, Krisenkommunikation, Media Relations. 12 Mitarbeiter, Hamburg.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'done',
        'Alleinstellungsmerkmale (USPs)': 'done',
      },
    },

    // Turn 6-9: Rest normal durchgehen
    {
      userMessage: 'Ziel: Als Krisenexperten bekannt werden. Botschaft: Wenn der Sturm kommt, sind wir da. Zielgruppe: Kommunikationsleiter in DAX-Unternehmen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
    },

    {
      userMessage: 'Wettbewerber: Große Agenturnetzwerke wie Edelman, Ketchum. Wir sind schneller und persönlicher.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    {
      userMessage: 'Trend: Social Media Shitstorms werden häufiger, CEO-Kommunikation wichtiger.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    // Turn 10: Fertig
    {
      userMessage: 'Fertig, abschließen bitte',
      expectedTools: ['skill_confirm'],
    },

    {
      userMessage: 'Passt!',
      expectedTools: ['skill_sidebar'],
    },
  ],

  expectations: {
    minTotalToolCalls: 18,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_url_crawler', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    mustContain: ['PR-Agentur', 'Krisenkommunikation', 'Hamburg'],
    mustNotContain: ['Werbeagentur', 'Phase 1:'],
  },
};

// ============================================================================
// SZENARIO 4: Der Spezifizierer (Holzindustrie)
// Testet: Schrittweises Eingrenzen von zu allgemeinen Antworten
// ============================================================================
export const scenario4_spezifizierer: AgenticTestScenario = {
  id: 'briefing_spezifizierer_holz',
  description: 'Testet schrittweises Eingrenzen - Holzindustrie',
  specialistType: 'briefing_specialist',
  company: { id: 'test-holztech', name: 'HolzTech Solutions' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Lass uns loslegen',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: Zu allgemein - B2B
    {
      userMessage: 'Wir sind B2B',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'partial',
      },
      responseValidation: {
        mustContain: ['Branche', 'Produkt', 'genau', 'welche'],
      },
    },

    // Turn 3: Etwas spezifischer - Holz
    {
      userMessage: 'Holzbranche',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'partial',
      },
      responseValidation: {
        mustContain: ['Sägewerk', 'Möbel', 'Produkt', 'Bereich'],
      },
    },

    // Turn 4: Noch spezifischer - Sägewerke
    {
      userMessage: 'Maschinen für Sägewerke',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'partial',
      },
      responseValidation: {
        mustContain: ['welche', 'Art', 'Maschinen'],
      },
    },

    // Turn 5: Endlich konkret
    {
      userMessage: 'Automatische Sortieranlagen und Vermessungssysteme für Rundholz. Wir scannen die Stämme und sortieren sie automatisch nach Qualität und Durchmesser.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'done',
      },
    },

    // Turn 6: Zielgruppe auch schrittweise
    {
      userMessage: 'Zielgruppe: Unternehmen',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['welche', 'Größe', 'Branche', 'genau'],
      },
    },

    // Turn 7: Spezifischer
    {
      userMessage: 'Sägewerksbetreiber',
      expectedTools: ['skill_todos', 'skill_suggestions'],
      responseValidation: {
        mustContain: ['Größe', 'Region', 'Entscheider'],
      },
    },

    // Turn 8: Konkret
    {
      userMessage: 'Sägewerke mit mehr als 50.000 Festmeter Jahreseinschnitt, hauptsächlich DACH und Skandinavien. Entscheider sind technische Geschäftsführer und Produktionsleiter.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Zielgruppe': 'done',
      },
    },

    // Rest zügig abschließen
    {
      userMessage: 'USP: Höchste Messgenauigkeit am Markt (±2mm), KI-basierte Qualitätserkennung, 30 Jahre Erfahrung',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
    },

    {
      userMessage: 'Kommunikationsziel: Als Technologieführer wahrgenommen werden. Botschaft: Präzision die sich rechnet.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
    },

    {
      userMessage: 'Wettbewerber: Microtec (Italien), RemaSawco (Schweden). Positionierung: Der deutsche Präzisionsspezialist. Trends: Fachkräftemangel, Automatisierung, Nachhaltigkeit.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
    },

    {
      userMessage: 'Abschließen',
      expectedTools: ['skill_confirm'],
    },

    {
      userMessage: 'Ja',
      expectedTools: ['skill_sidebar'],
    },
  ],

  expectations: {
    minTotalToolCalls: 22,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    mustContain: ['Sägewerk', 'Rundholz', 'Skandinavien', '±2mm'],
    mustNotContain: ['B2B', 'Holzbranche', 'Unternehmen', 'Phase 1:'], // Die vagen Begriffe sollten durch konkrete ersetzt sein
  },
};

// ============================================================================
// SZENARIO 5: Der Abbrecher (Medizintechnik)
// Testet: Vorzeitiges Ende, Respektieren des User-Wunsches
// ============================================================================
export const scenario5_abbrecher: AgenticTestScenario = {
  id: 'briefing_abbrecher_medtech',
  description: 'Testet vorzeitiges Beenden - Medizintechnik',
  specialistType: 'briefing_specialist',
  company: { id: 'test-meddevice', name: 'MedDevice Systems' },
  language: 'de',

  turns: [
    // Turn 1: Start
    {
      userMessage: 'Lass uns loslegen',
      expectedTools: ['skill_roadmap', 'skill_todos', 'skill_suggestions'],
    },

    // Turn 2: Gute erste Antwort
    {
      userMessage: 'MedDevice entwickelt tragbare EKG-Geräte für die Langzeit-Überwachung. Patienten tragen sie 7 Tage und die Daten werden per App an den Arzt übertragen.',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_suggestions'],
      todoStatusValidation: {
        'Kerngeschäft/Produkte': 'done',
      },
    },

    // Turn 3: USPs
    {
      userMessage: 'USP: Kleinste Geräte am Markt, KI-Erkennung von Herzrhythmusstörungen in Echtzeit, CE-zertifiziert Klasse IIa',
      expectedTools: ['skill_todos', 'skill_sidebar', 'skill_roadmap', 'skill_suggestions'],
    },

    // Turn 4: User will abbrechen!
    {
      userMessage: 'Das reicht erstmal, ich hab keine Zeit mehr',
      expectedTools: ['skill_confirm'], // Sollte zum Abschluss gehen
      forbiddenTools: ['skill_todos'], // Nicht weiterfragen!
      responseValidation: {
        mustNotContain: ['Kommunikationsziel', 'Zielgruppe', 'weiter'],
      },
    },

    // Turn 5: Bestätigung
    {
      userMessage: 'Ja, so speichern',
      expectedTools: ['skill_sidebar'],
      responseValidation: {
        mustContain: ['erstellt'],
      },
    },
  ],

  expectations: {
    minTotalToolCalls: 10,
    requiredTools: ['skill_roadmap', 'skill_todos', 'skill_sidebar', 'skill_confirm'],
    shouldProduceFinalDocument: true,
  },

  finalDocumentValidation: {
    requiredSections: ['## Unternehmen'],
    mustContain: ['MedDevice', 'EKG', 'CE-zertifiziert'],
    mustNotContain: ['Phase 1:'],
    // Aufgabe und Markt können leer/minimal sein - das ist OK bei Abbruch
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const briefingSpecialistDatasets = [
  scenario1_worthuelsen,
  scenario2_praezise,
  scenario3_chaotisch,
  scenario4_spezifizierer,
  scenario5_abbrecher,
];
