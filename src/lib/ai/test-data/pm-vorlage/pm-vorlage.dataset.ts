// src/lib/ai/test-data/pm-vorlage/pm-vorlage.dataset.ts
// Test-Dataset für PM-Vorlage Story-Qualität
// Enthält reale Beispiele zur Evaluation des neuen Story-First Ansatzes

import type { GeneratePMVorlageInput } from '@/lib/ai/flows/generate-pm-vorlage';

export interface PMVorlageTestCase {
  id: string;
  description: string;
  input: GeneratePMVorlageInput;
  expectations: {
    /** Headline sollte NICHT generisch sein (z.B. "Firma startet X") */
    headlineShouldNotBeGeneric: boolean;
    /** Zitat sollte den Speaker-Namen enthalten */
    quoteShouldContainSpeaker: string;
    /** Diese Begriffe sollten im Text vorkommen */
    shouldContain?: string[];
    /** Diese Begriffe sollten NICHT vorkommen */
    shouldNotContain?: string[];
    /** Mindest-Wortanzahl */
    minWordCount?: number;
  };
}

// ============================================================================
// TEST CASE 1: Golfclub Rehburg-Loccum - Green Month
// Das Referenz-Beispiel aus der Analyse
// ============================================================================

export const golfclubGreenMonth: PMVorlageTestCase = {
  id: 'golfclub_green_month',
  description: 'Golfclub bricht mit Klischees - Green Month Schnupperangebot',

  input: {
    projectId: 'test-green-month',
    companyId: 'test-gcrl',
    companyName: 'Golfclub Rehburg-Loccum GmbH',
    language: 'de',

    dnaSynthese: `🧪 DNA SYNTHESE: Golfclub Rehburg-Loccum
UNTERNEHMENSPROFIL
• Branche: Golfsport
• Tätigkeit: Verkauf von Jahres- und Vollmitgliedschaften, Greenfee-Einnahmen, Golfkurse, Firmen-Events, Betrieb eines 6-Loch-Kurzplatzes mit Footgolf-Anlage.
• Gründung & Größe: Rehburg-Loccum
• Kernprodukte: Jahresmitgliedschaften, Greenfees, Golfkurse

📍 FIRMENSTAMMDATEN:
• Offizieller Name: Golfclub Rehburg-Loccum GmbH
• Adresse: Hormannshausen 2a, 31547 Rehburg-Loccum
• Website: https://www.golfclub-rehburg-loccum.de
• Presse-Kontakt: info@gcrl.de

STRATEGISCHE POSITION
• USP: Einsteigerfreundliche Ausrichtung und persönliche Clubkultur machen Golf für jeden zugänglich. → Beweis: Kombination aus 18-Loch-Anlage und 6-Loch-Kurzplatz, attraktives Preis-Leistungs-Verhältnis.
• Soll-Image: "Ein zugänglicher, moderner und sympathischer Club, der Golf als einsteigerfreundliches Erlebnis für jedermann präsentiert."
• Marktrolle: Challenger
• Differenzierung: Im Gegensatz zu Golfpark Steinhuder Meer, Golfclub Schaumburg, Golfclub Hannover Garbsen setzt der Golfclub Rehburg-Loccum verstärkt auf eine einsteigerfreundliche Ausrichtung und eine persönliche Clubkultur, die soziale Interaktion fördert.

ZIELGRUPPEN-MATRIX
ID    Zielgruppe    Pain-Point/Trigger    Kanal
ZG1    Berufstätige/Selbstständige (30-65 Jahre) mit Interesse an Sport und Natur    Negatives Image von Golf als elitär und teuer    Regionale Tageszeitungen, Onlineportale, Social Media
ZG2    Jüngere Menschen (18-30 Jahre)    Suche nach neuen, unkomplizierten Freizeitaktivitäten    Social Media, lokale Events
ZG3    Journalisten (Sport, Regionales)    Interesse an Geschichten über Sport, Gemeinschaft, regionale Wirtschaft    Regionale Medien (Print & Online)

KERNBOTSCHAFTEN:
1. Golf ist bei uns einfach: Unkomplizierter Einstieg durch Schnupperkurse und Kurzplatz. → Beweis: Schnupperkurs "Golf – mitten ins Glück" für 19 Euro. → FÜR: ZG1, ZG2
2. Sie sind vom ersten Moment an willkommen: Offene und persönliche Atmosphäre. → Beweis: Niedrigschwelliger Schnupperkurs, persönliche Ansprechpartner. → FÜR: ZG1
3. Wir begleiten Sie Schritt für Schritt: Klare Angebote und persönliche Betreuung. → Beweis: Logisch aufgebauter Einstiegspfad, praxisnahe Platzreifekurse. → FÜR: ZG1

KOMMUNIKATIONSZIELE
• WISSEN (Kopf): Der Golfclub Rehburg-Loccum ist einer der zugänglichsten Golfclubs der Region mit ganzjährig bespielbaren Sommergrüns und einem Kurzplatz für Einsteiger.
• FÜHLEN (Herz): Offenheit, Vertrauen und Zugehörigkeit.
• TUN (Hand): Aktive Kontaktaufnahme, Anmeldung zu Kursen, Mitgliedschaft.

SWOT-ESSENZ
• NUTZEN: Ganzjährig bespielbarer Platz → In Texten hervorheben.
• VERMEIDEN: Hohe Betriebskosten → Nicht thematisieren.`,

    faktenMatrix: {
      hook: {
        event: 'Der Golfclub Rehburg-Loccum startet den „Green Month" mit acht Schnupper-Terminen für alle, die Sport und Gemeinschaft suchen.',
        location: 'Golfclub Rehburg-Loccum',
        date: 'April 2026'
      },
      details: {
        delta: 'Maximale Offenheit, einsteigerfreundlicher Zugang ohne teure Ausrüstung oder elitäre Hürden.',
        evidence: '8 Schnupper-Termine, 19 Euro Kursgebühr (inkl. Leihschläger, Bälle, Trainer), 6-Loch-Kurzplatz, ganzjährig bespielbare Sommergrüns.'
      },
      quote: {
        speakerId: 'contact_gregor_von_hinten_geschaeftsfuehrer',
        rawStatement: 'Der „Green Month" ist eine Einladung, Teil der lebendigen Clubkultur zu werden, wo das „Du" und der Spaß am Spiel im Vordergrund stehen.'
      }
    },

    dnaContacts: [
      {
        id: 'contact_gregor_von_hinten_geschaeftsfuehrer',
        name: 'Gregor von Hinten',
        position: 'Geschäftsführer',
        email: 'info@gcrl.de'
      }
    ],

    targetGroup: 'ZG1'
  },

  expectations: {
    headlineShouldNotBeGeneric: true,
    quoteShouldContainSpeaker: 'Gregor von Hinten',
    shouldContain: [
      'Green Month',
      '19 Euro',
      'Rehburg-Loccum'
    ],
    shouldNotContain: [
      'revolutionär',
      'einzigartig',
      'führend'
    ],
    minWordCount: 250
  }
};

