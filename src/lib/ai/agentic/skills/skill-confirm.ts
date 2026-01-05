// src/lib/ai/agentic/skills/skill-confirm.ts
// Skill: Triggert die Bestätigungs-Box für User-Freigaben

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { ConfirmInputSchema, ConfirmSummaryItemSchema } from '../types';

/**
 * skill_confirm
 *
 * Zeigt eine Bestätigungs-Box mit Zusammenfassung und [Ja]/[Anpassen] Buttons.
 *
 * WICHTIG: Rufe dieses Tool NUR auf, wenn alle ToDos auf "done" stehen!
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "title": "Briefing-Check abschließen?",
 *   "summaryItems": [
 *     { "key": "Unternehmen", "value": "CeleroPress" },
 *     { "key": "Branche", "value": "PR-Software" },
 *     { "key": "Fokus", "value": "KI-Automatisierung" }
 *   ]
 * }
 * ```
 */
export const skillConfirm = ai.defineTool(
  {
    name: 'skill_confirm',
    description: `Zeigt eine Bestätigungs-Box zur Freigabe des Dokuments.

Rufe dieses Tool auf, wenn:
- ALLE Aufgaben in skill_todos auf "done" stehen
- Du dem User das Ergebnis zur Bestätigung vorlegen möchtest

Die Box zeigt:
- Einen Titel (z.B. "Briefing-Check abschließen?")
- Eine Zusammenfassung der gesammelten Daten als Key-Value-Paare
- Buttons [Ja] und [Anpassen]

Bei [Ja]: Frontend ruft skill_sidebar.finalizeDocument() auf
Bei [Anpassen]: User kann weiteren Input geben`,
    inputSchema: ConfirmInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      title: z.string(),
      summaryItems: z.array(ConfirmSummaryItemSchema),
      awaitingConfirmation: z.boolean(),
    }),
  },
  async (input) => {
    return {
      success: true,
      title: input.title,
      summaryItems: input.summaryItems,
      awaitingConfirmation: true,
    };
  }
);
