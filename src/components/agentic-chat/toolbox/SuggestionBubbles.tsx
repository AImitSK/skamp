'use client';

// src/components/agentic-chat/toolbox/SuggestionBubbles.tsx
// Minimalistiche Vorschläge (Claude-Style)

import type { SuggestionBubblesProps } from './types';

/**
 * SuggestionBubbles - Minimalistisch wie Claude.ai
 *
 * Einfache klickbare Text-Links als Antwort-Optionen.
 */
export function SuggestionBubbles({ prompts, onSelect, disabled = false }: SuggestionBubblesProps) {
  if (prompts.length === 0) return null;

  return (
    <div className="my-2 flex flex-wrap gap-2">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className={`
            text-sm px-3 py-1.5 rounded-md
            border border-zinc-200 bg-zinc-50
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-zinc-100 hover:border-zinc-300'
            }
          `}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
