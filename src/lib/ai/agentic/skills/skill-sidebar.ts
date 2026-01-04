// src/lib/ai/agentic/skills/skill-sidebar.ts
// Skill: Steuert den Inhalt der Sidebar (Artifact/Dokument)

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { SidebarInputSchema } from '../types';

/**
 * skill_sidebar
 *
 * Steuert den Inhalt der Sidebar während und nach dem Chat.
 *
 * Aktionen:
 * - updateDraft: Live-Update während des Chats (Status bleibt "draft")
 * - finalizeDocument: Finalisiert und speichert (Status wird "completed")
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "action": "updateDraft",
 *   "content": "## Briefing-Check: CeleroPress\n\n### Das Unternehmen\n- Branche: PR-Software\n..."
 * }
 * ```
 */
export const skillSidebar = ai.defineTool(
  {
    name: 'skill_sidebar',
    description: `Steuert den Inhalt der Sidebar (Dokument-Vorschau).

Aktionen:
- "updateDraft": Aktualisiere den Entwurf während des Chats
  - Nutze dies nach jeder relevanten User-Antwort
  - Der Status bleibt "draft"
  - Der User sieht den Fortschritt live

- "finalizeDocument": Finalisiere und speichere das Dokument
  - Nutze dies NUR nach User-Bestätigung via skill_confirm
  - Der Status wird auf "completed" gesetzt
  - Das Dokument wird in Firestore gespeichert

WICHTIG:
- Formatiere den Content in Markdown
- Nutze strukturierte Überschriften (##, ###)
- Halte den Content übersichtlich`,
    inputSchema: SidebarInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      action: z.string(),
      content: z.string(),
      status: z.enum(['draft', 'completed']),
    }),
  },
  async (input) => {
    const status: 'draft' | 'completed' = input.action === 'finalizeDocument' ? 'completed' : 'draft';

    return {
      success: true,
      action: input.action,
      content: input.content,
      status,
    };
  }
);
