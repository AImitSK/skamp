// src/lib/ai/agentic/skills/skill-suggestions.ts
// Skill: Aktualisiert die Quick-Reply Vorschläge

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { SuggestionsInputSchema } from '../types';

/**
 * skill_suggestions
 *
 * Aktualisiert die interaktiven Antwort-Vorschläge (Action-Bubbles).
 *
 * Diese erscheinen als klickbare Buttons unter dem Input-Feld.
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "prompts": [
 *     "Ja, Briefing starten",
 *     "Ich möchte direkt zur SWOT",
 *     "Zeige mir den Status"
 *   ]
 * }
 * ```
 */
export const skillSuggestions = ai.defineTool(
  {
    name: 'skill_suggestions',
    description: `Aktualisiert die klickbaren Antwort-Vorschläge unter dem Input-Feld.

Nutze dieses Tool um dem User hilfreiche nächste Schritte anzubieten.

Gute Vorschläge:
- Sind kurz und prägnant (max. 5-7 Wörter)
- Bieten konkrete Handlungsoptionen
- Passen zum aktuellen Kontext

Biete 2-4 Vorschläge an.`,
    inputSchema: SuggestionsInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      prompts: z.array(z.string()),
    }),
  },
  async (input) => {
    return {
      success: true,
      prompts: input.prompts,
    };
  }
);
