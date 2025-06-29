// src/app/api/ai/generate-structured/route.ts - NEUE DATEI ERSTELLEN
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

// Parsing-Funktion für strukturierte Ausgabe
function parseStructuredOutput(text: string): StructuredPressRelease {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote = { text: '', person: '', role: '', company: '' };
  let boilerplate = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Erste Zeile = Headline
    if (i === 0) {
      headline = line;
      continue;
    }
    
    // Lead-Absatz (mit **)
    if (line.startsWith('**') && line.endsWith('**')) {
      leadParagraph = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      continue;
    }
    
    // Zitat parsen
    if (line.startsWith('"') && line.includes('sagt ')) {
      const quoteMatch = line.match(/"([^"]+)",?\s*sagt\s+([^,]+),\s*([^,]+)\s+bei\s+([^.]+)/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3].trim(),
          company: quoteMatch[4].trim()
        };
      } else {
        quote.text = line;
      }
      continue;
    }
    
    // Boilerplate (mit *)
    if (line.startsWith('*Über ')) {
      boilerplate = line.replace(/^\*/, '').replace(/\*$/, '');
      continue;
    }
    
    // Normale Absätze = Body
    if (!line.startsWith('"') && !line.startsWith('*')) {
      bodyParagraphs.push(line);
    }
  }
  
  return {
    headline,
    leadParagraph,
    bodyParagraphs,
    quote,
    boilerplate
  };
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

    console.log('Generating structured press release with Gemini', { 
      promptLength: prompt.length,
      context: context 
    });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Strukturierter System-Prompt für getrennte Ausgabe
    const systemPrompt = `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen.

AUFGABE: Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

STRUKTUR (ZWINGEND EINHALTEN):
Zeile 1: Schlagzeile (max. 80 Zeichen, aktive Sprache, newsworthy)

**Lead-Absatz: Beantworte 5 W-Fragen in EXAKT 40-50 Wörtern**

Absatz 2: Hauptinformation ausführlich mit konkreten Details und Zahlen

Absatz 3: Hintergrund, Kontext und Bedeutung für die Branche

Absatz 4: Auswirkungen, Nutzen und Zukunftsperspektive

"Authentisches Zitat (20-35 Wörter)", sagt [Vollständiger Name], [Position] bei [Unternehmen].

*Über [Unternehmen]: [Kurze Unternehmensbeschreibung in 2-3 Sätzen]*

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
- Zu lange Sätze (max. 15 Wörter)

Antworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.`;

    // Kontext hinzufügen
    let contextInfo = '';
    if (context?.industry) {
      contextInfo += `\nBRANCHE: ${context.industry}`;
    }
    if (context?.tone) {
      contextInfo += `\nTONALITÄT: ${context.tone.toUpperCase()}`;
    }
    if (context?.audience) {
      contextInfo += `\nZIELGRUPPE: ${context.audience}`;
    }

    const userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}${contextInfo}`;

    // Gemini Anfrage
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

    // HTML für Editor generieren
    const htmlContent = `<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>"${structured.quote.text}", sagt ${structured.quote.person}, ${structured.quote.role} bei ${structured.quote.company}.</blockquote>

<p><em>${structured.boilerplate}</em></p>`;

    console.log('Structured press release generated successfully', { 
      headline: structured.headline,
      bodyParagraphs: structured.bodyParagraphs.length,
      hasQuote: !!structured.quote.text,
      outputLength: generatedText.length
    });

    return NextResponse.json({
      success: true,
      structured: structured,
      headline: structured.headline,
      htmlContent: htmlContent,
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