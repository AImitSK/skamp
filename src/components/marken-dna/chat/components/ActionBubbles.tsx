'use client';

import {
  DocumentTextIcon,
  ArrowPathIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';

interface ActionBubblesProps {
  onShowDocument: () => void;
  onRestart: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

/**
 * 3 feste Action-Bubbles unter der Input-Box
 *
 * Layout (gemäß 08-CHAT-UI-KONZEPT.md):
 *    [📄 Zwischenstand]    [🔄 Neu starten]    [💾 Speichern]
 *
 * Buttons:
 * - Zwischenstand: Öffnet Sidebar mit aktuellem Dokument
 * - Neu starten: Chat zurücksetzen (mit Bestätigung)
 * - Speichern: Speichert als Entwurf und schließt
 *
 * Styling:
 * - bg-white border border-zinc-200
 * - rounded-full px-4 py-2
 * - hover:bg-zinc-50
 */
export function ActionBubbles({
  onShowDocument,
  onRestart,
  onSave,
  isSaving = false,
}: ActionBubblesProps) {
  return (
    <div className="flex justify-center gap-3 mt-3">
      {/* Zwischenstand */}
      <button
        onClick={onShowDocument}
        className="inline-flex items-center gap-2
                   bg-white border border-zinc-200 rounded-full
                   px-4 py-2 text-sm
                   text-zinc-700 hover:bg-zinc-50
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   transition-colors"
        aria-label="Zwischenstand anzeigen"
      >
        <DocumentTextIcon className="h-4 w-4" />
        <span>Zwischenstand</span>
      </button>

      {/* Neu starten */}
      <button
        onClick={onRestart}
        className="inline-flex items-center gap-2
                   bg-white border border-zinc-200 rounded-full
                   px-4 py-2 text-sm
                   text-zinc-700 hover:bg-zinc-50
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   transition-colors"
        aria-label="Chat neu starten"
      >
        <ArrowPathIcon className="h-4 w-4" />
        <span>Neu starten</span>
      </button>

      {/* Speichern */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2
                   bg-white border border-zinc-200 rounded-full
                   px-4 py-2 text-sm
                   text-zinc-700 hover:bg-zinc-50
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Entwurf speichern und schließen"
      >
        <BookmarkIcon className="h-4 w-4" />
        <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
      </button>
    </div>
  );
}
