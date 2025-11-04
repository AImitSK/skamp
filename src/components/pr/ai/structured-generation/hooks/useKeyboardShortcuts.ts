// src/components/pr/ai/structured-generation/hooks/useKeyboardShortcuts.ts
/**
 * Hook für Keyboard Shortcuts im Modal
 *
 * Handhabt Tastatur-Shortcuts für häufige Aktionen:
 * - Cmd/Ctrl + Enter → Generierung starten
 * - Escape → Modal schließen
 */

import { useEffect } from 'react';
import { GenerationStep } from '../types';

/**
 * Props für useKeyboardShortcuts Hook
 */
export interface UseKeyboardShortcutsProps {
  /** Callback für Generierung (Cmd/Ctrl + Enter) */
  onGenerate: () => void;
  /** Callback für Modal schließen (Escape) */
  onClose: () => void;
  /** Aktueller Workflow-Step (für konditionelle Shortcuts) */
  currentStep: GenerationStep;
}

/**
 * Hook für Keyboard Shortcuts im Generierungs-Modal
 *
 * Registriert globale Keyboard-Event-Listener für:
 * - **Cmd/Ctrl + Enter**: Startet Generierung (nur im 'content' Step)
 * - **Escape**: Schließt das Modal
 *
 * Der Hook cleaned sich automatisch auf (removeEventListener).
 *
 * @param props - Callbacks und aktueller Step
 *
 * @example
 * ```typescript
 * // In einer Component
 * useKeyboardShortcuts({
 *   onGenerate: handleGenerate,
 *   onClose: () => setIsOpen(false),
 *   currentStep: 'content'
 * });
 * ```
 */
export function useKeyboardShortcuts({
  onGenerate,
  onClose,
  currentStep
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter = Generate
      // Nur im 'content' Step aktiv
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && currentStep === 'content') {
        e.preventDefault();
        onGenerate();
      }

      // Escape = Close Modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    // Event Listener registrieren
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup beim Unmount
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onGenerate, onClose, currentStep]);
}
