'use client';

import { LightBulbIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

/**
 * Vorschläge-Chips für KI-Chat
 *
 * Zeigt klickbare Vorschläge aus der KI-Antwort
 * (extrahiert aus [SUGGESTIONS]...[/SUGGESTIONS] Tags)
 */
export function SuggestedPrompts({
  prompts,
  onSelect,
}: SuggestedPromptsProps) {
  const t = useTranslations('markenDNA.chat');

  if (prompts.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-2 mb-2">
        {/* Design System: Heroicon statt Emoji */}
        <LightBulbIcon className="h-4 w-4 text-amber-500" />
        <span className="text-xs text-zinc-500">{t('suggestions')}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelect(prompt)}
            type="button"
            className="px-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-full
                       hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
