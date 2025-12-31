'use client';

import { ProgressCircle, ProgressStatus } from './ProgressCircle';
import { ProgressLine } from './ProgressLine';

export interface RoadmapPhase {
  id: number;
  title: string;
  shortTitle?: string;
  status: ProgressStatus;
}

interface RoadmapBoxProps {
  phases: RoadmapPhase[];
  className?: string;
}

/**
 * Horizontale Roadmap-Box für Phasen-Übersicht
 *
 * Zeigt alle Phasen als Progress-Line mit Kreisen.
 * Responsive: Auf Mobile vertikal statt horizontal.
 *
 * @example
 * ```tsx
 * <RoadmapBox
 *   phases={[
 *     { id: 1, title: 'DER ANLASS', shortTitle: 'Anlass', status: 'done' },
 *     { id: 2, title: 'DAS MASSNAHMENZIEL', shortTitle: 'Ziel', status: 'active' },
 *     { id: 3, title: 'DIE TEILBOTSCHAFT', shortTitle: 'Botschaft', status: 'open' },
 *     { id: 4, title: 'DAS MATERIAL', shortTitle: 'Material', status: 'open' },
 *   ]}
 * />
 * ```
 */
export function RoadmapBox({ phases, className = '' }: RoadmapBoxProps) {
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
        Roadmap
      </div>

      {/* Desktop: Horizontal */}
      <div className="hidden sm:block">
        {/* Progress-Line mit Kreisen */}
        <div className="flex items-center mb-2">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1 last:flex-none">
              <ProgressCircle status={phase.status} />
              {index < phases.length - 1 && (
                <ProgressLine
                  orientation="horizontal"
                  done={phase.status === 'done'}
                />
              )}
            </div>
          ))}
        </div>

        {/* Labels unter den Kreisen */}
        <div className="flex">
          {phases.map((phase) => (
            <div key={phase.id} className="flex-1 last:flex-none">
              <span className="text-xs text-zinc-600">
                {phase.shortTitle || phase.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertikal */}
      <div className="sm:hidden">
        {phases.map((phase, index) => (
          <div key={phase.id}>
            <div className="flex items-center gap-2">
              <ProgressCircle status={phase.status} />
              <span className="text-xs text-zinc-600">
                Phase {phase.id}: {phase.shortTitle || phase.title}
                {phase.status === 'done' && ' ✓'}
                {phase.status === 'active' && ' ← aktuell'}
              </span>
            </div>
            {index < phases.length - 1 && (
              <ProgressLine done={phase.status === 'done'} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Parser-Hilfsfunktion: Extrahiert Phasen aus [ROADMAP] Tag-Content
 *
 * @example
 * ```
 * const content = `
 * (○) Phase 1: DER ANLASS
 * (●) Phase 2: DAS MASSNAHMENZIEL
 * `;
 * const phases = parseRoadmapContent(content);
 * ```
 */
export function parseRoadmapContent(content: string): RoadmapPhase[] {
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    // Status aus Symbol extrahieren
    let status: ProgressStatus = 'open';
    if (line.includes('(●)') || line.includes('✓')) {
      status = 'done';
    } else if (line.includes('(◐)') || line.includes('aktuell')) {
      status = 'active';
    }

    // Titel extrahieren (nach "Phase X:" oder nach dem Symbol)
    const titleMatch = line.match(/Phase\s*\d+[:\s]+(.+)/i);
    const title = titleMatch
      ? titleMatch[1].replace(/[()○◐●✓←aktuell]/g, '').trim()
      : line.replace(/[()○◐●✓←aktuell]/g, '').trim();

    // Kurzform für Display
    const shortTitles: Record<string, string> = {
      'DER ANLASS': 'Anlass',
      'DAS MASSNAHMENZIEL': 'Ziel',
      'DIE TEILBOTSCHAFT': 'Botschaft',
      'DAS MATERIAL': 'Material',
    };

    const shortTitle = shortTitles[title.toUpperCase()] || title.split(' ')[0];

    return {
      id: index + 1,
      title,
      shortTitle,
      status,
    };
  });
}
