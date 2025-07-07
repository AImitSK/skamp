// src/app/api/ai/generate-structured/route.ts - ENHANCED mit Prompt Library
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

interface StructuredGenerateRequest {
  prompt: string;
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
    companyName?: string;
  };
}

interface StructuredPressRelease {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  boilerplate: string;
}

// System-Prompts aus der Prompt Library
const SYSTEM_PROMPTS = {
  base: `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen.

AUFGABE: Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

STRUKTUR (ZWINGEND EINHALTEN):
Zeile 1: Schlagzeile (max. 80 Zeichen, aktive Sprache, newsworthy)

**Lead-Absatz: Beantworte 5 W-Fragen in EXAKT 40-50 Wörtern**

Absatz 2: Hauptinformation ausführlich mit konkreten Details und Zahlen

Absatz 3: Hintergrund, Kontext und Bedeutung für die Branche

Absatz 4: Auswirkungen, Nutzen und Zukunftsperspektive

"Authentisches Zitat (20-35 Wörter)", sagt [Vollständiger Name], [Position] bei [Unternehmen].

*Über [Unternehmen]: [Kurze Unternehmensbeschreibung in 2-3 Sätzen]*`,

  rules: `
KRITISCHE REGELN:
✓ Headline: Prägnant, faktisch, max. 80 Zeichen
✓ Lead: EXAKT 40-50 Wörter, in **Sterne** einschließen
✓ Body: 3 separate Absätze mit verschiedenen Aspekten
✓ Zitat: In "Anführungszeichen" mit vollständiger Attribution
✓ Boilerplate: Mit *Sterne* markieren
✓ Sachlich und objektiv, keine Werbesprache
✓ Perfekte deutsche Rechtschreibung
✓ Konkrete Zahlen und Fakten

VERMEIDE:
- Werbesprache ("revolutionär", "bahnbrechend", "einzigartig")
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange Sätze (max. 15 Wörter)`,

  // Tonalitäts-spezifische Anpassungen
  tones: {
    formal: `
TONALITÄT: FORMAL
- Konservativ, seriös, vertrauenswürdig
- Längere, komplexere Sätze erlaubt (max. 20 Wörter)
- Fachterminologie wenn angemessen
- Zurückhaltende, objektive Sprache
- Förmliche Anrede und Struktur`,

    modern: `
TONALITÄT: MODERN
- Zeitgemäß, innovativ, zugänglich
- Kurze, prägnante Sätze (max. 12 Wörter)
- Moderne Begriffe, aber nicht übertrieben
- Leicht verständlich, aktiv
- Direkte Ansprache`,

    technical: `
TONALITÄT: TECHNISCH
- Fachspezifisch, präzise, detailliert
- Technische Begriffe korrekt verwenden
- Zahlen, Daten, Spezifikationen prominent
- Sachlich und faktenorientiert
- Für Experten geschrieben`,

    startup: `
TONALITÄT: STARTUP
- Dynamisch, visionär, mutig
- Wachstums- und Zukunftsfokus
- Etwas emotionaler, aber professionell
- Marktveränderung betonen
- Disruptive Sprache erlaubt`
  },

  // Zielgruppen-spezifische Anpassungen
  audiences: {
    b2b: `
ZIELGRUPPE: B2B/FACHMEDIEN
- Fokus auf ROI, Effizienz, Kostenersparnisse
- Technische Details und Spezifikationen
- Branchenkontext und Marktanalyse
- Zitate von Entscheidern (C-Level)
- Zahlen, Daten, Benchmarks`,

    consumer: `
ZIELGRUPPE: VERBRAUCHER
- Fokus auf Nutzen für Endverbraucher
- Einfache, verständliche Sprache
- Praktische Anwendungsbeispiele
- Emotionaler Bezug und Lifestyle
- Verfügbarkeit und Preise prominent`,

    media: `
ZIELGRUPPE: MEDIEN/JOURNALISTEN
- Nachrichtenwert und Aktualität betonen
- Klare Story mit Spannungsbogen
- Zitierfähige Aussagen
- Hintergrundinformationen
- Kontaktdaten prominent`
  }
};

