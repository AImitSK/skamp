// src/app/api/ai/templates/route.ts - ENHANCED mit vollständiger Prompt Library
import { NextResponse } from 'next/server';

// Erweiterte Template-Struktur aus der Prompt Library
const TEMPLATE_LIBRARY = {
  product: {
    title: 'Produkteinführung (Tech)',
    category: 'product',
    industries: ['Technologie & Software', 'E-Commerce', 'Fintech'],
    prompt: `Produktname: DataSense Pro
Hauptfunktion: KI-gestützte Datenanalyse für mittelständische Unternehmen
Zielgruppe: CFOs und Controller in Unternehmen mit 50-500 Mitarbeitern
Marktproblem: Manuelle Excel-Analysen dauern Tage und sind fehleranfällig
Alleinstellung: 10x schneller als herkömmliche Tools, 90% weniger manuelle Arbeit
Verfügbarkeit: Ab 1. März 2025 als SaaS-Lösung
Preismodell: 299€/Monat pro Nutzer, keine Setup-Kosten
Besonderheiten: Integration in bestehende ERP-Systeme, deutsche DSGVO-konforme Server`,
    structure: {
      focus: ['Problem/Challenge im Markt', 'Technische Lösung konkret', 'Wettbewerbsvorteile', 'Verfügbarkeit und Preis'],
      tone: 'modern',
      audience: 'b2b'
    }
  },

  finance: {
    title: 'Finanzierungsrunde',
    category: 'finance',
    industries: ['Technologie & Software', 'Fintech', 'E-Commerce', 'Healthcare'],
    prompt: `Unternehmen: DataCorp (KI-Datenanalyse für B2B)
Finanzierungsrunde: Serie A, 8 Millionen Euro
Lead-Investor: Atlantic Ventures (bekannt für B2B-Software Investments)
Co-Investoren: High-Tech Gründerfonds, Business Angels aus SAP-Umfeld
Bisherige Erfolge: 200+ Kunden, 180% Umsatzwachstum 2024, ARR von 2,5M€
Mittel-Verwendung: 60% Produktentwicklung, 25% Sales-Team, 15% internationale Expansion
Team-Wachstum: Von 25 auf 45 Mitarbeiter bis Ende 2025
Vision: Marktführer für KI-Analytics in DACH-Region werden`,
    structure: {
      focus: ['Finanzierungsdetails', 'Bisherige Erfolge', 'Verwendung der Mittel', 'Wachstumspläne'],
      tone: 'startup',
      audience: 'media'
    }
  },

  partnership: {
    title: 'Strategische Partnerschaft',
    category: 'partnership',
    industries: ['Alle Branchen'],
    prompt: `Partner 1: DataCorp (KI-Datenanalyse, 25 Mitarbeiter, München)
Partner 2: CloudFirst (Cloud-Infrastructure, 150 Mitarbeiter, Berlin)
Kooperations-Art: Technische Integration von DataCorp AI-Services in CloudFirst Platform
Gemeinsames Ziel: All-in-one Business Intelligence Lösung für deutsche KMU
Kunde-Nutzen: Single-Point-of-Access für alle Unternehmensdaten, 40% Kostenersparnis
Marktauswirkung: Direkte Konkurrenz zu Microsoft Azure Analytics
Synergie-Beispiele: DataCorp AI-Algorithmen + CloudFirst Skalierung und Sicherheit
Zeitrahmen: 3-Jahres-Partnerschaft mit Option auf Verlängerung
Potentiale: Gemeinsame Expansion in österreichischen und schweizer Markt geplant`,
    structure: {
      focus: ['Partner vorstellen', 'Synergie-Effekte', 'Kundennutzen', 'Marktpositionierung'],
      tone: 'professional',
      audience: 'b2b'
    }
  },

  milestone: {
    title: 'Unternehmensmeilenstein',
    category: 'corporate',
    industries: ['Alle Branchen'],
    prompt: `Meilenstein: 1 Million aktive Nutzer erreicht
Bedeutung: Wichtiger Proof-of-Concept für Skalierbarkeit und Product-Market-Fit
Zeitrahmen: 18 Monate seit offiziellem Launch der Plattform
Schlüsselfaktoren: Virales Wachstum durch Nutzer-Empfehlungen, Product-Market-Fit
Stakeholder-Nutzen: Kunden profitieren von stabiler, bewährter Plattform
Nächste Ziele: Internationalisierung (Österreich, Schweiz) ab Q2 2025
Marktkontext: Platz 3 der führenden Analytics-Anbieter in DACH-Region
Team: 5-köpfiges Gründerteam + 30 Entwickler und Product Manager`,
    structure: {
      focus: ['Meilenstein konkret', 'Weg zum Erfolg', 'Bedeutung für Stakeholder', 'Nächste Schritte'],
      tone: 'modern',
      audience: 'media'
    }
  },

  award: {
    title: 'Auszeichnung & Award',
    category: 'corporate',
    industries: ['Alle Branchen'],
    prompt: `Auszeichnung: "Best B2B Software 2024" beim German Tech Awards
Bedeutung: Anerkennung als innovativste B2B-Lösung des Jahres
Bewertungskriterien: Innovation, Nutzerfreundlichkeit, Marktimpact, Kundenzufriedenheit
Konkurrenz: 200+ Bewerber, nur 10 Gewinner in der Kategorie
Kunden-Impact: 95% Kundenzufriedenheit, durchschnittlich 35% Effizienzsteigerung
Juroren: CIOs führender deutscher Unternehmen, Branchenexperten
Bedeutung für Markt: Bestätigung der Produktqualität und Marktreife
Nächste Schritte: Internationale Expansion auf Basis der Anerkennung`,
    structure: {
      focus: ['Award-Details', 'Bewertungskriterien', 'Bedeutung', 'Zukunftspläne'],
      tone: 'formal',
      audience: 'media'
    }
  },

  leadership: {
    title: 'Führungswechsel',
    category: 'corporate',
    industries: ['Alle Branchen'],
    prompt: `Position: Neuer Chief Technology Officer (CTO)
Person: Dr. Michael Weber (42), bisher Senior Engineering Manager bei SAP
Hintergrund: 15 Jahre Erfahrung in Enterprise-Software, Promotion in Informatik (TUM)
Verantwortung: Leitung der Produktentwicklung, Skalierung der Tech-Organisation
Team: 35 Entwickler und Data Scientists
Herausforderung: Produktportfolio erweitern, internationale Skalierung vorbereiten
Zeitpunkt: Ab 1. April 2025, nahtlose Übergabe vom bisherigen CTO
Begründung: Schnelles Wachstum erfordert erfahrene Enterprise-Expertise`,
    structure: {
      focus: ['Person und Hintergrund', 'Neue Rolle', 'Herausforderungen', 'Unternehmenskontext'],
      tone: 'formal',
      audience: 'b2b'
    }
  },

  research: {
    title: 'Forschungsergebnisse & Studie',
    category: 'research',
    industries: ['Technologie', 'Healthcare', 'Finanzdienstleistungen', 'Bildung'],
    prompt: `Studie: "Digitalisierung im deutschen Mittelstand 2025"
Durchführung: 6-monatige Studie mit 500 Unternehmen (50-500 Mitarbeiter)
Kernerkenntnisse: 73% planen KI-Investitionen, aber nur 23% haben konkrete Strategie
Haupthindernisse: Fachkräftemangel (67%), Datenschutz-Bedenken (54%), Kosten (48%)
Branchen-Unterschiede: Tech-Branche führend (89% KI-Nutzung), Handel nachholbedarf (34%)
Handlungsempfehlungen: Schrittweise Integration, Mitarbeiter-Schulung, Partner-Ökosystem
Methodik: Online-Befragung + 50 Experten-Interviews
Verfügbarkeit: Vollständige Studie kostenlos als PDF downloadbar`,
    structure: {
      focus: ['Studien-Setup', 'Kernerkenntnisse', 'Implikationen', 'Call-to-Action'],
      tone: 'technical',
      audience: 'b2b'
    }
  },

  event: {
    title: 'Event-Ankündigung',
    category: 'event',
    industries: ['Alle Branchen'],
    prompt: `Event: TechSummit 2025 - "KI trifft Mittelstand"
Datum: 15.-16. Mai 2025
Location: Messe München, Halle A4
Zielgruppe: Entscheider aus mittelständischen Unternehmen, IT-Leiter, CDOs
Programm-Highlights: 40+ Speaker, 20 Workshops, KI-Showcase mit Live-Demos
Keynote-Speaker: Prof. Dr. Müller (TUM), Sarah Chen (Microsoft), Tom Fischer (SAP)
Themen-Schwerpunkte: Praktische KI-Integration, Datenschutz, ROI-Berechnung
Networking: CEO-Dinner, Start-up Pitch Night, Speed-Dating für Kooperationen
Tickets: Early-Bird bis 31.03. für 299€, regulär 449€`,
    structure: {
      focus: ['Event-Details', 'Programm-Highlights', 'Zielgruppe', 'Call-to-Action'],
      tone: 'modern',
      audience: 'b2b'
    }
  },

  crisis: {
    title: 'Krisen-Kommunikation',
    category: 'corporate',
    industries: ['Alle Branchen'],
    prompt: `Situation: Datenschutz-Vorfall bei Cloud-Service entdeckt
Umfang: 5.000 Kundenkonten potentiell betroffen, keine Zahlungsdaten kompromittiert
Entdeckung: Durch interne Sicherheits-Routine am [Datum]
Sofortmaßnahmen: Sicherheitslücke geschlossen, alle Passwörter zurückgesetzt
Kommunikation: Direkte Information aller betroffenen Kunden per E-Mail
Untersuchung: Externe Sicherheitsfirma beauftragt, Behörden informiert
Entschädigung: 3 Monate kostenlose Premium-Features für betroffene Kunden
Langfrist-Maßnahmen: Verschärfte Sicherheits-Audits, ISO 27001 Zertifizierung`,
    structure: {
      focus: ['Transparenz', 'Sofortmaßnahmen', 'Kundenorientierung', 'Zukunftssicherung'],
      tone: 'formal',
      audience: 'consumer'
    }
  },

  sustainability: {
    title: 'Nachhaltigkeits-Initiative',
    category: 'corporate',
    industries: ['Alle Branchen'],
    prompt: `Initiative: "CO2-neutral bis 2030" - Umfassende Nachhaltigkeitsstrategie
Ausgangslage: Aktuell 50.000 Tonnen CO2-Ausstoß jährlich
Maßnahmen-Paket: 100% Ökostrom, E-Fahrzeugflotte, Remote-Work-Policy
Investition: 10 Millionen Euro über 5 Jahre
Meilensteine: 2025: -30% CO2, 2027: -60%, 2030: Klimaneutralität
Mitarbeiter-Beteiligung: Green-Teams, Nachhaltigkeits-Bonus, Ideenwettbewerb
Partner: Zusammenarbeit mit ClimatePartner für Zertifizierung
Transparenz: Jährlicher Nachhaltigkeitsbericht, quartalsweise Updates`,
    structure: {
      focus: ['Konkrete Ziele', 'Maßnahmenplan', 'Investitionen', 'Messbarkeit'],
      tone: 'modern',
      audience: 'media'
    }
  }
};

