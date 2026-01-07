// src/components/pr/ai/structured-generation/steps/ContentInputStep.tsx
/**
 * Content Input Step Component
 *
 * Zweiter Step im Generierungs-Workflow: Eingabe des Prompts
 * und Template-Auswahl.
 *
 * Hinweis: Experten-Modus mit DNA-Synthese ist jetzt im Strategie-Tab.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { Field, Label } from '@/components/ui/fieldset';
import { Textarea } from '@/components/ui/textarea';
import clsx from 'clsx';
import { type ContentInputStepProps } from '../types';
import TemplateDropdown from '../components/TemplateDropdown';

/**
 * ContentInputStep Component
 *
 * Zeigt Eingabefelder für den Prompt und Template-Auswahl an.
 *
 * - Template-Dropdown zur Auswahl bewährter Vorlagen
 * - Prompt-Eingabefeld mit Beispielen
 * - Tipps für bessere Ergebnisse
 * - Context Pills (Firma, Branche, Tonalität, etc.)
 *
 * @param props - Component Props (siehe ContentInputStepProps)
 */
function ContentInputStep({
  prompt,
  onChange,
  templates,
  onTemplateSelect,
  context,
  loadingTemplates,
  selectedTemplate,
}: ContentInputStepProps) {
  const t = useTranslations('pr.ai.structuredGeneration');

  const tipExamples = [
    t('contentStep.tip1'),
    t('contentStep.tip2'),
    t('contentStep.tip3'),
    t('contentStep.tip4'),
    t('contentStep.tip5')
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Context Pills */}
      {(context.companyName || context.industry || context.tone || context.audience) && (
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {context.companyName && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {context.companyName}
            </span>
          )}
          {context.industry && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {context.industry}
            </span>
          )}
          {context.tone && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium capitalize">
              {context.tone}
            </span>
          )}
          {context.audience && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {t(`audiences.${context.audience}.label`)}
            </span>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Template Dropdown */}
        <TemplateDropdown
          templates={templates}
          onSelect={onTemplateSelect}
          loading={loadingTemplates}
          selectedTemplate={selectedTemplate}
        />

        {/* Main Input */}
        <Field>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-semibold">
              {t('contentStep.promptLabelStandard')}
            </Label>
            {prompt.length > 0 && (
              <span className={clsx(
                "text-sm",
                prompt.length > 500 ? "text-orange-600" : "text-gray-500"
              )}>
                {t('contentStep.charactersLabel', { count: prompt.length })}
              </span>
            )}
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            placeholder={t('contentStep.placeholderStandard')}
            className="w-full font-mono text-sm"
          />
        </Field>

        {/* Tips Section - Kompakter */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <LightBulbIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-sm mb-2">
                {t('contentStep.tipsHeading')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tipExamples.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span className="text-sm text-blue-700">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ContentInputStep);
