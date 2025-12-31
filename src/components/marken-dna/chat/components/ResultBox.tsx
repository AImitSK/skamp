'use client';

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
 * Header mit Icon + Titel, Content als Key-Value Grid.
 *
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
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

  // Markdown-Formatierung entfernen
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/^#{1,6}\s*/gm, '')  // ## Headers entfernen (multiline)
      .replace(/^\s*[-*]\s+/gm, '') // - und * Listenpunkte entfernen (multiline, mit Leerzeichen dahinter)
      .replace(/^\*\s*/gm, '')      // Alleinstehende * am Zeilenanfang entfernen
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
      .replace(/\*([^*]+)\*/g, '$1')     // *italic* → italic
      .replace(/`([^`]+)`/g, '$1')       // `code` → code
      .trim();
  };

  // Content parsen: Zeilen mit ":" werden als Key-Value behandelt
  const parseContent = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());

    return lines.map((line, index) => {
      // Erst Markdown bereinigen
      const cleanLine = cleanMarkdown(line);

      // Erste Zeile oder Zeilen die mit "Phase" beginnen sind Überschriften
      const isHeader = index === 0 || cleanLine.toLowerCase().startsWith('phase');

      // Prüfe ob es ein Key-Value Paar ist (enthält ":")
      const colonIndex = cleanLine.indexOf(':');

      if (colonIndex > 0 && colonIndex < 30) {
        // Key-Value Paar
        const key = cleanLine.substring(0, colonIndex).trim();
        const value = cleanLine.substring(colonIndex + 1).trim();

        return { type: 'kv' as const, key, value, isHeader };
      } else {
        // Normale Zeile
        return { type: 'text' as const, text: cleanLine, isHeader };
      }
    });
  };

  const parsedContent = parseContent(content);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
      {/* Header mit Icon + Titel */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
        <Icon className="h-4 w-4 text-zinc-600" />
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
      </div>

      {/* Content als Grid */}
      <div className="px-4 py-3">
        <div className="space-y-1">
          {parsedContent.map((item, index) => {
            if (item.type === 'kv') {
              return (
                <div key={index} className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className={`text-zinc-500 ${item.isHeader ? 'font-semibold text-zinc-900' : ''}`}>
                    {item.key}:
                  </span>
                  <span className={`text-zinc-700 ${item.isHeader ? 'font-semibold text-zinc-900' : ''}`}>
                    {item.value}
                  </span>
                </div>
              );
            } else {
              return (
                <div key={index} className={`text-sm ${item.isHeader ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>
                  {item.text}
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}
