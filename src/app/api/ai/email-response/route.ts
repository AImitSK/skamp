// src/app/api/ai/email-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  EmailResponseRequest,
  EmailResponseSuggestionResponse,
  EmailResponseSuggestion
} from '@/types/ai';

// Nutze bestehende Gemini Konfiguration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // API Key Check
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Request Body parsen
    const data: EmailResponseRequest = await request.json();
    const { originalEmail, responseType, context, tone = 'professional', language = 'de' } = data;

    // Validierung
    if (!originalEmail?.content || !originalEmail?.subject || !responseType) {
      return NextResponse.json(
        { error: 'OriginalEmail (content, subject) und ResponseType sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('Generating email response with Gemini', { 
      responseType,
      language,
      tone,
      hasContext: !!context 
    });

    // Gemini initialisieren
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Response-Type spezifische Prompts
    let systemPrompt: string;
    let userPrompt: string;

    const languageInstruction = language === 'de' ? 'auf Deutsch' : 'in English';
    const toneDescriptions = {
      formal: 'förmlich und geschäftsmäßig',
      friendly: 'freundlich und persönlich',
      professional: 'professionell und sachlich',
      empathetic: 'empathisch und verständnisvoll'
    };

    switch (responseType) {
      case 'answer':
        systemPrompt = `Du bist ein erfahrener Kundenservice-Experte. Erstelle hilfreiche, präzise E-Mail-Antworten.

AUFGABE: Beantworte die Kundenanfrage vollständig und ${toneDescriptions[tone]} ${languageInstruction}.

ANTWORT-QUALITÄT:
✓ Beantworte alle gestellten Fragen vollständig
✓ Verwende ${toneDescriptions[tone]} Tonalität
✓ Strukturiere die Antwort klar und verständlich
✓ Biete bei Bedarf nächste Schritte an
✓ Schließe professionell ab
✓ Keine Werbesprache oder übertriebene Höflichkeit

STRUKTUR:
- Höfliche Begrüßung/Dank
- Direkte Antwort auf die Fragen
- Zusätzliche hilfreiche Informationen
- Nächste Schritte (falls relevant)
- Professioneller Abschluss

ANTWORTE mit 3 Varianten als JSON:
{
  "suggestions": [
    {
      "responseText": "Vollständige E-Mail Antwort...",
      "tone": "${tone}",
      "confidence": 0.9,
      "keyPoints": ["Hauptpunkt 1", "Hauptpunkt 2"],
      "suggestedActions": ["Folgeaktion falls nötig"],
      "personalizations": {"customerName": "Herr/Frau [Name]"}
    }
  ]
}`;
        break;

      case 'acknowledge':
        systemPrompt = `Du bist ein Kundenservice-Experte. Erstelle professionelle Eingangsbestätigungen.

AUFGABE: Bestätige den Erhalt der E-Mail ${toneDescriptions[tone]} ${languageInstruction} und kommuniziere nächste Schritte.

BESTÄTIGUNGS-ELEMENTE:
✓ Dank für die Nachricht
✓ Bestätigung des Erhalts
✓ Kurze Zusammenfassung des Anliegens
✓ Erwartete Bearbeitungszeit
✓ Nächste Schritte
✓ Kontaktmöglichkeiten bei Rückfragen

ANTWORTE mit 3 Varianten als JSON im gleichen Format.`;
        break;

      case 'escalate':
        systemPrompt = `Du bist ein Kundenservice-Experte. Erstelle professionelle Eskalations-E-Mails.

AUFGABE: Eskaliere das Anliegen ${toneDescriptions[tone]} ${languageInstruction} an das zuständige Team.

ESKALATIONS-ELEMENTE:
✓ Verständnis für die Situation zeigen
✓ Erklärung der Weiterleitung
✓ Erwartungen für die Bearbeitung setzen
✓ Entschuldigung für eventuelle Unannehmlichkeiten
✓ Kontaktdaten für Rückfragen

ANTWORTE mit 3 Varianten als JSON im gleichen Format.`;
        break;

      case 'follow_up':
        systemPrompt = `Du bist ein Kundenservice-Experte. Erstelle professionelle Nachfass-E-Mails.

AUFGABE: Erstelle eine höfliche Nachfrage ${toneDescriptions[tone]} ${languageInstruction}.

FOLLOW-UP-ELEMENTE:
✓ Bezug auf vorherige Kommunikation
✓ Höfliche Erinnerung an offene Punkte
✓ Angebot weiterer Hilfe
✓ Klare nächste Schritte
✓ Zeitrahmen für Antwort

ANTWORTE mit 3 Varianten als JSON im gleichen Format.`;
        break;

      default:
        return NextResponse.json(
          { error: `Unbekannter ResponseType: ${responseType}` },
          { status: 400 }
        );
    }

    // Kontext aufbauen
    let contextInfo = '';
    if (context?.customerName) {
      contextInfo += `\nKUNDE: ${context.customerName}`;
    }
    if (context?.customerHistory) {
      contextInfo += `\nKUNDEN-HISTORIE: ${context.customerHistory}`;
    }
    if (context?.companyInfo) {
      contextInfo += `\nUNTERNEHMEN: ${context.companyInfo}`;
    }
    if (context?.threadHistory?.length) {
      contextInfo += `\nVORHERIGE NACHRICHTEN:\n${context.threadHistory.join('\n---\n')}`;
    }

    userPrompt = `URSPRÜNGLICHE E-MAIL:
Betreff: ${originalEmail.subject}
Von: ${originalEmail.fromEmail}
An: ${originalEmail.toEmail}
Inhalt: ${originalEmail.content}${contextInfo}

ANTWORT-TYP: ${responseType}
TONALITÄT: ${tone}
SPRACHE: ${language}

Erstelle 3 verschiedene Antwort-Varianten und antworte ausschließlich als JSON:`;

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

    // JSON aus Antwort extrahieren
    let parsedResponse;
    try {
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
      console.error('Raw response:', generatedText);
      
      return NextResponse.json(
        { error: 'Fehler beim Parsen der KI-Antwort' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Validiere dass suggestions Array vorhanden ist
    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      return NextResponse.json(
        { error: 'Ungültige KI-Antwort: Fehlende suggestions' },
        { status: 500 }
      );
    }

    console.log('Email response suggestions generated successfully', { 
      responseType,
      tone,
      language,
      suggestionsCount: parsedResponse.suggestions.length,
      processingTime,
      model: "gemini-1.5-flash"
    });

    const responseData: EmailResponseSuggestionResponse = {
      success: true,
      suggestions: parsedResponse.suggestions,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString(),
      processingTime
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error generating email response with Gemini:', error);

    // Gemini-spezifische Fehlerbehandlung
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
        { error: 'E-Mail-Inhalt wurde von Gemini Safety-Filtern blockiert.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: `Fehler bei der Response-Generierung: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}