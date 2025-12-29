// src/components/pr/ai/structured-generation/steps/ContextSetupStep.tsx
/**
 * Context Setup Step Component
 *
 * Erster Step im Generierungs-Workflow: Kontext-Konfiguration
 * für Standard-Modus (Branche, Tonalität, Zielgruppe) oder
 * Experten-Modus (Planungsdokumente).
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  TrashIcon,
  AcademicCapIcon,
  SparklesIcon,
  BeakerIcon,
  RocketLaunchIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  NewspaperIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { DnaIcon } from '@/components/icons/DnaIcon';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { type ContextSetupStepProps, INDUSTRY_IDS, TONE_IDS, AUDIENCE_IDS } from '../types';

/**
 * ContextSetupStep Component
 *
 * Zeigt Konfigurations-Felder für die Pressemitteilungs-Generierung an.
 *
 * **Standard-Modus:**
 * - Branche auswählen
 * - Unternehmensname eingeben
 * - Tonalität wählen (Formal, Modern, etc.)
 * - Zielgruppe wählen (B2B, Consumer, Media)
 *
 * **Experten-Modus:**
 * - Planungsdokumente hochladen/auswählen
 * - Dokumente verwalten (hinzufügen, entfernen)
 *
 * @param props - Component Props (siehe ContextSetupStepProps)
 *
 * @example
 * ```tsx
 * <ContextSetupStep
 *   context={context}
 *   onChange={setContext}
 *   generationMode="standard"
 *   setGenerationMode={setMode}
 *   selectedDocuments={[]}
 *   onOpenDocumentPicker={() => setShowPicker(true)}
 *   onClearDocuments={() => setDocs([])}
 *   onRemoveDocument={(id) => removeDocs(id)}
 * />
 * ```
 */
