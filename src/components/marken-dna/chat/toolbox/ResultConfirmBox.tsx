'use client';

import { CheckIcon, PencilIcon } from '@heroicons/react/24/outline';

export interface ResultItem {
  label: string;
  value: string;
}

interface ResultConfirmBoxProps {
  phase: number;
  title: string;
  items: ResultItem[];
  onConfirm?: () => void;
  onAdjust?: () => void;
  className?: string;
}

/**
 * Ergebnis-Box zur Bestätigung einer Phase
 *
 * Zeigt das Ergebnis einer Phase mit Ja/Anpassen Buttons.
 * Nach Klick auf "Ja" wird die Sidebar aktualisiert.
 *
 * @example
 * ```tsx
 * <ResultConfirmBox
 *   phase={1}
 *   title="DER ANLASS"
 *   items={[
 *     { label: 'Thema', value: 'Produktlaunch Feature X' },
 *     { label: 'News-Hook', value: '20% Zeitersparnis' },
 *   ]}
 *   onConfirm={() => handleConfirm(1)}
 *   onAdjust={() => handleAdjust(1)}
 * />
 * ```
 */
export function ResultConfirmBox({
  phase,
  title,
  items,
  onConfirm,
  onAdjust,
  className = ''
}: ResultConfirmBoxProps) {
  return (
    <div
      className={`
        rounded-lg border border-green-200 bg-green-50/50
        px-4 py-3
        ${className}
      `}
    >
      {/* Header */}
      <div className="text-sm font-medium text-green-700 mb-3">
        Phase {phase}: {title} - Ergebnis
      </div>

      {/* Items als Key-Value Grid */}
      <div className="space-y-1 mb-3">
        {items.map((item, index) => (
          <div key={index} className="flex text-sm">
            <span className="text-zinc-500 w-32 flex-shrink-0">
              {item.label}
            </span>
            <span className="text-zinc-700">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Trennlinie */}
      <div className="border-t border-green-200 my-3" />

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600">
          Stimmt das?
        </span>
        <div className="flex gap-2">
          {onAdjust && (
            <button
              onClick={onAdjust}
              className="
                inline-flex items-center gap-1
                px-4 py-2 rounded-md
                text-sm font-medium
                text-zinc-600 bg-white border border-zinc-300
                hover:bg-zinc-50
                transition-colors
              "
            >
              <PencilIcon className="w-4 h-4" />
              Anpassen
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="
                inline-flex items-center gap-1
                px-4 py-2 rounded-md
                text-sm font-medium
                text-white bg-green-600
                hover:bg-green-700
                transition-colors
              "
            >
              <CheckIcon className="w-4 h-4" />
              Ja
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Parser-Hilfsfunktion: Extrahiert Items aus [RESULT] Tag-Content
 *
 * @example
 * ```
 * const content = `
 * Thema: Produktlaunch Feature X
 * News-Hook: 20% Zeitersparnis
 * `;
 * const items = parseResultContent(content);
 * ```
 */
export function parseResultContent(content: string): ResultItem[] {
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map(line => {
    const colonIndex = line.indexOf(':');

    if (colonIndex > 0) {
      return {
        label: line.substring(0, colonIndex).trim(),
        value: line.substring(colonIndex + 1).trim(),
      };
    }

    return {
      label: '',
      value: line.trim(),
    };
  }).filter(item => item.value); // Leere Items entfernen
}
