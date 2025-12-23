'use client';

interface UserMessageProps {
  content: string;
}

/**
 * User-Nachricht Komponente (Claude-Style)
 *
 * Rechts ausgerichtete Nachricht mit neutraler Hintergrundfarbe.
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 *
 * @example
 * ```tsx
 * <UserMessage content="Wir betreiben einen Golf-Club mit 18-Loch-Platz." />
 * ```
 */
export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-6">
      <div className="bg-zinc-100 rounded-2xl px-4 py-2 ml-auto max-w-md">
        <p className="text-sm text-zinc-900 whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}
