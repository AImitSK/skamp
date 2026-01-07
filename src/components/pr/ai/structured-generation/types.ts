// src/components/pr/ai/structured-generation/types.ts
/**
 * Shared Types für Structured Generation Modal
 *
 * Extrahiert aus StructuredGenerationModal.tsx für bessere Wartbarkeit
 * und Wiederverwendbarkeit.
 */

import {
  GenerationContext,
  GenerationResult,
  AITemplate,
  StructuredGenerateResponse,
  DocumentContext
} from '@/types/ai';

// ===== Core Types =====

/**
 * Workflow Steps für die strukturierte Generierung
 */
export type GenerationStep = 'context' | 'content' | 'generating' | 'review';

// ===== Component Props =====

/**
 * Props für das Haupt-Modal (StructuredGenerationModal)
 */
export interface StructuredGenerationModalProps {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  organizationId?: string;
  dokumenteFolderId?: string;
  /** Projekt-ID für Experten-Modus (AI Sequenz: DNA Synthese + Kernbotschaft) */
  projectId?: string;
  /** Company-ID des Kunden (für DNA Synthese) */
  companyId?: string;
}

/**
 * Props für ContextSetupStep Komponente
 *
 * Vereinfacht - nur noch Standard-Modus.
 * Experten-Modus (DNA-Synthese + Kernbotschaft) ist im Strategie-Tab.
 */
export interface ContextSetupStepProps {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
}

/**
 * Props für ContentInputStep Komponente
 */
export interface ContentInputStepProps {
  prompt: string;
  onChange: (prompt: string) => void;
  templates: AITemplate[];
  onTemplateSelect: (template: AITemplate) => void;
  context: GenerationContext;
  loadingTemplates: boolean;
  selectedTemplate?: AITemplate | null;
}

/**
 * Props für GenerationStep Komponente
 */
export interface GenerationStepProps {
  isGenerating: boolean;
}

/**
 * Props für ReviewStep Komponente
 */
export interface ReviewStepProps {
  result: StructuredGenerateResponse;
  onRegenerate: () => void;
}

/**
 * Props für TemplateDropdown Komponente
 */
export interface TemplateDropdownProps {
  templates: AITemplate[];
  onSelect: (template: AITemplate) => void;
  loading: boolean;
  selectedTemplate?: AITemplate | null;
}

// ===== Constants =====

/**
 * IDs für Branchen - Labels kommen aus Übersetzungen (pr.ai.structuredGeneration.industries.{id})
 */
export const INDUSTRY_IDS = [
  'technology',
  'finance',
  'healthcare',
  'automotive',
  'retail',
  'media',
  'energy',
  'education',
  'nonprofit',
  'realestate',
  'tourism',
  'other'
] as const;

export type IndustryId = typeof INDUSTRY_IDS[number];

/**
 * IDs für Tonalitäten - Labels kommen aus Übersetzungen (pr.ai.structuredGeneration.tones.{id})
 */
export const TONE_IDS = ['formal', 'modern', 'technical', 'startup'] as const;

export type ToneId = typeof TONE_IDS[number];

/**
 * Icon mapping für Tonalitäten
 */
export const TONE_ICONS: Record<ToneId, string> = {
  formal: 'AcademicCapIcon',
  modern: 'SparklesIcon',
  technical: 'BeakerIcon',
  startup: 'RocketLaunchIcon'
};

/**
 * IDs für Zielgruppen - Labels kommen aus Übersetzungen (pr.ai.structuredGeneration.audiences.{id})
 */
export const AUDIENCE_IDS = ['b2b', 'consumer', 'media'] as const;

export type AudienceId = typeof AUDIENCE_IDS[number];

/**
 * Icon mapping für Zielgruppen
 */
export const AUDIENCE_ICONS: Record<AudienceId, string> = {
  b2b: 'BriefcaseIcon',
  consumer: 'ShoppingBagIcon',
  media: 'NewspaperIcon'
};

// Legacy exports for backwards compatibility (deprecated)
export const INDUSTRIES = INDUSTRY_IDS;
export const TONES = TONE_IDS.map(id => ({ id, icon: TONE_ICONS[id] }));
export const AUDIENCES = AUDIENCE_IDS.map(id => ({ id, icon: AUDIENCE_ICONS[id] }));

// ===== Type Guards & Helpers =====

/**
 * Type Guard für GenerationStep
 */
export function isGenerationStep(value: string): value is GenerationStep {
  return ['context', 'content', 'generating', 'review'].includes(value);
}
