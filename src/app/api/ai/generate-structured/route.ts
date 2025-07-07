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

// Parsing-Funktion für strukturierte Ausgabe
function parseStructuredOutput(text: string): StructuredPressRelease {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote = { text: '', person: '', role: '', company: '' };
  let boilerplate = '';
  
  let inBody = false;
  let bodyCount = 0;
  let foundHeadline = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Erste nicht-leere Zeile = Headline
    if (!foundHeadline && !headline) {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      foundHeadline = true;
      continue;
    }
    
    // Lead-Absatz - flexiblere Erkennung
    if (!leadParagraph && foundHeadline && !line.startsWith('"') && !line.startsWith('*Über')) {
      // Prüfe ob es ein Lead-Absatz sein könnte (mit oder ohne **)
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      } else if (!inBody && line.length > 50 && line.length < 300) {
        // Wenn kein ** vorhanden, aber es sieht nach einem Lead aus
        leadParagraph = line;
      }
      
      if (leadParagraph) {
        inBody = true;
        continue;
      }
    }
    
    // Zitat parsen
    if (line.startsWith('"')) {
      const fullQuote = line;
      
      // Versuche verschiedene Zitat-Formate zu parsen
      const quoteMatch = fullQuote.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
      } else {
        // Fallback für einfache Zitate
        const simpleMatch = line.match(/"([^"]+)"/);
        if (simpleMatch) {
          quote.text = simpleMatch[1];
        }
      }
      inBody = false;
      continue;
    }
    
    // Boilerplate (mit *)
    if (line.startsWith('*Über ') || line.startsWith('*About ')) {
      boilerplate = line.replace(/^\*/, '').replace(/\*$/, '');
      continue;
    }
    
    // Body-Absätze
    if (inBody && bodyCount < 3 && !line.startsWith('"') && !line.startsWith('*')) {
      // Wenn noch kein Lead gefunden wurde und dies der erste Body ist
      if (!leadParagraph && bodyCount === 0) {
        leadParagraph = line;
      } else {
        bodyParagraphs.push(line);
        bodyCount++;
      }
    }
  }
  
  // Validierung und Defaults
  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph && bodyParagraphs.length > 0) {
    // Nimm den ersten Body-Absatz als Lead
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
  }
  if (!leadParagraph) leadParagraph = 'Lead-Absatz fehlt';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
  if (!quote.text) quote = { text: 'Wir freuen uns über diese Entwicklung', person: 'Sprecher', role: 'Geschäftsführer', company: 'Unternehmen' };
  if (!boilerplate) boilerplate = 'Über das Unternehmen: [Platzhalter für Unternehmensbeschreibung]';
  
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