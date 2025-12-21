'use client';

interface UserMessageProps {
  content: string;
}

/**
 * User-Nachricht Bubble
 *
 * Einfache Nachricht rechts ausgerichtet mit Primary-Farbe
 */
export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-primary text-white rounded-lg px-4 py-3">
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}
