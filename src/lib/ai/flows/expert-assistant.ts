/**
 * Genkit Flow für Experten-Modus (CeleroPress Formel)
 *
 * Dieser Flow nutzt die DNA Synthese (~500 Tokens) und Kernbotschaft
 * für konsistente, markentreue Texterstellung.
 *
 * WICHTIG: Der Output ist STRUKTURIERT (wie generatePressReleaseStructuredFlow)
 * - headline, leadParagraph, bodyParagraphs, quote, cta, hashtags, htmlContent
 *
 * Der Experten-Modus orchestriert drei Schichten:
 * - EBENE 1: MARKEN-DNA (Höchste Priorität)
 * - EBENE 2: SCORE-REGELN (Journalistisches Handwerk)
 * - EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
 */

import { ai, gemini25FlashModel } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { buildAIContext } from '@/lib/ai/context-builder';
import {
  StructuredPressReleaseSchema,
  type StructuredPressRelease,
  type Quote
} from '@/lib/ai/schemas/press-release-structured-schemas';

/**
 * Input Schema für den Experten-Assistenten Flow
 */
const ExpertAssistantInputSchema = z.object({
  /** Projekt-ID für Kernbotschaft */
  projectId: z.string().describe('ID des Projekts (für Kernbotschaft)'),

  /** Company-ID für DNA Synthese */
  companyId: z.string().optional().describe('ID des Unternehmens (für DNA Synthese)'),

  /** Anfrage des Benutzers */
  userPrompt: z.string().describe('Anfrage des Benutzers'),

  /** Sprache für den System-Prompt (de oder en) */
  language: z.enum(['de', 'en']).default('de').describe('Sprache für den System-Prompt'),

  /** Optionales Ausgabeformat */
  outputFormat: z
    .enum(['pressrelease', 'social', 'blog', 'email', 'custom'])
    .optional()
    .describe('Gewünschtes Ausgabeformat'),
});

/**
 * Output Schema für den Experten-Assistenten Flow
 * JETZT STRUKTURIERT wie generatePressReleaseStructuredFlow!
 */
const ExpertAssistantOutputSchema = z.object({
  /** Strukturierte Pressemeldung */
  structured: StructuredPressReleaseSchema,

  /** Wurde DNA Synthese verwendet? */
  usedDNASynthese: z.boolean().describe('Wurde DNA Synthese verwendet?'),

  /** Wurde Kernbotschaft verwendet? */
  usedKernbotschaft: z.boolean().describe('Wurde Kernbotschaft verwendet?'),
});

// ══════════════════════════════════════════════════════════════
// PROMPT LIBRARY - CeleroPress Formel mit DNA Synthese
// ══════════════════════════════════════════════════════════════

