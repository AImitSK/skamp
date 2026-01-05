'use client';

// src/components/agentic-chat/toolbox/TodoList.tsx
// Minimalistiche Checkliste (Claude-Style)

import type { TodoListProps } from './types';

/**
 * TodoList - Minimalistisch wie Claude.ai
 *
 * Einfache Liste mit:
 * - Grüner Punkt für offene Items
 * - Grauer durchgestrichener Text für erledigte Items
 */
export function TodoList({ items }: TodoListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="my-2 space-y-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          {/* Einfacher Bullet Point */}
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            item.status === 'done' ? 'bg-zinc-400' : 'bg-green-500'
          }`} />

          {/* Text */}
          <div className="flex-1">
            <span className={`text-sm ${
              item.status === 'done'
                ? 'text-zinc-400 line-through'
                : 'text-zinc-700'
            }`}>
              {item.label}
            </span>

            {/* Wert eingerückt darunter */}
            {item.value && (
              <div className="text-sm text-zinc-500 ml-3 mt-0.5">
                └── {item.value}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
