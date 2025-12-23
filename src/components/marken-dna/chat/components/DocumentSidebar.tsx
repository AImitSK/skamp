'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { Transition } from '@headlessui/react';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

/**
 * Dokument-Sidebar Komponente (Claude Artifacts-Style)
 *
 * Layout (gemäß 08-CHAT-UI-KONZEPT.md):
 * ┌───────────────────────────────────┐
 * │ 📄 Dokument                    [X]│
 * ├───────────────────────────────────┤
 * │ Markdown-Content scrollbar        │
 * │                                   │
 * │                                   │
 * └───────────────────────────────────┘
 *
 * Features:
 * - Slide-in von rechts
 * - Breite: w-[500px]
 * - Header: Titel + Close-Button (XMarkIcon)
 * - Content: Markdown-gerendert, scrollbar
 * - Animation: transition-transform duration-300
 * - Styling: border-l border-zinc-200 bg-white
 *
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 *
 * @example
 * ```tsx
 * <DocumentSidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   title="Briefing-Check"
 *   content="# Phase 1\n\n**Branche:** Golf & Gastronomie"
 * />
 * ```
 */
export function DocumentSidebar({
  isOpen,
  onClose,
  title,
  content,
}: DocumentSidebarProps) {
  return (
    <Transition
      show={isOpen}
      enter="transition-transform duration-300 ease-out"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transition-transform duration-300 ease-in"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
    >
      <div className="w-[500px] h-full bg-white border-l border-zinc-200 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-zinc-200 px-4 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-zinc-900">
              📄 {title}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center
                       text-zinc-700 hover:text-zinc-900
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                       rounded-md transition-colors"
            aria-label="Sidebar schließen"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content: Scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {content ? (
            <div className="prose prose-sm max-w-none prose-zinc">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-500">
                Noch kein Dokument vorhanden. Starte das Gespräch, um Inhalte
                zu generieren.
              </p>
            </div>
          )}
        </div>
      </div>
    </Transition>
  );
}
