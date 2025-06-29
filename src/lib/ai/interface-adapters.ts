// src/lib/ai/interface-adapters.ts - KORRIGIERT
import { 
  StructuredPressRelease, 
  GenerationResult as EnhancedGenerationResult,
  GenerationContext 
} from '@/types/ai';

/**
 * Legacy GenerationResult Interface für Rückwärtskompatibilität
 */
export interface LegacyGenerationResult {
  headline: string;
  content: string;
  structured?: {
    headline: string;
    leadParagraph: string;
    bodyParagraphs: string[];
    quote: {
      person: string;
      role: string;
      company: string;
      text: string;
    };
    boilerplate: string;
  };
  metadata?: {
    generatedBy?: string;
    timestamp?: string;
    context?: {
      industry?: string;
      tone?: string;
      audience?: string;
    };
  };
}

/**
 * Adapter-Klasse um zwischen Legacy und Enhanced Interfaces zu konvertieren
 */
export class AIServiceAdapter {
  
  /**
   * Konvertiert Enhanced GenerationResult zu Legacy Format
   */
  static enhancedToLegacy(enhanced: EnhancedGenerationResult): LegacyGenerationResult {
    if (!enhanced.structured) {
      throw new Error('Enhanced result missing structured data');
    }

    return {
      headline: enhanced.structured.headline,
      content: enhanced.content,
      structured: {
        headline: enhanced.structured.headline,
        leadParagraph: enhanced.structured.leadParagraph,
        bodyParagraphs: enhanced.structured.bodyParagraphs,
        quote: enhanced.structured.quote,
        boilerplate: enhanced.structured.boilerplate
      },
      metadata: enhanced.metadata ? {
        generatedBy: enhanced.metadata.generatedBy,
        timestamp: enhanced.metadata.timestamp,
        context: enhanced.metadata.context ? {
          industry: enhanced.metadata.context.industry,
          tone: enhanced.metadata.context.tone,
          audience: enhanced.metadata.context.audience
        } : undefined
      } : undefined
    };
  }

  /**
   * Konvertiert Legacy zu Enhanced Format
   */
  static legacyToEnhanced(legacy: LegacyGenerationResult): EnhancedGenerationResult {
    if (!legacy.structured) {
      throw new Error('Legacy result missing structured data');
    }

    return {
      headline: legacy.headline,
      content: legacy.content,
      structured: {
        headline: legacy.structured.headline,
        leadParagraph: legacy.structured.leadParagraph,
        bodyParagraphs: legacy.structured.bodyParagraphs,
        quote: legacy.structured.quote,
        boilerplate: legacy.structured.boilerplate
      },
      metadata: legacy.metadata ? {
        generatedBy: legacy.metadata.generatedBy || 'legacy-service',
        timestamp: legacy.metadata.timestamp || new Date().toISOString(),
        context: legacy.metadata.context ? {
          industry: legacy.metadata.context.industry,
          tone: legacy.metadata.context.tone as GenerationContext['tone'],
          audience: legacy.metadata.context.audience as GenerationContext['audience']
        } : undefined
      } : {
        generatedBy: 'legacy-service',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Hilfsfunktion: Prüft ob ein Result Enhanced Format hat
   */
  static isEnhancedResult(result: any): result is EnhancedGenerationResult {
    return result && 
           typeof result.structured === 'object' &&
           result.structured.headline &&
           result.structured.leadParagraph &&
           Array.isArray(result.structured.bodyParagraphs);
  }

  /**
   * Hilfsfunktion: Prüft ob ein Result Legacy Format hat
   */
  static isLegacyResult(result: any): result is LegacyGenerationResult {
    return result && 
           typeof result.headline === 'string' &&
           typeof result.content === 'string';
  }
}

/**
 * Type Guards für Runtime-Prüfungen
 */
export function isEnhancedResult(result: any): result is EnhancedGenerationResult {
  return AIServiceAdapter.isEnhancedResult(result);
}

export function isLegacyResult(result: any): result is LegacyGenerationResult {
  return AIServiceAdapter.isLegacyResult(result);
}

export default AIServiceAdapter;