// ============================================================================
// TEST CASE 2: Tech-Startup - KI-Produkt Launch
// Kontrastfall: B2B Tech statt B2C Sport
// ============================================================================

export const techStartupKILaunch: PMVorlageTestCase = {
  id: 'tech_startup_ki_launch',
  description: 'B2B SaaS Startup launcht KI-Tool für Mittelstand',

  input: {
    projectId: 'test-ki-launch',
    companyId: 'test-datawise',
    companyName: 'DataWise GmbH',
    language: 'de',

    dnaSynthese: `🧪 DNA SYNTHESE: DataWise GmbH
UNTERNEHMENSPROFIL
• Branche: B2B Software / KI
• Tätigkeit: Entwicklung von KI-gestützten Datenanalyse-Tools für den Mittelstand
• Gründung & Größe: 2022, 15 Mitarbeiter, München
• Kernprodukte: DataWise Analytics Platform

📍 FIRMENSTAMMDATEN:
• Offizieller Name: DataWise GmbH
• Adresse: Maximilianstraße 42, 80539 München
• Website: https://www.datawise.de
• Presse-Kontakt: presse@datawise.de

STRATEGISCHE POSITION
• USP: KI-Analyse ohne Data Scientists - Mittelständler können ihre Daten selbst auswerten. → Beweis: No-Code Interface, 80% schnellere Einrichtung als Wettbewerber.
• Soll-Image: "Der KI-Partner für den Mittelstand, der komplexe Technologie verständlich macht."
• Marktrolle: Challenger
• Differenzierung: Im Gegensatz zu Enterprise-Lösungen wie Tableau oder Power BI richtet sich DataWise explizit an Mittelständler ohne eigene IT-Abteilung.

ZIELGRUPPEN-MATRIX
ID    Zielgruppe    Pain-Point/Trigger    Kanal
ZG1    Geschäftsführer mittelständischer Unternehmen (100-500 MA)    Daten vorhanden, aber keine Kapazität zur Auswertung    LinkedIn, Fachmagazine
ZG2    Controlling-Leiter    Reporting dauert zu lange, Excel stößt an Grenzen    Fachportale, Webinare
ZG3    IT-Journalisten    Interesse an "KI für alle" Stories    Tech-Medien

KERNBOTSCHAFTEN:
1. KI ohne Vorkenntnisse: Unsere Plattform erklärt sich selbst. → Beweis: Guided Workflows, natürlichsprachige Abfragen. → FÜR: ZG1, ZG2
2. Ihre Daten bleiben bei Ihnen: DSGVO-konform, deutscher Serverstandort. → Beweis: ISO 27001, TÜV-zertifiziert. → FÜR: ZG1

KOMMUNIKATIONSZIELE
• WISSEN: DataWise macht KI-Datenanalyse für Nicht-Techniker zugänglich.
• FÜHLEN: Vertrauen, Kompetenz, Machbarkeit.
• TUN: Demo anfragen, Testaccount erstellen.`,

    faktenMatrix: {
      hook: {
        event: 'DataWise launcht Version 2.0 mit natürlichsprachiger KI-Abfrage',
        location: 'München',
        date: 'April 2026'
      },
      details: {
        delta: 'Erstmals können Mittelständler ihre Geschäftsdaten in normaler Sprache abfragen - ohne SQL, ohne Data Scientists.',
        evidence: 'Natürlichsprachige Abfragen auf Deutsch, 80% schnellere Einrichtung, DSGVO-konform mit deutschen Servern, bereits 200+ Mittelstandskunden.'
      },
      quote: {
        speakerId: 'contact_lisa_mueller_ceo',
        rawStatement: 'Wir glauben, dass jedes Unternehmen das Recht hat, seine eigenen Daten zu verstehen - auch ohne IT-Abteilung.'
      }
    },

    dnaContacts: [
      {
        id: 'contact_lisa_mueller_ceo',
        name: 'Lisa Müller',
        position: 'CEO',
        email: 'lisa.mueller@datawise.de'
      }
    ],

    targetGroup: 'ZG1'
  },

  expectations: {
    headlineShouldNotBeGeneric: true,
    quoteShouldContainSpeaker: 'Lisa Müller',
    shouldContain: [
      'DataWise',
      'Mittelstand',
      'KI'
    ],
    shouldNotContain: [
      'revolutionär',
      'Game-Changer',
      'disruptiv'
    ],
    minWordCount: 250
  }
};

// ============================================================================
// EXPORT: Alle Test-Cases
// ============================================================================

export const pmVorlageTestCases: PMVorlageTestCase[] = [
  golfclubGreenMonth,
  techStartupKILaunch,
];

export default pmVorlageTestCases;
