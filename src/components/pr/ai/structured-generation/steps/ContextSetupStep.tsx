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
  AcademicCapIcon,
  SparklesIcon,
  BeakerIcon,
  RocketLaunchIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
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
      {/* HINWEIS-BOX: Strategie-Tab fuer Experten-Modus */}
      <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <SparklesIcon className="h-5 w-5 text-[#0284c7] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-[#0284c7]">Tipp: CeleroPress Formel nutzen</h4>
            <p className="text-sm text-[#0369a1] mt-1">
              Fuer markengerechte Texte basierend auf Ihrer DNA-Strategie nutzen Sie den
              <strong> Strategie-Tab</strong> im Projekt. Dort generieren Sie PM-Vorlagen
              mit DNA-Synthese und Fakten-Matrix.
            </p>
          </div>
        </div>
      </div>

      {/* Kontext-Felder */}
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
    </div>
  );
}

export default React.memo(ContextSetupStep);
