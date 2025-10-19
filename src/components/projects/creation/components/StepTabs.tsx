// src/components/projects/creation/components/StepTabs.tsx
'use client';

import React from 'react';
import {
  RocketLaunchIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { WizardStep, StepConfig } from '../steps/types';

const DEFAULT_STEP_CONFIGS: StepConfig[] = [
  { id: 1, label: 'Projekt', icon: RocketLaunchIcon },
  { id: 2, label: 'Kunde', icon: BuildingOfficeIcon },
  { id: 3, label: 'Team', icon: UserGroupIcon }
];

const DEFAULT_STEP_ICONS = [RocketLaunchIcon, BuildingOfficeIcon, UserGroupIcon, MegaphoneIcon];

interface StepTabsProps {
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  completedSteps: WizardStep[];
  stepLabels?: string[]; // Optional custom labels
  allowAllSteps?: boolean; // Für Edit-Modus: Alle Steps immer klickbar
}

export function StepTabs({
  currentStep,
  onStepChange,
  completedSteps,
  stepLabels,
  allowAllSteps = false
}: StepTabsProps) {
  // Generate step configs from labels or use defaults
  const stepConfigs = stepLabels
    ? stepLabels.map((label, index) => ({
        id: index + 1,
        label,
        icon: DEFAULT_STEP_ICONS[index] || RocketLaunchIcon
      }))
    : DEFAULT_STEP_CONFIGS;
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        {stepConfigs.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id as WizardStep);
          const isClickable = allowAllSteps || isCompleted || step.id <= currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepChange(step.id as WizardStep)}
              disabled={!isClickable}
              className={clsx(
                'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap',
                isActive
                  ? 'border-[#005fab] text-[#005fab]'
                  : isClickable
                  ? 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900 cursor-pointer'
                  : 'border-transparent text-gray-400 cursor-not-allowed'
              )}
            >
              <Icon
                className={clsx(
                  'mr-2 h-5 w-5',
                  isActive
                    ? 'text-[#005fab]'
                    : isClickable
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
