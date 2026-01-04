// src/lib/ai/agentic/skills/skill-roadmap.ts
// Skill: Steuert die horizontale Phasen-Anzeige

import { ai } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { RoadmapInputSchema } from '../types';

/**
 * skill_roadmap
 *
 * Steuert die visuelle Phasen-Roadmap im Chat-UI.
 *
 * Aktionen:
 * - showRoadmap: Initialisiert die Roadmap mit Phasen-Namen
 * - completePhase: Markiert eine Phase als abgeschlossen
 *
 * Beispiel Tool-Call:
 * ```json
 * {
 *   "action": "showRoadmap",
 *   "phases": ["Fakten", "Analyse", "Strategie"],
 *   "currentPhaseIndex": 0
 * }
 * ```
 */
export const skillRoadmap = ai.defineTool(
  {
    name: 'skill_roadmap',
    description: `Steuert die horizontale Phasen-Anzeige (Roadmap) im Chat.

Nutze dieses Tool um:
- Den Prozess zu visualisieren mit showRoadmap
- Phasen als erledigt zu markieren mit completePhase

WICHTIG: Rufe showRoadmap zu Beginn jedes Dokument-Chats auf!`,
    inputSchema: RoadmapInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      action: z.string(),
      phases: z.array(z.string()).optional(),
      currentPhaseIndex: z.number().optional(),
      completedPhaseIndex: z.number().optional(),
    }),
  },
  async (input) => {
    // Tool-Execution - das Frontend rendert basierend auf diesem Result
    if (input.action === 'showRoadmap') {
      return {
        success: true,
        action: 'showRoadmap',
        phases: input.phases || [],
        currentPhaseIndex: input.currentPhaseIndex ?? 0,
      };
    }

    if (input.action === 'completePhase') {
      return {
        success: true,
        action: 'completePhase',
        completedPhaseIndex: input.phaseIndex,
      };
    }

    return {
      success: false,
      action: input.action,
    };
  }
);
