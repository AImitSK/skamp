// src/components/pr/ai/structured-generation/components/ModalFooter.tsx
/**
 * Modal Footer Component
 *
 * Zeigt step-spezifische Navigation-Buttons im Footer des
 * Generierungs-Modals an.
 */

import React from 'react';
import { ArrowRightIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { type GenerationStep } from '../types';

/**
 * Props für ModalFooter Component
 */
export interface ModalFooterProps {
  /** Aktueller Workflow-Step */
  currentStep: GenerationStep;
  /** Callback für Modal schließen */
  onClose: () => void;
  /** Callback für Zurück-Navigation */
  onBack: () => void;
  /** Callback für Weiter zu Content-Step */
  onNext: () => void;
  /** Callback für KI-Generierung starten */
  onGenerate: () => void;
  /** Callback für generiertes Ergebnis übernehmen */
  onUseResult: () => void;
  /** Ob Generierung erlaubt ist (basierend auf Modus und Inputs) */
  canGenerate: boolean;
  /** Ob aktuell eine Generierung läuft */
  isGenerating: boolean;
}

/**
 * ModalFooter Component
 *
 * Zeigt step-spezifische Buttons im Footer an.
 *
 * **Step-spezifische Buttons:**
 *
 * - **context**: "Abbrechen" (links) + "Weiter" (rechts, Indigo-Gradient)
 * - **content**: "Zurück" (links) + "Mit KI generieren" (rechts, Indigo-Gradient, disabled wenn canGenerate=false)
 * - **generating**: "Zurück" (links, disabled während Generierung)
 * - **review**: "Zurück"/"Neu generieren" (links) + "Text übernehmen" (rechts, Grün-Gradient)
 *
 * **Layout:**
 * - Links: Zurück/Abbrechen Button (plain style)
 * - Rechts: Primär-Aktion Button (gradient style)
 * - Grauer Hintergrund mit Border-Top
 *
 * @param props - Component Props
 *
 * @example
 * ```tsx
 * <ModalFooter
 *   currentStep="content"
 *   onClose={handleClose}
 *   onBack={handleBack}
 *   onNext={handleNext}
 *   onGenerate={handleGenerate}
 *   onUseResult={handleUseResult}
 *   canGenerate={true}
 *   isGenerating={false}
 * />
 * ```
 */
function ModalFooter({
  currentStep,
  onClose,
  onBack,
  onNext,
  onGenerate,
  onUseResult,
  canGenerate,
  isGenerating
}: ModalFooterProps) {
  return (
    <div className="border-t p-6 flex justify-between items-center bg-gray-50">
      {/* Left Side: Back/Cancel Button */}
      <div>
        <Button
          plain
          onClick={currentStep === 'context' ? onClose : onBack}
        >
          {currentStep === 'context' ? 'Abbrechen' : 'Zurück'}
        </Button>
      </div>

      {/* Right Side: Primary Action Buttons */}
      <div className="flex gap-2">
        {currentStep === 'context' && (
          <Button
            onClick={onNext}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            Weiter <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        )}

        {currentStep === 'content' && (
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Mit KI generieren
          </Button>
        )}

        {currentStep === 'review' && (
          <>
            <Button plain onClick={onBack}>
              Neu generieren
            </Button>
            <Button
              onClick={onUseResult}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Text übernehmen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(ModalFooter);
