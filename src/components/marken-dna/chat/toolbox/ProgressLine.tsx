'use client';

interface ProgressLineProps {
  done?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * Verbindungslinie zwischen Progress-Kreisen
 *
 * Zwei Zustände:
 * - done=false: Graue Linie (ausstehend)
 * - done=true: Blaue Linie (erledigt)
 *
 * Zwei Orientierungen:
 * - vertical: Für ToDo-Listen innerhalb einer Phase
 * - horizontal: Für Roadmap zwischen Phasen
 *
 * @example
 * ```tsx
 * // Vertikal (Standard)
 * <ProgressLine done={true} />
 *
 * // Horizontal
 * <ProgressLine done={false} orientation="horizontal" />
 * ```
 */
export function ProgressLine({
  done = false,
  orientation = 'vertical',
  className = ''
}: ProgressLineProps) {
  const baseClasses = 'transition-colors duration-300';
  const colorClasses = done ? 'bg-blue-500' : 'bg-zinc-200';

  if (orientation === 'horizontal') {
    // Horizontale Linie (für Roadmap)
    return (
      <div
        className={`h-0.5 flex-1 ${baseClasses} ${colorClasses} ${className}`}
      />
    );
  }

  // Vertikale Linie (für ToDo-Listen)
  // ml-[5px] zentriert die Linie unter einem 12px Kreis (12/2 - 1 = 5)
  return (
    <div
      className={`w-0.5 h-4 ml-[5px] ${baseClasses} ${colorClasses} ${className}`}
    />
  );
}
