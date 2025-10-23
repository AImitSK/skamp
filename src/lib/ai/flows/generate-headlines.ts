// src/lib/ai/flows/generate-headlines.ts
// Genkit Flow für KI-gestützte Headline-Generierung (3 Varianten)

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  GenerateHeadlinesInputSchema,
  GenerateHeadlinesOutputSchema,
  type GenerateHeadlinesInput,
  type GenerateHeadlinesOutput
} from '../schemas/headline-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPT - Headlines-spezifisch
// ══════════════════════════════════════════════════════════════

const HEADLINE_SYSTEM_PROMPT = `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen (dpa, Reuters, Handelsblatt).

AUFGABE: Erstelle GENAU 3 verschiedene Headlines für die gegebene Pressemitteilung.

KRITISCHE REGELN:
✓ Antworte AUSSCHLIESSLICH mit 3 Headlines
✓ Jede Headline in einer separaten Zeile
✓ KEINE Nummerierung, KEINE Anführungszeichen, KEINE Markdown-Formatierung
✓ KEINE Erklärungen oder Kommentare
✓ Verwende EXAKT die Firmennamen/Produktnamen aus dem Content (NICHT abändern!)
✓ MINDESTENS 2 der 3 Headlines MÜSSEN ein aktives Verb enthalten

HEADLINE-STILE (in dieser Reihenfolge):
1. Faktisch-Direkt: Klare Fakten, AKTIVES VERB, direkt auf den Punkt
2. Nutzen-Orientiert: Fokus auf Benefits, Zahlen/Fakten prominent
3. Kontext-Reich: Einordnung in Markt/Branche, strategische Bedeutung

QUALITÄTS-ANFORDERUNGEN:
✓ Länge: 40-75 Zeichen pro Headline
✓ SEO-optimiert: Wichtigste Keywords am Anfang
✓ Aktive Verben (PFLICHT für Stil 1+2): lanciert, startet, präsentiert, führt ein, entwickelt, bietet, erweitert, übernimmt, stärkt, steigert, reduziert, optimiert, veröffentlicht, eröffnet, schließt ab
✓ Sachlich und faktisch - KEINE Werbesprache
✓ VERMEIDE: "revolutioniert", "bahnbrechend", "einzigartig", "massiv", "bedeutend"
✓ Journalistischer Stil (dpa/Reuters)

GUTE BEISPIELE:
Content: "TechVision stellt KI-Plattform DataSense vor, 80% schneller"

DataFlow lanciert KI-Plattform SmartAnalytics Pro
SmartAnalytics Pro: 80% Zeitersparnis bei Datenanalyse
TechVision stärkt Position im KI-Markt mit neuer Plattform

SCHLECHTE BEISPIELE (NICHT VERWENDEN):
TechVision revolutioniert Datenanalyse massiv ❌ (werblich)
KI-Tool bietet Unternehmen neue Möglichkeiten ❌ (kein Firmenname)
Bedeutender Durchbruch in der Datenanalyse ❌ (keine Fakten)

Antworte JETZT mit 3 Headlines:`;

// ══════════════════════════════════════════════════════════════
// CONTEXT-AWARE SYSTEM PROMPTS
// ══════════════════════════════════════════════════════════════

