'use client';

import { useTranslations } from 'next-intl';

interface ProgressIndicatorProps {
  progress: number; // 0-100
}

/**
 * Fortschrittsanzeige für Marken-DNA Dokument-Erstellung
 *
 * Zeigt visuellen Fortschrittsbalken mit Prozentangabe
 * (extrahiert aus [PROGRESS:XX] Tags der KI-Antwort)
 */
export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const t = useTranslations('markenDNA.chat');

  if (progress <= 0) return null;

  // Clamp auf 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="px-4 py-3 border-t border-zinc-200">
      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Progress Text */}
      <p className="text-xs text-zinc-500 mt-2 text-center">
        {t('progress', { percent: clampedProgress })}
      </p>
    </div>
  );
}
