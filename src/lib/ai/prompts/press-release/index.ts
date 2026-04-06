// src/lib/ai/prompts/press-release/index.ts
// Re-Exports aller Pressemeldungs-Module

/**
 * PRESSEMELDUNGS-PROMPT-MODULE
 *
 * Modulare Architektur mit klarer Trennung zwischen:
 * - Standard-Modus: Generische Bibliothek für User ohne Strategie-Vorarbeit
 * - Experten-Modus: DNA-gesteuerte Generierung mit Fakten-Matrix (Story-First!)
 */

// Story Engine: Story-First Ansatz für Experten-Modus (NEU - ersetzt Core + Craftsmanship)
export { STORY_ENGINE } from './story-engine';

// Legacy-Exports (für Abwärtskompatibilität, werden nicht mehr aktiv genutzt)
export { CORE_ENGINE } from './core-engine';
export { PRESS_RELEASE_CRAFTSMANSHIP } from './press-release-craftsmanship';

// Standard Library: Tonalitäten, Branchen, Zielgruppen (nur Standard-Modus)
export { STANDARD_LIBRARY } from './standard-library';

// Expert Builder: DNA + Fakten-Matrix Builder (nur Experten-Modus)
export {
  buildExpertPrompt,
  type DNAContact,
  type FaktenMatrix
} from './expert-builder';
