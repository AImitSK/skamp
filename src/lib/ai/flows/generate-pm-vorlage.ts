// src/lib/ai/flows/generate-pm-vorlage.ts
// Genkit Flow fuer PM-Vorlage Generierung (Experten-Modus)
// Phase 4 des Pressemeldungs-Refactorings

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {
  CORE_ENGINE,
  PRESS_RELEASE_CRAFTSMANSHIP,
  buildExpertPrompt,
  type DNAContact,
} from '@/lib/ai/prompts/press-release';
import { FaktenMatrixSchema } from '@/lib/ai/schemas/fakten-matrix-schemas';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

export const GeneratePMVorlageInputSchema = z.object({
  projectId: z.string().describe('ID des Projekts'),
  companyId: z.string().describe('ID des Unternehmens'),
  companyName: z.string().describe('Name des Unternehmens'),
  language: z.enum(['de', 'en']).default('de'),

  /** DNA-Synthese (komprimierte Marken-DNA) */
  dnaSynthese: z.string().describe('Komprimierte DNA-Synthese'),

  /** Fakten-Matrix aus dem Project-Wizard */
  faktenMatrix: FaktenMatrixSchema.describe('Strukturierte Fakten aus Wizard'),

  /** DNA-Kontakte fuer Speaker-Lookup */
  dnaContacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.string(),
    expertise: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })).describe('Kontakte aus der Marken-DNA'),

  /** Zielgruppe (optional, Standard: ZG1) */
  targetGroup: z.enum(['ZG1', 'ZG2', 'ZG3']).optional().default('ZG1'),
});

export const PMVorlageOutputSchema = z.object({
  /** Generierte Headline */
  headline: z.string(),

  /** Lead-Paragraph mit 5 W-Fragen */
  leadParagraph: z.string(),

  /** Body-Paragraphen (3-4 Absaetze) */
  bodyParagraphs: z.array(z.string()),

  /** Zitat mit vollstaendiger Attribution */
  quote: z.object({
    text: z.string(),
    person: z.string(),
    role: z.string(),
    company: z.string(),
  }),

  /** Call-to-Action mit Kontaktdaten */
  cta: z.string(),

  /** Hashtags fuer Social Media */
  hashtags: z.array(z.string()),

  /** Roh-Text der Generierung (fuer Debugging) */
  rawText: z.string().optional(),

  /** HTML-Content fuer den Editor */
  htmlContent: z.string(),

  /** Zielgruppe */
  targetGroup: z.enum(['ZG1', 'ZG2', 'ZG3']),
});

export type GeneratePMVorlageInput = z.infer<typeof GeneratePMVorlageInputSchema>;
export type PMVorlageOutput = z.infer<typeof PMVorlageOutputSchema>;

// ============================================================================
// PARSING-FUNKTIONEN
// ============================================================================

/**
 * Parst die strukturierte AI-Ausgabe in PMVorlageOutput
 *
 * Erkennt die Parsing-Anker aus CORE_ENGINE:
 * - **Lead** -> leadParagraph
 * - "Zitat", sagt -> quote
 * - [[CTA: ...]] -> cta
 * - [[HASHTAGS: ...]] -> hashtags
 */
function parseGeneratedText(
  text: string,
  speaker: DNAContact,
  companyName: string
): Omit<PMVorlageOutput, 'targetGroup' | 'rawText'> {
  const lines = text.split('\n').filter(line => line.trim());

  // Headline: Erste Zeile (ohne HEADLINE: Praefix falls vorhanden)
  let headline = lines[0] || '';
  headline = headline.replace(/^HEADLINE:?\s*/i, '').trim();

  // Lead: Zeile mit **...**
  let leadParagraph = '';
  const leadMatch = text.match(/\*\*([^*]+)\*\*/);
  if (leadMatch) {
    leadParagraph = leadMatch[1].trim();
  }

  // Body: Absaetze zwischen Lead und Zitat
  const bodyParagraphs: string[] = [];
  let inBody = false;
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip Headline und Lead
    if (trimmed === headline || trimmed.startsWith('**') || trimmed.includes('HEADLINE')) {
      continue;
    }

    // Stop bei Zitat, CTA oder Hashtags
    if (trimmed.startsWith('"') || trimmed.startsWith('[[CTA:') || trimmed.startsWith('[[HASHTAGS:')) {
      break;
    }

    // Body-Absaetze sammeln
    if (trimmed.length > 50) {
      bodyParagraphs.push(trimmed);
      inBody = true;
    }
  }

  // Zitat: "...", sagt Name, Position bei Firma.
  let quoteText = '';
  const quoteMatch = text.match(/"([^"]+)"/);
  if (quoteMatch) {
    quoteText = quoteMatch[1].trim();
  }

  // CTA: [[CTA: ...]]
  let cta = '';
  const ctaMatch = text.match(/\[\[CTA:\s*([^\]]+)\]\]/i);
  if (ctaMatch) {
    cta = ctaMatch[1].trim();
  }

  // Hashtags: [[HASHTAGS: #Tag1 #Tag2 ...]]
  const hashtags: string[] = [];
  const hashtagsMatch = text.match(/\[\[HASHTAGS:\s*([^\]]+)\]\]/i);
  if (hashtagsMatch) {
    const hashtagStr = hashtagsMatch[1].trim();
    const tags = hashtagStr.match(/#\w+/g);
    if (tags) {
      hashtags.push(...tags);
    }
  }

  // HTML-Content generieren
  const htmlContent = buildHtmlContent(
    headline,
    leadParagraph,
    bodyParagraphs,
    { text: quoteText, person: speaker.name, role: speaker.position, company: companyName },
    cta,
    hashtags
  );

  return {
    headline,
    leadParagraph,
    bodyParagraphs: bodyParagraphs.slice(0, 4), // Max 4 Absaetze
    quote: {
      text: quoteText,
      person: speaker.name,
      role: speaker.position,
      company: companyName,
    },
    cta,
    hashtags: hashtags.slice(0, 3), // Max 3 Hashtags
    htmlContent,
  };
}

