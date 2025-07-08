// src/components/pr/email/StepIndicator.tsx
"use client";

import { ComposerStep } from '@/types/email-composer';
import { CheckIcon } from '@heroicons/react/20/solid';

interface StepIndicatorProps {
  currentStep: ComposerStep;
  completedSteps: Set<ComposerStep>;
  onStepClick: (step: ComposerStep) => void;
}

interface Step {
  id: ComposerStep;
  name: string;
  description: string;
}

const steps: Step[] = [
  {
    id: 1,
    name: 'Anschreiben verfassen',
    description: 'E-Mail-Inhalt erstellen'
  },
  {
    id: 2,
    name: 'Versand-Details',
    description: 'Empfänger & Absender'
  },
  {
    id: 3,
    name: 'Vorschau & Versand',
    description: 'Testen & Versenden'
  }
];

export default function StepIndicator({ 
  currentStep, 
  completedSteps, 
  onStepClick 
}: StepIndicatorProps) {
  return (
    <nav aria-label="Fortschritt">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li 
            key={step.id} 
            className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}
          >
            {/* Verbindungslinie */}
            {stepIdx !== steps.length - 1 && (
              <div className="absolute top-4 w-full">
                <div className="h-0.5 w-full bg-gray-200">
                  <div 
                    className="h-0.5 bg-[#005fab] transition-all duration-500"
                    style={{ 
                      width: completedSteps.has(step.id) || currentStep > step.id ? '100%' : '0%' 
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Step Circle & Content */}
            <button
              onClick={() => onStepClick(step.id)}
              disabled={!completedSteps.has(step.id) && step.id !== currentStep}
              className={`relative flex items-start group ${
                (!completedSteps.has(step.id) && step.id !== currentStep) 
                  ? 'cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            >
              <span className="flex h-9 items-center">
                <span className={`
                  relative z-10 flex h-8 w-8 items-center justify-center rounded-full
                  transition-all duration-300
                  ${completedSteps.has(step.id) 
                    ? 'bg-[#005fab] group-hover:bg-[#004a8c]' 
                    : currentStep === step.id
                    ? 'border-2 border-[#005fab] bg-white'
                    : 'border-2 border-gray-300 bg-white group-hover:border-gray-400'
                  }
                `}>
                  {completedSteps.has(step.id) ? (
                    <CheckIcon className="h-5 w-5 text-white" />
                  ) : (
                    <span className={`
                      text-sm font-medium
                      ${currentStep === step.id ? 'text-[#005fab]' : 'text-gray-500'}
                    `}>
                      {step.id}
                    </span>
                  )}
                </span>
              </span>
              
              <span className="ml-3 flex flex-col">
                <span className={`
                  text-sm font-medium
                  ${currentStep === step.id 
                    ? 'text-[#005fab]' 
                    : completedSteps.has(step.id)
                    ? 'text-gray-900'
                    : 'text-gray-500'
                  }
                `}>
                  {step.name}
                </span>
                <span className="text-xs text-gray-500 mt-0.5">
                  {step.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}