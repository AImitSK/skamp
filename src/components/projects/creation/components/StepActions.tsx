// src/components/projects/creation/components/StepActions.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { WizardStep } from '../steps/types';
import clsx from 'clsx';

interface StepActionsProps {
  currentStep: number;
  totalSteps?: number; // Default: 3
  isLoading: boolean;
  isStepValid: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string; // Default: 'Projekt erstellen'
  showSubmitOnAllSteps?: boolean; // Für Edit-Modus: Zeige "Speichern" in allen Steps
}

export function StepActions({
  currentStep,
  totalSteps = 3,
  isLoading,
  isStepValid,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
  submitLabel,
  showSubmitOnAllSteps = false
}: StepActionsProps) {
  const t = useTranslations('projects.creation.stepActions');
  const isLastStep = currentStep === totalSteps;
  const showSubmitButton = showSubmitOnAllSteps || isLastStep;

  // Use provided submitLabel or default to translation
  const finalSubmitLabel = submitLabel || t('defaultSubmit');

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
          {t('back')}
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
          {t('cancel')}
        </Button>

        {/* Edit-Modus: Zeige beides (Weiter + Speichern) wenn nicht letzter Step */}
        {showSubmitOnAllSteps && !isLastStep && (
          <>
            <Button
              type="button"
              onClick={onNext}
              disabled={!isStepValid || isLoading}
            >
              {t('next')}
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? t('loading', { label: finalSubmitLabel }) : finalSubmitLabel}
            </Button>
          </>
        )}

        {/* Creation-Modus oder letzter Step: Zeige entweder Weiter oder Speichern */}
        {!showSubmitOnAllSteps && (
          <>
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={onNext}
                disabled={!isStepValid || isLoading}
              >
                {t('next')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isLoading}
              >
                {isLoading ? t('loading', { label: finalSubmitLabel }) : finalSubmitLabel}
              </Button>
            )}
          </>
        )}

        {/* Letzter Step im Edit-Modus: Nur Speichern zeigen */}
        {showSubmitOnAllSteps && isLastStep && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? t('loading', { label: finalSubmitLabel }) : finalSubmitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
