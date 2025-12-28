// src/components/marken-dna/DNASyntheseRenderer.tsx
'use client';

import React from 'react';
import clsx from 'clsx';

interface DNASyntheseRendererProps {
  content: string;
  className?: string;
}

/**
 * Rendert DNA Synthese Markdown mit formatierter Darstellung
 *
 * Hebt wichtige Sektionen farbig hervor:
 * - TONALITÄTS-OVERRIDE: Lila
 * - BLACKLIST: Rot
 * - Tabellen: Formatiert
 * - Headers: Strukturiert
 */
export function DNASyntheseRenderer({ content, className }: DNASyntheseRendererProps) {
  // Parse den Content in Sektionen
  const sections = parseDNAContent(content);

  return (
    <div className={clsx('space-y-4', className)}>
      {sections.map((section, index) => (
        <SectionRenderer key={index} section={section} />
      ))}
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================

type SectionType =
  | 'header'
  | 'tonality'
  | 'blacklist'
  | 'table'
  | 'list'
  | 'paragraph'
  | 'spokespersons';

interface Section {
  type: SectionType;
  title?: string;
  content: string;
  items?: string[];
  tableData?: { headers: string[]; rows: string[][] };
}

// ============================================================================
// PARSER
// ============================================================================

function parseDNAContent(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length > 0 && currentSection) {
      currentSection.content = buffer.join('\n').trim();
      if (currentSection.content) {
        sections.push(currentSection);
      }
    }
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Header mit Emoji erkennen (z.B. "#### 🧪 DNA SYNTHESE:")
    if (trimmedLine.match(/^#{1,4}\s*[🧪🎯💬⚡🚫⚖️📋✅]\s*/)) {
      flushBuffer();
      currentSection = {
        type: 'header',
        title: trimmedLine.replace(/^#{1,4}\s*/, ''),
        content: '',
      };
      sections.push(currentSection);
      currentSection = { type: 'paragraph', content: '' };
      continue;
    }

    // TONALITÄTS-OVERRIDE Block
    if (trimmedLine.includes('TONALITÄTS-OVERRIDE') || trimmedLine.includes('TONALITY OVERRIDE')) {
      flushBuffer();
      currentSection = {
        type: 'tonality',
        title: trimmedLine.replace(/\*\*/g, ''),
        content: '',
        items: [],
      };
      continue;
    }

    // BLACKLIST Block
    if (trimmedLine.includes('BLACKLIST')) {
      flushBuffer();
      currentSection = {
        type: 'blacklist',
        title: trimmedLine.replace(/\*\*/g, ''),
        content: '',
        items: [],
      };
      continue;
    }

    // ANSPRECHPARTNER Block
    if (trimmedLine.includes('ANSPRECHPARTNER') || trimmedLine.includes('SPOKESPERSONS')) {
      flushBuffer();
      currentSection = {
        type: 'spokespersons',
        title: trimmedLine.replace(/\*\*/g, ''),
        content: '',
      };
      continue;
    }

    // Normale Header (z.B. **UNTERNEHMENSPROFIL:**)
    if (trimmedLine.match(/^\*\*[A-ZÄÖÜ][A-ZÄÖÜ\s\-&]+:?\*\*:?$/)) {
      flushBuffer();
      currentSection = {
        type: 'header',
        title: trimmedLine.replace(/\*\*/g, '').replace(/:$/, ''),
        content: '',
      };
      sections.push(currentSection);
      currentSection = { type: 'paragraph', content: '' };
      continue;
    }

    // Tabelle erkennen (beginnt mit |)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (currentSection?.type !== 'table') {
        flushBuffer();
        currentSection = {
          type: 'table',
          content: '',
          tableData: { headers: [], rows: [] },
        };
      }

      // Parse Tabellenzeile
      const cells = trimmedLine
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim());

      // Separator-Zeile überspringen (z.B. |---|---|)
      if (cells.every(cell => cell.match(/^[-:]+$/))) {
        continue;
      }

      if (currentSection.tableData) {
        if (currentSection.tableData.headers.length === 0) {
          currentSection.tableData.headers = cells;
        } else {
          currentSection.tableData.rows.push(cells);
        }
      }
      continue;
    } else if (currentSection?.type === 'table') {
      // Tabelle beenden wenn Zeile nicht mit | beginnt
      sections.push(currentSection);
      currentSection = { type: 'paragraph', content: '' };
    }

    // Listen-Items (- oder •)
    if (trimmedLine.match(/^[-•]\s+/)) {
      if (currentSection?.type === 'tonality' || currentSection?.type === 'blacklist') {
        currentSection.items?.push(trimmedLine.replace(/^[-•]\s+/, ''));
      } else {
        buffer.push(line);
      }
      continue;
    }

    // IMMER/NIE/STIL Pattern für Tonalität
    if (currentSection?.type === 'tonality' && trimmedLine.match(/^(IMMER|NIE|STIL|PFLICHT|ALWAYS|NEVER|STYLE|MUST):/i)) {
      currentSection.items?.push(trimmedLine);
      continue;
    }

    // Normale Zeile
    buffer.push(line);
  }

  // Letzten Buffer flushen
  flushBuffer();

  return sections.filter(s => s.content || s.items?.length || s.tableData?.rows.length || s.type === 'header');
}

// ============================================================================
// SECTION RENDERER
// ============================================================================

