'use client';

// src/components/agentic-chat/toolbox/RoadmapBox.tsx
// Vertikale Timeline für Phasen-Anzeige

import type { RoadmapBoxProps } from './types';

/**
 * RoadmapBox - Vertikale Timeline
 *
 * Design:
 * ● Erledigte Phase (ausgefüllter Kreis)
 * │ (Verbindungslinie, kleine Schrift für kurze Abstände)
 * ○ Offene Phase (leerer Kreis)
 */
export function RoadmapBox({ phases, currentPhaseIndex, completedPhases }: RoadmapBoxProps) {
  if (phases.length === 0) return null;

  return (
    <div className="my-6">
      {/* Label */}
      <div className="text-[8px] font-bold text-zinc-400 tracking-[0.3em] mb-2">
        ROADMAP
      </div>

      {phases.map((phase, index) => {
        const isCompleted = completedPhases.includes(index);
        const isCurrent = index === currentPhaseIndex && !isCompleted;
        const isDone = isCompleted || index < currentPhaseIndex;
        const isLast = index === phases.length - 1;

        return (
          <div key={index}>
            {/* Phase-Zeile: Kreis + Text */}
            <div className="flex items-center gap-2">
              {/* Kreis: ausgefüllt oder leer */}
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 ${
                  isDone || isCurrent
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white border-zinc-300'
                }`}
              />
              {/* Phase-Name */}
              <span
                className={`${
                  isCurrent
                    ? 'font-semibold text-zinc-900'
                    : isDone
                      ? 'text-zinc-500'
                      : 'text-zinc-400'
                }`}
              >
                {phase}
              </span>
            </div>

            {/* Verbindungslinie (nicht nach letztem Element) */}
            {!isLast && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 flex justify-center">
                  <div className={`w-0.5 h-2 ${isDone ? 'bg-green-500' : 'bg-zinc-200'}`} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
