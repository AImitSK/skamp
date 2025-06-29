// src/components/pr/ai/StructuredGenerationModal.tsx - KORRIGIERT
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { 
  XMarkIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select } from '@/components/select';
import { useAuth } from '@/context/AuthContext';
import {
  StructuredPressRelease,
  GenerationContext,
  GenerationResult,
  AITemplate,
  StructuredGenerateResponse
} from '@/types/ai';

// Lokale Types
type GenerationStep = 'context' | 'content' | 'generating' | 'review';

interface Props {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
}

export default function StructuredGenerationModal({ onClose, onGenerate, existingContent }: Props) {
  const { user } = useAuth();
  
  // Workflow State
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generation Data
  const [context, setContext] = useState<GenerationContext>({});
  const [prompt, setPrompt] = useState('');
  const [generatedResult, setGeneratedResult] = useState<StructuredGenerateResponse | null>(null);
  
  // Templates von API laden
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Templates von API laden
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/ai/templates');
        const data = await response.json();
        
        if (data.success && data.templates) {
          // Konvertiere API-Templates zu AITemplate Format
          const apiTemplates: AITemplate[] = data.templates.map((t: any, index: number) => ({
            id: `template-${index}`,
            title: t.title,
            category: categorizeTemplate(t.title),
            prompt: t.prompt,
            description: extractDescription(t.prompt)
          }));
          setTemplates(apiTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (currentStep === 'content') {
      loadTemplates();
    }
  }, [currentStep]);

  // Hilfsfunktionen für Template-Konvertierung
  const categorizeTemplate = (title: string): AITemplate['category'] => {
    if (title.includes('Produkt')) return 'product';
    if (title.includes('Partner')) return 'partnership';
    if (title.includes('Finanz')) return 'finance';
    if (title.includes('Auszeichnung') || title.includes('Award')) return 'corporate';
    if (title.includes('Führung') || title.includes('Personal')) return 'corporate';
    return 'corporate';
  };

  const extractDescription = (prompt: string): string => {
    // Extrahiere ersten Teil des Prompts als Beschreibung
    const lines = prompt.split('\n');
    return lines[0].substring(0, 100) + '...';
  };

  const steps = [
    { id: 'context', name: 'Kontext', icon: CogIcon, description: 'Branche und Tonalität' },
    { id: 'content', name: 'Inhalt', icon: DocumentTextIcon, description: 'Template oder eigener Text' },
    { id: 'generating', name: 'Generierung', icon: SparklesIcon, description: 'KI erstellt Text' },
    { id: 'review', name: 'Review', icon: EyeIcon, description: 'Prüfen und übernehmen' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // Nutze die strukturierte API
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Bitte gib eine Beschreibung ein.');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setError(null);

    try {
      // Verwende die strukturierte API
      const response = await fetch('/api/ai/generate-structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          context: context // Kontext wird jetzt mitgesendet!
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generierung fehlgeschlagen');
      }

      const result: StructuredGenerateResponse = await response.json();

      if (!result.success || !result.structured) {
        throw new Error('Unvollständige Antwort vom Server');
      }

      setGeneratedResult(result);
      setCurrentStep('review');

    } catch (error: any) {
      console.error('Generation failed:', error);
      setError(error.message || 'Generierung fehlgeschlagen');
      setCurrentStep('content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseResult = () => {
    if (!generatedResult) return;

    // Konvertiere zu GenerationResult Format
    const result: GenerationResult = {
      headline: generatedResult.headline,
      content: generatedResult.htmlContent,
      structured: generatedResult.structured,
      metadata: {
        generatedBy: generatedResult.aiProvider || 'gemini',
        timestamp: generatedResult.timestamp || new Date().toISOString(),
        context: context
      }
    };

    onGenerate(result);
  };

  const handleTemplateSelect = (template: AITemplate) => {
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
                KI-Assistent - Strukturierte Generierung
              </DialogTitle>
              <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                v2.1
              </Badge>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="border-b p-4 bg-gray-50">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center ${
                      isActive ? 'text-indigo-600' :
                      isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`rounded-full p-2 ${
                        isActive ? 'bg-indigo-100' :
                        isCompleted ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="ml-3 text-left hidden sm:block">
                        <div className="text-sm font-medium">{step.name}</div>
                        <div className="text-xs">{step.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRightIcon className={`h-4 w-4 mx-2 sm:mx-4 ${
                        isCompleted ? 'text-green-400' : 'text-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 'context' && (
              <ContextSetupStep 
                context={context} 
                onChange={setContext}
              />
            )}

            {currentStep === 'content' && (
              <ContentInputStep 
                prompt={prompt}
                onChange={setPrompt}
                templates={templates}
                onTemplateSelect={handleTemplateSelect}
                context={context}
                loadingTemplates={loadingTemplates}
              />
            )}

            {currentStep === 'generating' && (
              <GenerationStep isGenerating={isGenerating} />
            )}

            {currentStep === 'review' && generatedResult && (
              <ReviewStep 
                result={generatedResult}
                onRegenerate={() => {
                  setGeneratedResult(null);
                  setCurrentStep('content');
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex justify-between bg-gray-50">
            <Button 
              plain 
              onClick={() => {
                if (currentStep === 'context') {
                  onClose();
                } else if (currentStep === 'content') {
                  setCurrentStep('context');
                } else if (currentStep === 'review') {
                  setCurrentStep('content');
                }
              }}
            >
              {currentStep === 'context' ? 'Abbrechen' : 'Zurück'}
            </Button>
            
            <div className="flex gap-2">
              {currentStep === 'context' && (
                <Button onClick={() => setCurrentStep('content')}>
                  Weiter <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              )}
              
              {currentStep === 'content' && (
                <Button 
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                >
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Mit KI generieren
                </Button>
              )}
              
              {currentStep === 'review' && (
                <>
                  <Button plain onClick={() => setCurrentStep('content')}>
                    Neu generieren
                  </Button>
                  <Button onClick={handleUseResult}>
                    Text übernehmen
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

// Badge Komponente (falls nicht vorhanden)
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

// Step Components
function ContextSetupStep({ 
  context, 
  onChange
}: {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
}) {
  const industries = [
    'Technologie & Software',
    'Finanzdienstleistungen',
    'Gesundheitswesen',
    'Automobil',
    'Handel & E-Commerce',
    'Medien & Entertainment',
    'Energie & Umwelt',
    'Bildung',
    'Non-Profit',
    'Immobilien',
    'Tourismus & Gastgewerbe',
    'Sonstiges'
  ];

  const tones = [
    { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell, konservativ' },
    { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ, zugänglich' },
    { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise, detailliert' },
    { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär, disruptiv' }
  ];

  const audiences = [
    { id: 'b2b', label: 'B2B/Fachpresse', desc: 'Unternehmen und Experten' },
    { id: 'consumer', label: 'Verbraucher', desc: 'Endkunden und Publikum' },
    { id: 'media', label: 'Medien', desc: 'Journalisten und Redaktionen' }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Kontext festlegen</h3>
        <p className="text-gray-600">
          Diese Informationen helfen der KI, eine passende Pressemitteilung zu erstellen.
        </p>
      </div>

      <Field>
        <Label>Branche *</Label>
        <Select 
          value={context.industry || ''} 
          onChange={(e) => onChange({ ...context, industry: e.target.value })}
          className="w-full"
        >
          <option value="">Branche auswählen...</option>
          {industries.map(industry => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>Tonalität *</Label>
        <div className="grid grid-cols-2 gap-3">
          {tones.map(tone => (
            <label key={tone.id} className={`border rounded-lg p-4 cursor-pointer transition-all ${
              context.tone === tone.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="tone"
                value={tone.id}
                checked={context.tone === tone.id}
                onChange={(e) => onChange({ ...context, tone: e.target.value as any })}
                className="sr-only"
              />
              <div className="font-medium">{tone.label}</div>
              <div className="text-sm text-gray-600 mt-1">{tone.desc}</div>
            </label>
          ))}
        </div>
      </Field>

      <Field>
        <Label>Zielgruppe *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {audiences.map(audience => (
            <label key={audience.id} className={`border rounded-lg p-3 cursor-pointer transition-all ${
              context.audience === audience.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="audience"
                value={audience.id}
                checked={context.audience === audience.id}
                onChange={(e) => onChange({ ...context, audience: e.target.value as any })}
                className="sr-only"
              />
              <div className="font-medium text-sm">{audience.label}</div>
              <div className="text-xs text-gray-600 mt-1">{audience.desc}</div>
            </label>
          ))}
        </div>
      </Field>

      <Field>
        <Label>Unternehmensname (optional)</Label>
        <Input
          value={context.companyName || ''}
          onChange={(e) => onChange({ ...context, companyName: e.target.value })}
          placeholder="Ihre Firma GmbH"
        />
      </Field>
    </div>
  );
}

function ContentInputStep({ 
  prompt, 
  onChange, 
  templates, 
  onTemplateSelect,
  context,
  loadingTemplates
}: {
  prompt: string;
  onChange: (prompt: string) => void;
  templates: AITemplate[];
  onTemplateSelect: (template: AITemplate) => void;
  context: GenerationContext;
  loadingTemplates: boolean;
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Inhalt definieren</h3>
        <p className="text-gray-600">
          Wähle eine Vorlage oder beschreibe deine Pressemitteilung frei.
        </p>
        {context.industry && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {context.industry}
            </span>
            {context.tone && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm capitalize">
                {context.tone}
              </span>
            )}
            {context.audience && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {context.audience === 'b2b' ? 'B2B' : 
                 context.audience === 'consumer' ? 'Verbraucher' : 'Medien'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Vorlagen für schnellen Start:</h4>
        {loadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onTemplateSelect(template)}
                className="text-left p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
              >
                <h4 className="font-medium text-gray-900">{template.title}</h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {template.description || template.prompt.substring(0, 80) + '...'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Field>
        <Label>Beschreibe deine Pressemitteilung *</Label>
        <Textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder="Beschreibe dein Unternehmen, das Produkt, die Ankündigung oder das Ereignis. Je detaillierter deine Beschreibung, desto besser wird das Ergebnis.

Beispiel: Unser Startup DataCorp hat eine neue KI-Plattform entwickelt, die..."
          className="w-full"
        />
        <p className="mt-2 text-sm text-gray-500">
          Die KI wird eine strukturierte Pressemitteilung mit Headline, Lead-Absatz, 
          Haupttext, Zitat und Boilerplate erstellen.
        </p>
      </Field>

      {/* Tips Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Tipps für bessere Ergebnisse:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nenne konkrete Zahlen, Daten und Fakten</li>
              <li>Beschreibe das Alleinstellungsmerkmal</li>
              <li>Erwähne die Zielgruppe und den Nutzen</li>
              <li>Gib Kontext zur Marktsituation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerationStep({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-20 h-20 mb-8">
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600"></div>
            <SparklesIcon className="h-10 w-10 text-indigo-600 mx-auto mt-[-60px] mb-[40px] animate-pulse" />
          </>
        ) : (
          <div className="rounded-full h-20 w-20 bg-green-100 flex items-center justify-center">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
        )}
      </div>
      
      <h3 className="text-xl font-semibold mb-2">
        {isGenerating ? 'KI erstellt deine Pressemitteilung...' : 'Fertig!'}
      </h3>
      
      <p className="text-gray-600 max-w-md mx-auto">
        {isGenerating 
          ? 'Google Gemini analysiert deine Anforderungen und erstellt eine professionelle Pressemitteilung nach journalistischen Standards.' 
          : 'Die Pressemitteilung wurde erfolgreich erstellt.'
        }
      </p>

      {isGenerating && (
        <div className="mt-8 space-y-2 max-w-sm mx-auto">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-4 h-4 rounded-full bg-indigo-600 mr-3 animate-pulse"></div>
            <span>Analysiere Kontext und Anforderungen...</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-4 h-4 rounded-full bg-indigo-600 mr-3 animate-pulse delay-75"></div>
            <span>Erstelle strukturierte Inhalte...</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-4 h-4 rounded-full bg-indigo-600 mr-3 animate-pulse delay-150"></div>
            <span>Optimiere für Zielgruppe...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ 
  result,
  onRegenerate 
}: {
  result: StructuredGenerateResponse;
  onRegenerate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'preview' | 'structured'>('preview');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">✨ Pressemitteilung erstellt!</h3>
        <p className="text-gray-600">
          Prüfe das Ergebnis und übernehme es in deine Kampagne.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'preview' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <EyeIcon className="h-4 w-4 inline mr-2" />
          Vorschau
        </button>
        <button
          onClick={() => setActiveTab('structured')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'structured' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4 inline mr-2" />
          Strukturiert
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' && (
        <div className="border rounded-lg bg-white shadow-sm">
          <div className="p-6 border-b bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">{result.headline}</h1>
          </div>
          <div className="p-6 max-h-[500px] overflow-y-auto">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: result.htmlContent }}
            />
          </div>
        </div>
      )}

      {activeTab === 'structured' && result.structured && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-700 mb-2">Headline</h4>
            <p className="text-lg font-semibold">{result.structured.headline}</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Lead-Absatz</h4>
            <p className="text-gray-900">{result.structured.leadParagraph}</p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Haupttext</h4>
            {result.structured.bodyParagraphs.map((para, index) => (
              <p key={index} className="text-gray-900 mb-3">{para}</p>
            ))}
          </div>

          {result.structured.quote && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-gray-700 mb-2">Zitat</h4>
              <blockquote className="italic text-gray-900">
                "{result.structured.quote.text}"
              </blockquote>
              <p className="text-sm text-gray-600 mt-2">
                – {result.structured.quote.person}, {result.structured.quote.role} 
                {result.structured.quote.company && ` bei ${result.structured.quote.company}`}
              </p>
            </div>
          )}

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Boilerplate</h4>
            <p className="text-gray-900 text-sm">{result.structured.boilerplate}</p>
          </div>
        </div>
      )}

      {/* Success Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-green-700">
            <p className="font-medium">Pressemitteilung erfolgreich erstellt!</p>
            <p className="mt-1">
              Die Headline wird automatisch ins Titel-Feld und der formatierte Text 
              in den Rich-Text-Editor übernommen.
            </p>
          </div>
        </div>
      </div>

      {/* Quality Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-indigo-600">
            {result.structured.headline.length}
          </div>
          <div className="text-xs text-gray-600">Zeichen Headline</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-indigo-600">
            {result.structured.leadParagraph.split(' ').length}
          </div>
          <div className="text-xs text-gray-600">Wörter Lead</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-indigo-600">
            {result.structured.bodyParagraphs.length}
          </div>
          <div className="text-xs text-gray-600">Absätze</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-indigo-600">
            ✓
          </div>
          <div className="text-xs text-gray-600">5 W-Fragen</div>
        </div>
      </div>
    </div>
  );
}