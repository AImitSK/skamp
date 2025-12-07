// src/lib/ai/flows/translate-press-release.ts
// Genkit Flow für KI-gestützte Pressemitteilungs-Übersetzung mit Glossar-Unterstützung

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  TranslatePressReleaseInputSchema,
  TranslatePressReleaseOutputSchema,
  type TranslatePressReleaseInput,
  type TranslatePressReleaseOutput,
  type GlossaryEntry,
  getLanguageName,
} from '../schemas/translate-press-release-schemas';

// ══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ══════════════════════════════════════════════════════════════

/**
 * Baut den Glossar-Abschnitt für den Prompt
 */
function buildGlossarySection(entries: GlossaryEntry[] | null | undefined): string {
  if (!entries || entries.length === 0) {
    return '';
  }

  const glossaryLines = entries.map((entry) => {
    const contextNote = entry.context ? ` (${entry.context})` : '';
    return `- "${entry.source}" → "${entry.target}"${contextNote}`;
  });

  return `
FACHBEGRIFFE / GLOSSAR (MÜSSEN exakt so übersetzt werden!):
${glossaryLines.join('\n')}

WICHTIG: Diese Begriffe sind kundenspezifisch definiert und MÜSSEN exakt wie angegeben übersetzt werden!
`;
}

/**
 * Baut den System-Prompt für die Übersetzung
 */
function buildSystemPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  glossaryEntries: GlossaryEntry[] | null | undefined,
  tone: string,
  preserveFormatting: boolean
): string {
  const sourceName = getLanguageName(sourceLanguage);
  const targetName = getLanguageName(targetLanguage);
  const glossarySection = buildGlossarySection(glossaryEntries);

  const toneInstructions: Record<string, string> = {
    formal: 'Verwende formelle, distanzierte Sprache. Keine Umgangssprache.',
    professional: 'Verwende professionelle Geschäftssprache, kompetent und seriös aber zugänglich.',
    neutral: 'Verwende neutrale, sachliche Sprache ohne emotionale Färbung.'
  };

  return `Du bist ein professioneller Übersetzer für Pressemitteilungen und Unternehmenskommunikation.

AUFGABE: Übersetze die folgende Pressemitteilung von ${sourceName} nach ${targetName}.

${glossarySection}

ÜBERSETZUNGS-REGELN:

1. QUALITÄT:
   - Professionelle, publikationsreife Übersetzung
   - Keine wörtliche Übersetzung - natürlicher Sprachfluss in der Zielsprache
   - Fachterminologie korrekt übersetzen (außer Glossar-Begriffe → exakt!)
   - ${toneInstructions[tone] || toneInstructions.professional}

2. EIGENNAMEN & MARKEN:
   - Firmennamen UNVERÄNDERT lassen (z.B. "TechCorp GmbH" bleibt "TechCorp GmbH")
   - Produktnamen UNVERÄNDERT lassen
   - Personennamen UNVERÄNDERT lassen
   - Städte/Länder in Zielsprache (z.B. "München" → "Munich" bei EN)

3. ZAHLEN & EINHEITEN:
   - Zahlenformate an Zielsprache anpassen (1.000,00 → 1,000.00 bei EN)
   - Währungen beibehalten (€, $, etc.)
   - Datumsformate an Zielsprache anpassen

${preserveFormatting ? `4. HTML-FORMATIERUNG (KRITISCH!):
   - ALLE HTML-Tags EXAKT beibehalten (<p>, <strong>, <blockquote>, etc.)
   - Nur den TEXT zwischen den Tags übersetzen
   - Tag-Attribute NICHT ändern (class, data-type, etc.)
   - Zeilenumbrüche und Absatzstruktur beibehalten
   - KEINE neuen HTML-Tags hinzufügen
   - KEINE HTML-Tags entfernen

   BEISPIEL:
   Original: <p><strong>Die Firma startet</strong> ein neues Projekt.</p>
   Übersetzt: <p><strong>The company launches</strong> a new project.</p>
` : ''}

5. STRUKTUR:
   - Absatzstruktur EXAKT beibehalten
   - Aufzählungen/Listen beibehalten
   - Zitate als Zitate kennzeichnen

WICHTIG: Antworte NUR mit der Übersetzung. Keine Erklärungen, keine Kommentare, keine Einleitung!`;
}

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Findet welche Glossar-Einträge in der Übersetzung verwendet wurden
 */
function findUsedGlossaryEntries(
  translatedText: string,
  glossaryEntries: GlossaryEntry[] | null | undefined
): string[] {
  if (!glossaryEntries || glossaryEntries.length === 0) {
    return [];
  }

  const usedIds: string[] = [];

  for (const entry of glossaryEntries) {
    // Prüfe ob der Zielbegriff in der Übersetzung vorkommt
    if (entry.target && translatedText.toLowerCase().includes(entry.target.toLowerCase())) {
      if (entry.id) {
        usedIds.push(entry.id);
      }
    }
  }

  return usedIds;
}

/**
 * Berechnet einen einfachen Konfidenz-Score basierend auf der Übersetzung
 */
