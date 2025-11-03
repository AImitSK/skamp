// src/components/pr/ai/structured-generation/components/ErrorBanner.tsx
/**
 * Error Banner Component
 *
 * Zeigt Fehlermeldungen in einem roten Banner mit Icon und
 * Shake-Animation an.
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Props für ErrorBanner Component
 */
export interface ErrorBannerProps {
  /** Fehlermeldung (oder null wenn kein Fehler) */
  error: string | null;
}

/**
 * ErrorBanner Component
 *
 * Zeigt eine Fehlermeldung in einem roten Banner an.
 *
 * **Features:**
 * - Roter Hintergrund mit Border
 * - Exclamation-Icon links
 * - Shake-Animation beim Erscheinen
 * - Nur sichtbar wenn error nicht null/leer
 *
 * @param props - Component Props
 *
 * @example
 * ```tsx
 * <ErrorBanner error="Bitte wähle Tonalität und Zielgruppe aus." />
 * ```
 */
export default function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
        <p className="text-red-600">{error}</p>
      </div>
    </div>
  );
}
