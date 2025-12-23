'use client';

import ReactMarkdown from 'react-markdown';
import {
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  MapPinIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface ResultBoxProps {
  title: string;
  content: string;
  icon?: 'document' | 'chart' | 'users' | 'map' | 'flag' | 'chat';
}

/**
 * Result-Box Komponente (Claude-Style)
 *
 * Formatierte Box für strukturierte Phasen-Ergebnisse in AI-Messages.
 * Header mit Icon + Titel, Markdown-gerendeter Content.
 *
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 *
 * Styling:
 * - Background: bg-zinc-50
 * - Border: border-zinc-200
 * - Rounded: rounded-lg
 *
 * @example
 * ```tsx
 * <ResultBox
 *   title="Phase 1: Unternehmensprofil"
 *   content="**Branche:** Golf & Gastronomie\n- Mitgliedschaften\n- Greenfee-Gäste"
 *   icon="document"
 * />
 * ```
 */
export function ResultBox({ title, content, icon = 'document' }: ResultBoxProps) {
  // Icon-Mapping
  const iconMap = {
    document: DocumentTextIcon,
    chart: ChartBarIcon,
    users: UserGroupIcon,
    map: MapPinIcon,
    flag: FlagIcon,
    chat: ChatBubbleLeftRightIcon,
  };

  const Icon = iconMap[icon];

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden">
      {/* Header mit Icon + Titel */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200">
        <Icon className="h-5 w-5 text-zinc-700" />
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
      </div>

      {/* Content: Markdown */}
      <div className="px-4 py-3">
        <div className="prose prose-sm max-w-none prose-zinc">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
