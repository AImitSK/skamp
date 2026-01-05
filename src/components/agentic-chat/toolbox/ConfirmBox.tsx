'use client';

// src/components/agentic-chat/toolbox/ConfirmBox.tsx
// Minimalistiche Bestätigung (Claude-Style)

import type { ConfirmBoxProps } from './types';

/**
 * ConfirmBox - Minimalistisch wie Claude.ai
 *
 * Einfache Zusammenfassung mit zwei dezenten Buttons.
 */
export function ConfirmBox({ title, summaryItems, onConfirm, onAdjust, isLoading = false }: ConfirmBoxProps) {
  return (
    <div className="my-3 border-l-2 border-green-500 pl-4">
      {/* Titel */}
      <div className="text-sm font-medium text-zinc-700 mb-2">{title}</div>

      {/* Zusammenfassung als einfache Liste */}
      <ul className="space-y-1 mb-3">
        {summaryItems.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span>
              <span className="font-medium text-zinc-700">{item.key}</span>
              {item.value && (
                <span className="text-zinc-500 ml-1">– {item.value}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Dezente Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="text-sm px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Wird gespeichert...' : 'Bestätigen'}
        </button>
        <button
          type="button"
          onClick={onAdjust}
          disabled={isLoading}
          className="text-sm px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          Anpassen
        </button>
      </div>
    </div>
  );
}
