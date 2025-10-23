// src/lib/ai/flows/generate-press-release.ts
// Genkit Flow für PR-Assistent: Pressemitteilungen generieren und verbessern

import { z } from 'genkit';
import { ai, gemini25FlashModel } from '../genkit-config';

/**
 * Input Schema für Pressemitteilungs-Generierung
 */
const GeneratePressReleaseInputSchema = z.object({
  prompt: z.string().describe('Hauptanfrage/Thema der Pressemitteilung'),
  mode: z.enum(['generate', 'improve']).describe('Generieren oder Verbessern'),
  existingContent: z.string().nullish().describe('Bestehender Content (nur für improve Mode)'),
  context: z.object({
    industry: z.string().nullish().describe('Branche/Industrie'),
    tone: z.string().nullish().describe('Tonalität (z.B. formal, locker)'),
    audience: z.string().nullish().describe('Zielgruppe')
  }).nullish().describe('Optionaler Kontext für bessere Ergebnisse')
});

/**
 * Output Schema für Pressemitteilungs-Generierung
 */
const GeneratePressReleaseOutputSchema = z.object({
  generatedText: z.string().describe('Generierter/Verbesserter HTML-Text'),
  mode: z.enum(['generate', 'improve']).describe('Verwendeter Modus'),
  postProcessed: z.boolean().describe('Wurde HTML-Konvertierung angewendet?'),
  timestamp: z.string().describe('Zeitstempel der Generierung')
});

type GeneratePressReleaseInput = z.infer<typeof GeneratePressReleaseInputSchema>;
type GeneratePressReleaseOutput = z.infer<typeof GeneratePressReleaseOutputSchema>;

/**
 * Konvertiert Plaintext-Pressemitteilung zu HTML
 *
 * Struktur-Erkennung:
 * - Erste Zeile → <h1>
 * - **Text** → <p><strong>
 * - Zeilen mit Zitaten → <blockquote>
 * - *Über ...* → <p><em>
 * - Normale Zeilen → <p>
 */
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

/**
 * Genkit Flow: Pressemitteilungen generieren oder verbessern
 *
 * Features:
 * - Zwei Modi: generate (neu erstellen) | improve (verbessern)
 * - Kontext-bewusst (Branche, Tonalität, Zielgruppe)
 * - Automatische HTML-Konvertierung
 * - Journalistische Standards (dpa-Stil)
 * - Gemini 2.5 Flash für schnelle, qualitative Ergebnisse
 *
 * Best Practices:
 * - JSON Mode für robuste Fehlerbehandlung
 * - Strukturierte Prompts mit klaren Anweisungen
 * - Fallback auf Plaintext → HTML Konvertierung
 */
export const generatePressReleaseFlow = ai.defineFlow(
  {
    name: 'generatePressRelease',
    inputSchema: GeneratePressReleaseInputSchema,
    outputSchema: GeneratePressReleaseOutputSchema
  },
  async (input: GeneratePressReleaseInput): Promise<GeneratePressReleaseOutput> => {

    // ══════════════════════════════════════════════════════════════
    // 1. PROMPT VORBEREITUNG
    // ══════════════════════════════════════════════════════════════

    let systemPrompt: string;
    let userPrompt: string;

    if (input.mode === 'improve' && input.existingContent) {
      // ────────────────────────────────────────────────────────────
      // IMPROVE MODE: Bestehende Pressemitteilung verbessern
      // ────────────────────────────────────────────────────────────
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
${input.existingContent}

Verbesserungsanfrage: ${input.prompt}

Bitte verbessere die Pressemitteilung entsprechend der Anfrage:`;

    } else {
      // ────────────────────────────────────────────────────────────
      // GENERATE MODE: Neue Pressemitteilung erstellen
      // ────────────────────────────────────────────────────────────
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
      if (input.context?.industry) {
        contextInfo += `\nBRANCHE: ${input.context.industry}`;
      }
      if (input.context?.tone) {
        contextInfo += `\nTONALITÄT: ${input.context.tone.toUpperCase()}`;
      }
      if (input.context?.audience) {
        contextInfo += `\nZIELGRUPPE: ${input.context.audience}`;
      }

      userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${input.prompt}${contextInfo}`;
    }

    // ══════════════════════════════════════════════════════════════
    // 2. AI GENERIERUNG MIT GEMINI 2.5 FLASH
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

    // ══════════════════════════════════════════════════════════════
    // 3. TEXT EXTRAKTION
    // ══════════════════════════════════════════════════════════════

    // Best Practice: result.message?.content?.[0]?.text
    let generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    // ══════════════════════════════════════════════════════════════
    // 4. HTML-KONVERTIERUNG (falls nötig)
    // ══════════════════════════════════════════════════════════════

    let wasConverted = false;
    if (!generatedText.includes('<h1>') && !generatedText.includes('<p>')) {
      generatedText = convertToHTML(generatedText);
      wasConverted = true;
    }

    // ══════════════════════════════════════════════════════════════
    // 5. RÜCKGABE
    // ══════════════════════════════════════════════════════════════

    return {
      generatedText,
      mode: input.mode,
      postProcessed: wasConverted,
      timestamp: new Date().toISOString()
    };
  }
);
