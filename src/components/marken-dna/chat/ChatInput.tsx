'use client';

import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

/**
 * Chat-Eingabefeld mit Send-Button
 *
 * Features:
 * - Textarea mit Auto-Resize
 * - Send-Button (disabled während Loading)
 * - Enter zum Senden (Shift+Enter für neue Zeile)
 * - Design System: h-10 Mindesthöhe, Primary-Button
 */
export function ChatInput({
  value,
  onChange,
  isLoading,
  placeholder = 'Nachricht eingeben...',
}: ChatInputProps) {
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
    <div className="flex items-end gap-2">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="flex-1 block rounded-lg border border-zinc-300 bg-white
                   px-3 py-2 text-sm resize-none
                   placeholder:text-zinc-300
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
                   min-h-[40px] max-h-[200px]"
        style={{
          height: 'auto',
          overflowY: value.split('\n').length > 3 ? 'auto' : 'hidden',
        }}
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="inline-flex items-center justify-center
                   bg-primary hover:bg-primary-hover text-white
                   font-medium whitespace-nowrap
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                   h-10 w-10 rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        title="Senden"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
