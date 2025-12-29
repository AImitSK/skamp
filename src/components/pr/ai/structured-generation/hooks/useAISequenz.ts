// src/components/pr/ai/structured-generation/hooks/useAISequenz.ts
/**
 * Hook für das Laden der AI Sequenz (DNA Synthese + Kernbotschaft)
 *
 * Lädt automatisch die DNA Synthese und Kernbotschaft für ein Projekt,
 * um sie im Experten-Modus zu verwenden.
 */

import { useState, useEffect } from 'react';
import { useDNASynthese } from '@/lib/hooks/useDNASynthese';
import { useKernbotschaft } from '@/lib/hooks/useKernbotschaft';
import type { AISequenzData } from '../types';

/**
 * Hook für AI Sequenz Daten
 *
 * @param projectId - Projekt-ID
 * @param companyId - Company-ID (für DNA Synthese)
 * @returns AI Sequenz Daten mit Lade-Status
 *
 * @example
 * ```tsx
 * const aiSequenz = useAISequenz(projectId, companyId);
 *
 * if (aiSequenz.isLoading) {
 *   return <Spinner />;
 * }
 *
 * if (aiSequenz.hasDNASynthese && aiSequenz.hasKernbotschaft) {
 *   // Experten-Modus aktivieren
 * }
 * ```
 */
export function useAISequenz(
  projectId: string | undefined,
  companyId: string | undefined
): AISequenzData {
  // DNA Synthese laden (von Company, nicht Project!)
  const { data: dnaSynthese, isLoading: isDNALoading } = useDNASynthese(companyId);

  // Kernbotschaft laden (von Project)
  const { data: kernbotschaft, isLoading: isKernbotschaftLoading } = useKernbotschaft(projectId);

  const isLoading = isDNALoading || isKernbotschaftLoading;

  return {
    hasDNASynthese: !!dnaSynthese?.plainText,
    hasKernbotschaft: !!kernbotschaft?.id,
    dnaSynthesePreview: dnaSynthese?.plainText
      ? dnaSynthese.plainText.substring(0, 200) + (dnaSynthese.plainText.length > 200 ? '...' : '')
      : undefined,
    kernbotschaftOccasion: kernbotschaft?.occasion,
    kernbotschaftGoal: kernbotschaft?.goal,
    isLoading,
  };
}
