// src/lib/ai/prompts/press-release/index.ts
// Re-Exports aller Pressemeldungs-Module

/**
 * PRESSEMELDUNGS-PROMPT-MODULE
 *
 * Modulare Architektur mit klarer Trennung zwischen:
 * - Standard-Modus: Generische Bibliothek für User ohne Strategie-Vorarbeit
 * - Experten-Modus: DNA-gesteuerte Generierung mit Fakten-Matrix
 */

// Core Engine: Parsing-kritische Format-Vorgaben
export { CORE_ENGINE } from './core-engine';

// Press Release Craftsmanship: Universelle journalistische Standards
export { PRESS_RELEASE_CRAFTSMANSHIP } from './press-release-craftsmanship';

// Standard Library: Tonalitäten, Branchen, Zielgruppen (nur Standard-Modus)
export { STANDARD_LIBRARY } from './standard-library';

// Expert Builder: DNA + Fakten-Matrix Builder (nur Experten-Modus)
export {
  buildExpertPrompt,
  type DNAContact,
  type FaktenMatrix
} from './expert-builder';
