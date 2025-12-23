'use client';

/**
 * Loading-Indicator Komponente (Claude-Style)
 *
 * Typing-Animation mit 3 animierten Punkten.
 * Erscheint während AI generiert.
 *
 * Design-Referenz: docs/planning/marken-dna/08-CHAT-UI-KONZEPT.md
 *
 * Animation:
 * - 3 Punkte mit verzögerter Animation
 * - Sanftes Pulsieren (opacity 0.3 → 1)
 * - Infinite Loop
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingIndicator />}
 * ```
 */
export function LoadingIndicator() {
  return (
    <div className="mb-6 max-w-3xl">
      <div className="flex items-center gap-1">
        {/* Punkt 1 */}
        <div
          className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse"
          style={{
            animationDelay: '0ms',
            animationDuration: '1400ms',
          }}
        />
        {/* Punkt 2 */}
        <div
          className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse"
          style={{
            animationDelay: '200ms',
            animationDuration: '1400ms',
          }}
        />
        {/* Punkt 3 */}
        <div
          className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse"
          style={{
            animationDelay: '400ms',
            animationDuration: '1400ms',
          }}
        />
      </div>
    </div>
  );
}
