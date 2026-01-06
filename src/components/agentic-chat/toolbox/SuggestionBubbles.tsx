'use client';

// src/components/agentic-chat/toolbox/SuggestionBubbles.tsx
// Klickbare Quick-Reply Vorschläge

import type { SuggestionBubblesProps } from './types';

/**
 * SuggestionBubbles
 *
 * Zeigt klickbare Antwort-Vorschläge als Pills an.
 * Wird durch skill_suggestions.updateSuggestions() gesteuert.
 */
export function SuggestionBubbles({ prompts, onSelect, disabled = false }: SuggestionBubblesProps) {
  if (prompts.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Label */}
      <div className="text-[8px] font-bold text-zinc-400 tracking-[0.3em] mb-2">
        QUICK REPLIES
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-full
            border border-zinc-200 bg-white
            transition-all duration-150
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100'
            }
          `}
        >
          {prompt}
        </button>
      ))}
      </div>
    </div>
  );
}