function calculateConfidence(
  originalContent: string,
  translatedContent: string,
  preserveFormatting: boolean
): number {
  let confidence = 0.85; // Basis-Konfidenz für Gemini

  // Längen-Verhältnis prüfen (sollte ähnlich sein)
  const lengthRatio = translatedContent.length / originalContent.length;
  if (lengthRatio > 0.7 && lengthRatio < 1.5) {
    confidence += 0.05;
  }

  // HTML-Tags Erhaltung prüfen
  if (preserveFormatting) {
    const originalTags = (originalContent.match(/<[^>]+>/g) || []).length;
    const translatedTags = (translatedContent.match(/<[^>]+>/g) || []).length;

    if (originalTags === translatedTags) {
      confidence += 0.05;
    } else if (Math.abs(originalTags - translatedTags) <= 2) {
      confidence += 0.02;
    }
  }

  // Nicht leer
  if (translatedContent.trim().length > 50) {
    confidence += 0.03;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Validiert und bereinigt die Übersetzung
 */
function cleanTranslation(text: string): string {
  let cleaned = text;

  // Entferne eventuelle Markdown-Codeblöcke
  cleaned = cleaned.replace(/^```html?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');

  // Entferne führende/trailing Whitespace
  cleaned = cleaned.trim();

  // Entferne eventuelle "Übersetzung:" Präfixe
  cleaned = cleaned.replace(/^(Übersetzung|Translation|Traducción|Traduction):\s*/i, '');

  return cleaned;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const translatePressReleaseFlow = ai.defineFlow(
  {
    name: 'translatePressRelease',
    inputSchema: TranslatePressReleaseInputSchema,
    outputSchema: TranslatePressReleaseOutputSchema,
  },
  async (input: TranslatePressReleaseInput): Promise<TranslatePressReleaseOutput> => {
    console.log('🌐 Übersetzung gestartet', {
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      contentLength: input.content.length,
      titleLength: input.title.length,
      glossaryCount: input.glossaryEntries?.length || 0,
      preserveFormatting: input.preserveFormatting
    });

    const startTime = Date.now();

    // ══════════════════════════════════════════════════════════════
    // 1. PROMPTS ERSTELLEN
    // ══════════════════════════════════════════════════════════════

    const systemPrompt = buildSystemPrompt(
      input.sourceLanguage,
      input.targetLanguage,
      input.glossaryEntries,
      input.tone || 'professional',
      input.preserveFormatting ?? true
    );

    // Content und Titel zusammen übersetzen für Kontext
    const userPrompt = `TITEL:
${input.title}

PRESSEMITTEILUNG:
${input.content}

Übersetze beides nach ${getLanguageName(input.targetLanguage)}. Antworte im Format:
TITEL: [übersetzter Titel]
INHALT: [übersetzter Inhalt]`;

    // ══════════════════════════════════════════════════════════════
    // 2. KI-ÜBERSETZUNG
    // ══════════════════════════════════════════════════════════════

    let result;
    try {
      result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: systemPrompt },
          { text: userPrompt }
        ],
        config: {
          temperature: 0.3, // Niedrig für konsistente Übersetzungen
          maxOutputTokens: 8192
        }
      });
    } catch (genError: any) {
      console.error('❌ Gemini API Error:', {
        error: genError.message,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage
      });
      throw new Error(`Übersetzungs-Fehler: ${genError.message}`);
    }

    // Text extrahieren
    const generatedText = result.message?.content?.[0]?.text
                       || result.text
                       || '';

    if (!generatedText || generatedText.trim() === '') {
      console.error('❌ Leere Gemini Response');
      throw new Error('Keine Übersetzung von Gemini erhalten');
    }

    console.log('✅ Rohübersetzung erhalten, Länge:', generatedText.length);

    // ══════════════════════════════════════════════════════════════
    // 3. POST-PROCESSING: Titel und Inhalt extrahieren
    // ══════════════════════════════════════════════════════════════

    let translatedTitle = '';
    let translatedContent = '';

    // Versuche strukturierte Antwort zu parsen
    const titleMatch = generatedText.match(/TITEL:\s*(.+?)(?=\n|INHALT:|$)/i);
    const contentMatch = generatedText.match(/INHALT:\s*([\s\S]+)$/i);

    if (titleMatch && contentMatch) {
      translatedTitle = cleanTranslation(titleMatch[1]);
      translatedContent = cleanTranslation(contentMatch[1]);
    } else {
      // Fallback: Erste Zeile als Titel, Rest als Inhalt
      const lines = generatedText.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        translatedTitle = cleanTranslation(lines[0]);
        translatedContent = cleanTranslation(lines.slice(1).join('\n'));
      } else {
        translatedTitle = input.title; // Fallback auf Original
        translatedContent = cleanTranslation(generatedText);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 4. GLOSSAR-TRACKING & METRIKEN
    // ══════════════════════════════════════════════════════════════

    const glossaryUsed = findUsedGlossaryEntries(
      translatedContent + ' ' + translatedTitle,
      input.glossaryEntries
    );

    const confidence = calculateConfidence(
      input.content,
      translatedContent,
      input.preserveFormatting ?? true
    );

    const duration = Date.now() - startTime;

    console.log('📊 Übersetzung abgeschlossen', {
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      originalChars: input.content.length,
      translatedChars: translatedContent.length,
      glossaryUsed: glossaryUsed.length,
      confidence: confidence.toFixed(2),
      durationMs: duration
    });

    // ══════════════════════════════════════════════════════════════
    // 5. OUTPUT
    // ══════════════════════════════════════════════════════════════

    return {
      translatedContent,
      translatedTitle,
      glossaryUsed,
      confidence,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      stats: {
        originalCharCount: input.content.length,
        translatedCharCount: translatedContent.length,
        glossaryMatchCount: glossaryUsed.length
      },
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash'
    };
  }
);
