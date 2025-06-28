// src/app/api/ai/generate/route.ts - OPTIMIERTE VERSION
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
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
  };
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
    const { prompt, mode, existingContent, context } = data;

    // Validierung
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('Generating press release with Gemini', { 
      mode, 
      promptLength: prompt.length,
      context: context 
    });

    // Gemini initialisieren
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // System-Prompt vorbereiten
    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'improve' && existingContent) {
      systemPrompt = `Du bist ein erfahrener Lektor für Pressemitteilungen mit 15+ Jahren Erfahrung bei führenden deutschen Medien.

AUFGABE: Verbessere die gegebene Pressemitteilung entsprechend der spezifischen Anfrage.

VERBESSERUNGS-BEREICHE:
✓ Klarheit und Verständlichkeit
✓ Journalistische Struktur optimieren
✓ Sprachliche Qualität erhöhen
✓ Faktenkonsistenz sicherstellen
✓ Zielgruppen-Ansprache verbessern

HÄUFIGE PROBLEME BEHEBEN:
- Zu viele Adjektive → Konkrete Fakten
- Passive Sprache → Aktive Formulierungen  
- Unklare Statements → Präzise Aussagen
- Fehlende W-Fragen → Vollständige Information
- Schwache Headlines → Starke, faktische Schlagzeilen

QUALITÄTS-STANDARDS:
✓ Sachlich und objektiv, keine Werbesprache
✓ Aktive Sprache, max. 15 Wörter pro Satz
✓ Perfekte deutsche Rechtschreibung
✓ Konkrete Fakten vor abstrakten Begriffen
✓ Journalistische Standards (dpa-Stil)

Behalte die HTML-Formatierung bei und antworte NUR mit der verbesserten Pressemitteilung.`;

      userPrompt = `Bestehende Pressemitteilung:
${existingContent}

Verbesserungsanfrage: ${prompt}

Bitte verbessere die Pressemitteilung entsprechend der Anfrage:`;

    } else {
      // OPTIMIERTER HAUPT-PROMPT für Generierung
      systemPrompt = `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen (dpa, Reuters, Handelsblatt).

AUFGABE: Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

<h1>Prägnante Schlagzeile (max. 80 Zeichen, aktive Sprache)</h1>

<p><strong>Lead-Absatz mit 5 W-Fragen (Wer, Was, Wann, Wo, Warum) in 40-60 Wörtern</strong></p>

<p>Absatz 1: Hauptinformation ausführlich mit konkreten Details und Zahlen</p>

<p>Absatz 2: Hintergrund, Kontext und Bedeutung für die Branche</p>

<p>Absatz 3: Auswirkungen, Nutzen und Zukunftsperspektive</p>

<blockquote>"Authentisches Zitat (20-35 Wörter) das die Kernbotschaft unterstützt", sagt [Name], [Position] bei [Unternehmen].</blockquote>

<p><em>Über [Unternehmen]: [Kurze Unternehmensbeschreibung in 2-3 Sätzen als Platzhalter]</em></p>

QUALITÄTS-STANDARDS:
✓ Sachlich und objektiv, keine Werbesprache oder Superlative
✓ Aktive Sprache, Präsens, max. 15 Wörter pro Satz
✓ Perfekte deutsche Rechtschreibung und Grammatik
✓ Journalistische Standards (dpa-Stil)
✓ Konkrete Fakten und Zahlen vor abstrakten Begriffen
✓ Zielgruppen-relevante Informationen
✓ Newsworthy Hook in der Headline

VERMEIDE unbedingt:
- Werbesprache wie "revolutionär", "bahnbrechend", "einzigartig"
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange, verschachtelte Sätze
- Fachbegriffe ohne Erklärung (außer für Fachmedien)

Antworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung im HTML-Format. Keine Erklärungen oder Kommentare.`;

      // Kontext-bewusster User-Prompt
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

      userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}${contextInfo}`;
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
      model: "gemini-1.5-flash",
      mode: mode,
      hasContext: !!context
    });

    return NextResponse.json({
      success: true,
      generatedText: generatedText,
      mode: mode,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString()
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
    } else if (error.message?.includes('RECITATION')) {
      return NextResponse.json(
        { error: 'Der generierte Inhalt war zu ähnlich zu bestehenden Texten. Bitte formuliere den Prompt anders.' },
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