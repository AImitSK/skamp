// src/components/pr/ai/structured-generation/steps/GenerationStep.tsx
/**
 * Generation Step Component
 *
 * Dritter Step im Generierungs-Workflow: Zeigt Loading-Animation
 * während die KI die Pressemitteilung generiert.
 */

import React from 'react';
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
export default function GenerationStep({ isGenerating }: GenerationStepProps) {
  const steps = [
    { text: "Kontext und Anforderungen analysieren", delay: "0ms" },
    { text: "Journalistische Struktur erstellen", delay: "100ms" },
    { text: "Inhalte für Zielgruppe optimieren", delay: "200ms" },
    { text: "Qualitätskontrolle durchführen", delay: "300ms" }
  ];

  return (
    <div className="text-center py-16 max-w-lg mx-auto">
      <div className="relative mx-auto w-24 h-24 mb-8">
        {isGenerating ? (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-spin"
                 style={{ animationDuration: '3s' }}>
              <div className="absolute inset-1 rounded-full bg-white"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="h-10 w-10 text-indigo-600 animate-pulse" />
            </div>
          </>
        ) : (
          <div className="rounded-full h-24 w-24 bg-green-100 flex items-center justify-center animate-scale-in">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        {isGenerating ? 'KI arbeitet für dich...' : 'Fertig!'}
      </h3>

      <p className="text-gray-600 mb-8">
        {isGenerating
          ? 'Google Gemini erstellt eine professionelle Pressemitteilung nach journalistischen Standards.'
          : 'Die Pressemitteilung wurde erfolgreich erstellt.'
        }
      </p>

      {isGenerating && (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-left opacity-0 animate-fade-in"
              style={{ animationDelay: step.delay, animationFillMode: 'forwards' }}
            >
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              <span className="text-sm text-gray-600">{step.text}</span>
            </div>
          ))}
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
