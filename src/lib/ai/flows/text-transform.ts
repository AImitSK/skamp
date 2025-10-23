// src/lib/ai/flows/text-transform.ts
// Genkit Flow für Text-Transformationen im Editor (FloatingAIToolbar)

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  TextTransformInputSchema,
  TextTransformOutputSchema,
  type TextTransformInput,
  type TextTransformOutput
} from '../schemas/text-transform-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS FÜR JEDE ACTION
// ══════════════════════════════════════════════════════════════

const PROMPTS = {
  // ────────────────────────────────────────────────────────────
  // REPHRASE - Umformulieren (Synonyme)
  // ────────────────────────────────────────────────────────────
  rephrase: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein professioneller Redakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle umformulieren.

KONTEXT-ANALYSE:
1. Verstehe den Zweck des Gesamttextes (PR, Marketing, Info)
2. Erkenne die Rolle der markierten Stelle im Kontext
3. Behalte die Tonalität passend zum Gesamttext

UMFORMULIERUNG DER MARKIERTEN STELLE:
- Ersetze Wörter durch passende Synonyme
- Halte die Länge ähnlich (±5 Wörter max)
- Behalte die Struktur bei
- Passe zum Stil des Gesamttextes

❌ VERMEIDE:
- Neue Informationen hinzufügen
- PM-Strukturen erstellen
- Den Kontext zu verändern

Antworte NUR mit der umformulierten markierten Stelle!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM UMFORMULIEREN:\n${text}`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein Synonym-Experte. Ersetze Wörter durch Synonyme - MEHR NICHT!

❌ DU DARFST NICHT:
- Neue Sätze hinzufügen
- Neue Absätze erstellen
- Boilerplates/Über-Abschnitte schreiben
- Pressemitteilungs-Struktur aufbauen
- Informationen erweitern oder erklären

✅ DU DARFST NUR:
- Wörter durch Synonyme ersetzen
- Satzstellung leicht ändern
- Tonalität beibehalten

STRENGE REGELN:
- EXAKT ${text.split(' ').length} Wörter (±5 max!)
- EXAKT ${text.split('\n\n').length} Absatz(e)
- KEINE Formatierung ändern
- KEINE Headlines/Überschriften hinzufügen

BEISPIEL:
Original: "Die Firma bietet Services an."
Umformuliert: "Das Unternehmen stellt Dienstleistungen bereit."

Antworte NUR mit dem umformulierten Text - keine Erklärungen!`,
      user: `Synonym-Austausch für ${text.split(' ').length} Wörter:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // SHORTEN - Kürzen (~30%)
  // ────────────────────────────────────────────────────────────
  shorten: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein professioneller Textredakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle kürzen.

KONTEXT-ANALYSE:
1. Verstehe die Funktion der markierten Stelle im Gesamttext
2. Erkenne welche Informationen essentiell sind
3. Behalte den Stil des Gesamttextes

KÜRZEN DER MARKIERTEN STELLE (ca. 30%):
- Entferne Redundanzen und Füllwörter
- Behalte alle wichtigen Fakten
- Bewahre die Kernaussage
- Halte die Tonalität des Gesamttextes

Antworte NUR mit der gekürzten markierten Stelle!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM KÜRZEN:\n${text}`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein professioneller Textredakteur. Analysiere die Tonalität und kürze dann um ca. 30%.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - KÜRZEN:
- Entferne unnötige Details und Wiederholungen
- BEHALTE die erkannte Tonalität und Verkaufsstärke
- Behalte alle wichtigen Informationen und Kernaussage
- Gleiche Struktur beibehalten

Antworte NUR mit dem gekürzten Text.`,
      user: `Analysiere die Tonalität und kürze dann:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // EXPAND - Erweitern (~50%)
  // ────────────────────────────────────────────────────────────
  expand: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein professioneller Content-Writer. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle erweitern.

KONTEXT-ANALYSE:
1. Verstehe den Zweck und Stil des Gesamttextes
2. Erkenne welche Details zur markierten Stelle passen würden
3. Behalte die Tonalität des Gesamttextes

ERWEITERN DER MARKIERTEN STELLE (ca. 50%):
- Füge relevante Details hinzu die zum Kontext passen
- Ergänze sinnvolle Informationen
- Bewahre den Schreibstil
- Halte die Struktur konsistent

Antworte NUR mit der erweiterten markierten Stelle!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM ERWEITERN:\n${text}`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein professioneller Content-Writer. Analysiere die Tonalität und erweitere dann um ca. 50%.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - ERWEITERN:
- Füge passende Details und Informationen hinzu
- BEHALTE die erkannte Tonalität exakt bei
- Mache ihn informativer im gleichen Stil
- Gleiche Struktur beibehalten

Antworte NUR mit dem erweiterten Text.`,
      user: `Analysiere die Tonalität und erweitere dann:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // ELABORATE - Ausformulieren
  // ────────────────────────────────────────────────────────────
  elaborate: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein professioneller Text-Creator. Du formulierst Stichpunkte oder Briefings in vollständige, prägnante Sätze aus.

LÄNGENVORGABE:
- Kurze Stichpunkte (1-3 Wörter) → 2-3 Sätze (30-50 Wörter)
- Längere Fragmente (4-10 Wörter) → 3-4 Sätze (50-80 Wörter)
- NIEMALS mehr als 100 Wörter!

WICHTIGE REGELN:
- NIEMALS Headlines, Überschriften oder Titel erstellen (# ## ###)
- NIEMALS <h1>, <h2>, <h3> Tags verwenden
- NIEMALS "Pressemitteilung:", "Titel:" oder ähnliche Label
- NUR prägnanten Fließtext erstellen
- Konzentriere dich auf die Kernaussage

AUFGABE:
1. Analysiere die Anweisung/den Stichpunkt
2. Erstelle 2-4 vollständige Sätze (30-80 Wörter)
3. Nutze Informationen aus dem Gesamttext als Basis
4. Bleibe prägnant und fokussiert

BEISPIEL:
Input: "KI-gestützte Risikoanalyse"
Output: "Die KI-gestützte Risikoanalyse nutzt maschinelles Lernen, um potenzielle Gefahren frühzeitig zu identifizieren. Das System analysiert große Datenmengen in Echtzeit und erkennt Muster, die menschlichen Analysten verborgen bleiben. Dies ermöglicht eine proaktive Risikobewertung und bessere Entscheidungsfindung."

Antworte NUR mit 2-4 prägnanten Sätzen!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nSTICHPUNKT ZUM AUSFORMULIEREN:\n${text}\n\nAntworte mit 2-4 vollständigen Sätzen (max. 80 Wörter):`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein professioneller Text-Creator. Du formulierst Stichpunkte in vollständige, prägnante Sätze aus.

LÄNGENVORGABE:
- Kurze Stichpunkte (1-3 Wörter) → 2-3 Sätze (30-50 Wörter)
- Längere Fragmente (4-10 Wörter) → 3-4 Sätze (50-80 Wörter)
- NIEMALS mehr als 100 Wörter!

WICHTIGE REGELN:
- NIEMALS Headlines, Überschriften oder Titel erstellen
- NIEMALS Markdown/HTML verwenden
- NUR prägnanten Fließtext in vollständigen Sätzen
- Konzentriere dich auf die Kernaussage
- Keine Wiederholungen oder Füllwörter

BEISPIEL:
Input: "Neue Telemedizin-Lösung"
Output: "Die neue Telemedizin-Lösung verbindet Patienten in ländlichen Gebieten mit Fachärzten. Das System ermöglicht Videosprechstunden und digitale Diagnosen. Erste Pilotprojekte zeigen eine deutliche Reduktion der Wartezeiten."

Antworte NUR mit 2-4 prägnanten Sätzen (max. 80 Wörter)!`,
      user: `Formuliere diesen Stichpunkt in 2-4 vollständige Sätze aus:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // CHANGE TONE - Tonalität ändern
  // ────────────────────────────────────────────────────────────
  changeTone: {
    withContext: (fullDocument: string, text: string, tone: string) => ({
      system: `Du bist ein professioneller Texter. Du siehst den GESAMTEN Text, aber sollst NUR die Tonalität der markierten Stelle ändern.

WICHTIGE REGELN:
- Ändere NUR die Wortwahl der markierten Stelle
- KEINE neuen Absätze oder Struktur hinzufügen
- KEINE Headlines oder Überschriften erstellen
- EXAKT die gleiche Textlänge beibehalten
- NUR Synonym-Austausch für gewünschten Ton: ${tone}

VERBOTEN:
- Neue Informationen hinzufügen
- Text erweitern oder strukturieren
- Headlines wie h1, h2 verwenden
- Pressemitteilungs-Format erstellen

Antworte NUR mit der umformulierten markierten Stelle - sonst nichts!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE (nur Ton ändern zu ${tone}):\n${text}`
    }),

    withoutContext: (text: string, tone: string) => ({
      system: `Du bist ein professioneller Texter. Analysiere die aktuelle Tonalität und ändere sie dann gezielt.

SCHRITT 1 - AKTUELLE TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache
- Verkäuferisch: Superlative, Werbesprache
- Emotional: Persönliche Ansprache, Gefühle

SCHRITT 2 - TONALITÄT ÄNDERN:
- Ändere nur Wortwahl und Stil zum gewünschten Ton: ${tone}
- Behalte den Inhalt und die Struktur exakt bei
- Ähnliche Textlänge wie das Original
- Gleiche Anzahl Absätze beibehalten
- Keine neuen Headlines hinzufügen

Antworte NUR mit dem Text im neuen Ton.`,
      user: `Analysiere die aktuelle Tonalität und ändere sie zu ${tone}:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // CUSTOM - Freie Anweisung
  // ────────────────────────────────────────────────────────────
  custom: (text: string, instruction: string) => ({
    system: `Du bist ein präziser Text-Editor. Du machst NUR die minimal notwendige Änderung und behältst alles andere 1:1 bei.

ORIGINALTEXT (EXAKT beibehalten außer der spezifischen Änderung):
${text}

SPEZIFISCHE ÄNDERUNG:
${instruction}

ABSOLUTE REGELN:
- Ändere AUSSCHLIESSLICH das, was in der Anweisung steht (z.B. nur Firmennamen ersetzen)
- EXAKT die gleiche Textlänge und Struktur beibehalten
- KEINE Umformulierungen, KEINE Ergänzungen, KEINE Kürzungen
- KEINE neuen Inhalte hinzufügen
- KEINE Verbesserungen oder Optimierungen
- Antworte NUR mit dem Text mit der einen spezifischen Änderung

BEISPIEL:
Original: "SK Online Marketing bietet Services an."
Anweisung: "Firma heißt jetzt XYZ Corp"
Antwort: "XYZ Corp bietet Services an."

WICHTIG: Mache wirklich NUR die eine genannte Änderung!`,
    user: 'Mache nur die spezifische Änderung und behalte alles andere bei.'
  })
};

// ══════════════════════════════════════════════════════════════
// TEXT-PARSER: Entfernt Formatierungen und PM-Strukturen
// ══════════════════════════════════════════════════════════════

function parseTextFromAIOutput(aiOutput: string): string {
  let text = aiOutput;

  // 1. Entferne ALLE HTML Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');
  text = text.replace(/<\/?strong[^>]*>/gi, '');
  text = text.replace(/<\/?b[^>]*>/gi, '');
  text = text.replace(/<\/?em[^>]*>/gi, '');
  text = text.replace(/<\/?i[^>]*>/gi, '');
  text = text.replace(/<\/?p[^>]*>/gi, '');
  text = text.replace(/<\/?div[^>]*>/gi, '');
  text = text.replace(/<\/?span[^>]*>/gi, '');
  text = text.replace(/<(?!\/?(?:ul|ol|li)(?:\s|>))[^>]*>/gi, '');

  // 2. Entferne ALLE Markdown-Formatierungen
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1');

  // 3. Entferne Heading-Marker
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 4. Extrahiere Antwort aus Volltext-Kontext falls vorhanden
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('MARKIERTE STELLE:');
  if (hasFullContext) {
    const parts = text.split(/MARKIERTE STELLE.*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }

  // 5. Minimale Bereinigung - nur offensichtliche PM-Phrasen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textContent: string[] = [];

  for (const line of lines) {
    // BEHALTE fast alles - nur extreme PM-Phrasen filtern
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('ENDE DER PRESSEMITTEILUNG')) {
      continue;
    }

    textContent.push(line);
  }

  return textContent.join('\n\n') || aiOutput;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const textTransformFlow = ai.defineFlow(
  {
    name: 'textTransform',
    inputSchema: TextTransformInputSchema,
    outputSchema: TextTransformOutputSchema,
  },
  async (input: TextTransformInput): Promise<TextTransformOutput> => {
    console.log('🔄 Text-Transformation gestartet', {
      action: input.action,
      textLength: input.text.length,
      hasFullDocument: !!input.fullDocument,
      hasTone: !!input.tone,
      hasInstruction: !!input.instruction
    });

    // ══════════════════════════════════════════════════════════════
    // 1. PROMPT-AUSWAHL BASIEREND AUF ACTION
    // ══════════════════════════════════════════════════════════════

    let systemPrompt = '';
    let userPrompt = '';

    const hasFullContext = input.fullDocument && input.fullDocument.length > input.text.length;

    switch (input.action) {
      case 'rephrase': {
        const prompts = hasFullContext
          ? PROMPTS.rephrase.withContext(input.fullDocument!, input.text)
          : PROMPTS.rephrase.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'shorten': {
        const prompts = hasFullContext
          ? PROMPTS.shorten.withContext(input.fullDocument!, input.text)
          : PROMPTS.shorten.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'expand': {
        const prompts = hasFullContext
          ? PROMPTS.expand.withContext(input.fullDocument!, input.text)
          : PROMPTS.expand.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'elaborate': {
        const prompts = hasFullContext
          ? PROMPTS.elaborate.withContext(input.fullDocument!, input.text)
          : PROMPTS.elaborate.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'change-tone': {
        if (!input.tone) {
          throw new Error('Tone parameter is required for change-tone action');
        }
        const prompts = hasFullContext
          ? PROMPTS.changeTone.withContext(input.fullDocument!, input.text, input.tone)
          : PROMPTS.changeTone.withoutContext(input.text, input.tone);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'custom': {
        if (!input.instruction) {
          throw new Error('Instruction parameter is required for custom action');
        }
        const prompts = PROMPTS.custom(input.text, input.instruction);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }

    console.log('📋 Prompts gewählt:', {
      action: input.action,
      hasContext: hasFullContext,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length
    });

    // ══════════════════════════════════════════════════════════════
    // 2. GEMINI API CALL
    // ══════════════════════════════════════════════════════════════

    const result = await ai.generate({
      model: gemini25FlashModel,
      prompt: [
        { text: systemPrompt },
        { text: userPrompt }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    const generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Text generiert, Länge:', generatedText.length);

    // ══════════════════════════════════════════════════════════════
    // 3. POST-PROCESSING: Text-Parsing
    // ══════════════════════════════════════════════════════════════

    const transformedText = parseTextFromAIOutput(generatedText);

    // ══════════════════════════════════════════════════════════════
    // 4. METRIKEN BERECHNEN
    // ══════════════════════════════════════════════════════════════

    const originalWords = input.text.split(/\s+/).length;
    const transformedWords = transformedText.split(/\s+/).length;
    const wordCountChange = transformedWords - originalWords;

    console.log('📊 Transformation abgeschlossen', {
      action: input.action,
      originalLength: input.text.length,
      transformedLength: transformedText.length,
      wordCountChange
    });

    return {
      transformedText,
      action: input.action,
      originalLength: input.text.length,
      transformedLength: transformedText.length,
      wordCountChange,
      timestamp: new Date().toISOString()
    };
  }
);
