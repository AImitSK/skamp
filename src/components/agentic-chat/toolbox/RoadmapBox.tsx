'use client';

// src/components/agentic-chat/toolbox/RoadmapBox.tsx
// Minimalistiche Phasen-Anzeige (Claude-Style)

import type { RoadmapBoxProps } from './types';

/**
 * RoadmapBox - Minimalistisch wie Claude.ai
 *
 * Einfache nummerierte Liste der Phasen:
 * - Aktuelle Phase fett markiert
 * - Abgeschlossene Phasen durchgestrichen
 */
export function RoadmapBox({ phases, currentPhaseIndex, completedPhases }: RoadmapBoxProps) {
  if (phases.length === 0) return null;

  return (
    <div className="my-2">
      <div className="text-sm font-medium text-zinc-700 mb-1">Ablauf:</div>
      <ol className="space-y-0.5">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(index);
          const isCurrent = index === currentPhaseIndex && !isCompleted;

          return (
            <li key={index} className="flex items-start gap-2 text-sm">
              {/* Nummer */}
              <span className={`w-4 flex-shrink-0 ${
                isCompleted ? 'text-zinc-400' : isCurrent ? 'text-green-600 font-medium' : 'text-zinc-500'
              }`}>
                {index + 1}.
              </span>

              {/* Phase Name */}
              <span className={`${
                isCompleted
                  ? 'text-zinc-400 line-through'
                  : isCurrent
                    ? 'text-zinc-900 font-medium'
                    : 'text-zinc-600'
              }`}>
                {phase}
                {isCurrent && <span className="text-green-600 ml-1">←</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
