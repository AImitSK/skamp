// src/lib/ai/flows/analyze-keyword-seo.ts
// Genkit Flow für SEO-Keyword-Analyse mit KI

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  AnalyzeKeywordSEOInputSchema,
  AnalyzeKeywordSEOOutputSchema,
  type AnalyzeKeywordSEOInput,
  type AnalyzeKeywordSEOOutput,
  type TargetAudience,
  type Tonality,
  scoreToKeywordFit,
  calculateAverageScore
} from '../schemas/analyze-keyword-seo-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Du bist ein erfahrener SEO-Analyst und Content-Stratege mit Expertise in:
- Keyword-Relevanz-Analyse für PR und Content Marketing
- Zielgruppen-Segmentierung (B2B, B2C, Fachpublikum, etc.)
- Tonalitäts-Erkennung und Schreibstil-Analyse
- Semantische Content-Bewertung

ANALYSE-METHODIK:

1. SEMANTISCHE RELEVANZ (0-100):
   - 90-100: Keyword ist zentrales Thema, mehrfach prominent genannt
   - 70-89: Keyword passt sehr gut, ist klar relevant für den Content
   - 50-69: Keyword passt moderat, ist thematisch verbunden
   - 30-49: Keyword ist tangential oder randständig erwähnt
   - 0-29: Keyword ist irrelevant oder fehlt komplett

2. KONTEXT-QUALITÄT (0-100):
   - 90-100: Perfekt natürliche Einbindung, fließt organisch in den Text
   - 70-89: Sehr gute Einbindung, wirkt authentisch
   - 50-69: Ordentliche Einbindung, teilweise etwas forciert
   - 30-49: Keyword wirkt aufgesetzt oder unnatürlich platziert
   - 0-29: Keyword-Stuffing oder sehr unnatürlich

3. ZIELGRUPPEN-ERKENNUNG:
   - Analysiere Fachsprache, Komplexität und Ansprache
   - B2B: Geschäftssprache, ROI, Enterprise, Lösungen
   - B2C: Nutzen-fokussiert, einfache Sprache, Emotionen
   - Verbraucher: Alltagssprache, praktischer Fokus
   - Fachpublikum: Technische Details, Spezifikationen
   - Medien: Nachrichtenwert, Relevanz, Fakten
   - Investoren: Finanzen, Wachstum, Kennzahlen

4. TONALITÄTS-ANALYSE:
   - Sachlich: Neutral, faktenorientiert, objektiv
   - Emotional: Gefühlsbetont, persönlich, storytelling
   - Verkäuferisch: Werblich, überzeugend, Call-to-Actions
   - Professionell: Geschäftlich, seriös, etabliert
   - Fachlich: Technisch, detailliert, präzise

5. VERWANDTE BEGRIFFE:
   - Finde 3-5 Begriffe die im Text vorkommen
   - Sollten thematisch zum Keyword passen
   - Keine Füllwörter oder Stoppwörter

WICHTIG:
- Sei objektiv und präzise in deiner Bewertung
- Gib realistische Scores (nicht alles 90+)
- Berücksichtige den Gesamt-Kontext des Texts
- Confidence-Scores ehrlich einschätzen`;

// ══════════════════════════════════════════════════════════════
// USER PROMPT TEMPLATE
// ══════════════════════════════════════════════════════════════

function createUserPrompt(keyword: string, text: string): string {
  // Text auf max. 10.000 Zeichen begrenzen für Performance
  const truncatedText = text.length > 10000 ? text.substring(0, 10000) + '...' : text;

  return `Analysiere das Keyword "${keyword}" im folgenden PR-Text:

═══════════════════════════════════════════════════════════════
TEXT (${truncatedText.length} Zeichen):
═══════════════════════════════════════════════════════════════

${truncatedText}

═══════════════════════════════════════════════════════════════
ANALYSE-AUFGABE:
═══════════════════════════════════════════════════════════════

Bewerte das Keyword "${keyword}" anhand folgender Kriterien:

1. SEMANTISCHE RELEVANZ (0-100):
   Wie gut passt das Keyword thematisch zum Content?