// Verbesserte Parsing-Funktion für strukturierte Ausgabe
function parseStructuredOutput(text: string): StructuredPressRelease {
  console.log('=== PARSING START ===');
  console.log('Raw text:', text.substring(0, 500) + '...');
  
  const lines = text.split('\n');
  
  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote = { text: '', person: '', role: '', company: '' };
  let boilerplate = '';
  
  let currentSection = 'searching'; // searching, lead, body, quote, boilerplate
  let bodyCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    console.log(`Line ${i}: [${currentSection}] "${line.substring(0, 50)}..."`);
    
    // 1. Headline - erste nicht-leere Zeile
    if (!headline && currentSection === 'searching') {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = 'lead';
      console.log('Found headline:', headline);
      continue;
    }
    
    // 2. Lead-Absatz - verschiedene Formate erkennen
    if (!leadParagraph && currentSection === 'lead') {
      // Format 1: **Text in Sternen**
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.substring(2, line.length - 2);
        currentSection = 'body';
        console.log('Found lead (format 1):', leadParagraph);
        continue;
      }
      
      // Format 2: Erster Absatz nach Headline (wenn er W-Fragen beantwortet)
      const hasWQuestions = 
        (line.includes('Wer') || line.includes('Was') || line.includes('Wann') || 
         line.includes('Wo') || line.includes('Warum')) ||
        (line.length > 100 && line.length < 400); // Typische Lead-Länge
      
      if (hasWQuestions) {
        leadParagraph = line;
        currentSection = 'body';
        console.log('Found lead (format 2):', leadParagraph);
        continue;
      }
      
      // Wenn keine typischen Lead-Merkmale, gehe zu Body
      currentSection = 'body';
    }
    
    // 3. Zitat erkennen
    if (line.startsWith('"')) {
      currentSection = 'quote';
      
      // Verschiedene Zitat-Formate parsen
      const quoteMatch = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
        console.log('Found quote:', quote);
      } else {
        // Einfacheres Format nur mit Zitat
        const simpleMatch = line.match(/"([^"]+)"/);
        if (simpleMatch) {
          quote.text = simpleMatch[1];
          // Versuche Person aus nachfolgenden Zeilen zu extrahieren
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const personMatch = nextLine.match(/[-–—]\s*(.+)/);
            if (personMatch) {
              const parts = personMatch[1].split(',').map(p => p.trim());
              quote.person = parts[0] || 'Sprecher';
              quote.role = parts[1] || 'Geschäftsführer';
              quote.company = parts[2] || '';
              i++; // Skip next line
            }
          }
        }
      }
      currentSection = 'boilerplate';
      continue;
    }
    
    // 4. Boilerplate erkennen
    if (line.startsWith('*Über ') || line.startsWith('*About ') || 
        line.startsWith('Über ') && currentSection === 'boilerplate') {
      boilerplate = line.replace(/^\*/, '').replace(/\*$/, '');
      console.log('Found boilerplate:', boilerplate);
      continue;
    }
    
    // 5. Body-Absätze sammeln
    if (currentSection === 'body' && bodyCount < 3) {
      // Skip wenn es wie ein Zitat oder Boilerplate aussieht
      if (line.startsWith('"') || line.startsWith('*')) {
        continue;
      }
      
      bodyParagraphs.push(line);
      bodyCount++;
      console.log(`Added body paragraph ${bodyCount}:`, line.substring(0, 50) + '...');
    }
  }
  
  // Nachbearbeitung und Validierung
  
  // Wenn kein Lead gefunden wurde, nimm ersten Body-Absatz
  if (!leadParagraph && bodyParagraphs.length > 0) {
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
    console.log('Using first body as lead:', leadParagraph);
  }
  
  // Defaults für fehlende Elemente
  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph) leadParagraph = 'Lead-Absatz fehlt';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
  if (!quote.text) {
    quote = { 
      text: 'Wir freuen uns über diese Entwicklung', 
      person: 'Sprecher', 
      role: 'Geschäftsführer', 
      company: 'Unternehmen' 
    };
  }
  if (!boilerplate) {
    boilerplate = 'Über das Unternehmen: [Platzhalter für Unternehmensbeschreibung]';
  }
  
  console.log('=== PARSING RESULT ===');
  console.log('Headline:', headline);
  console.log('Lead length:', leadParagraph.length);
  console.log('Body paragraphs:', bodyParagraphs.length);
  console.log('Has quote:', !!quote.text);
  console.log('=== PARSING END ===');
  
  return {
    headline,
    leadParagraph,
    bodyParagraphs,
    quote,
    boilerplate
  };
}

