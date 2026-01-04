// src/lib/ai/agentic/specialist-mapping.ts
// Client-sichere Mapping-Datei (KEIN genkit Import!)

/**
 * Marken-DNA Dokumenttypen (UI-Ebene)
 */
export type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';

/**
 * Spezialisten-Typen
 */
export type SpecialistType =
  | 'briefing_specialist'
  | 'swot_specialist'
  | 'audience_specialist'
  | 'positioning_specialist'
  | 'goals_specialist'
  | 'messages_specialist'
  | 'project_wizard'
  | 'orchestrator';

/**
 * Mapping: DocumentType → SpecialistType
 * Wird verwendet um vom UI-Dokumenttyp zum richtigen Spezialisten zu kommen
 */
export const DOCUMENT_TO_SPECIALIST: Record<MarkenDNADocumentType, SpecialistType> = {
  briefing: 'briefing_specialist',
  swot: 'swot_specialist',
  audience: 'audience_specialist',
  positioning: 'positioning_specialist',
  goals: 'goals_specialist',
  messages: 'messages_specialist',
};

/**
 * Helper-Funktion um den Spezialisten für einen Dokumenttyp zu bekommen
 */
export function getSpecialistForDocument(documentType: MarkenDNADocumentType): SpecialistType {
  return DOCUMENT_TO_SPECIALIST[documentType];
}
