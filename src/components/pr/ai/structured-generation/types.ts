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
}

/**
 * Props für ContextSetupStep Komponente
 */
export interface ContextSetupStepProps {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
  selectedDocuments?: DocumentContext[];
  onOpenDocumentPicker?: () => void;
  generationMode: 'standard' | 'expert';
  setGenerationMode: (mode: 'standard' | 'expert') => void;
  onClearDocuments?: () => void;
  onRemoveDocument?: (docId: string) => void;
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
  generationMode: 'standard' | 'expert';
  hasDocuments?: boolean;
  documentCount?: number;
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
 * Verfügbare Branchen für die Kontext-Auswahl
 */
export const INDUSTRIES = [
  'Technologie & Software',
  'Finanzdienstleistungen',
  'Gesundheitswesen',
  'Automobil',
  'Handel & E-Commerce',
  'Medien & Entertainment',
  'Energie & Umwelt',
  'Bildung',
  'Non-Profit',
  'Immobilien',
  'Tourismus & Gastgewerbe',
  'Sonstiges'
] as const;

/**
 * Verfügbare Tonalitäten mit Beschreibungen und Icons
 */
export const TONES = [
  {
    id: 'formal',
    label: 'Formal',
    desc: 'Seriös, traditionell, konservativ',
    icon: 'AcademicCapIcon'
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'Zeitgemäß, innovativ, zugänglich',
    icon: 'SparklesIcon'
  },
  {
    id: 'technical',
    label: 'Technisch',
    desc: 'Fachspezifisch, präzise, detailliert',
    icon: 'BeakerIcon'
  },
  {
    id: 'startup',
    label: 'Startup',
    desc: 'Dynamisch, visionär, disruptiv',
    icon: 'RocketLaunchIcon'
  }
] as const;

/**
 * Verfügbare Zielgruppen mit Beschreibungen und Icons
 */
export const AUDIENCES = [
  {
    id: 'b2b',
    label: 'B2B',
    desc: 'Unternehmen und Experten',
    icon: 'BriefcaseIcon'
  },
  {
    id: 'consumer',
    label: 'Verbraucher',
    desc: 'Endkunden und Publikum',
    icon: 'ShoppingBagIcon'
  },
  {
    id: 'media',
    label: 'Medien',
    desc: 'Journalisten und Redaktionen',
    icon: 'NewspaperIcon'
  }
] as const;

// ===== Type Guards & Helpers =====

/**
 * Type Guard für GenerationStep
 */
export function isGenerationStep(value: string): value is GenerationStep {
  return ['context', 'content', 'generating', 'review'].includes(value);
}
