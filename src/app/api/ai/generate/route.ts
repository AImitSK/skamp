// src/app/api/ai/generate/route.ts - KOMPLETTE DATEI ZUM COPY-PASTEN
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

// Automatische HTML-Konvertierung
function convertToHTML(text: string): string {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  let html = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip leere Zeilen
    if (!line) continue;
    
    // Erste Zeile = Headline
    if (i === 0) {
      html += `<h1>${line}</h1>\n\n`;
      continue;
    }
    
    // Zeile mit **Text** = Lead-Absatz  
    if (line.startsWith('**') && line.endsWith('**')) {
      const content = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      html += `<p><strong>${content}</strong></p>\n\n`;
      continue;
    }
    
    // Zeile mit Anführungszeichen = Zitat
    if (line.startsWith('"') || line.includes('sagt ') || line.includes(', sagt ')) {
      html += `<blockquote>${line}</blockquote>\n\n`;
      continue;
    }
    
    // Zeile mit *Über = Boilerplate
    if (line.startsWith('*Über ')) {
      const content = line.replace(/^\*/, '').replace(/\*$/, '');
      html += `<p><em>${content}</em></p>\n\n`;
      continue;
    }
    
    // Alle anderen Zeilen = normale Absätze
    html += `<p>${line}</p>\n\n`;
  }
  
  return html.trim();
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

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

Antworte NUR mit der verbesserten Pressemitteilung.`;

      userPrompt = `Bestehende Pressemitteilung:
${existingContent}

Verbesserungsanfrage: ${prompt}

Bitte verbessere die Pressemitteilung entsprechend der Anfrage:`;

    } else {
      // VERSCHÄRFTER SYSTEM-PROMPT
      systemPrompt = `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen (dpa, Reuters, Handelsblatt).

AUFGABE: Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

STRUKTUR (ZWINGEND EINHALTEN):
Zeile 1: Schlagzeile (max. 80 Zeichen, aktive Sprache, newsworthy)

**Lead-Absatz: Beantworte 5 W-Fragen in EXAKT 40-50 Wörtern**

Absatz 2: Hauptinformation ausführlich mit konkreten Details und Zahlen

Absatz 3: Hintergrund, Kontext und Bedeutung für die Branche

Absatz 4: Auswirkungen, Nutzen und Zukunftsperspektive

"Authentisches Zitat (20-35 Wörter) das die Kernbotschaft unterstützt", sagt [Name], [Position] bei [Unternehmen].

*Über [Unternehmen]: [Kurze Unternehmensbeschreibung in 2-3 Sätzen als Platzhalter]*

KRITISCHE REGELN:
✓ Lead-Absatz: MAXIMAL 50 Wörter, in **Sterne** einschließen
✓ Sachlich und objektiv, keine Werbesprache
✓ Aktive Sprache, max. 15 Wörter pro Satz
✓ Perfekte deutsche Rechtschreibung (keine Tippfehler!)
✓ Konkrete Zahlen und Fakten vor abstrakten Begriffen
✓ Journalistische Standards (dpa-Stil)
✓ Zitat in "Anführungszeichen" mit vollständiger Attribution
✓ Boilerplate mit *Sterne* markieren

VERMEIDE unbedingt:
- Werbesprache wie "revolutionär", "bahnbrechend", "einzigartig"
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange, verschachtelte Sätze
- Fachbegriffe ohne Erklärung

BEISPIEL-STRUKTUR:
TechStart reduziert Datenanalyse-Zeit um 80%

**Das Berliner Startup TechStart hat heute DataSense vorgestellt, eine KI-Plattform die Unternehmensdaten zehnmal schneller analysiert als herkömmliche Tools. Die Software ist ab sofort verfügbar.**

DataSense nutzt maschinelles Lernen und kann komplexe Datensätze in Echtzeit verarbeiten...

"Mit DataSense revolutionieren wir die Art, wie Unternehmen ihre Daten nutzen", sagt Dr. Anna Schmidt, CEO bei TechStart.

*Über TechStart: TechStart ist ein Berliner Software-Unternehmen, das 2020 gegründet wurde. Das Unternehmen entwickelt KI-basierte Lösungen für die Datenanalyse.*

Antworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung. Keine Erklärungen oder Kommentare.`;

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
    let generatedText = response.text();

    if (!generatedText || generatedText.trim() === '') {
      return NextResponse.json(
        { error: 'Keine Antwort von Gemini erhalten' },
        { status: 500 }
      );
    }

    // AUTOMATISCHE HTML-KONVERTIERUNG
    let wasConverted = false;
    if (!generatedText.includes('<h1>') && !generatedText.includes('<p>')) {
      console.log('Converting plain text to HTML...');
      generatedText = convertToHTML(generatedText);
      wasConverted = true;
    }

    console.log('Press release generated successfully with Gemini', { 
      outputLength: generatedText.length,
      model: "gemini-1.5-flash",
      mode: mode,
      hasContext: !!context,
      wasConverted: wasConverted
    });

    return NextResponse.json({
      success: true,
      generatedText: generatedText,
      mode: mode,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString(),
      postProcessed: wasConverted
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