function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case 'header':
      return <HeaderSection title={section.title || ''} />;

    case 'tonality':
      return <TonalitySection title={section.title} items={section.items || []} />;

    case 'blacklist':
      return <BlacklistSection title={section.title} items={section.items || []} content={section.content} />;

    case 'table':
      return <TableSection data={section.tableData} />;

    case 'spokespersons':
      return <SpokespersonsSection title={section.title} content={section.content} />;

    case 'paragraph':
    case 'list':
    default:
      return <ParagraphSection content={section.content} />;
  }
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function HeaderSection({ title }: { title: string }) {
  // Emoji am Anfang erkennen
  const hasEmoji = title.match(/^[🧪🎯💬⚡🚫⚖️📋✅]/);

  return (
    <h3 className={clsx(
      'text-sm font-semibold uppercase tracking-wide border-b pb-1 mt-4 first:mt-0',
      hasEmoji ? 'text-purple-700 border-purple-200' : 'text-zinc-700 border-zinc-200'
    )}>
      {title}
    </h3>
  );
}

function TonalitySection({ title, items }: { title?: string; items: string[] }) {
  // Emoji aus Titel entfernen falls vorhanden
  const cleanTitle = (title || 'TONALITÄTS-OVERRIDE').replace(/^⚡\s*/, '');

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚡</span>
        <h4 className="font-semibold text-purple-800 text-sm">
          {cleanTitle}
        </h4>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isImmer = item.toLowerCase().startsWith('immer') || item.toLowerCase().startsWith('always');
          const isNie = item.toLowerCase().startsWith('nie') || item.toLowerCase().startsWith('never');
          const isStil = item.toLowerCase().startsWith('stil') || item.toLowerCase().startsWith('style');
          const isPflicht = item.toLowerCase().startsWith('pflicht') || item.toLowerCase().startsWith('must');

          return (
            <div
              key={idx}
              className={clsx(
                'text-sm px-3 py-1.5 rounded',
                isImmer && 'bg-green-100 text-green-800',
                isNie && 'bg-red-100 text-red-800',
                isStil && 'bg-blue-100 text-blue-800',
                isPflicht && 'bg-amber-100 text-amber-800',
                !isImmer && !isNie && !isStil && !isPflicht && 'bg-purple-100 text-purple-800'
              )}
            >
              {formatTonalityItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTonalityItem(item: string): React.ReactNode {
  // Split bei : und formatiere Label fett
  const colonIndex = item.indexOf(':');
  if (colonIndex > 0) {
    const label = item.substring(0, colonIndex + 1);
    const value = item.substring(colonIndex + 1).trim();
    return (
      <>
        <span className="font-semibold">{label}</span> {value}
      </>
    );
  }
  return item;
}

function BlacklistSection({ title, items, content }: { title?: string; items: string[]; content: string }) {
  // Emoji aus Titel entfernen falls vorhanden
  const cleanTitle = (title || 'BLACKLIST').replace(/^🚫\s*/, '');

  // Wenn items leer, versuche aus content zu parsen
  let displayItems = items;
  if (displayItems.length === 0 && content) {
    displayItems = content
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('-'));
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🚫</span>
        <h4 className="font-semibold text-red-800 text-sm">
          {cleanTitle}
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300"
          >
            <span className="mr-1">✕</span>
            {item.replace(/^[-•]\s*/, '')}
          </span>
        ))}
      </div>
    </div>
  );
}

function TableSection({ data }: { data?: { headers: string[]; rows: string[][] } }) {
  if (!data || data.headers.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-zinc-200 rounded-lg overflow-hidden">
        <thead className="bg-zinc-100">
          <tr>
            {data.headers.map((header, idx) => (
              <th
                key={idx}
                className="px-3 py-2 text-left font-medium text-zinc-700 border-b border-zinc-200"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {data.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-zinc-50">
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-3 py-2 text-zinc-600"
                >
                  {formatCellContent(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellContent(cell: string): React.ReactNode {
  // Zielgruppen-IDs hervorheben
  if (cell.match(/^ZG[1-3]$/) || cell.match(/^TG[1-3]$/)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
        {cell}
      </span>
    );
  }
  return cell;
}

function SpokespersonsSection({ title, content }: { title?: string; content: string }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💬</span>
        <h4 className="font-semibold text-blue-800 text-sm">
          {title || 'ANSPRECHPARTNER'}
        </h4>
      </div>
      <div className="text-sm text-blue-900 whitespace-pre-wrap">
        {formatMarkdownBasic(content)}
      </div>
    </div>
  );
}

function ParagraphSection({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <div className="text-sm text-zinc-700 leading-relaxed">
      {formatMarkdownBasic(content)}
    </div>
  );
}

// ============================================================================
// MARKDOWN FORMATTER
// ============================================================================

function formatMarkdownBasic(text: string): React.ReactNode {
  if (!text) return null;

  // Split in Zeilen und verarbeite
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Listen-Item
        if (trimmed.match(/^[-•]\s+/)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-zinc-400 mt-0.5">•</span>
              <span>{formatInlineMarkdown(trimmed.replace(/^[-•]\s+/, ''))}</span>
            </div>
          );
        }

        // Nummerierte Liste
        if (trimmed.match(/^\d+\.\s+/)) {
          const num = trimmed.match(/^(\d+)\./)?.[1];
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-zinc-500 font-medium min-w-[1.5rem]">{num}.</span>
              <span>{formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</span>
            </div>
          );
        }

        // Normale Zeile
        return (
          <div key={idx}>
            {formatInlineMarkdown(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Einfache Inline-Formatierung
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Bold **text**
  while (remaining.includes('**')) {
    const start = remaining.indexOf('**');
    const end = remaining.indexOf('**', start + 2);

    if (end === -1) break;

    if (start > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, start)}</span>);
    }

    parts.push(
      <span key={key++} className="font-semibold text-zinc-900">
        {remaining.substring(start + 2, end)}
      </span>
    );

    remaining = remaining.substring(end + 2);
  }

  if (remaining) {
    parts.push(<span key={key++}>{remaining}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export default DNASyntheseRenderer;