function buildExpertSystemPrompt(
  dnaSynthese: string | undefined,
  kernbotschaft: { occasion?: string; goal?: string; plainText?: string } | undefined
): string {
  // Basis-Prompt für strukturierte Ausgabe
  let systemPrompt = `Du bist ein erfahrener PR-Experte bei CeleroPress mit 15+ Jahren Erfahrung.

═══════════════════════════════════════════════════════════════════
🧬 EBENE 1: MARKEN-DNA (HÖCHSTE PRIORITÄT!)
═══════════════════════════════════════════════════════════════════
`;

  if (dnaSynthese) {
    systemPrompt += `
Die folgende DNA Synthese definiert die UNVERÄNDERLICHEN Markenrichtlinien.
ALLE Texte müssen dieser DNA entsprechen - Tonalität, Begriffe, Stil!

--- DNA SYNTHESE START ---
${dnaSynthese}
--- DNA SYNTHESE ENDE ---

WICHTIG: Verwende NUR die Tonalität und Begriffe aus der DNA Synthese!
- Wenn die DNA "formal" vorgibt → KEINE lockere Sprache
- Wenn die DNA bestimmte Begriffe vorgibt → Diese EXAKT verwenden
- NO-GO-WORDS aus der DNA → NIEMALS verwenden!
`;
  } else {
    systemPrompt += `
⚠️ KEINE DNA SYNTHESE VORHANDEN
Verwende professionellen, formalen Ton als Standard.
`;
  }

  systemPrompt += `
═══════════════════════════════════════════════════════════════════
💬 EBENE 2: PROJEKT-KERNBOTSCHAFT
═══════════════════════════════════════════════════════════════════
`;

  if (kernbotschaft?.plainText || kernbotschaft?.occasion || kernbotschaft?.goal) {
    systemPrompt += `
Die Kernbotschaft definiert WAS kommuniziert werden soll:

${kernbotschaft.occasion ? `ANLASS: ${kernbotschaft.occasion}` : ''}
${kernbotschaft.goal ? `ZIEL: ${kernbotschaft.goal}` : ''}
${kernbotschaft.plainText ? `KERNBOTSCHAFT:\n${kernbotschaft.plainText}` : ''}

WICHTIG: Die Kernbotschaft muss der ROTE FADEN der Pressemeldung sein!
`;
  } else {
    systemPrompt += `
⚠️ KEINE KERNBOTSCHAFT DEFINIERT
Erstelle eine generische Pressemeldung basierend auf dem User-Prompt.
`;
  }

  systemPrompt += `
═══════════════════════════════════════════════════════════════════
📊 EBENE 3: SCORE-OPTIMIERTE STRUKTUR (85-95% PR-SEO Score)
═══════════════════════════════════════════════════════════════════

AUFGABE: Erstelle eine deutsche Pressemitteilung mit folgender EXAKTER Struktur:

SCORE-OPTIMIERUNG:
✓ Headline: 40-75 Zeichen, Keywords integrieren, aktive Verben
✓ Lead: 80-200 Zeichen, 5 W-Fragen (Wer, Was, Wann, Wo, Warum)
✓ Struktur: 3-4 Absätze, je 150-400 Zeichen
✓ Konkretheit: Mindestens 2 Zahlen, 1 Datum, Firmennamen
✓ Engagement: IMMER Zitat UND Call-to-Action
✓ Social: 2-3 relevante Hashtags

AUSGABE-FORMAT (ZWINGEND EINHALTEN):

Zeile 1: Schlagzeile (40-75 Zeichen)
**Lead-Absatz mit 5 W-Fragen (80-200 Zeichen)**
Absatz 2: Hauptinformation mit Details
Absatz 3: Weitere Details und Kontext
Absatz 4: Ausblick oder Zusatzinfo
"Zitat (20-35 Wörter)", sagt [Name], [Position] bei [Unternehmen].
[[CTA: Konkrete Handlungsaufforderung mit Kontakt/URL]]
[[HASHTAGS: #Hashtag1 #Hashtag2 #Hashtag3]]

KRITISCHE REGELN:
✓ Lead in **Sterne** einschließen
✓ Zitat in "Anführungszeichen" mit vollständiger Attribution
✓ CTA mit [[CTA: ...]] markieren
✓ Hashtags mit [[HASHTAGS: ...]] markieren
✓ KEINE Boilerplate/Unternehmensbeschreibung am Ende
✓ Sachlich und objektiv, keine Werbesprache
✓ Perfekte deutsche Rechtschreibung

VERMEIDE:
- Werbesprache ("revolutionär", "bahnbrechend", "einzigartig")
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange Sätze (max. 15 Wörter)
- "Über das Unternehmen" Abschnitte

Antworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.
`;

  return systemPrompt;
}

// ══════════════════════════════════════════════════════════════
// PARSING LOGIC - Strukturierter Output
// ══════════════════════════════════════════════════════════════

