// src/components/pr/ai/structured-generation/components/StepProgressBar.tsx
/**
 * Step Progress Bar Component
 *
 * Zeigt den aktuellen Fortschritt im Generierungs-Workflow an
 * mit visuellen Indikatoren für aktive, abgeschlossene und
 * ausstehende Steps.
 */

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { type GenerationStep } from '../types';

/**
 * Props für StepProgressBar Component
 */
export interface StepProgressBarProps {
  /** Aktueller Workflow-Step */
  currentStep: GenerationStep;
  /** Step-Konfiguration mit Icons und Labels */
  steps: Array<{
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

/**
 * StepProgressBar Component
 *
 * Zeigt eine horizontale Fortschrittsleiste mit 4 Steps an.
 *
 * **Zustände:**
 * - **Active:** Aktueller Step (Indigo-Hintergrund, Scale-Animation)
 * - **Completed:** Abgeschlossene Steps (Grüner Hintergrund, Check-Icon)
 * - **Pending:** Ausstehende Steps (Grauer Hintergrund)
 *
 * **Features:**
 * - Verbindungslinien zwischen Steps (grün bei completed)
 * - Responsive Design (Labels hidden auf kleinen Screens)
 * - Smooth Transitions für alle State-Changes
 *
 * @param props - Component Props
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'context', name: 'Kontext', icon: CogIcon },
 *   { id: 'content', name: 'Inhalt', icon: DocumentTextIcon },
 *   { id: 'generating', name: 'KI', icon: SparklesIcon },
 *   { id: 'review', name: 'Review', icon: EyeIcon }
 * ];
 *
 * <StepProgressBar currentStep="content" steps={steps} />
 * ```
 */
export default function StepProgressBar({ currentStep, steps }: StepProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="px-6 py-3 border-b bg-gray-50">
      <div className="flex items-center justify-center gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                "flex items-center gap-2 transition-all",
                isActive && "scale-110"
              )}>
                <div className={clsx(
                  "rounded-full p-2 transition-all",
                  isActive && "bg-indigo-600 text-white shadow-lg",
                  isCompleted && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-400"
                )}>
                  {isCompleted ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={clsx(
                  "text-sm font-medium hidden sm:block",
                  isActive && "text-indigo-600",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-gray-400"
                )}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={clsx(
                  "w-12 h-0.5 mx-2 transition-colors",
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
