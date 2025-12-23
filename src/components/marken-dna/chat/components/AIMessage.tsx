'use client';

import ReactMarkdown from 'react-markdown';
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ResultBox } from './ResultBox';

interface AIMessageProps {
  content: string;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

/**
 * AI-Nachricht Komponente (Claude-Style)
 *
 * Features:
 * - Markdown-Rendering für Haupt-Content
 * - Extrahiert [DOCUMENT] Markup und zeigt es in ResultBox
 * - Icon-Buttons rechts unten (nur Icons mit Tooltip)
 * - Clean Design ohne Border
 *
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 *
 * @example
 * ```tsx
 * <AIMessage
 *   content="Perfekt! Golf & Gastronomie...\n\n[DOCUMENT]\n## Phase 1\n...\n[/DOCUMENT]"
 *   onCopy={() => copyToClipboard()}
 *   onRegenerate={() => regenerate()}
 * />
 * ```
 */
export function AIMessage({ content, onRegenerate, onCopy }: AIMessageProps) {
  // Extrahiere Dokument-Inhalt aus [DOCUMENT]...[/DOCUMENT]
  const documentMatch = content.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  const documentContent = documentMatch ? documentMatch[1].trim() : null;

  // Content ohne Meta-Tags für Anzeige
  const cleanContent = content
    .replace(/\[DOCUMENT\][\s\S]*?\[\/DOCUMENT\]/g, '')  // [DOCUMENT]...[/DOCUMENT]
    .replace(/\[PROGRESS:\d+\]/g, '')                     // [PROGRESS:50]
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '') // [SUGGESTIONS]...[/SUGGESTIONS]
    .replace(/\[\/?SUGGESTIONS\]/g, '')                   // [SUGGESTIONS] oder [/SUGGESTIONS] alleine
    .replace(/\[STATUS:[^\]]+\]/g, '')                    // [STATUS:completed], [STATUS:draft], etc.
    .replace(/\[\/?DOCUMENT\]/g, '')                      // [DOCUMENT] oder [/DOCUMENT] alleine
    .trim();

  return (
    <div className="mb-6 max-w-3xl">
      {/* Hauptinhalt: Markdown */}
      <div className="prose prose-sm max-w-none prose-zinc
                      prose-headings:font-semibold prose-headings:text-zinc-900
                      prose-p:text-zinc-700 prose-p:leading-relaxed
                      prose-strong:text-zinc-900 prose-strong:font-semibold
                      prose-ul:my-2 prose-li:my-0.5 prose-li:text-zinc-700
                      prose-li:marker:text-zinc-400">
        <ReactMarkdown>{cleanContent}</ReactMarkdown>
      </div>

      {/* Result-Box: Falls [DOCUMENT] vorhanden */}
      {documentContent && (
        <div className="mt-3">
          <ResultBox
            title="Phasen-Ergebnis"
            content={documentContent}
            icon="document"
          />
        </div>
      )}

      {/* Icon-Buttons: Rechts unten */}
      <div className="flex justify-end gap-1 mt-2">
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Kopieren"
            type="button"
            aria-label="Kopieren"
          >
            <ClipboardDocumentIcon className="h-4 w-4 text-zinc-700" />
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Neu generieren"
            type="button"
            aria-label="Neu generieren"
          >
            <ArrowPathIcon className="h-4 w-4 text-zinc-700" />
          </button>
        )}
      </div>
    </div>
  );
}
