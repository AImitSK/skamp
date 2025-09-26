// src/app/api/ai/email-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  EmailAnalysisRequest,
  EmailAnalysisResponse,
  EmailSentimentAnalysis,
  EmailIntentAnalysis,
  EmailPriorityAnalysis,
  EmailCategoryAnalysis,
  EmailFullAnalysis
} from '@/types/ai';

// Nutze bestehende Gemini Konfiguration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // API Key Check (wie in bestehender generate route)
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Request Body parsen
    const data: EmailAnalysisRequest = await request.json();
    const { emailContent, htmlContent, subject, fromEmail, analysisType, context } = data;

    // Validierung
    if (!emailContent || !subject || !fromEmail || !analysisType) {
      return NextResponse.json(
        { error: 'EmailContent, Subject, FromEmail und AnalysisType sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('Analyzing email with Gemini', { 
      analysisType, 
      contentLength: emailContent.length,
      fromEmail,
      hasContext: !!context 
    });

    // Gemini initialisieren (wie in bestehender route)
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // Analysis-spezifische Prompts
    let systemPrompt: string;
    let userPrompt: string;

    switch (analysisType) {
      case 'sentiment':
        systemPrompt = `Du bist ein Experte für Email-Sentimentanalyse. Analysiere die emotionale Stimmung der Email.

AUFGABE: Bestimme das Sentiment und die emotionale Tonalität der Email.

SENTIMENT-KATEGORIEN:
- positive: Zufrieden, dankbar, höflich, konstruktiv
- neutral: Sachlich, informativ, neutral
- negative: Unzufrieden, frustriert, kritisch
- urgent: Dringend, sofortiger Handlungsbedarf

ANALYSIERE:
✓ Grundlegende Stimmung (positive/neutral/negative/urgent)
✓ Emotionale Intensität (0.0-1.0)
✓ Dringlichkeitslevel (low/medium/high/urgent)
✓ Schlüsselphrasen die das Sentiment zeigen
✓ Emotionale Tonalitäten (höflich, frustriert, dankbar, etc.)

ANTWORTE NUR als JSON in folgendem Format:
{
  "sentiment": "positive|neutral|negative|urgent",
  "confidence": 0.85,
  "emotionalTone": ["höflich", "dankbar"],
  "keyPhrases": ["vielen Dank", "sehr zufrieden"],
  "urgencyLevel": "low|medium|high|urgent"
}`;
        break;

      case 'intent':
        systemPrompt = `Du bist ein Experte für Email-Intent-Analyse. Bestimme die Absicht und den Zweck der Email.

AUFGABE: Erkenne die Hauptabsicht der Email und erforderliche Handlungen.

INTENT-KATEGORIEN:
- question: Stellt eine Frage, braucht Antwort
- complaint: Beschwerde, Problem melden
- request: Anfrage nach Service/Produkt/Information
- information: Informiert über etwas, keine Antwort nötig
- compliment: Lob, positives Feedback
- other: Andere Absicht

ANALYSIERE:
✓ Hauptabsicht der Email
✓ Ist eine Handlung erforderlich?
✓ Welche spezifischen Aktionen werden benötigt?
✓ Gibt es ein passendes Antwort-Template?

ANTWORTE NUR als JSON:
{
  "intent": "question|complaint|request|information|compliment|other",
  "confidence": 0.9,
  "actionRequired": true,
  "suggestedActions": ["Frage beantworten", "Termin vereinbaren"],
  "responseTemplate": "Danke für Ihre Anfrage..."
}`;
        break;

      case 'priority':
        systemPrompt = `Du bist ein Experte für Email-Prioritätsbewertung. Bestimme die Dringlichkeit und Priorität der Email.

AUFGABE: Bewerte die Priorität basierend auf Inhalt, Kontext und Dringlichkeit.

PRIORITÄTS-STUFEN:
- low: Routine, keine Eile (48h+ SLA)
- normal: Standard Business (24h SLA)
- high: Wichtig, zeitnah bearbeiten (4h SLA)
- urgent: Kritisch, sofort bearbeiten (1h SLA)

BEWERTUNGSKRITERIEN:
✓ Dringlichkeits-Indikatoren ("ASAP", "sofort", "dringend")
✓ Business Impact (Umsatz, Kunde, Problem)
✓ Emotionale Intensität (Ärger, Frustration)
✓ Zeitkritische Aspekte
✓ Eskalations-Bedarf

ANTWORTE NUR als JSON:
{
  "priority": "low|normal|high|urgent",
  "confidence": 0.8,
  "reasoning": "Kunde meldet kritischen Produktfehler",
  "slaRecommendation": 4,
  "escalationNeeded": false
}`;
        break;

      case 'category':
        systemPrompt = `Du bist ein Experte für Email-Kategorisierung. Ordne Emails den richtigen Abteilungen zu.

AUFGABE: Kategorisiere die Email und schlage passende Zuweisungen vor.

HAUPT-KATEGORIEN:
- sales: Verkaufsanfragen, Angebote, Preise
- support: Technische Probleme, Hilfe, Bugs
- billing: Rechnungen, Zahlungen, Preise
- partnership: Kooperationen, B2B-Anfragen
- hr: Bewerbungen, Personal, Jobs
- marketing: Kampagnen, Content, Events
- legal: Rechtsfragen, Verträge, Compliance
- other: Andere Kategorie

ANALYSIERE:
✓ Hauptkategorie basierend auf Inhalt
✓ Spezifische Unterkategorie
✓ Empfohlene Abteilung
✓ Möglicher Ansprechpartner

ANTWORTE NUR als JSON:
{
  "category": "sales|support|billing|partnership|hr|marketing|legal|other",
  "confidence": 0.95,
  "subcategory": "Technischer Support",
  "suggestedDepartment": "Support Team",
  "suggestedAssignee": "Senior Support Specialist"
}`;
        break;

      case 'full':
        systemPrompt = `Du bist ein umfassender Email-Analyse-Experte. Führe eine vollständige Analyse durch.

AUFGABE: Kombiniere Sentiment, Intent, Priorität und Kategorisierung in einer umfassenden Analyse.

VOLLSTÄNDIGE ANALYSE umfasst:
✓ Sentiment-Analyse
✓ Intent-Erkennung  
✓ Prioritäts-Bewertung
✓ Kategorisierung
✓ Zusammenfassung
✓ Key Insights
✓ Antwort-Vorschlag
✓ Kunden-Insights

ANTWORTE NUR als JSON mit vollständiger Struktur:
{
  "sentiment": {
    "sentiment": "neutral",
    "confidence": 0.8,
    "emotionalTone": ["professionell"],
    "keyPhrases": ["wichtige Anfrage"],
    "urgencyLevel": "medium"
  },
  "intent": {
    "intent": "request",
    "confidence": 0.9,
    "actionRequired": true,
    "suggestedActions": ["Angebot erstellen"],
    "responseTemplate": "Danke für Ihr Interesse..."
  },
  "priority": {
    "priority": "high",
    "confidence": 0.85,
    "reasoning": "Qualifizierte Verkaufsanfrage",
    "slaRecommendation": 4,
    "escalationNeeded": false
  },
  "category": {
    "category": "sales",
    "confidence": 0.95,
    "subcategory": "Produktanfrage",
    "suggestedDepartment": "Sales",
    "suggestedAssignee": "Account Manager"
  },
  "summary": "Professionelle Produktanfrage eines Interessenten",
  "keyInsights": ["Qualifizierter Lead", "Zeitnah bearbeiten"],
  "suggestedResponse": {
    "tone": "professional",
    "template": "Vielen Dank für Ihr Interesse...",
    "keyPoints": ["Produkt-Features", "Preise", "Demo-Termin"]
  },
  "customerInsights": {
    "satisfactionLevel": "medium",
    "relationshipStatus": "new",
    "nextBestAction": "Persönliches Gespräch vereinbaren"
  }
}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unbekannter AnalysisType: ${analysisType}` },
          { status: 400 }
        );
    }

    // Kontext hinzufügen falls vorhanden
    let contextInfo = '';
    if (context?.threadHistory?.length) {
      contextInfo += `\nTHREAD-KONTEXT: Vorherige Nachrichten im Thread:\n${context.threadHistory.join('\n---\n')}`;
    }
    if (context?.customerInfo) {
      contextInfo += `\nKUNDE-INFO: ${context.customerInfo}`;
    }
    if (context?.campaignContext) {
      contextInfo += `\nKAMPAGNE-KONTEXT: ${context.campaignContext}`;
    }

    userPrompt = `EMAIL ZU ANALYSIEREN:
Betreff: ${subject}
Von: ${fromEmail}
Inhalt: ${emailContent}${contextInfo}

Führe eine ${analysisType}-Analyse durch und antworte ausschließlich mit dem JSON-Objekt:`;

    // Gemini Anfrage (wie in bestehender route)
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
    let analysis;
    try {
      // Bereinige die Antwort (entferne ```json etc.)
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
      console.error('Raw response:', generatedText);
      
      return NextResponse.json(
        { error: 'Fehler beim Parsen der KI-Antwort' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Confidence aus der Analyse extrahieren
    let confidence = 0.5; // default
    if (analysisType === 'full' && analysis.sentiment?.confidence) {
      confidence = analysis.sentiment.confidence;
    } else if (analysis.confidence) {
      confidence = analysis.confidence;
    }

    console.log('Email analysis completed successfully', { 
      analysisType,
      processingTime,
      confidence,
      model: "gemini-1.5-flash"
    });

    const responseData: EmailAnalysisResponse = {
      success: true,
      analysis,
      analysisType,
      processingTime,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString(),
      confidence
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error analyzing email with Gemini:', error);

    // Nutze bestehende Gemini Error Handling Logic
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
        { error: 'Email-Inhalt wurde von Gemini Safety-Filtern blockiert.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: `Fehler bei der Email-Analyse: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}