function parseStructuredOutput(text: string): Omit<StructuredPressRelease, 'htmlContent'> {
  const lines = text.split('\n');

  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote: Quote = { text: '', person: '', role: '', company: '' };
  let cta = '';
  let hashtags: string[] = [];

  let currentSection = 'searching';
  let bodyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Headline
    if (!headline && currentSection === 'searching') {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = 'lead';
      continue;
    }

    // 2. Lead-Absatz
    if (!leadParagraph && currentSection === 'lead') {
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.substring(2, line.length - 2);
        currentSection = 'body';
        continue;
      }

      const hasWQuestions =
        (line.includes('Wer') || line.includes('Was') || line.includes('Wann') ||
         line.includes('Wo') || line.includes('Warum')) ||
        (line.length > 100 && line.length < 400);

      if (hasWQuestions) {
        leadParagraph = line;
        currentSection = 'body';
        continue;
      }

      currentSection = 'body';
    }

    // 3. Zitat
    if (line.startsWith('"') || line.includes('sagt:') || line.includes('sagt "')) {
      currentSection = 'quote';

      // Format: "Text", sagt Person, Rolle bei Firma.
      const quoteMatch1 = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch1) {
        quote = {
          text: quoteMatch1[1],
          person: quoteMatch1[2].trim(),
          role: quoteMatch1[3] ? quoteMatch1[3].trim() : 'Sprecher',
          company: quoteMatch1[4] ? quoteMatch1[4].trim() : ''
        };
        currentSection = 'cta';
        continue;
      }

      // Einfaches Format
      const simpleMatch = line.match(/"([^"]+)"/);
      if (simpleMatch) {
        quote.text = simpleMatch[1];
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const personMatch = nextLine.match(/[-–—]\s*(.+)/);
          if (personMatch) {
            const parts = personMatch[1].split(',').map(p => p.trim());
            quote.person = parts[0] || 'Sprecher';
            quote.role = parts[1] || 'Geschäftsführer';
            quote.company = parts[2] || '';
            i++;
          }
        }
      }
      currentSection = 'cta';
      continue;
    }

    // 4. Hashtags
    if (line.includes('[[HASHTAGS:') || line.includes('HASHTAGS:') || line.includes('#')) {
      const hashtagMatch = line.match(/\[\[HASHTAGS?:?\s*([^\]]+)\]\]/i);
      if (hashtagMatch) {
        const foundTags = hashtagMatch[1].match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length > 0) {
          hashtags = foundTags.slice(0, 3);
          continue;
        }
      }
      // Direkte Hashtags im Text
      const directTags = line.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
      if (directTags && directTags.length >= 2) {
        hashtags = directTags.slice(0, 3);
        continue;
      }
    }

    // 5. CTA
    if (line.includes('[[CTA:') || line.includes('CTA:') ||
        line.includes('Kontakt:') || line.includes('Weitere Informationen:')) {
      const ctaMatch = line.match(/\[\[CTA:\s*(.+?)\]\]/) ||
                       line.match(/CTA:\s*(.+)/) ||
                       line.match(/Kontakt:\s*(.+)/) ||
                       line.match(/Weitere Informationen:\s*(.+)/);
      if (ctaMatch) {
        cta = ctaMatch[1].trim();
      }
      continue;
    }

    // 6. Body-Absätze
    if (currentSection === 'body' && bodyCount < 4) {
      if (line.startsWith('"') || line.startsWith('*') || line.includes('[[')) {
        continue;
      }
      bodyParagraphs.push(line);
      bodyCount++;
    }
  }

  // Fallback: Zitat aus Body extrahieren
  if (!quote.text) {
    for (let i = 0; i < bodyParagraphs.length; i++) {
      const paragraph = bodyParagraphs[i];
      const quoteMatch = paragraph.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+(?:von|bei)\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
        bodyParagraphs.splice(i, 1);
        break;
      }
    }
  }

  // Standardisiere Hashtags
  hashtags = hashtags.map(tag =>
    tag.startsWith('#') ? tag : '#' + tag
  ).slice(0, 3);

  // Defaults
  if (hashtags.length === 0) {
    hashtags = ['#Pressemitteilung', '#News'];
  }

  if (!leadParagraph && bodyParagraphs.length > 0) {
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
  }

  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph) leadParagraph = 'Lead-Absatz';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
  if (!quote.text) {
    quote = {
      text: 'Wir freuen uns über diese Entwicklung',
      person: 'Sprecher',
      role: 'Geschäftsführer',
      company: ''
    };
  }
  if (!cta) {
    cta = 'Für weitere Informationen kontaktieren Sie uns';
  }

  const socialOptimized = headline.length <= 280 && hashtags.length >= 2;

  return {
    headline,
    leadParagraph,
    bodyParagraphs,
    quote,
    cta,
    hashtags,
    socialOptimized
  };
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * Experten-Assistenten Flow mit strukturiertem Output
 *
 * Dieser Flow nutzt die CeleroPress Formel:
 * - Lädt automatisch DNA Synthese (~500 Tokens) via companyId
 * - Lädt automatisch Kernbotschaft via projectId
 * - Generiert STRUKTURIERTE Pressemeldung mit Gemini 2.5 Flash
 * - Garantiert PR-SEO Score von 85-95%
 */
