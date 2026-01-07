// src/components/pr/ai/structured-generation/hooks/useStructuredGeneration.ts
/**
 * Hook für strukturierte PR-Generierung (Standard-Modus)
 *
 * Handhabt die API-Integration für die strukturierte Generierung von Pressemitteilungen,
 * inklusive Validierung, Request-Building und Error-Handling.
 *
 * Hinweis: Experten-Modus mit DNA-Synthese ist jetzt im Strategie-Tab
 * unter PM-Vorlage (siehe usePMVorlage Hook).
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api/api-client';
import {
  GenerationContext,
  DocumentContext,
  StructuredGenerateResponse
} from '@/types/ai';
import { validateInput } from '../utils/validation';
import { toastService } from '@/lib/utils/toast';

/**
 * Parameter für die generate() Funktion
 */
export interface GenerateParams {
  /** Generierungs-Modus (nur 'standard' wird unterstützt) */
  mode: 'standard';
  /** User-Prompt */
  prompt: string;
  /** Generierungs-Kontext (Branche, Tonalität, Zielgruppe, etc.) */
  context: GenerationContext;
  /** Ausgewählte Dokumente (Legacy, nicht mehr verwendet) */
  selectedDocuments: DocumentContext[];
}

/**
 * Hook für strukturierte Generierung von Pressemitteilungen (Standard-Modus)
 *
 * Verwaltet die komplette Generierungs-Pipeline:
 * - Input-Validierung
 * - Request-Body-Building
 * - API-Call zu /api/ai/generate-structured
 * - State-Management (Loading, Result, Error)
 *
 * @returns Hook-API mit generate, reset, und State-Properties
 */
export function useStructuredGeneration() {
  const t = useTranslations('pr.ai.structuredGeneration');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StructuredGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Startet die strukturierte Generierung
   *
   * @param params - Generierungs-Parameter
   * @returns Das Generierungs-Ergebnis oder null bei Fehler
   */
  const generate = useCallback(async ({
    mode,
    prompt,
    context,
    selectedDocuments,
  }: GenerateParams): Promise<StructuredGenerateResponse | null> => {
    // Validierung
    const validation = validateInput(mode, prompt, context, selectedDocuments);
    if (!validation.isValid) {
      const errorMessage = validation.errorKey
        ? t(validation.errorKey as any)
        : t('validation.validationFailed');
      setError(errorMessage);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody = {
        prompt: prompt.trim(),
        context: {
          industry: context.industry,
          tone: context.tone,
          audience: context.audience,
          companyName: context.companyName,
        },
      };

      // API-Call
      const apiResult: StructuredGenerateResponse = await apiClient.post<StructuredGenerateResponse>(
        '/api/ai/generate-structured',
        requestBody
      );

      // Response-Validierung
      if (!apiResult.success || !apiResult.structured) {
        throw new Error(t('validation.incompleteResponse'));
      }

      setResult(apiResult);
      toastService.success(t('success.generated'));
      return apiResult;

    } catch (err: any) {
      const errorMessage = err.message || t('validation.generationFailed');
      setError(errorMessage);
      toastService.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  /**
   * Setzt den Hook-State zurück
   *
   * Nützlich für neue Generierung oder Modal-Schließen.
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    /** Startet die Generierung */
    generate,
    /** Setzt den State zurück */
    reset,
    /** Ob aktuell eine Generierung läuft */
    isGenerating,
    /** Das Generierungs-Ergebnis (wenn erfolgreich) */
    result,
    /** Fehlermeldung (wenn fehlgeschlagen) */
    error
  };
}