function ContextSetupStep({
  context,
  onChange,
  selectedDocuments,
  onOpenDocumentPicker,
  generationMode,
  setGenerationMode,
  onClearDocuments,
  onRemoveDocument,
  aiSequenz,
  projectId
}: ContextSetupStepProps) {
  const t = useTranslations('pr.ai.structuredGeneration');

  // Icon mapping für TONES und AUDIENCES
  const iconMap: Record<string, any> = {
    AcademicCapIcon,
    SparklesIcon,
    BeakerIcon,
    RocketLaunchIcon,
    BriefcaseIcon,
    ShoppingBagIcon,
    NewspaperIcon
  };

  const tones = TONE_IDS.map(id => ({
    id,
    label: t(`tones.${id}.label`),
    icon: iconMap[id === 'formal' ? 'AcademicCapIcon' : id === 'modern' ? 'SparklesIcon' : id === 'technical' ? 'BeakerIcon' : 'RocketLaunchIcon']
  }));

  const audiences = AUDIENCE_IDS.map(id => ({
    id,
    label: t(`audiences.${id}.label`),
    icon: iconMap[id === 'b2b' ? 'BriefcaseIcon' : id === 'consumer' ? 'ShoppingBagIcon' : 'NewspaperIcon']
  }));

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* MODUS-AUSWAHL */}
      <div className="mb-8">
        <Field>
          <Label className="text-base font-semibold">{t('contextStep.modeLabel')}</Label>
          <div className="grid grid-cols-2 gap-6 mt-3">
          <button
            type="button"
            onClick={() => {
              setGenerationMode('standard');
              if (onClearDocuments) onClearDocuments();
            }}
            className={`w-full text-left border rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
              generationMode === 'standard'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {generationMode === 'standard' ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
              )}
              <h3 className={`text-lg font-semibold ${generationMode === 'standard' ? 'text-green-900' : 'text-gray-900'}`}>
                {t('contextStep.modeStandard')}
              </h3>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setGenerationMode('expert')}
            className={`w-full text-left border rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
              generationMode === 'expert'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {generationMode === 'expert' ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
              )}
              <h3 className={`text-lg font-semibold ${generationMode === 'expert' ? 'text-green-900' : 'text-gray-900'}`}>
                {t('contextStep.modeExpert')}
              </h3>
            </div>
          </button>
          </div>
        </Field>
      </div>

      {/* STANDARD-MODUS FELDER */}
      {generationMode === 'standard' && (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Field>
              <Label className="text-base font-semibold">{t('contextStep.industryLabel')}</Label>
              <Select
                value={context.industry || ''}
                onChange={(e) => onChange({ ...context, industry: e.target.value })}
                className="mt-2"
              >
                <option value="">{t('contextStep.industryPlaceholder')}</option>
                {INDUSTRY_IDS.map(id => (
                  <option key={id} value={id}>{t(`industries.${id}`)}</option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label className="text-base font-semibold">{t('contextStep.companyNameLabel')}</Label>
              <Input
                value={context.companyName || ''}
                onChange={(e) => onChange({ ...context, companyName: e.target.value })}
                placeholder={t('contextStep.companyNamePlaceholder')}
                className="mt-2"
              />
            </Field>
          </div>

      <div className="mb-8">
        <Field>
          <Label className="text-base font-semibold">{t('contextStep.toneLabel')}</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {tones.map(tone => (
              <button
                key={tone.id}
                type="button"
                onClick={() => onChange({ ...context, tone: tone.id as any })}
                className={`w-full text-left border rounded-lg p-4 transition-all duration-150 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
                  context.tone === tone.id
                    ? 'bg-gradient-to-br from-blue-50 to-white border-gray-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tone.icon className="h-5 w-5 text-[#005fab] flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">{tone.label}</h3>
                  {context.tone === tone.id && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded ml-auto">
                      {t('contextStep.activeBadge')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mb-8">
        <Field>
          <Label className="text-base font-semibold">{t('contextStep.audienceLabel')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {audiences.map(audience => (
              <button
                key={audience.id}
                type="button"
                onClick={() => onChange({ ...context, audience: audience.id as any })}
                className={`w-full text-left border rounded-lg p-4 transition-all duration-150 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
                  context.audience === audience.id
                    ? 'bg-gradient-to-br from-blue-50 to-white border-gray-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <audience.icon className="h-5 w-5 text-[#005fab] flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">{audience.label}</h3>
                  {context.audience === audience.id && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded ml-auto">
                      {t('contextStep.activeBadge')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Field>
      </div>
        </>
      )}

      {/* EXPERTEN-MODUS: AI Sequenz (DNA Synthese + Kernbotschaft) */}
      {generationMode === 'expert' && (
        <div className="space-y-4">
          {/* Hinweis wenn kein Projekt ausgewählt */}
          {!projectId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Kein Projekt ausgewählt</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Der Experten-Modus benötigt ein Projekt mit DNA Synthese und Kernbotschaft.
                    Bitte wähle zuerst ein Projekt aus.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Sequenz Status */}
          {projectId && aiSequenz && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">AI Sequenz - CeleroPress Formel</h4>
              </div>

              {aiSequenz.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                  <span className="ml-3 text-purple-700">Lade DNA Synthese und Kernbotschaft...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* DNA Synthese */}
                  <div className={`p-4 rounded-lg border ${aiSequenz.hasDNASynthese ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <DnaIcon className={`h-5 w-5 ${aiSequenz.hasDNASynthese ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${aiSequenz.hasDNASynthese ? 'text-purple-900' : 'text-gray-500'}`}>
                        DNA Synthese
                      </span>
                      {aiSequenz.hasDNASynthese ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 ml-auto" />
                      )}
                    </div>
                    {aiSequenz.hasDNASynthese ? (
                      <p className="text-sm text-purple-700 line-clamp-2">{aiSequenz.dnaSynthesePreview}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Keine DNA Synthese vorhanden. Bitte zuerst erstellen.</p>
                    )}
                  </div>

                  {/* Kernbotschaft */}
                  <div className={`p-4 rounded-lg border ${aiSequenz.hasKernbotschaft ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ChatBubbleLeftRightIcon className={`h-5 w-5 ${aiSequenz.hasKernbotschaft ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${aiSequenz.hasKernbotschaft ? 'text-blue-900' : 'text-gray-500'}`}>
                        Kernbotschaft
                      </span>
                      {aiSequenz.hasKernbotschaft ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 ml-auto" />
                      )}
                    </div>
                    {aiSequenz.hasKernbotschaft ? (
                      <div className="text-sm text-blue-700 space-y-1">
                        {aiSequenz.kernbotschaftOccasion && (
                          <p><strong>Anlass:</strong> {aiSequenz.kernbotschaftOccasion}</p>
                        )}
                        {aiSequenz.kernbotschaftGoal && (
                          <p><strong>Ziel:</strong> {aiSequenz.kernbotschaftGoal}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Keine Kernbotschaft vorhanden. Bitte zuerst erstellen.</p>
                    )}
                  </div>

                  {/* Status-Zusammenfassung */}
                  {aiSequenz.hasDNASynthese && aiSequenz.hasKernbotschaft ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        AI Sequenz vollständig - bereit zur Generierung
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        AI Sequenz unvollständig - bitte fehlende Komponenten erstellen
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ContextSetupStep);
