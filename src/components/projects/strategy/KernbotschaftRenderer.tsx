// src/components/projects/strategy/KernbotschaftRenderer.tsx
'use client';

import React from 'react';
import clsx from 'clsx';

interface KernbotschaftRendererProps {
  content: string;
  className?: string;
}

/**
 * Rendert Kernbotschaft Markdown mit formatierter Darstellung
 *
 * Unterstuetzt:
 * - **fett** und *kursiv*
 * - ## Ueberschriften
 * - - Listen
 * - Absaetze
 */
export function KernbotschaftRenderer({ content, className }: KernbotschaftRendererProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 text-sm text-zinc-700 ml-2">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Leere Zeile
    if (!trimmed) {
      flushList();
      continue;
    }

    // Ueberschrift H2 (##)
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-zinc-900 mt-4 mb-2 first:mt-0">
          {formatInline(trimmed.substring(3))}
        </h3>
      );
      continue;
    }

    // Ueberschrift H3 (###)
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-zinc-800 mt-3 mb-1">
          {formatInline(trimmed.substring(4))}
        </h4>
      );
      continue;
    }

    // Listen-Item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.substring(2));
      continue;
    }

    // Nummerierte Liste
    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^\d+\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 text-sm text-zinc-700 ml-2">
            <span className="text-zinc-400">{trimmed.match(/^\d+/)?.[0]}.</span>
            <span>{formatInline(match[1])}</span>
          </div>
        );
      }
      continue;
    }

    // Normaler Absatz
    flushList();
    elements.push(
      <p key={key++} className="text-sm text-zinc-700 leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  }

  // Restliche Liste flushen
  flushList();

  return (
    <div className={clsx('space-y-2', className)}>
      {elements}
    </div>
  );
}

/**
 * Formatiert Inline-Markdown (fett, kursiv)
 */
function formatInline(text: string): React.ReactNode {
  // Einfache Implementierung: **fett** und *kursiv*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // **fett**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index));
      }
      parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // *kursiv*
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(remaining.substring(0, italicMatch.index));
      }
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Kein Match mehr - Rest hinzufuegen
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default KernbotschaftRenderer;