// Prompt-Builder mit Kontext
function buildSystemPrompt(context?: StructuredGenerateRequest['context']): string {
  let systemPrompt = SYSTEM_PROMPTS.base + '\n' + SYSTEM_PROMPTS.rules;
  
  // Tonalität hinzufügen
  if (context?.tone && SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones];
  }
  
  // Zielgruppe hinzufügen
  if (context?.audience && SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences];
  }
  
  // Finale Anweisung
  systemPrompt += '\n\nAntworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.';
  
  return systemPrompt;
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    const data: StructuredGenerateRequest = await request.json();
    const { prompt, context } = data;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('Generating structured press release with context', { 
      promptLength: prompt.length,
      context: context 
    });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Dynamisch System-Prompt basierend auf Kontext erstellen
    const systemPrompt = buildSystemPrompt(context);

    // Kontext-Info für User-Prompt
    let contextInfo = '';
    if (context?.industry) {
      contextInfo += `\nBRANCHE: ${context.industry}`;
    }
    if (context?.companyName) {
      contextInfo += `\nUNTERNEHMEN: ${context.companyName}`;
    }

    const userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}${contextInfo}`;

    // Gemini Anfrage mit dynamischem Prompt
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = await result.response;
    const generatedText = response.text();

    if (!generatedText || generatedText.trim() === '') {
      return NextResponse.json(
        { error: 'Keine Antwort von Gemini erhalten' },
        { status: 500 }
      );
    }

    // Strukturierte Ausgabe parsen
    const structured = parseStructuredOutput(generatedText);

    // HTML für Editor generieren mit verbesserter Formatierung
    const htmlContent = `
<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>
  <p>"${structured.quote.text}"</p>
  <footer>— ${structured.quote.person}, ${structured.quote.role}${structured.quote.company ? ` bei ${structured.quote.company}` : ''}</footer>
</blockquote>

<hr>

<p><em>${structured.boilerplate}</em></p>
`;

    console.log('Structured press release generated successfully', { 
      headline: structured.headline,
      leadLength: structured.leadParagraph?.length,
      bodyParagraphs: structured.bodyParagraphs?.length,
      hasQuote: !!structured.quote.text,
      context: context,
      promptUsed: systemPrompt.substring(0, 200) + '...'
    });

    return NextResponse.json({
      success: true,
      structured: structured,
      headline: structured.headline,
      htmlContent: htmlContent.trim(),
      rawText: generatedText,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating structured press release:', error);

    // Spezifische Fehlerbehandlung
    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Ungültiger Gemini API Key' },
        { status: 401 }
      );
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      return NextResponse.json(
        { error: 'Gemini Quota erreicht. Bitte versuche es später erneut.' },
        { status: 429 }
      );
    } else if (error.message?.includes('SAFETY')) {
      return NextResponse.json(
        { error: 'Content wurde von Gemini Safety-Filtern blockiert. Bitte formuliere anders.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: `Fehler bei der strukturierten KI-Generierung: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}