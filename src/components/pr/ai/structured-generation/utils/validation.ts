// src/components/pr/ai/structured-generation/utils/validation.ts
/**
 * Validierungs-Utilities für strukturierte Generierung
 *
 * Extrahiert aus StructuredGenerationModal.tsx für bessere Testbarkeit
 * und Wiederverwendbarkeit.
 */

import { GenerationContext, DocumentContext } from '@/types/ai';

/**
 * Ergebnis einer Validierung
 */
export interface ValidationResult {
  /** Ob die Validierung erfolgreich war */
  isValid: boolean;
  /** i18n-Key für Fehlermeldung, falls Validierung fehlgeschlagen */
  errorKey?: string;
}

/**
 * Validiert Input für den Standard-Modus
 *
 * Im Standard-Modus sind erforderlich:
 * - Prompt (nicht leer)
 * - Tonalität (context.tone)
 * - Zielgruppe (context.audience)
 *
 * @param prompt - Der eingegebene Prompt
 * @param context - Der Generierungs-Kontext
 * @returns ValidationResult mit isValid und optionaler Fehlermeldung
 *
 * @example
 * ```typescript
 * const result = validateStandardMode('Produktlaunch', { tone: 'modern', audience: 'b2b' });
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateStandardMode(
  prompt: string,
  context: GenerationContext
): ValidationResult {
  if (!prompt.trim()) {
    return {
      isValid: false,
      errorKey: 'pr.ai.structuredGeneration.validation.promptRequired'
    };
  }

  if (!context.tone || !context.audience) {
    return {
      isValid: false,
      errorKey: 'pr.ai.structuredGeneration.validation.toneAndAudienceRequired'
    };
  }

  return { isValid: true };
}

/**
 * Validiert Input für den Experten-Modus
 *
 * Im Experten-Modus ist erforderlich:
 * - Mindestens 1 Planungsdokument
 * - Prompt ist optional
 *
 * @param selectedDocuments - Die ausgewählten Dokumente
 * @returns ValidationResult mit isValid und optionaler Fehlermeldung
 *
 * @example
 * ```typescript
 * const result = validateExpertMode([doc1, doc2]);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateExpertMode(
  selectedDocuments: DocumentContext[]
): ValidationResult {
  if (selectedDocuments.length === 0) {
    return {
      isValid: false,
      errorKey: 'pr.ai.structuredGeneration.validation.documentsRequired'
    };
  }

  return { isValid: true };
}

/**
 * Validiert Input basierend auf dem ausgewählten Modus
 *
 * Diese Funktion ist ein Wrapper, der die entsprechende Validierung
 * basierend auf dem Modus aufruft.
 *
 * @param mode - Der Generierungs-Modus ('standard' oder 'expert')
 * @param prompt - Der eingegebene Prompt
 * @param context - Der Generierungs-Kontext
 * @param selectedDocuments - Die ausgewählten Dokumente
 * @returns ValidationResult mit isValid und optionaler Fehlermeldung
 *
 * @example
 * ```typescript
 * const result = validateInput('standard', prompt, context, []);
 * if (!result.isValid) {
 *   setError(result.error);
 *   return;
 * }
 * // Fortfahren mit Generierung...
 * ```
 */
export function validateInput(
  mode: 'standard' | 'expert',
  prompt: string,
  context: GenerationContext,
  selectedDocuments: DocumentContext[]
): ValidationResult {
  if (mode === 'standard') {
    return validateStandardMode(prompt, context);
  } else {
    return validateExpertMode(selectedDocuments);
  }
}
