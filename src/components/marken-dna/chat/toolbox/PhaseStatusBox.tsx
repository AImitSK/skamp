'use client';

import { ProgressCircle, ProgressStatus } from './ProgressCircle';
import { ProgressLine } from './ProgressLine';

export interface PhaseItem {
  id: string;
  label: string;
  value?: string;
  status: ProgressStatus;
}

interface PhaseStatusBoxProps {
  phase: number;
  title: string;
  items: PhaseItem[];
  className?: string;
}

/**
 * Phase-Status-Box für aktuelle Phase mit ToDo-Items
 *
 * Zeigt die Items einer Phase mit vertikaler Progress-Line.
 * Kombiniert die Funktionen von [TODO] und [SUMMARY].
 *
 * @example
 * ```tsx
 * <PhaseStatusBox
 *   phase={1}
 *   title="DER ANLASS"
 *   items={[
 *     { id: '1', label: 'Worüber berichten wir?', value: 'Produktlaunch', status: 'done' },
 *     { id: '2', label: 'Was macht es relevant?', value: '(wird geklärt...)', status: 'active' },
 *     { id: '3', label: 'Zeitbezug?', status: 'open' },
 *   ]}
 * />
 * ```
 */
export function PhaseStatusBox({
  phase,
  title,
  items,
  className = ''
}: PhaseStatusBoxProps) {
  return (
    <div
      className={`
        rounded-lg border border-zinc-200 bg-zinc-50/50
        px-4 py-3 max-w-md
        ${className}
      `}
    >
      {/* Header */}
      <div className="text-xs font-medium text-zinc-500 mb-3">
        Phase {phase}: {title}
      </div>

      {/* Items mit vertikaler Progress-Line */}
      <div>
        {items.map((item, index) => (
          <div key={item.id}>
            {/* Linie vor dem Item (außer beim ersten) */}
            {index > 0 && (
              <ProgressLine
                done={items[index - 1].status === 'done'}
              />
            )}

            {/* Item-Zeile */}
            <div className="flex items-start gap-2">
              <ProgressCircle status={item.status} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-zinc-700">
                  {item.label}
                </span>
                {item.value && (
                  <span className="text-xs text-zinc-500 ml-1">
                    → {item.value}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Parser-Hilfsfunktion: Extrahiert Phase-Attribute aus Tag
 *
 * @example
 * ```
 * const attrs = parsePhaseAttributes('[PHASE_STATUS phase="1" title="DER ANLASS"]');
 * // { phase: 1, title: 'DER ANLASS' }
 * ```
 */
export function parsePhaseAttributes(tag: string): { phase: number; title: string } {
  const phaseMatch = tag.match(/phase="(\d+)"/);
  const titleMatch = tag.match(/title="([^"]+)"/);

  return {
    phase: phaseMatch ? parseInt(phaseMatch[1], 10) : 1,
    title: titleMatch ? titleMatch[1] : '',
  };
}

/**
 * Parser-Hilfsfunktion: Extrahiert Items aus [PHASE_STATUS] Tag-Content
 *
 * @example
 * ```
 * const content = `
 * (●) Thema: Produktlaunch Feature X
 * (◐) News-Hook: 20% Zeitersparnis (wird geklärt)
 * (○) Zeitbezug
 * `;
 * const items = parsePhaseStatusContent(content);
 * ```
 */
export function parsePhaseStatusContent(content: string): PhaseItem[] {
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    // Status aus Symbol extrahieren
    let status: ProgressStatus = 'open';
    if (line.includes('(●)')) {
      status = 'done';
    } else if (line.includes('(◐)')) {
      status = 'active';
    }

    // Label und Value extrahieren
    const cleanLine = line.replace(/[()○◐●]/g, '').trim();
    const colonIndex = cleanLine.indexOf(':');

    let label = cleanLine;
    let value: string | undefined;

    if (colonIndex > 0) {
      label = cleanLine.substring(0, colonIndex).trim();
      value = cleanLine.substring(colonIndex + 1).trim() || undefined;
    }

    return {
      id: `item-${index}`,
      label,
      value,
      status,
    };
  });
}
