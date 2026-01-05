'use client';

// src/components/agentic-chat/toolbox/TodoList.tsx
// Vertikale Checkliste mit Status-Indikatoren

import type { TodoListProps } from './types';

/**
 * TodoList
 *
 * Zeigt eine vertikale Checkliste mit Status-Kreisen.
 * Wird durch skill_todos.updateTodoStatus() gesteuert.
 *
 * Status-Icons:
 * - open: ○ (leerer Kreis)
 * - partial: ◐ (halb gefüllter Kreis)
 * - done: ● (voller Kreis, grün)
 */
export function TodoList({ items }: TodoListProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            {/* Status Circle */}
            <div className="flex-shrink-0 mt-0.5">
              <StatusCircle status={item.status} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span
                className={`
                  text-sm font-medium
                  ${item.status === 'done' ? 'text-zinc-500' : 'text-zinc-900'}
                `}
              >
                {item.label}
              </span>

              {/* Value (wenn vorhanden) */}
              {item.value && (
                <p className="text-sm text-zinc-500 mt-0.5 truncate">
                  {item.value}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Status-Kreis Komponente
 */
function StatusCircle({ status }: { status: 'open' | 'partial' | 'done' }) {
  switch (status) {
    case 'done':
      return (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );

    case 'partial':
      return (
        <div className="w-5 h-5 rounded-full border-2 border-primary overflow-hidden">
          <div className="w-full h-full bg-primary" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      );

    case 'open':
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-zinc-300" />
      );
  }
}
