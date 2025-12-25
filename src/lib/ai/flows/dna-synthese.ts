// src/lib/ai/flows/dna-synthese.ts
// Genkit Flow für DNA Synthese - KI-Komprimierung der 6 Marken-DNA Dokumente
// Transformiert ~5.000 Tokens in ~500 Tokens optimiert für KI-Kontext

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { DNA_SYNTHESE_PROMPT } from '@/lib/ai/prompts/marken-dna-prompts';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

export const DNASyntheseInputSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  /** Die 6 Marken-DNA Dokumente als Plain-Text (bereits exportiert) */
  markenDNAContent: z.string(),
});

export const DNASyntheseOutputSchema = z.object({
  /** KI-optimierte Kurzform (~500 Tokens) */
  synthese: z.string(),
  /** Token-Schätzung der Ausgabe */
  estimatedTokens: z.number().optional(),
});

export type DNASyntheseInput = z.infer<typeof DNASyntheseInputSchema>;
export type DNASyntheseOutput = z.infer<typeof DNASyntheseOutputSchema>;

// ============================================================================
// FLOW DEFINITION
// ============================================================================

/**
 * DNA Synthese Flow
 *
 * Transformiert die 6 Marken-DNA Dokumente (~5.000 Tokens) in eine
 * KI-optimierte Kurzform (~500 Tokens).
 *
 * Die Synthese dient als effizienter Kontext für alle nachfolgenden
 * KI-Assistenten (Kernbotschaft, AI Sequenz, Text-Matrix, etc.)
 *
 * @example
 * ```typescript
 * const result = await dnaSyntheseFlow({
 *   companyId: 'company-123',
 *   companyName: 'Müller GmbH',
 *   language: 'de',
 *   markenDNAContent: '... alle 6 Dokumente als Plain-Text ...'
 * });
 *
 * console.log(result.synthese); // ~500 Token optimierte Version
 * ```
 */
export const dnaSyntheseFlow = ai.defineFlow(
  {
    name: 'dnaSyntheseFlow',
    inputSchema: DNASyntheseInputSchema,
    outputSchema: DNASyntheseOutputSchema,
  },
  async (input) => {
    const systemPrompt = DNA_SYNTHESE_PROMPT[input.language];

    // User-Prompt mit den 6 Dokumenten
    const userPrompt = `Hier sind die 6 Marken-DNA Dokumente für "${input.companyName}":

${input.markenDNAContent}

Bitte erstelle die DNA Synthese gemäß den Anweisungen.`;

    // Generieren mit Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: userPrompt,
      config: {
        temperature: 0.3, // Niedrig für konsistente, faktenbasierte Ausgabe
      },
    });

    const syntheseText = response.text;

    // Grobe Token-Schätzung (ca. 4 Zeichen pro Token für Deutsch)
    const estimatedTokens = Math.ceil(syntheseText.length / 4);

    return {
      synthese: syntheseText,
      estimatedTokens,
    };
  }
);
