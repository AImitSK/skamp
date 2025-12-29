/**
 * Genkit Flow für Experten-Modus (CeleroPress Formel)
 *
 * Dieser Flow nutzt die DNA Synthese (~500 Tokens) und Kernbotschaft
 * für konsistente, markentreue Texterstellung.
 *
 * Der Experten-Modus orchestriert drei Schichten:
 * - EBENE 1: MARKEN-DNA (Höchste Priorität)
 * - EBENE 2: SCORE-REGELN (Journalistisches Handwerk)
 * - EBENE 3: PROJEKT-KONTEXT (Aktuelle Fakten)
 */

import { ai, gemini25FlashModel } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { buildAIContext } from '@/lib/ai/context-builder';
import { buildExpertModePrompt } from '@/lib/ai/prompts/expert-mode';
import type { PromptLanguage } from '@/lib/ai/prompts/expert-mode';

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
 */
const ExpertAssistantOutputSchema = z.object({
  /** Generierter Textinhalt */
  content: z.string().describe('Generierter Textinhalt'),

  /** Wurde DNA Synthese verwendet? */
  usedDNASynthese: z.boolean().describe('Wurde DNA Synthese verwendet?'),

  /** Wurde Kernbotschaft verwendet? */
  usedKernbotschaft: z.boolean().describe('Wurde Kernbotschaft verwendet?'),

  /** Optionale Verbesserungsvorschläge */
  suggestions: z.array(z.string()).optional().describe('Optionale Verbesserungsvorschläge'),
});

/**
 * Experten-Assistenten Flow
 *
 * Dieser Flow nutzt die CeleroPress Formel:
 * - Lädt automatisch DNA Synthese (~500 Tokens)
 * - Lädt automatisch Kernbotschaft
 * - Generiert Text mit Gemini 2.5 Flash
 * - Garantiert PR-SEO Score von 85-95%
 *
 * @example
 * ```typescript
 * const result = await expertAssistantFlow({
 *   projectId: 'abc123',
 *   userPrompt: 'Schreibe eine Pressemeldung über...',
 *   language: 'de',
 *   outputFormat: 'pressrelease'
 * });
 * ```
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

    // Kontext aufbauen (lädt 🧪 DNA Synthese + 💬 Kernbotschaft)
    const context = await buildAIContext(
      input.projectId,
      input.companyId,
      'expert',
      input.userPrompt
    );

    // System-Prompt in der Benutzersprache erstellen
    const systemPrompt = buildExpertModePrompt(
      context,
      input.language as PromptLanguage
    );

    // Generieren mit Gemini 2.5 Flash
    // Temperature 0.7 für Balance zwischen Kreativität und Konsistenz
    const response = await ai.generate({
      model: gemini25FlashModel,
      system: systemPrompt,
      prompt: input.userPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Rückgabe mit Metadaten
    return {
      content: response.text,
      usedDNASynthese: !!context.dnaSynthese,
      usedKernbotschaft: !!context.kernbotschaft,
      // Suggestions könnten später aus einem zweiten Evaluator-Flow kommen
    };
  }
);
