// src/app/api/ai/templates/route.ts - ERSETZE DIE KOMPLETTE DATEI
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Templates requested');

  return NextResponse.json({
    success: true,
    templates: [
      {
        title: 'Produkteinführung (Tech)',
        prompt: `Produktname: DataSense Pro
Hauptfunktion: KI-gestützte Datenanalyse für mittelständische Unternehmen
Zielgruppe: CFOs und Controller in Unternehmen mit 50-500 Mitarbeitern
Marktproblem: Manuelle Excel-Analysen dauern Tage und sind fehleranfällig
Alleinstellung: 10x schneller als herkömmliche Tools, 90% weniger manuelle Arbeit
Verfügbarkeit: Ab 1. März 2025 als SaaS-Lösung
Preismodell: 299€/Monat pro Nutzer, keine Setup-Kosten
Besonderheiten: Integration in bestehende ERP-Systeme, deutsche DSGVO-konforme Server`
      },
      {
        title: 'Finanzierungsrunde',
        prompt: `Unternehmen: DataCorp (KI-Datenanalyse für B2B)
Finanzierungsrunde: Serie A, 8 Millionen Euro
Lead-Investor: Atlantic Ventures (bekannt für B2B-Software Investments)
Co-Investoren: High-Tech Gründerfonds, Business Angels aus SAP-Umfeld
Bisherige Erfolge: 200+ Kunden, 180% Umsatzwachstum 2024, ARR von 2,5M€
Mittel-Verwendung: 60% Produktentwicklung, 25% Sales-Team, 15% internationale Expansion
Team-Wachstum: Von 25 auf 45 Mitarbeiter bis Ende 2025
Vision: Marktführer für KI-Analytics in DACH-Region werden`
      },
      {
        title: 'Strategische Partnerschaft',
        prompt: `Partner 1: DataCorp (KI-Datenanalyse, 25 Mitarbeiter, München)
Partner 2: CloudFirst (Cloud-Infrastructure, 150 Mitarbeiter, Berlin)
Kooperations-Art: Technische Integration von DataCorp AI-Services in CloudFirst Platform
Gemeinsames Ziel: All-in-one Business Intelligence Lösung für deutsche KMU
Kunde-Nutzen: Single-Point-of-Access für alle Unternehmensdaten, 40% Kostenersparnis
Marktauswirkung: Direkte Konkurrenz zu Microsoft Azure Analytics
Synergie-Beispiele: DataCorp AI-Algorithmen + CloudFirst Skalierung und Sicherheit
Zeitrahmen: 3-Jahres-Partnerschaft mit Option auf Verlängerung
Potentiale: Gemeinsame Expansion in österreichischen und schweizer Markt geplant`
      },
      {
        title: 'Unternehmensmeilenstein',
        prompt: `Meilenstein: 1 Million aktive Nutzer erreicht
Bedeutung: Wichtiger Proof-of-Concept für Skalierbarkeit und Product-Market-Fit
Zeitrahmen: 18 Monate seit offiziellem Launch der Plattform
Schlüsselfaktoren: Virales Wachstum durch Nutzer-Empfehlungen, Product-Market-Fit
Stakeholder-Nutzen: Kunden profitieren von stabiler, bewährter Plattform
Nächste Ziele: Internationalisierung (Österreich, Schweiz) ab Q2 2025
Marktkontext: Platz 3 der führenden Analytics-Anbieter in DACH-Region
Team: 5-köpfiges Gründerteam + 30 Entwickler und Product Manager`
      },
      {
        title: 'Auszeichnung & Award',
        prompt: `Auszeichnung: "Best B2B Software 2024" beim German Tech Awards
Bedeutung: Anerkennung als innovativste B2B-Lösung des Jahres
Bewertungskriterien: Innovation, Nutzerfreundlichkeit, Marktimpact, Kundenzufriedenheit
Konkurrenz: 200+ Bewerber, nur 10 Gewinner in der Kategorie
Kunden-Impact: 95% Kundenzufriedenheit, durchschnittlich 35% Effizienzsteigerung
Juroren: CIOs führender deutscher Unternehmen, Branchenexperten
Bedeutung für Markt: Bestätigung der Produktqualität und Marktreife
Nächste Schritte: Internationale Expansion auf Basis der Anerkennung`
      },
      {
        title: 'Führungswechsel',
        prompt: `Position: Neuer Chief Technology Officer (CTO)
Person: Dr. Michael Weber (42), bisher Senior Engineering Manager bei SAP
Hintergrund: 15 Jahre Erfahrung in Enterprise-Software, Promotion in Informatik (TUM)
Verantwortung: Leitung der Produktentwicklung, Skalierung der Tech-Organisation
Team: 35 Entwickler und Data Scientists
Herausforderung: Produktportfolio erweitern, internationale Skalierung vorbereiten
Zeitpunkt: Ab 1. April 2025, nahtlose Übergabe vom bisherigen CTO
Begründung: Schnelles Wachstum erfordert erfahrene Enterprise-Expertise`
      }
    ]
  });
}