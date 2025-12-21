// src/lib/ai/context-builder.ts
import { dnaSyntheseService } from '@/lib/firebase/dna-synthese-service';
import { kernbotschaftService } from '@/lib/firebase/kernbotschaft-service';
import { Kernbotschaft } from '@/types/kernbotschaft';

/**
 * AI Context Interface
 *
 * Definiert den Kontext, der an KI-Assistenten uebergeben wird.
 * Im 'expert' Modus werden automatisch DNA Synthese und Kernbotschaft geladen.
 */
export interface AIContext {
  /** Modus: 'standard' oder 'expert' */
  mode: 'standard' | 'expert';

  /** DNA Synthese (KI-optimierte Kurzform der Marken-DNA, ~500 Tokens) */
  dnaSynthese?: string;

  /** Kernbotschaft (projekt-spezifische strategische Botschaft) */
  kernbotschaft?: Kernbotschaft;

  /** User-Prompt (Anfrage des Benutzers) */
  userPrompt: string;

  /** Ausgewaehlte Optionen (fuer Standard-Modus) */
  selectedOptions?: string[];

  /** Template (fuer Standard-Modus) */
  template?: string;
}

/**
 * Optionen fuer buildAIContext
 */
export interface BuildAIContextOptions {
  /** Ausgewaehlte Optionen (fuer Standard-Modus) */
  selectedOptions?: string[];

  /** Template (fuer Standard-Modus) */
  template?: string;
}

/**
 * Baut den vollstaendigen KI-Kontext auf
 *
 * Diese Funktion laedt automatisch die relevanten Daten basierend auf dem Modus:
 * - **Standard-Modus**: Nutzt nur userPrompt, selectedOptions und template
 * - **Experten-Modus**: Laedt zusaetzlich DNA Synthese und Kernbotschaft
 *
 * @param projectId - ID des Projekts
 * @param mode - Modus ('standard' oder 'expert')
 * @param userPrompt - Anfrage des Benutzers
 * @param options - Zusaetzliche Optionen (selectedOptions, template)
 * @returns Vollstaendiger AI Context
 *
 * @example
 * ```typescript
 * // Standard-Modus
 * const context = await buildAIContext(
 *   projectId,
 *   'standard',
 *   'Schreibe eine Pressemeldung ueber...',
 *   { selectedOptions: ['seo', 'formal'], template: 'press-release' }
 * );
 *
 * // Experten-Modus (laedt automatisch DNA Synthese + Kernbotschaft)
 * const expertContext = await buildAIContext(
 *   projectId,
 *   'expert',
 *   'Schreibe eine Pressemeldung ueber...'
 * );
 * ```
 */
export async function buildAIContext(
  projectId: string,
  mode: 'standard' | 'expert',
  userPrompt: string,
  options?: BuildAIContextOptions
): Promise<AIContext> {
  const context: AIContext = {
    mode,
    userPrompt,
    ...options,
  };

  // Im Experten-Modus: DNA Synthese und Kernbotschaft automatisch laden
  if (mode === 'expert') {
    try {
      // 1. DNA Synthese laden (bereits verdichtet auf ~500 Tokens)
      // Die DNA Synthese enthaelt:
      // - Tonalitaet (formal/casual/modern)
      // - USP & Positionierung
      // - Kernbotschaften (Dachbotschaften)
      // - No-Go-Words (Blacklist)
      // - Zielgruppen-Definition
      const dnaSynthese = await dnaSyntheseService.getSynthese(projectId);
      if (dnaSynthese) {
        context.dnaSynthese = dnaSynthese.plainText;
      }

      // 2. Kernbotschaft laden
      // Die Kernbotschaft enthaelt:
      // - Anlass (Warum jetzt?)
      // - Ziel (Was soll erreicht werden?)
      // - Teilbotschaft (Projekt-spezifische Message)
      // - Material/Fakten (Daten fuer dieses Projekt)
      const kernbotschaft = await kernbotschaftService.getKernbotschaftByProject(projectId);
      if (kernbotschaft) {
        context.kernbotschaft = kernbotschaft;
      }
    } catch (error) {
      console.error('Fehler beim Laden des Experten-Kontexts:', error);
      // Context wird trotz Fehler zurueckgegeben (Graceful Degradation)
    }
  }

  return context;
}