2. KONTEXT-QUALITÄT (0-100):
   Wie natürlich ist das Keyword in den Text eingebunden?

3. ZIELGRUPPE:
   Wähle DIE EINE Haupt-Zielgruppe:
   - B2B (Business Kunden)
   - B2C (Endkunden)
   - Verbraucher (Privatpersonen)
   - Fachpublikum (Experten)
   - Medien (Journalisten)
   - Investoren (Finanzwelt)
   - Mitarbeiter (Intern)
   - Öffentlichkeit (Allgemein)
   - Unbekannt (Nicht erkennbar)

4. ZIELGRUPPEN-KONFIDENZ (0-100):
   Wie sicher bist du bei der Zielgruppen-Einschätzung?

5. TONALITÄT:
   Wähle DIE EINE dominante Tonalität:
   - Sachlich (Neutral, faktenorientiert)
   - Emotional (Gefühlsbetont)
   - Verkäuferisch (Werblich)
   - Professionell (Geschäftlich)
   - Fachlich (Technisch)
   - Locker (Casual)
   - Formell (Offiziell)
   - Inspirierend (Motivierend)
   - Neutral (Ausgeglichen)

6. TONALITÄTS-KONFIDENZ (0-100):
   Wie sicher bist du bei der Tonalitäts-Einschätzung?

7. VERWANDTE BEGRIFFE:
   Finde 3-5 Begriffe aus dem Text, die thematisch zum Keyword passen

8. EMPFEHLUNGEN:
   Gib bis zu 3 konkrete Verbesserungsvorschläge (falls Scores < 70)

Antworte im JSON-Format mit diesem exakten Schema:
{
  "semanticRelevance": <number 0-100>,
  "contextQuality": <number 0-100>,
  "targetAudience": "<eine der obigen Zielgruppen>",
  "targetAudienceConfidence": <number 0-100>,
  "tonality": "<eine der obigen Tonalitäten>",
  "tonalityConfidence": <number 0-100>,
  "relatedTerms": ["<Begriff1>", "<Begriff2>", "<Begriff3>"],
  "recommendations": ["<Empfehlung1>", "<Empfehlung2>"]
}`;
}

// ══════════════════════════════════════════════════════════════
// TEXT CLEANING HELPER
// ══════════════════════════════════════════════════════════════

/**
 * Bereinigt HTML und Markdown aus Text für bessere Analyse
 */
function cleanTextForAnalysis(text: string): string {
  let cleaned = text;

  // HTML Tags entfernen
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  // Markdown entfernen
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
  cleaned = cleaned.replace(/#{1,6}\s+/g, ''); // Headlines
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links

  // Mehrfache Leerzeichen normalisieren
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// ══════════════════════════════════════════════════════════════
// JSON RESPONSE PARSER
// ══════════════════════════════════════════════════════════════

/**
 * Parst JSON aus AI-Response mit Fallback-Extraktion
 */
function parseAIResponse(aiText: string): any {
  try {
    // Versuch 1: Direktes JSON-Parse
    return JSON.parse(aiText);
  } catch (e1) {
    try {
      // Versuch 2: JSON aus Text extrahieren
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e2) {
      // Versuch 3: Zwischen ``` extrahieren
      const codeBlockMatch = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
    }
  }

  throw new Error('Could not parse JSON from AI response');
}

// ══════════════════════════════════════════════════════════════
// FALLBACK VALUES
// ══════════════════════════════════════════════════════════════

/**
 * Erzeugt Fallback-Werte wenn AI-Analyse fehlschlägt
 */