/**
 * Baut TipTap-kompatibles HTML aus den Komponenten
 */
function buildHtmlContent(
  headline: string,
  leadParagraph: string,
  bodyParagraphs: string[],
  quote: { text: string; person: string; role: string; company: string },
  cta: string,
  hashtags: string[]
): string {
  const parts: string[] = [];

  // Headline
  parts.push(`<h1>${escapeHtml(headline)}</h1>`);

  // Lead mit Strong-Tag
  parts.push(`<p><strong>${escapeHtml(leadParagraph)}</strong></p>`);

  // Body-Paragraphen
  for (const para of bodyParagraphs) {
    parts.push(`<p>${escapeHtml(para)}</p>`);
  }

  // Zitat
  if (quote.text) {
    parts.push(`<blockquote>
  <p>"${escapeHtml(quote.text)}"</p>
  <footer>${escapeHtml(quote.person)}, ${escapeHtml(quote.role)} bei ${escapeHtml(quote.company)}</footer>
</blockquote>`);
  }

  // CTA
  if (cta) {
    parts.push(`<p><span data-type="cta-text" class="cta-text">${escapeHtml(cta)}</span></p>`);
  }

  // Hashtags
  if (hashtags.length > 0) {
    const hashtagHtml = hashtags
      .map(tag => `<span data-type="hashtag" class="hashtag">${escapeHtml(tag)}</span>`)
      .join(' ');
    parts.push(`<p>${hashtagHtml}</p>`);
  }

  return parts.join('\n\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// FLOW DEFINITION
// ============================================================================

/**
 * PM-Vorlage Flow
 *
 * Generiert eine Pressemeldungs-Vorlage aus DNA-Synthese und Fakten-Matrix.
 * Verwendet den Experten-Modus mit allen DNA-gesteuerten Regeln.
 *
 * @example
 * ```typescript
 * const result = await generatePMVorlageFlow({
 *   projectId: 'project-123',
 *   companyId: 'company-456',
 *   companyName: 'TechCorp GmbH',
 *   language: 'de',
 *   dnaSynthese: '... komprimierte DNA ...',
 *   faktenMatrix: { hook: {...}, details: {...}, quote: {...} },
 *   dnaContacts: [{ id: 'ceo', name: 'Max Müller', position: 'CEO' }],
 *   targetGroup: 'ZG1'
 * });
 * ```
 */
export const generatePMVorlageFlow = ai.defineFlow(
  {
    name: 'generatePMVorlageFlow',
    inputSchema: GeneratePMVorlageInputSchema,
    outputSchema: PMVorlageOutputSchema,
  },
  async (input) => {
    // 1. Speaker aus DNA-Kontakten auflösen
    const speaker = input.dnaContacts.find(
      c => c.id === input.faktenMatrix.quote.speakerId
    );

    if (!speaker) {
      throw new Error(
        `Speaker mit ID "${input.faktenMatrix.quote.speakerId}" nicht in DNA-Kontakten gefunden. ` +
        `Verfuegbare IDs: ${input.dnaContacts.map(c => c.id).join(', ')}`
      );
    }

    // 2. Experten-Prompt bauen
    const expertPrompt = buildExpertPrompt(
      input.dnaSynthese,
      input.faktenMatrix,
      input.dnaContacts,
      input.targetGroup
    );

    // 3. Vollstaendigen System-Prompt zusammenbauen
    const systemPrompt = [
      CORE_ENGINE.toPrompt(),
      PRESS_RELEASE_CRAFTSMANSHIP.toPrompt(),
      expertPrompt,
    ].join('\n\n');

    // 4. User-Prompt mit Generierungsaufforderung
    const userPrompt = `Erstelle jetzt die Pressemeldung fuer "${input.companyName}" basierend auf den oben genannten Fakten.

Beachte:
- Halte dich EXAKT an das Ausgabe-Format
- Verwende die Fakten aus der Fakten-Matrix
- Das Zitat muss von ${speaker.name} (${speaker.position}) kommen
- Kernaussage fuer das Zitat: "${input.faktenMatrix.quote.rawStatement}"

Beginne mit der Headline:`;

    // 5. Generierung mit Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: userPrompt,
      config: {
        temperature: 0.4, // Etwas kreativer als DNA-Synthese, aber noch kontrolliert
      },
    });

    const generatedText = response.text;

    // 6. Parsen und Strukturieren
    const parsed = parseGeneratedText(generatedText, speaker, input.companyName);

    return {
      ...parsed,
      targetGroup: input.targetGroup || 'ZG1',
      rawText: generatedText,
    };
  }
);
