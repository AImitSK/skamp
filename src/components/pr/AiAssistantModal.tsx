// src/components/pr/AiAssistantModal.tsx - AKTUALISIERT mit Upgrade-Hinweisen
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  XMarkIcon,
  SparklesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Textarea } from '@/components/ui/textarea';
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
import { useAuth } from '@/context/AuthContext';

interface AiAssistantModalProps {
  onClose: () => void;
  onGenerate: (generatedText: string) => void;
  existingContent?: string;
}

interface Template {
  title: string;
  prompt: string;
}

/**
 * Legacy AI Assistant Modal
 * 
 * ⚠️ HINWEIS: Diese Komponente wird durch StructuredGenerationModal ersetzt.
 * Sie bleibt für Rückwärtskompatibilität bestehen, aber neue Implementierungen
 * sollten das neue strukturierte Modal verwenden.
 */
export default function AiAssistantModal({
  onClose,
  onGenerate,
  existingContent
}: AiAssistantModalProps) {
  const { user } = useAuth();
  const t = useTranslations('pr.aiAssistant');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'generate' | 'improve'>(existingContent ? 'improve' : 'generate');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(true);

  // Service Health Check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await firebaseAIService.healthCheck();
        setIsHealthy(healthy);
      } catch (error) {
        setIsHealthy(false);
      }
    };

    if (user) {
      checkHealth();
    }
  }, [user]);

  // Templates laden
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templateList = await firebaseAIService.getTemplates();
        setTemplates(templateList);
      } catch (error) {
        console.warn('Templates konnten nicht geladen werden:', error);
      }
    };

    if (mode === 'generate' && user) {
      loadTemplates();
    }
  }, [mode, user]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(t('errors.promptRequired'));
      return;
    }

    if (!user) {
      setError(t('errors.authRequired'));
      return;
    }

    setIsGenerating(true);
    setGeneratedText('');
    setError(null);

    try {
      let result: string;
      
      if (mode === 'improve' && existingContent) {
        result = await firebaseAIService.improvePressRelease(existingContent, prompt);
      } else {
        result = await firebaseAIService.generatePressRelease(prompt);
      }
      
      setGeneratedText(result);
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      setError(error.message || 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGenerated = () => {
    if (generatedText) {
      onGenerate(generatedText);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setPrompt(template.prompt);
    setError(null);
  };

  // Auth Check
  if (!user) {
    return (
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md bg-white rounded-lg shadow-xl p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('auth.title')}</h3>
              <p className="text-gray-600 mb-6">
                {t('auth.message')}
              </p>
              <Button onClick={onClose} className="w-full">
                {t('auth.button')}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-5xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6 text-indigo-600" />
              <DialogTitle className="text-lg font-semibold">
                {t('title')}
              </DialogTitle>
              {isHealthy && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" title={t('serviceRunning')} />
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Upgrade Notice */}
            {showUpgradeNotice && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <ArrowUpIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900">
                      {t('upgradeNotice.title')}
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      {t('upgradeNotice.message')}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => window.location.reload()} // Placeholder für Upgrade
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        {t('upgradeNotice.switchButton')}
                      </button>
                      <button
                        onClick={() => setShowUpgradeNotice(false)}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        {t('upgradeNotice.hideButton')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Status Warning */}
            {!isHealthy && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800">
                      {t('serviceWarning.title')}
                    </h3>
                    <p className="mt-1 text-sm text-orange-700">
                      {t('serviceWarning.message')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode Selection */}
            {existingContent && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <Button
                    plain
                    className={mode === 'generate' ? 'bg-indigo-100 text-indigo-700' : ''}
                    onClick={() => setMode('generate')}
                  >
                    {t('modes.generate')}
                  </Button>
                  <Button
                    plain
                    className={mode === 'improve' ? 'bg-indigo-100 text-indigo-700' : ''}
                    onClick={() => setMode('improve')}
                  >
                    {t('modes.improve')}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Seite */}
              <div className="space-y-4">
                <Field>
                  <Label className="text-base font-medium">
                    {mode === 'improve' ? t('input.labelImprove') : t('input.labelGenerate')}
                  </Label>
                  <Textarea
                    rows={6}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setError(null);
                    }}
                    placeholder={
                      mode === 'improve'
                        ? t('input.placeholderImprove')
                        : t('input.placeholderGenerate')
                    }
                    className={error ? 'border-red-300' : ''}
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </Field>

                {/* Template Prompts */}
                {mode === 'generate' && templates.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('templates.label')}</p>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {templates.map((template, index) => (
                        <button
                          key={index}
                          onClick={() => handleTemplateSelect(template)}
                          className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-colors text-sm"
                        >
                          <div className="font-medium text-gray-900">{template.title}</div>
                          <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {template.prompt}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || !isHealthy}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('buttons.generating')}
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      {mode === 'improve' ? t('buttons.improveWithGemini') : t('buttons.generateWithGemini')}
                    </>
                  )}
                </Button>

                {/* Legacy-Hinweis */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                    <div className="text-xs text-yellow-700">
                      <p className="font-medium">{t('legacyNotice.title')}</p>
                      <p className="mt-1">
                        {t('legacyNotice.message')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Seite */}
              <div className="space-y-4">
                <p className="text-base font-medium text-gray-700">{t('output.label')}</p>
                <div className="border rounded-lg bg-gray-50 min-h-[400px] max-h-[500px] overflow-y-auto">
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">{t('output.generatingMessage')}</p>
                      </div>
                    </div>
                  ) : generatedText ? (
                    <div className="p-4">
                      <div
                        className="prose prose-sm max-w-none text-gray-900"
                        dangerouslySetInnerHTML={{ __html: generatedText }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 h-32 flex items-center justify-center">
                      <div>
                        <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>{t('output.emptyPlaceholder')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {generatedText && (
                  <div className="flex gap-2">
                    <Button onClick={handleUseGenerated} className="flex-1">
                      {t('buttons.useText')}
                    </Button>
                    <Button plain onClick={() => setGeneratedText('')}>
                      {t('buttons.delete')}
                    </Button>
                  </div>
                )}

                {/* Quality Notice für Legacy */}
                {generatedText && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-4 w-4 text-amber-600 mt-0.5 mr-2" />
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">{t('qualityNotice.title')}</p>
                        <p className="mt-1">
                          {t('qualityNotice.message')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">{t('infoBox.title')}</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>{t('infoBox.features.simpleGeneration')}</li>
                    <li>{t('infoBox.features.basicTemplates')}</li>
                    <li>{t('infoBox.features.upgradeRecommendation')}</li>
                    <li>{t('infoBox.features.secureProcessing')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <Button plain onClick={onClose}>
              {t('buttons.cancel')}
            </Button>
            {generatedText && (
              <Button onClick={handleUseGenerated}>
                {t('buttons.useText')}
              </Button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}