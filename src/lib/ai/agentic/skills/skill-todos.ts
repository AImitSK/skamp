// src/lib/ai/agentic/skills/skill-todos.ts
// Skill: Verwaltet die vertikale Checkliste innerhalb einer Phase

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { TodosInputSchema, TodoItemSchema } from '../types';

/**
 * skill_todos
 *
 * Verwaltet die Checkliste mit Status-Indikatoren.
 *
 * Status-Icons:
 * - open: ○ (leer)
 * - partial: ◐ (halb gefüllt)
 * - done: ● (voll)
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "items": [
 *     { "id": "t1", "label": "Branche klären", "status": "done", "value": "SaaS" },
 *     { "id": "t2", "label": "Zielgruppen", "status": "partial", "value": "PR-Agenturen..." },
 *     { "id": "t3", "label": "Wettbewerber", "status": "open" }
 *   ]
 * }
 * ```
 */
export const skillTodos = ai.defineTool(
  {
    name: 'skill_todos',
    description: `Verwaltet die vertikale Checkliste mit Aufgaben/Fragen.

Nutze dieses Tool nach JEDER User-Antwort um den Fortschritt zu visualisieren!

Status-Werte:
- "open": Noch nicht bearbeitet (○)
- "partial": Teilweise bearbeitet (◐)
- "done": Vollständig erledigt (●)

Das "value" Feld enthält eine kurze Zusammenfassung der User-Antwort.

WICHTIG: Wenn ALLE Items auf "done" stehen, rufe danach skill_confirm auf!`,
    inputSchema: TodosInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      items: z.array(TodoItemSchema),
      allDone: z.boolean(),
    }),
  },
  async (input) => {
    const allDone = input.items.every(item => item.status === 'done');

    return {
      success: true,
      items: input.items,
      allDone,
    };
  }
);
