'use client';

// src/components/agentic-chat/toolbox/RoadmapBox.tsx
// Horizontale Phasen-Anzeige für den Agentic Chat

import { CheckIcon } from '@heroicons/react/24/outline';
import type { RoadmapBoxProps } from './types';

/**
 * RoadmapBox
 *
 * Zeigt eine horizontale Phasen-Roadmap an.
 * Wird durch skill_roadmap.showRoadmap() gesteuert.
 *
 * Zustände:
 * - Abgeschlossen: Grüner Kreis mit Häkchen
 * - Aktiv: Blauer Kreis (Primary)
 * - Ausstehend: Grauer Kreis
 */
export function RoadmapBox({ phases, currentPhaseIndex, completedPhases }: RoadmapBoxProps) {
  if (phases.length === 0) return null;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(index);
          const isCurrent = index === currentPhaseIndex && !isCompleted;
          const isPending = index > currentPhaseIndex && !isCompleted;

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Phase Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-colors duration-200
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-zinc-200 text-zinc-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCurrent ? 'text-primary' : 'text-zinc-600'}
                  `}
                >
                  {phase}
                </span>
              </div>

              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 mt-[-1rem]
                    ${isCompleted ? 'bg-green-500' : 'bg-zinc-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
