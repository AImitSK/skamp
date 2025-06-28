// src/app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key aus Umgebungsvariablen
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

interface GenerateRequest {
  prompt: string;
  mode: 'generate' | 'improve';
  existingContent?: string;
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
    const data: GenerateRequest = await request.json();
    const { prompt, mode, existingContent } = data;

    // Validierung
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('Generating press release with Gemini', { 
      mode, 
      promptLength: prompt.length 
    });

    // Gemini initialisieren
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // System-Prompt vorbereiten
    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'improve' && existingContent) {
      systemPrompt = `Du bist ein erfahrener PR-Experte und verbesserst bestehende deutsche Pressemitteilungen.

VERBESSERUNGS-GUIDELINES:
- Behalte die grundlegende Struktur bei
- Verbessere Klarheit und Verständlichkeit
- Nutze journalistische Standards
- Achte auf perfekte deutsche Rechtschreibung
- Optimiere für die Zielgruppe
- Behalte HTML-Formatierung bei

Antworte NUR mit der verbesserten Pressemitteilung im HTML-Format.`;

      userPrompt = `Bestehende Pressemitteilung:
${existingContent}

Verbesserungsanfrage: ${prompt}

Bitte verbessere die Pressemitteilung entsprechend der Anfrage:`;

    } else {
      systemPrompt = `Du bist ein erfahrener PR-Experte und Journalist. Erstelle professionelle deutsche Pressemitteilungen.

STRUKTUR einer perfekten Pressemitteilung:
1. **Headline**: Aussagekräftig, max. 80 Zeichen, fesselt Journalisten
2. **Lead**: Beantwortet die 5 W-Fragen (Wer, Was, Wann, Wo, Warum)
3. **Body**: Detaillierte Informationen, Hintergründe, Kontext
4. **Zitate**: Authentische Statements (nutze Platzhalter wie "[CEO Name]")
5. **Boilerplate**: Kurze Unternehmensbeschreibung
6. **Kontakt**: Pressekontakt-Platzhalter

STIL-GUIDELINES:
- Sachlich und objektiv, keine Werbesprache
- Kurze, prägnante Sätze (max. 20 Wörter)
- Aktive Sprache, präsente Zeit
- Journalistischer Stil, faktenfokussiert
- Perfekte deutsche Rechtschreibung
- HTML-Format mit <h1>, <p>, <blockquote> Tags

Antworte NUR mit der fertigen Pressemitteilung im HTML-Format.`;

      userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}`;
    }

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

    console.log('Press release generated successfully with Gemini', { 
      outputLength: generatedText.length,
      model: "gemini-1.5-flash"
    });

    return NextResponse.json({
      success: true,
      generatedText: generatedText,
      mode: mode,
      aiProvider: 'gemini'
    });

  } catch (error: any) {
    console.error('Error generating press release with Gemini:', error);

    // Spezifische Fehlerbehandlung für Gemini
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
        { error: `Fehler bei der KI-Generierung: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

// OPTIONS für CORS (wird automatisch von Next.js gehandhabt für same-origin)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}