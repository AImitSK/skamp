// src/components/pr/ai/structured-generation/hooks/useTemplates.ts
/**
 * Hook für Template-Verwaltung und -Loading
 *
 * Lädt AI-Templates von der API und verarbeitet sie mit
 * Kategorisierung und Beschreibungs-Extraktion.
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { AITemplate } from '@/types/ai';
import { categorizeTemplate, extractDescription } from '../utils/template-categorizer';

/**
 * Hook zum Laden von AI-Templates
 *
 * Lädt Templates von der API und verarbeitet sie automatisch:
 * - Kategorisiert Templates basierend auf Titel
 * - Extrahiert Beschreibungen aus Prompts
 * - Handhabt Loading- und Error-States
 *
 * @param shouldLoad - Ob Templates geladen werden sollen (default: true)
 * @returns Templates, Loading-State und Error
 *
 * @example
 * ```typescript
 * // Standard-Verwendung (lädt automatisch)
 * const { templates, loading, error } = useTemplates();
 *
 * // Konditionelles Laden
 * const { templates, loading, error } = useTemplates(currentStep === 'content');
 * ```
 */
export function useTemplates(shouldLoad: boolean = true) {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nicht laden wenn shouldLoad false ist
    if (!shouldLoad) {
      setLoading(false);
      return;
    }

    const loadTemplates = async () => {
      try {
        const data = await apiClient.get<any>('/api/ai/templates');

        if (data.success && data.templates) {
          const apiTemplates: AITemplate[] = data.templates.map((t: any, index: number) => ({
            id: `template-${index}`,
            title: t.title,
            category: categorizeTemplate(t.title),
            prompt: t.prompt,
            description: extractDescription(t.prompt)
          }));

          setTemplates(apiTemplates);
          setError(null);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load templates');
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [shouldLoad]);

  return {
    templates,
    loading,
    error
  };
}
