// src/components/pr/ai/structured-generation/steps/ContentInputStep.tsx
/**
 * Content Input Step Component
 *
 * Zweiter Step im Generierungs-Workflow: Eingabe des Prompts
 * und Template-Auswahl (Standard-Modus) oder zusätzliche Anweisungen
 * (Experten-Modus).
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { DocumentTextIcon, LightBulbIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
 * **Standard-Modus:**
 * - Template-Dropdown zur Auswahl bewährter Vorlagen
 * - Prompt-Eingabefeld mit Beispielen
 * - Tipps für bessere Ergebnisse
 *
 * **Experten-Modus:**
 * - Hinweis auf kontext-basierte Generierung
 * - Optionales Anweisungsfeld
 * - Kürzerer Prompt (da Dokumente bereits vorhanden)
 *
 * **Context Pills:**
 * - Zeigt ausgewählten Kontext (Firma, Branche, Tonalität, etc.)
 * - Dokumenten-Anzahl (im Experten-Modus)
 *
 * @param props - Component Props (siehe ContentInputStepProps)
 *
 * @example
 * ```tsx
 * <ContentInputStep
 *   prompt={prompt}
 *   onChange={setPrompt}
 *   templates={templates}
 *   onTemplateSelect={handleTemplateSelect}
 *   context={context}
 *   loadingTemplates={false}
 *   selectedTemplate={null}
 *   generationMode="standard"
 *   hasDocuments={false}
 *   documentCount={0}
 * />
 * ```
 */
function ContentInputStep({
  prompt,
  onChange,
  templates,
  onTemplateSelect,
  context,
  loadingTemplates,
  selectedTemplate,
  generationMode,
  hasDocuments,
  documentCount
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
      {(context.companyName || context.industry || context.tone || context.audience || hasDocuments) && (
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
          {hasDocuments && documentCount && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1.5">
              <DocumentTextIcon className="h-4 w-4" />
              {t('contentStep.documentsAttached', {
                count: documentCount,
                plural: documentCount !== 1 ? t('contentStep.documentsAttachedPlural') : ''
              })}
            </span>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* NEU: Dokumenten-Modus Hinweis */}
        {generationMode === 'expert' && hasDocuments ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">
                  {t('contentStep.expertModeTitle')}
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  {t('contentStep.expertModeDescription', { count: documentCount || 0 })}
                </p>
              </div>
            </div>
          </div>
        ) : generationMode === 'standard' ? (
          /* Template Dropdown nur im Standard-Modus */
          <TemplateDropdown
            templates={templates}
            onSelect={onTemplateSelect}
            loading={loadingTemplates}
            selectedTemplate={selectedTemplate}
          />
        ) : null}

        {/* Main Input */}
        <Field>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-semibold">
              {generationMode === 'expert'
                ? t('contentStep.promptLabelExpert')
                : t('contentStep.promptLabelStandard')
              }
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
            rows={generationMode === 'expert' ? 8 : 12}
            placeholder={generationMode === 'expert'
              ? t('contentStep.placeholderExpert')
              : t('contentStep.placeholderStandard')
            }
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
