'use client';

import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface ChatHeaderProps {
  title: string;
  companyName: string;
  onClose: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  sidebarDisabled?: boolean;
}

/**
 * Chat-Header mit Titel, Company-Name und Aktionen
 *
 * Layout (gemäß 08-CHAT-UI-KONZEPT.md):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  [X] Briefing-Check · Golf-Club Widukind-Land            [📄]  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Links: Close-Button (XMarkIcon), Dokumenttyp-Titel, Company-Name
 * - Rechts: Sidebar-Toggle (DocumentTextIcon)
 * - Styling: h-14, border-b border-zinc-200
 */
export function ChatHeader({
  title,
  companyName,
  onClose,
  onToggleSidebar,
  sidebarOpen,
  sidebarDisabled = false,
}: ChatHeaderProps) {
  return (
    <div className="h-14 border-b border-zinc-200 px-4 flex items-center justify-between bg-white">
      {/* Links: Close + Titel + Company */}
      <div className="flex items-center gap-3">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center
                     text-zinc-700 hover:text-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                     rounded-md transition-colors"
          aria-label="Modal schließen"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Titel · Company */}
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <span className="text-zinc-400">·</span>
          <span className="text-sm text-zinc-600">{companyName}</span>
        </div>
      </div>

      {/* Rechts: Sidebar-Toggle */}
      <button
        onClick={onToggleSidebar}
        disabled={sidebarDisabled}
        className={`inline-flex items-center justify-center
                   rounded-md transition-colors
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                   ${
                     sidebarDisabled
                       ? 'text-zinc-300 cursor-not-allowed'
                       : 'text-zinc-700 hover:text-zinc-900'
                   }`}
        aria-label="Dokument-Sidebar anzeigen"
        title={sidebarDisabled ? 'Sidebar in Phase 3' : 'Dokument anzeigen'}
      >
        <DocumentTextIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
