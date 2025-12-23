'use client';

import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

/**
 * Große mehrzeilige Input-Box im Claude.ai-Stil
 *
 * Layout (gemäß 08-CHAT-UI-KONZEPT.md):
 * ┌───────────────────────────────────────────────────────────┐
 * │                                                           │
 * │ Nachricht eingeben...                                     │
 * │                                                       [➤] │
 * └───────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Mehrzeilig mit dynamischer Höhe (min 3 Zeilen, max ~10 Zeilen)
 * - Send-Button rechts unten (PaperAirplaneIcon)
 * - Enter = Senden, Shift+Enter = Neue Zeile
 * - Styling: rounded-xl, border-zinc-300, shadow-sm
 */
export function ChatInput({
  value,
  onChange,
  isLoading,
  placeholder = 'Nachricht eingeben...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-Resize Textarea basierend auf Inhalt
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="relative bg-white border border-zinc-300 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.1)] focus-within:shadow-none focus-within:border-zinc-400 transition-all">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={3}
        className="block w-full resize-none
                   px-4 py-3 pr-14 text-sm
                   bg-transparent border-0
                   placeholder:text-zinc-400
                   focus:outline-none focus:ring-0
                   disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
                   min-h-[80px] max-h-[300px]
                   overflow-y-auto"
      />

      {/* Send Button - Rechts unten */}
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="absolute bottom-3 right-3
                   inline-flex items-center justify-center
                   bg-primary hover:bg-primary-hover text-white
                   font-medium whitespace-nowrap
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                   h-8 w-8 rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Senden"
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
