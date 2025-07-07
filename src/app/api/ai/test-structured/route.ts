// src/app/api/ai/test-structured/route.ts
import { NextResponse } from 'next/server';

// Test-Text der typische Gemini-Responses simuliert
const TEST_RESPONSES = [
  // Test 1: Mit ** markierter Lead
  `DataSense Pro revolutioniert Datenanalyse für KMU

**Das Münchner Startup DataCorp stellt heute DataSense Pro vor, eine KI-gestützte Analyseplattform die Unternehmensdaten zehnmal schneller verarbeitet als herkömmliche Tools. Die Software richtet sich an mittelständische Unternehmen mit 50-500 Mitarbeitern.**

DataSense Pro nutzt modernste Machine-Learning-Algorithmen, um komplexe Datensätze in Echtzeit zu analysieren. Die Plattform kann nahtlos in bestehende ERP-Systeme integriert werden und benötigt keine aufwendige Schulung der Mitarbeiter.

Der deutsche Mittelstand kämpft seit Jahren mit der effizienten Nutzung seiner Datenbestände. Manuelle Excel-Analysen sind zeitaufwendig und fehleranfällig, während Enterprise-Lösungen oft zu komplex und teuer sind.

Mit einem Einstiegspreis von 299 Euro pro Monat macht DataSense Pro professionelle Datenanalyse für KMU erschwinglich. Erste Pilotkunden berichten von einer Zeitersparnis von bis zu 90 Prozent bei Routine-Analysen.

"DataSense Pro demokratisiert die Datenanalyse für den Mittelstand", sagt Dr. Anna Schmidt, CEO bei DataCorp.

*Über DataCorp: DataCorp wurde 2020 in München gegründet und entwickelt KI-basierte Lösungen für die Datenanalyse. Das Unternehmen beschäftigt 25 Mitarbeiter.*`,

  // Test 2: Ohne ** aber mit W-Fragen
  `Neue Finanzierungsrunde für DataCorp

Wer: DataCorp, ein führender Anbieter von KI-Datenanalyse. Was: Serie-A-Finanzierung über 8 Millionen Euro abgeschlossen. Wann: Heute bekanntgegeben. Wo: München, Deutschland. Warum: Internationale Expansion und Produktentwicklung.

Die Finanzierungsrunde wurde von Atlantic Ventures angeführt, mit Beteiligung des High-Tech Gründerfonds und mehreren Business Angels aus dem SAP-Umfeld. Das frische Kapital soll primär in die Weiterentwicklung der Plattform fließen.

DataCorp hat in den letzten 18 Monaten über 200 Kunden gewonnen und seinen Umsatz um 180 Prozent gesteigert. Die aktuelle ARR liegt bei 2,5 Millionen Euro mit starkem Wachstumstrend.

Das Unternehmen plant, sein Team von derzeit 25 auf 45 Mitarbeiter zu erweitern. Besonderer Fokus liegt auf der Verstärkung des Entwicklungsteams und dem Aufbau einer internationalen Vertriebsstruktur.

"Diese Finanzierung ist ein wichtiger Meilenstein für unser Wachstum und bestätigt unsere Vision", sagt Dr. Stefan Meier, CEO bei DataCorp.

*Über DataCorp: DataCorp ist ein schnell wachsendes Tech-Unternehmen aus München, das sich auf KI-basierte Datenanalyse spezialisiert hat.*`
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testCase = parseInt(searchParams.get('case') || '0');
  
  const testText = TEST_RESPONSES[testCase] || TEST_RESPONSES[0];
  
  // Import parseStructuredOutput function (kopiere sie hier rein für den Test)
  const parseStructuredOutput = (text: string) => {
    // ... (die verbesserte Funktion von oben)
    console.log('Parsing test text...');
    
    const lines = text.split('\n');
    let headline = '';
    let leadParagraph = '';
    let bodyParagraphs: string[] = [];
    let quote = { text: '', person: '', role: '', company: '' };
    let boilerplate = '';
    
    let currentSection = 'searching';
    let bodyCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Headline
      if (!headline && currentSection === 'searching') {
        headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
        currentSection = 'lead';
        continue;
      }
      
      // Lead
      if (!leadParagraph && currentSection === 'lead') {
        if (line.startsWith('**') && line.endsWith('**')) {
          leadParagraph = line.substring(2, line.length - 2);
          currentSection = 'body';
          continue;
        }
        
        const hasWQuestions = 
          (line.includes('Wer') || line.includes('Was') || line.includes('Wann') || 
           line.includes('Wo') || line.includes('Warum')) ||
          (line.length > 100 && line.length < 400);
        
        if (hasWQuestions) {
          leadParagraph = line;
          currentSection = 'body';
          continue;
        }
        
        currentSection = 'body';
      }
      
      // Zitat
      if (line.startsWith('"')) {
        const quoteMatch = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
        if (quoteMatch) {
          quote = {
            text: quoteMatch[1],
            person: quoteMatch[2].trim(),
            role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
            company: quoteMatch[4] ? quoteMatch[4].trim() : ''
          };
        }
        currentSection = 'boilerplate';
        continue;
      }
      
      // Boilerplate
      if (line.startsWith('*Über ')) {
        boilerplate = line.substring(1, line.length - 1);
        continue;
      }
      
      // Body
      if (currentSection === 'body' && bodyCount < 3) {
        if (!line.startsWith('"') && !line.startsWith('*')) {
          bodyParagraphs.push(line);
          bodyCount++;
        }
      }
    }
    
    // Defaults
    if (!leadParagraph && bodyParagraphs.length > 0) {
      leadParagraph = bodyParagraphs[0];
      bodyParagraphs = bodyParagraphs.slice(1);
    }
    
    return {
      headline: headline || 'Test Headline',
      leadParagraph: leadParagraph || 'Lead fehlt',
      bodyParagraphs: bodyParagraphs.length > 0 ? bodyParagraphs : ['Body fehlt'],
      quote: quote.text ? quote : { text: 'Test quote', person: 'Test Person', role: 'CEO', company: 'Test GmbH' },
      boilerplate: boilerplate || 'Über Test: Test Boilerplate'
    };
  };
  
  const result = parseStructuredOutput(testText);
  
  return NextResponse.json({
    testCase,
    input: testText,
    parsed: result,
    debug: {
      leadLength: result.leadParagraph.length,
      bodyCount: result.bodyParagraphs.length,
      hasQuote: !!result.quote.text,
      hasBoilerplate: !!result.boilerplate
    }
  });
}