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
      setError('Bitte gib eine Beschreibung ein.');
      return;
    }

    if (!user) {
      setError('Du musst angemeldet sein, um den KI-Assistenten zu nutzen.');
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
              <h3 className="text-lg font-semibold mb-2">Anmeldung erforderlich</h3>
              <p className="text-gray-600 mb-6">
                Du musst angemeldet sein, um den KI-Assistenten zu nutzen.
              </p>
              <Button onClick={onClose} className="w-full">
                Verstanden
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
                KI-Assistent (Legacy Version)
              </DialogTitle>
              {isHealthy && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" title="Service läuft" />
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
                      🚀 Neue strukturierte KI-Generierung verfügbar!
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Das neue strukturierte Modal bietet getrennte Felder für Headline und Content, 
                      bessere Templates und professionelle journalistische Standards.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => window.location.reload()} // Placeholder für Upgrade
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Zum neuen Modal wechseln →
                      </button>
                      <button
                        onClick={() => setShowUpgradeNotice(false)}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Ausblenden
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
                      KI-Service nicht verfügbar
                    </h3>
                    <p className="mt-1 text-sm text-orange-700">
                      Der KI-Assistent ist momentan nicht erreichbar. Bitte versuche es später erneut.
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
                    Neu generieren
                  </Button>
                  <Button
                    plain
                    className={mode === 'improve' ? 'bg-indigo-100 text-indigo-700' : ''}
                    onClick={() => setMode('improve')}
                  >
                    Bestehenden Text verbessern
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Seite */}
              <div className="space-y-4">
                <Field>
                  <Label className="text-base font-medium">
                    {mode === 'improve' ? 'Wie soll der Text verbessert werden?' : 'Was soll in der Pressemitteilung stehen?'}
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
                        ? 'z.B. "Mache den Ton professioneller", "Füge mehr Details hinzu", "Kürze den Text auf 200 Wörter"'
                        : 'Beschreibe dein Unternehmen, das Produkt, die Ankündigung oder das Ereignis. Je detaillierter, desto besser wird das Ergebnis...'
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
                    <p className="text-sm font-medium text-gray-700 mb-2">Oder wähle eine Vorlage:</p>
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
                      Gemini arbeitet...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      {mode === 'improve' ? 'Mit Gemini verbessern' : 'Mit Gemini generieren'}
                    </>
                  )}
                </Button>

                {/* Legacy-Hinweis */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                    <div className="text-xs text-yellow-700">
                      <p className="font-medium">Legacy-Version</p>
                      <p className="mt-1">
                        Dies ist die alte Version des KI-Assistenten. 
                        Für bessere Ergebnisse verwende das neue strukturierte Modal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Seite */}
              <div className="space-y-4">
                <p className="text-base font-medium text-gray-700">Generierter Text:</p>
                <div className="border rounded-lg bg-gray-50 min-h-[400px] max-h-[500px] overflow-y-auto">
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Google Gemini erstellt deine Pressemitteilung...</p>
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
                        <p>Der generierte Text wird hier angezeigt</p>
                      </div>
                    </div>
                  )}
                </div>

                {generatedText && (
                  <div className="flex gap-2">
                    <Button onClick={handleUseGenerated} className="flex-1">
                      Text verwenden
                    </Button>
                    <Button plain onClick={() => setGeneratedText('')}>
                      Löschen
                    </Button>
                  </div>
                )}

                {/* Quality Notice für Legacy */}
                {generatedText && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-4 w-4 text-amber-600 mt-0.5 mr-2" />
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">💡 Tipp für bessere Qualität</p>
                        <p className="mt-1">
                          Das neue strukturierte Modal bietet bessere journalistische Standards,
                          getrennte Headline/Content-Generierung und optimierte Prompts.
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
                  <p className="font-medium">🤖 Powered by Google Gemini (Legacy Mode)</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Einfache Text-Generierung ohne Struktur</li>
                    <li>Basis-Templates für schnelle Erstellung</li>
                    <li>Für bessere Ergebnisse: Neues strukturiertes Modal nutzen</li>
                    <li>Sichere Verarbeitung über Firebase Functions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            {generatedText && (
              <Button onClick={handleUseGenerated}>
                Text verwenden
              </Button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}