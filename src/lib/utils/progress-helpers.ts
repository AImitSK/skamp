/**
 * Progress Helper Utilities
 *
 * Design System konforme Progress-Farben und Helper-Funktionen
 * für konsistente Fortschritts-Anzeigen.
 */

/**
 * Design System konforme Progress-Farben
 *
 * Basierend auf CeleroPress Design System (docs/design-system/DESIGN_SYSTEM.md)
 */
export const PROGRESS_COLORS = {
  high: 'bg-green-600',      // 90%+ - Design System green
  medium: 'bg-blue-600',     // 70-89% - Design System blue
  low: 'bg-amber-500',       // 50-69% - Design System amber (nicht yellow!)
  critical: 'bg-red-600'     // <50% - Design System red
} as const;

/**
 * Gibt die passende Progress-Farbe basierend auf Prozent-Wert zurück
 *
 * @param percent - Fortschritt in Prozent (0-100)
 * @returns Tailwind CSS Klasse (z.B. "bg-green-600")
 *
 * @example
 * const color = getProgressColor(95); // "bg-green-600"
 * const color = getProgressColor(45); // "bg-red-600"
 */
export function getProgressColor(percent: number): string {
  if (percent >= 90) return PROGRESS_COLORS.high;
  if (percent >= 70) return PROGRESS_COLORS.medium;
  if (percent >= 50) return PROGRESS_COLORS.low;
  return PROGRESS_COLORS.critical;
}

/**
 * Gibt eine menschenlesbare Beschreibung des Progress-Status
 *
 * @param percent - Fortschritt in Prozent (0-100)
 * @returns Status-Beschreibung
 *
 * @example
 * getProgressStatus(95); // "Sehr gut"
 * getProgressStatus(45); // "Kritisch"
 */
export function getProgressStatus(percent: number): string {
  if (percent >= 90) return 'Sehr gut';
  if (percent >= 70) return 'Gut';
  if (percent >= 50) return 'Ausreichend';
  return 'Kritisch';
}