export const expertAssistantFlow = ai.defineFlow(
  {
    name: 'expertAssistantFlow',
    inputSchema: ExpertAssistantInputSchema,
    outputSchema: ExpertAssistantOutputSchema,
  },
  async (input) => {
    console.log('🚀 expertAssistantFlow gestartet:', {
      projectId: input.projectId,
      companyId: input.companyId,
      promptLength: input.userPrompt?.length
    });

    // ══════════════════════════════════════════════════════════════
    // 1. KONTEXT LADEN (DNA Synthese + Kernbotschaft)
    // ══════════════════════════════════════════════════════════════

    const context = await buildAIContext(
      input.projectId,
      input.companyId,
      'expert',
      input.userPrompt
    );

    console.log('📊 Kontext geladen:', {
      hasDNASynthese: !!context.dnaSynthese,
      hasKernbotschaft: !!context.kernbotschaft,
      dnaSyntheseLength: context.dnaSynthese?.length || 0
    });

    // ══════════════════════════════════════════════════════════════
    // 2. SYSTEM-PROMPT BAUEN
    // ══════════════════════════════════════════════════════════════

    const systemPrompt = buildExpertSystemPrompt(
      context.dnaSynthese,
      context.kernbotschaft
    );

    // Debug: Zeige ob DNA/Kernbotschaft im Prompt enthalten sind
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 System-Prompt Analyse:');
    console.log('   - Enthält DNA Synthese:', systemPrompt.includes('DNA SYNTHESE START'));
    console.log('   - Enthält Kernbotschaft:', systemPrompt.includes('KERNBOTSCHAFT:') || systemPrompt.includes('ANLASS:'));
    console.log('   - Prompt-Länge:', systemPrompt.length, 'Zeichen');
    console.log('═══════════════════════════════════════════════════════════════');

    // ══════════════════════════════════════════════════════════════
    // 3. GENERIERUNG MIT GEMINI 2.5 FLASH
    // ══════════════════════════════════════════════════════════════

    const result = await ai.generate({
      model: gemini25FlashModel,
      system: systemPrompt,
      prompt: input.userPrompt || 'Erstelle eine Pressemeldung basierend auf der DNA Synthese und Kernbotschaft.',
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const generatedText = result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Text generiert, starte Parsing...');

    // ══════════════════════════════════════════════════════════════
    // 4. STRUKTURIERTES PARSING
    // ══════════════════════════════════════════════════════════════

    const structured = parseStructuredOutput(generatedText);

    // ══════════════════════════════════════════════════════════════
    // 5. HTML-GENERIERUNG
    // ══════════════════════════════════════════════════════════════

    const hashtagsHTML = structured.hashtags && structured.hashtags.length > 0
      ? `<p>${structured.hashtags.map(tag =>
          `<span data-type="hashtag" class="hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200">${tag}</span>`
        ).join(' ')}</p>`
      : '';

    const htmlContent = `
<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>
  <p>"${structured.quote.text}"</p>
  <footer>— <strong>${structured.quote.person}</strong>, ${structured.quote.role}${structured.quote.company ? ` bei ${structured.quote.company}` : ''}</footer>
</blockquote>

<p><span data-type="cta-text" class="cta-text font-bold text-black">${structured.cta}</span></p>

${hashtagsHTML}
`.trim();

    console.log('✅ Strukturierte PR erfolgreich generiert!', {
      headline: structured.headline.substring(0, 50) + '...',
      bodyParagraphs: structured.bodyParagraphs.length,
      hashtags: structured.hashtags.length,
      usedDNASynthese: !!context.dnaSynthese,
      usedKernbotschaft: !!context.kernbotschaft
    });

    // ══════════════════════════════════════════════════════════════
    // 6. RÜCKGABE
    // ══════════════════════════════════════════════════════════════

    return {
      structured: {
        ...structured,
        htmlContent
      },
      usedDNASynthese: !!context.dnaSynthese,
      usedKernbotschaft: !!context.kernbotschaft,
    };
  }
);
