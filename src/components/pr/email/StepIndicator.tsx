// src/components/pr/email/StepIndicator.tsx
"use client";

import { ComposerStep } from '@/types/email-composer';
import { 
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: ComposerStep;
  completedSteps: Set<ComposerStep>;
  onStepClick: (step: ComposerStep) => void;
}

interface Step {
  id: ComposerStep;
  name: string;
  icon: any;
}

const steps: Step[] = [
  {
    id: 1,
    name: 'Anschreiben',
    icon: DocumentTextIcon
  },
  {
    id: 2,
    name: 'Details',
    icon: UserGroupIcon
  },
  {
    id: 3,
    name: 'Versand',
    icon: PaperAirplaneIcon
  }
];

export default function StepIndicator({ 
  currentStep, 
  completedSteps, 
  onStepClick 
}: StepIndicatorProps) {
  return (
    <div className="px-6 py-3 border-b bg-gray-50">
      <div className="flex items-center justify-center gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const currentStepIndex = steps.findIndex(s => s.id === currentStep);
          const stepIndex = index;
          const isPast = stepIndex < currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => {
                  // Nur erlauben, wenn der Step abgeschlossen ist oder es der aktuelle Step ist
                  if (isCompleted || isActive) {
                    onStepClick(step.id);
                  }
                }}
                disabled={!isCompleted && !isActive}
                className={clsx(
                  "flex items-center gap-2 transition-all",
                  isActive && "scale-110",
                  (isCompleted || isActive) ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div className={clsx(
                  "rounded-full p-2 transition-all",
                  isActive && "bg-[#005fab] text-white shadow-lg",
                  isCompleted && !isActive && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-400"
                )}>
                  {isCompleted && !isActive ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={clsx(
                  "text-sm font-medium hidden sm:block transition-colors",
                  isActive && "text-[#005fab]",
                  isCompleted && !isActive && "text-green-600",
                  !isActive && !isCompleted && "text-gray-400"
                )}>
                  {step.name}
                </span>
              </button>
              
              {index < steps.length - 1 && (
                <div className={clsx(
                  "w-12 h-0.5 mx-2 transition-colors",
                  isPast || isCompleted ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}