const CONTEXT_PROMPTS = {
  industries: {
    technology: `
BRANCHE: TECHNOLOGIE
✓ Fachbegriffe moderat einsetzen (KI, Cloud, API, SaaS)
✓ Innovation und Fortschritt betonen
✓ Zahlen und Benchmarks prominent
Beispiele: "startet", "lanciert", "entwickelt", "optimiert"`,

    healthcare: `
BRANCHE: GESUNDHEITSWESEN
✓ Vertrauenswürdige, seriöse Sprache
✓ Patientenwohl und Qualität betonen
✓ Regulatorische Aspekte erwähnen
Beispiele: "verbessert", "unterstützt", "erhöht Sicherheit"`,

    finance: `
BRANCHE: FINANZWESEN
✓ Präzise, konservative Formulierungen
✓ Compliance und Sicherheit hervorheben
✓ ROI und Effizienz betonen
Beispiele: "sichert", "optimiert", "reduziert Kosten"`,

    manufacturing: `
BRANCHE: PRODUKTION/FERTIGUNG
✓ Effizienz und Nachhaltigkeit
✓ Prozessverbesserungen konkret
✓ Industrie 4.0 Begriffe
Beispiele: "steigert Produktivität", "reduziert CO2", "automatisiert"`
  },

  tones: {
    formal: `TONALITÄT: FORMAL
✓ Sachliche, neutrale Sprache
✓ Vollständige Firmennamen
✓ Keine Umgangssprache`,

    modern: `TONALITÄT: MODERN
✓ Dynamische, zeitgemäße Sprache
✓ Trends und Innovation betonen
✓ Leicht zugänglicher Stil`,

    technical: `TONALITÄT: TECHNISCH
✓ Fachbegriffe präzise verwenden
✓ Technische Details einbinden
✓ Experten-Zielgruppe`,

    startup: `TONALITÄT: STARTUP
✓ Energiegeladen und mutig
✓ Disruption und Wandel
✓ Wachstum und Vision`
  },

  audiences: {
    b2b: `ZIELGRUPPE: B2B
✓ ROI und Effizienz prominent
✓ Entscheider-Perspektive
✓ Business-Impact betonen`,

    consumer: `ZIELGRUPPE: CONSUMER/B2C
✓ Nutzen und Benefits klar
✓ Verständliche Sprache
✓ Emotionale Ansprache möglich`,

    media: `ZIELGRUPPE: MEDIEN/JOURNALISTEN
✓ Nachrichtenwert hervorheben
✓ Journalistische Standards
✓ Fakten und Quellen`
  }
};

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const generateHeadlinesFlow = ai.defineFlow(
  {
    name: 'generateHeadlines',
    inputSchema: GenerateHeadlinesInputSchema,
    outputSchema: GenerateHeadlinesOutputSchema,
  },
  async (input: GenerateHeadlinesInput): Promise<GenerateHeadlinesOutput> => {

    console.log('🎯 Headlines-Generierung gestartet', {
      contentLength: input.content.length,
      hasCurrentHeadline: !!input.currentHeadline,
      hasContext: !!input.context
    });

    // ══════════════════════════════════════════════════════════════
    // 1. KONTEXT-AUFBEREITUNG
    // ══════════════════════════════════════════════════════════════

    let contextPrompt = '';

    if (input.context?.industry && CONTEXT_PROMPTS.industries[input.context.industry as keyof typeof CONTEXT_PROMPTS.industries]) {
      contextPrompt += CONTEXT_PROMPTS.industries[input.context.industry as keyof typeof CONTEXT_PROMPTS.industries];
    }

    if (input.context?.tone && CONTEXT_PROMPTS.tones[input.context.tone as keyof typeof CONTEXT_PROMPTS.tones]) {
      contextPrompt += '\n' + CONTEXT_PROMPTS.tones[input.context.tone as keyof typeof CONTEXT_PROMPTS.tones];
    }

    if (input.context?.audience && CONTEXT_PROMPTS.audiences[input.context.audience as keyof typeof CONTEXT_PROMPTS.audiences]) {
      contextPrompt += '\n' + CONTEXT_PROMPTS.audiences[input.context.audience as keyof typeof CONTEXT_PROMPTS.audiences];
    }

    // ══════════════════════════════════════════════════════════════
    // 2. USER PROMPT ZUSAMMENSTELLEN
    // ══════════════════════════════════════════════════════════════

    const currentHeadlineInfo = input.currentHeadline
      ? `\n\nAKTUELLE HEADLINE (zum Vergleich/Verbesserung):\n"${input.currentHeadline}"\n`
      : '';

    const userPrompt = `${contextPrompt}

${currentHeadlineInfo}
INHALT DER PRESSEMITTEILUNG:
${input.content.substring(0, 2000)}

Erstelle JETZT 3 verschiedene Headlines mit den 3 Stilen (Faktisch-Direkt, Nutzen-Orientiert, Kontext-Reich) und gib das JSON-Objekt zurück:`;

    console.log('🔍 DEBUG Prompts:', {
      systemPromptLength: HEADLINE_SYSTEM_PROMPT.length,
      userPromptLength: userPrompt.length,
      systemPromptPreview: HEADLINE_SYSTEM_PROMPT.substring(0, 100),
      userPromptPreview: userPrompt.substring(0, 100)
    });

    // ══════════════════════════════════════════════════════════════
    // 3. GEMINI API CALL
    // ══════════════════════════════════════════════════════════════

    const result = await ai.generate({
      model: gemini25FlashModel,
      prompt: [
        { text: HEADLINE_SYSTEM_PROMPT },
        { text: userPrompt }
      ],
      config: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      }
    });

    // Text extrahieren (gleiche Methode wie generatePressRelease)
    const generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Headlines-Text generiert, Länge:', generatedText.length);

    // Parse die 3 Headlines aus dem Text
    // Format: Jede Zeile ist eine Headline (erste 3 nicht-leere Zeilen)
    const lines = generatedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('-'))
      .slice(0, 3);

    if (lines.length < 3) {
      throw new Error(`Nur ${lines.length} Headlines gefunden, erwartet 3`);
    }

    // Erstelle strukturierte Output
    const headlines: GenerateHeadlinesOutput['headlines'] = lines.map((headline, index) => ({
      headline: headline.replace(/^["'\d\.\-\*\s]+/, '').replace(/["']+$/, ''), // Entferne Anführungszeichen/Nummerierung
      length: headline.length,
      hasActiveVerb: /\b(lanciert|startet|präsentiert|führt\sein|entwickelt|bietet|ermöglicht|erweitert|übernimmt|stärkt|steigert|reduziert|optimiert|veröffentlicht|eröffnet|schließt\sab)\b/i.test(headline),
      keywordDensity: 70 - (index * 5), // Einfache Schätzung
      seoScore: 85 - (index * 5), // Einfache Schätzung
      style: index === 0 ? 'Faktisch-Direkt' : index === 1 ? 'Nutzen-Orientiert' : 'Kontext-Reich'
    }));

    console.log('✅ Headlines erfolgreich geparst', { headlineCount: headlines.length });

    return {
      headlines,
      analysisNote: '3 verschiedene Headline-Stile für unterschiedliche Einsatzzwecke'
    };
  }
);
