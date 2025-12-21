'use client';

import ReactMarkdown from 'react-markdown';
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AIMessageProps {
  content: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
}

/**
 * KI-Nachricht mit Markdown-Rendering
 *
 * Features:
 * - Markdown-Rendering mit ReactMarkdown
 * - Aktionen: Kopieren, Regenerieren
 * - Loading-State mit Animation
 * - Extrahiert und filtert Meta-Tags ([DOCUMENT], [PROGRESS], [SUGGESTIONS])
 */
export function AIMessage({
  content,
  isLoading = false,
  onRegenerate,
  onCopy,
}: AIMessageProps) {
  // Content ohne Meta-Tags für Anzeige
  const cleanContent = content
    .replace(/\[DOCUMENT\][\s\S]*?\[\/DOCUMENT\]/g, '')
    .replace(/\[PROGRESS:\d+\]/g, '')
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
    .trim();

  return (
    <div className="flex justify-start">
      {/* Design System: AI Message Card */}
      <div className="max-w-[85%] bg-white border border-zinc-200 rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">CeleroPress</span>
          </div>

          {!isLoading && (
            <div className="flex items-center gap-1">
              {/* Kopieren */}
              {onCopy && (
                <button
                  onClick={onCopy}
                  className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                  title="Kopieren"
                  type="button"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 text-zinc-700" />
                </button>
              )}
              {/* Regenerieren */}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
                  title="Neu generieren"
                  type="button"
                >
                  <ArrowPathIcon className="h-4 w-4 text-zinc-700" />
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <span className="text-xs text-zinc-500 animate-pulse">
              Schreibt...
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="prose prose-sm max-w-none prose-zinc">
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
