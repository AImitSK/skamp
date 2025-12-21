import { useLocale } from 'next-intl';
import { useState, useCallback } from 'react';
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';

/**
 * Result-Interface für Experten-Assistenten
 */
export interface ExpertAssistantResult {
  content: string;
  usedDNASynthese: boolean;
  usedKernbotschaft: boolean;
  suggestions?: string[];
}

/**
 * Hook für den Experten-Modus des KI-Assistenten
 *
 * Nutzt die DNA Synthese und Kernbotschaft für konsistente,
 * markentreue KI-Generierung (CeleroPress Formel).
 *
 * @param projectId - Die ID des Projekts
 * @returns Hook-Interface mit generate, result, loading, error, copy, usedDNASynthese, usedKernbotschaft
 *
 * @example
 * ```tsx
 * const { generate, result, isLoading } = useExpertAssistant('project-123');
 *
 * const handleGenerate = async () => {
 *   await generate('Erstelle eine Pressemitteilung über...', 'pressrelease');
 * };
 *
 * if (result?.usedDNASynthese) {
 *   // DNA Synthese wurde verwendet
 * }
 * ```
 */
export function useExpertAssistant(projectId: string) {
  const locale = useLocale();
  const tToast = useTranslations('toasts');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExpertAssistantResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generiert Text mit dem Experten-Modus
   *
   * @param prompt - User-Prompt für die Generierung
   * @param outputFormat - Optional: Gewünschtes Output-Format
   * @returns Promise mit dem Result
   */
  const generate = useCallback(async (
    prompt: string,
    outputFormat?: 'pressrelease' | 'social' | 'blog' | 'email' | 'custom'
  ): Promise<ExpertAssistantResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userPrompt: prompt,
          language: locale,
          outputFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data: ExpertAssistantResult = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toastService.error(tToast('markenDNA.generationError', { error: error.message }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, locale, tToast]);

  /**
   * Kopiert das generierte Ergebnis in die Zwischenablage
   */
  const copyToClipboard = useCallback(async () => {
    if (result?.content) {
      try {
        await navigator.clipboard.writeText(result.content);
        toastService.success(tToast('copySuccess'));
      } catch (err) {
        toastService.error(tToast('copyError'));
      }
    }
  }, [result, tToast]);

  return {
    /** Generiert Text mit Experten-Modus */
    generate,
    /** Das generierte Ergebnis */
    result,
    /** Ladestate */
    isLoading,
    /** Fehler-Objekt */
    error,
    /** Kopiert das Ergebnis in die Zwischenablage */
    copyToClipboard,
    /** Wurde die DNA Synthese verwendet? */
    usedDNASynthese: result?.usedDNASynthese ?? false,
    /** Wurde die Kernbotschaft verwendet? */
    usedKernbotschaft: result?.usedKernbotschaft ?? false,
  };
}