// Hilfsfunktion zum Konvertieren der Templates für API Response
function formatTemplatesForAPI() {
  return Object.entries(TEMPLATE_LIBRARY).map(([key, template]) => ({
    id: key,
    title: template.title,
    category: template.category,
    prompt: template.prompt,
    industries: template.industries,
    structure: template.structure,
    description: extractDescriptionFromPrompt(template.prompt)
  }));
}

function extractDescriptionFromPrompt(prompt: string): string {
  const lines = prompt.split('\n');
  const firstFewLines = lines.slice(0, 2).join(' ');
  return firstFewLines.length > 150 
    ? firstFewLines.substring(0, 147) + '...' 
    : firstFewLines;
}

export async function GET() {
  console.log('Templates API called - returning enhanced template library');

  try {
    const templates = formatTemplatesForAPI();
    
    return NextResponse.json({
      success: true,
      templates: templates,
      count: templates.length,
      categories: Array.from(new Set(templates.map(t => t.category))),
      version: '2.0' // Enhanced version
    });
  } catch (error) {
    console.error('Error in templates API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der Templates',
      templates: [] // Leeres Array als Fallback
    }, { status: 500 });
  }
}

// POST Endpoint für Template-basierte Generierung
export async function POST(request: Request) {
  try {
    const { templateId, customizations } = await request.json();
    
    if (!templateId || !TEMPLATE_LIBRARY[templateId as keyof typeof TEMPLATE_LIBRARY]) {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Template-ID'
      }, { status: 400 });
    }
    
    const template = TEMPLATE_LIBRARY[templateId as keyof typeof TEMPLATE_LIBRARY];
    
    // Template mit Anpassungen kombinieren
    let customizedPrompt = template.prompt;
    
    if (customizations) {
      // Ersetze Platzhalter im Template mit benutzerdefinierten Werten
      Object.entries(customizations).forEach(([key, value]) => {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        customizedPrompt = customizedPrompt.replace(regex, value as string);
      });
    }
    
    return NextResponse.json({
      success: true,
      template: {
        ...template,
        prompt: customizedPrompt,
        customized: true
      }
    });
    
  } catch (error) {
    console.error('Error processing template request:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler bei der Template-Verarbeitung'
    }, { status: 500 });
  }
}