// src/lib/ai/flows/marken-dna-chat.ts
// Genkit Flow für Marken-DNA Chat-Interaktionen
// Phase 3: KI-Chat Backend

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getSystemPrompt, getOutputFormatInstructions } from '@/lib/ai/prompts/marken-dna-prompts';
import type { MarkenDNADocumentType } from '@/types/marken-dna';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const MarkenDNAChatInputSchema = z.object({
  documentType: z.enum(['briefing', 'swot', 'audience', 'positioning', 'goals', 'messages']),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(ChatMessageSchema),
  existingDocument: z.string().optional(), // Für "Umarbeiten"-Modus
});

export const MarkenDNAChatOutputSchema = z.object({
  response: z.string(),
  document: z.string().optional(),      // Extrahiertes [DOCUMENT]...[/DOCUMENT]
  progress: z.number().optional(),       // Extrahiertes [PROGRESS:XX]
  suggestions: z.array(z.string()).optional(), // Extrahierte [SUGGESTIONS]
  status: z.enum(['draft', 'completed']).optional(), // Extrahiertes [STATUS:XX]
});

export type MarkenDNAChatInput = z.infer<typeof MarkenDNAChatInputSchema>;
export type MarkenDNAChatOutput = z.infer<typeof MarkenDNAChatOutputSchema>;

// ============================================================================
// FLOW DEFINITION
// ============================================================================

export const markenDNAChatFlow = ai.defineFlow(
  {
    name: 'markenDNAChatFlow',
    inputSchema: MarkenDNAChatInputSchema,
    outputSchema: MarkenDNAChatOutputSchema,
  },
  async (input) => {
    // System-Prompt zusammenbauen
    const systemPrompt = buildFullSystemPrompt(
      input.documentType,
      input.language,
      input.companyName,
      input.existingDocument
    );

    // Nachrichten für Genkit formatieren
    const formattedMessages = input.messages.map(msg => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      content: [{ text: msg.content }],
    }));

    // Generieren mit Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      messages: formattedMessages,
      config: { temperature: 0.7 },
    });

    const responseText = response.text;

    // Strukturierte Daten aus Response extrahieren
    return {
      response: responseText,
      document: extractDocument(responseText),
      progress: extractProgress(responseText),
      suggestions: extractSuggestions(responseText),
      status: extractStatus(responseText),
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Baut den vollständigen System-Prompt zusammen
 */
function buildFullSystemPrompt(
  documentType: MarkenDNADocumentType,
  language: 'de' | 'en',
  companyName: string,
  existingDocument?: string
): string {
  const basePrompt = getSystemPrompt(documentType, language);
  const outputFormat = getOutputFormatInstructions(language);

  let prompt = `${basePrompt}

KONTEXT:
- Unternehmen: ${companyName}
- Sprache: ${language === 'de' ? 'Deutsch' : 'English'}

${outputFormat}`;

  // Für "Umarbeiten"-Modus: Bestehendes Dokument als Kontext
  if (existingDocument) {
    prompt += language === 'de'
      ? `

BESTEHENDES DOKUMENT (überarbeite basierend auf User-Feedback):
${existingDocument}
`
      : `

EXISTING DOCUMENT (revise based on user feedback):
${existingDocument}
`;
  }

  return prompt;
}

/**
 * Extrahiert Dokument-Content aus [DOCUMENT]...[/DOCUMENT] Tags
 */
function extractDocument(text: string): string | undefined {
  const match = text.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  return match ? match[1].trim() : undefined;
}

/**
 * Extrahiert Fortschritt aus [PROGRESS:XX] Tag
 */
function extractProgress(text: string): number | undefined {
  const match = text.match(/\[PROGRESS:(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Extrahiert Vorschläge aus [SUGGESTIONS]...[/SUGGESTIONS] Tags
 */
function extractSuggestions(text: string): string[] | undefined {
  const match = text.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return undefined;

  return match[1]
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extrahiert Status aus [STATUS:XX] Tag
 * Mögliche Werte: completed, draft
 */
function extractStatus(text: string): 'draft' | 'completed' | undefined {
  const match = text.match(/\[STATUS:(\w+)\]/i);
  if (!match) return undefined;

  const status = match[1].toLowerCase();
  if (status === 'completed') return 'completed';
  if (status === 'draft') return 'draft';
  return undefined;
}