function createFallbackResponse(keyword: string, text: string): AnalyzeKeywordSEOOutput {
  const cleanedText = cleanTextForAnalysis(text);

  // Basis-Keyword-Erkennung
  const keywordLower = keyword.toLowerCase();
  const textLower = cleanedText.toLowerCase();
  const keywordOccurrences = (textLower.match(new RegExp(`\\b${keywordLower}\\b`, 'g')) || []).length;

  // Rudimentäre Relevanz basierend auf Vorkommen
  const semanticRelevance = Math.min(100, keywordOccurrences * 15 + 30);
  const contextQuality = Math.min(100, keywordOccurrences * 10 + 40);

  return {
    keyword,
    semanticRelevance,
    contextQuality,
    targetAudience: 'Unbekannt' as TargetAudience,
    targetAudienceConfidence: 20,
    tonality: 'Neutral' as Tonality,
    tonalityConfidence: 20,
    relatedTerms: [],
    keywordFit: scoreToKeywordFit(calculateAverageScore(semanticRelevance, contextQuality)),
    recommendations: ['KI-Analyse fehlgeschlagen - Manuelle Prüfung empfohlen'],
    analysisTimestamp: new Date().toISOString(),
    textLength: text.length
  };
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const analyzeKeywordSEOFlow = ai.defineFlow(
  {
    name: 'analyzeKeywordSEO',
    inputSchema: AnalyzeKeywordSEOInputSchema,
    outputSchema: AnalyzeKeywordSEOOutputSchema,
  },
  async (input: AnalyzeKeywordSEOInput): Promise<AnalyzeKeywordSEOOutput> => {
    console.log('🔍 SEO-Keyword-Analyse gestartet', {
      keyword: input.keyword,
      textLength: input.text.length
    });

    try {
      // Text bereinigen
      const cleanedText = cleanTextForAnalysis(input.text);

      // User Prompt erstellen
      const userPrompt = createUserPrompt(input.keyword, cleanedText);

      // AI-Anfrage mit JSON-Mode
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: SYSTEM_PROMPT },
          { text: userPrompt }
        ],
        config: {
          temperature: 0.3, // Niedrig für konsistente Analysen
          maxOutputTokens: 4096, // Erhöht für Extended Thinking bei komplexen Analysen
        },
        output: {
          format: 'json',
          schema: AnalyzeKeywordSEOOutputSchema
        }
      });

      // Response extrahieren
      const responseText = result.message?.content?.[0]?.text || result.text || '';

      if (!responseText) {
        console.warn('⚠️ Leere AI-Response, nutze Fallback');
        return createFallbackResponse(input.keyword, input.text);
      }

      // JSON parsen
      let parsedData: any;
      try {
        parsedData = parseAIResponse(responseText);
      } catch (parseError) {
        console.error('❌ JSON-Parsing fehlgeschlagen:', parseError);
        return createFallbackResponse(input.keyword, input.text);
      }

      // Validate und transformieren
      const averageScore = calculateAverageScore(
        parsedData.semanticRelevance || 50,
        parsedData.contextQuality || 50
      );

      const output: AnalyzeKeywordSEOOutput = {
        keyword: input.keyword,
        semanticRelevance: Math.min(100, Math.max(0, parsedData.semanticRelevance || 50)),
        contextQuality: Math.min(100, Math.max(0, parsedData.contextQuality || 50)),
        targetAudience: parsedData.targetAudience || 'Unbekannt',
        targetAudienceConfidence: Math.min(100, Math.max(0, parsedData.targetAudienceConfidence || 50)),
        tonality: parsedData.tonality || 'Neutral',
        tonalityConfidence: Math.min(100, Math.max(0, parsedData.tonalityConfidence || 50)),
        relatedTerms: Array.isArray(parsedData.relatedTerms)
          ? parsedData.relatedTerms.slice(0, 5)
          : [],
        keywordFit: scoreToKeywordFit(averageScore),
        recommendations: Array.isArray(parsedData.recommendations)
          ? parsedData.recommendations.slice(0, 3)
          : [],
        analysisTimestamp: new Date().toISOString(),
        textLength: input.text.length
      };

      console.log('✅ SEO-Keyword-Analyse erfolgreich', {
        keyword: output.keyword,
        semanticRelevance: output.semanticRelevance,
        contextQuality: output.contextQuality,
        keywordFit: output.keywordFit,
        targetAudience: output.targetAudience,
        tonality: output.tonality
      });

      return output;

    } catch (error: any) {
      console.error('❌ Fehler in SEO-Keyword-Analyse:', error);

      // Fallback bei kritischem Fehler
      return createFallbackResponse(input.keyword, input.text);
    }
  }
);
