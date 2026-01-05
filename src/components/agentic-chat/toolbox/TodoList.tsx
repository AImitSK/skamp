'use client';

// src/components/agentic-chat/toolbox/TodoList.tsx
// Minimale Checkliste - inline im Chat ohne Box

import type { TodoListProps } from './types';

/**
 * TodoList - Minimalistisch wie im Layout-Entwurf
 *
 * Punkt-Farben nach Status:
 * - open: Grau (noch zu erledigen)
 * - done: Grün (erledigt)
 * - partial: Orange (muss weiter bearbeitet werden)
 *
 * Format:
 * • Label (fett)
 *   └── Wert (wenn vorhanden)
 */
export function TodoList({ items }: TodoListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="my-3 space-y-2">
      {items.map((item) => {
        // Punkt-Farbe nach Status
        const dotColor =
          item.status === 'done' ? 'bg-green-500' :
          item.status === 'partial' ? 'bg-orange-500' :
          'bg-zinc-400';

        return (
          <li key={item.id}>
            {/* Zeile 1: Punkt + Label */}
            <div className="flex items-baseline gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
                style={{ marginTop: '0.45em' }}
              />
              <span className="font-semibold text-zinc-900">
                {item.label}
              </span>
            </div>

            {/* Zeile 2: Eingerückter Wert mit Bogen */}
            {item.value && (
              <div className="flex items-baseline ml-4 mt-0.5">
                <span className="text-zinc-400 mr-1.5 font-mono text-sm">└──</span>
                <span className="text-zinc-600 text-sm">{item.value}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
