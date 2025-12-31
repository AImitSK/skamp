'use client';

export type ProgressStatus = 'open' | 'active' | 'done';

interface ProgressCircleProps {
  status: ProgressStatus;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Progress-Kreis Komponente für die Chat-Toolbox
 *
 * Drei Zustände:
 * - open: Outline-Kreis (noch nicht begonnen)
 * - active: Halb gefüllter Kreis (in Bearbeitung)
 * - done: Voll gefüllter Kreis (erledigt)
 *
 * @example
 * ```tsx
 * <ProgressCircle status="open" />
 * <ProgressCircle status="active" />
 * <ProgressCircle status="done" />
 * ```
 */
export function ProgressCircle({
  status,
  size = 'sm',
  className = ''
}: ProgressCircleProps) {
  // Größen: sm = 12px (w-3 h-3), md = 16px (w-4 h-4)
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const borderWidth = size === 'sm' ? '2px' : '2px';

  switch (status) {
    case 'open':
      // Outline: nur Rand, transparent innen
      return (
        <div
          className={`${sizeClasses} rounded-full border-2 border-zinc-300 bg-transparent flex-shrink-0 transition-all duration-300 ${className}`}
        />
      );

    case 'active':
      // Halb gefüllt: CSS conic-gradient für exakte Hälfte
      return (
        <div
          className={`${sizeClasses} rounded-full flex-shrink-0 transition-all duration-300 ${className}`}
          style={{
            background: 'conic-gradient(#3b82f6 0deg 180deg, transparent 180deg 360deg)',
            border: `${borderWidth} solid #3b82f6`
          }}
        />
      );

    case 'done':
      // Voll gefüllt: komplett blau
      return (
        <div
          className={`${sizeClasses} rounded-full bg-blue-500 flex-shrink-0 transition-all duration-300 ${className}`}
        />
      );

    default:
      return null;
  }
}
