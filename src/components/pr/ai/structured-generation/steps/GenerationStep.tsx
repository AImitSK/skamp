// src/components/pr/ai/structured-generation/steps/GenerationStep.tsx
/**
 * Generation Step Component
 *
 * Dritter Step im Generierungs-Workflow: Zeigt Loading-Animation
 * während die KI die Pressemitteilung generiert.
 */

import React, { useState, useEffect } from 'react';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { type GenerationStepProps } from '../types';

/**
 * GenerationStep Component
 *
 * Zeigt eine animierte Loading-Animation während der KI-Generierung.
 *
 * **Loading-State:**
 * - Rotierendes Sparkles-Icon mit Gradient-Ring
 * - Liste von animierten Fortschritts-Steps
 * - "KI arbeitet für dich..." Nachricht
 *
 * **Success-State:**
 * - Grünes Check-Icon mit Scale-In Animation
 * - "Fertig!" Nachricht
 *
 * @param props - Component Props (siehe GenerationStepProps)
 *
 * @example
 * ```tsx
 * <GenerationStep isGenerating={true} />
 * ```
 */
function GenerationStep({ isGenerating }: GenerationStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { text: "Thema und Kontext werden analysiert" },
    { text: "Struktur und Aufbau werden erstellt" },
    { text: "Inhalte werden formuliert und optimiert" },
    { text: "Finaler Text wird zusammengestellt" }
  ];

  // Timer für Steps und Progress Bar
  useEffect(() => {
    if (!isGenerating) {
      setCurrentStepIndex(0);
      setProgress(0);
      return;
    }

    // Steps nacheinander abarbeiten (alle 2.5 Sekunden)
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    // Progress Bar kontinuierlich füllen (10 Sekunden für 100%)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) {
          return prev + 1;
        }
        return prev;
      });
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [isGenerating, steps.length]);

  return (
    <div className="text-center py-16 max-w-lg mx-auto">
      {/* Icon - GRÖßER und STÄRKERE Pulsation */}
      <div className="relative mx-auto w-32 h-32 mb-6">
        {isGenerating ? (
          <>
            {/* Ring - Schneller und deutlicher */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-spin"
                 style={{ animationDuration: '2s' }}>
              <div className="absolute inset-2 rounded-full bg-white"></div>
            </div>
            {/* Icon - Größer und stärkere Pulsation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="h-16 w-16 text-indigo-600 animate-pulse"
                            style={{ animationDuration: '1s' }} />
            </div>
          </>
        ) : (
          <div className="rounded-full h-32 w-32 bg-green-100 flex items-center justify-center animate-scale-in">
            <CheckCircleIcon className="h-16 w-16 text-green-600" />
          </div>
        )}
      </div>

      {/* Haupttext - Aktiver */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {isGenerating ? '✨ Deine Pressemitteilung wird erstellt...' : 'Fertig!'}
      </h3>

      <p className="text-gray-600 mb-6">
        {isGenerating
          ? 'Die KI analysiert gerade deine Angaben und schreibt einen professionellen Text.'
          : 'Die Pressemitteilung wurde erfolgreich erstellt.'
        }
      </p>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="mb-8 px-8">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{progress}% abgeschlossen</p>
        </div>
      )}

      {/* Steps mit Checkmarks */}
      {isGenerating && (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 text-left transition-all duration-500 ${
                  isCompleted || isCurrent ? 'opacity-100' : 'opacity-30'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${
                  isCompleted ? 'text-green-600 line-through' :
                  isCurrent ? 'text-indigo-600' :
                  'text-gray-400'
                }`}>
                  {isCompleted ? '✓ ' : ''}{step.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default React.memo(GenerationStep);
