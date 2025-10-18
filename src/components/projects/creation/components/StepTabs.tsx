// src/components/projects/creation/components/StepTabs.tsx
'use client';

import React from 'react';
import {
  RocketLaunchIcon,
  BuildingOfficeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { WizardStep, StepConfig } from '../steps/types';

const STEP_CONFIGS: StepConfig[] = [
  { id: 1, label: 'Projekt', icon: RocketLaunchIcon },
  { id: 2, label: 'Kunde', icon: BuildingOfficeIcon },
  { id: 3, label: 'Team', icon: UserGroupIcon }
];

interface StepTabsProps {
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  completedSteps: WizardStep[];
}

export function StepTabs({ currentStep, onStepChange, completedSteps }: StepTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        {STEP_CONFIGS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = isCompleted || step.id <= currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepChange(step.id)}
              disabled={!isClickable}
              className={clsx(
                'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap',
                isActive
                  ? 'border-[#005fab] text-[#005fab]'
                  : isCompleted
                  ? 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900 cursor-pointer'
                  : 'border-transparent text-gray-400 cursor-not-allowed'
              )}
            >
              <Icon
                className={clsx(
                  'mr-2 h-5 w-5',
                  isActive
                    ? 'text-[#005fab]'
                    : isCompleted
                    ? 'text-gray-500 group-hover:text-gray-700'
                    : 'text-gray-400'
                )}
              />
              {step.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
