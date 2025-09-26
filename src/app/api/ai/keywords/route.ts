// src/app/api/ai/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key aus Umgebungsvariablen
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

interface KeywordRequest {
  text: string;
  maxKeywords?: number;
}

export async function POST(request: NextRequest) {
  try {
    // API Key Check
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Request Body parsen
    const data: KeywordRequest = await request.json();
    const { text, maxKeywords = 5 } = data;

    // Validierung
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('🔍 Keyword extraction request:', { 
      textLength: text.length,
      maxKeywords,
      textPreview: text.substring(0, 100) + '...'
    });

    // Gemini initialisieren
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // SPEZIFISCHER SYSTEM-PROMPT NUR FÜR KEYWORD-EXTRAKTION
    const systemPrompt = `Du bist ein SEO-Keyword-Spezialist. Deine EINZIGE Aufgabe ist es, aus Texten die wichtigsten Keywords zu extrahieren.

KRITISCHE REGELN:
- Antworte AUSSCHLIESSLICH mit ${maxKeywords} Keywords
- Trenne Keywords NUR mit Komma und Leerzeichen
- NIEMALS Sätze, Erklärungen oder Pressemitteilungen schreiben
- Maximal 3 Wörter pro Keyword
- Fokus: Unternehmen, Produkte, Technologien, Branchen

BEISPIEL KORREKTE ANTWORT:
Digitale Transformation, KI-Technologie, Startup Berlin, Cloud Computing, Softwareentwicklung

FALSCHE ANTWORTEN (NIEMALS SO):
- Ganze Sätze oder Absätze
- Erklärungen wie "Die Keywords sind..."
- HTML-Tags oder Formatierung
- Pressemitteilungstexte

Antworte JETZT nur mit Keywords:`;

    const userPrompt = `Extrahiere ${maxKeywords} SEO-Keywords aus diesem Text:

${text}`;

    // Gemini Anfrage
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = await result.response;
    let keywords = response.text();

    if (!keywords || keywords.trim() === '') {
      return NextResponse.json(
        { error: 'Keine Keywords von der KI erhalten' },
        { status: 500 }
      );
    }

    // Bereinige und parse Keywords
    keywords = keywords
      .replace(/<[^>]*>/g, '') // HTML-Tags entfernen
      .replace(/\*\*/g, '') // Markdown entfernen
      .replace(/\n+/g, ' ') // Zeilenumbrüche
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen
      .trim();

    // Split und validiere
    const keywordArray = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .filter(k => k.length <= 50)
      .filter(k => k.split(' ').length <= 3)
      .filter(k => !k.includes('.') || k.endsWith('.de'))
      .slice(0, maxKeywords);

    console.log('✅ Extracted keywords:', keywordArray);

    return NextResponse.json({
      success: true,
      keywords: keywordArray,
      confidence: keywordArray.length > 0 ? 0.9 : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error extracting keywords:', error);

    return NextResponse.json(
      { error: `Fehler bei der Keyword-Extraktion: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}