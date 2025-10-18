// src/components/projects/creation/components/StepActions.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { WizardStep } from '../steps/types';
import clsx from 'clsx';

interface StepActionsProps {
  currentStep: WizardStep;
  isLoading: boolean;
  isStepValid: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function StepActions({
  currentStep,
  isLoading,
  isStepValid,
  onPrevious,
  onNext,
  onCancel,
  onSubmit
}: StepActionsProps) {
  return (
    <div className="flex justify-between px-6 py-4 border-t border-gray-200">
      {/* Zurück Button (nur ab Step 2) */}
      {currentStep > 1 && (
        <Button
          type="button"
          color="secondary"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Zurück
        </Button>
      )}

      {/* Right Actions */}
      <div className={clsx('flex gap-3', currentStep === 1 && 'ml-auto')}>
        <Button
          type="button"
          color="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Abbrechen
        </Button>

        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!isStepValid || isLoading}
          >
            Weiter
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Erstelle Projekt...' : 'Projekt erstellen'}
          </Button>
        )}
      </div>
    </div>
  );
}
