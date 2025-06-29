// src/components/pr/ai/StructuredGenerationModal.tsx - KORRIGIERT
"use client";

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { 
  XMarkIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/button';
import { Field, Label } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select } from '@/components/select';
import { useAuth } from '@/context/AuthContext';
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
import {
  StructuredPressRelease,
  GenerationContext,
  GenerationResult,
  AITemplate
} from '@/types/ai';

// Lokale Types die fehlen
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
  const [generatedText, setGeneratedText] = useState('');
  
  // Available Data
  const [templates] = useState<AITemplate[]>([
    {
      id: 'product',
      title: 'Produktankündigung',
      category: 'product',
      prompt: 'Innovative Produkteinführung mit konkreten Features und Nutzen',
      description: 'Neue Produkte oder Services ankündigen'
    },
    {
      id: 'partnership',
      title: 'Strategische Partnerschaft',
      category: 'partnership',
      prompt: 'Strategische Partnerschaft zwischen Unternehmen mit Synergien',
      description: 'Kooperationen und Allianzen verkünden'
    }
  ]);

  const steps = [
    { id: 'context', name: 'Kontext', icon: CogIcon, description: 'Branche und Tonalität' },
    { id: 'content', name: 'Inhalt', icon: DocumentTextIcon, description: 'Template oder eigener Text' },
    { id: 'generating', name: 'Generierung', icon: SparklesIcon, description: 'KI erstellt Text' },
    { id: 'review', name: 'Review', icon: EyeIcon, description: 'Prüfen und übernehmen' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Bitte gib eine Beschreibung ein.');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setError(null);

    try {
      const result = await firebaseAIService.generatePressRelease(prompt);
      setGeneratedText(result);
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
    if (!generatedText) return;

    // Erstelle ein strukturiertes Result für Legacy-Kompatibilität
    const structuredResult: StructuredPressRelease = {
      headline: "KI-generierte Headline",
      leadParagraph: "Lead-Absatz...",
      bodyParagraphs: ["Body-Paragraph 1", "Body-Paragraph 2"],
      quote: {
        text: "KI-generiertes Zitat",
        person: "Sprecher",
        role: "Position",
        company: "Unternehmen"
      },
      boilerplate: "Boilerplate Text..."
    };

    const result: GenerationResult = {
      headline: structuredResult.headline,
      content: generatedText,
      structured: structuredResult,
      metadata: {
        generatedBy: 'firebase-ai-service',
        timestamp: new Date().toISOString(),
        context: context
      }
    };

    onGenerate(result);
  };

  const handleTemplateSelect = (template: AITemplate) => {
    setPrompt(template.prompt);
    
    // Template-Kontext übernehmen
    if (template.tone) {
      setContext(prev => ({ ...prev, tone: template.tone }));
    }
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
        <DialogPanel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6 text-indigo-600" />
              <DialogTitle className="text-lg font-semibold">
                KI-Assistent - Strukturierte Generierung
              </DialogTitle>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="border-b p-4 bg-gray-50">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
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
                      <div className="ml-3 text-left">
                        <div className="text-sm font-medium">{step.name}</div>
                        <div className="text-xs">{step.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRightIcon className={`h-4 w-4 mx-4 ${
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
                <p className="text-red-600">{error}</p>
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
              />
            )}

            {currentStep === 'generating' && (
              <GenerationStep isGenerating={isGenerating} />
            )}

            {currentStep === 'review' && generatedText && (
              <ReviewStep 
                generatedText={generatedText}
                onRegenerate={() => setCurrentStep('content')}
              />
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex justify-between">
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

// Vereinfachte Step Components
function ContextSetupStep({ 
  context, 
  onChange
}: {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
}) {
  const industries = [
    'Technologie & Software', 'Finanzdienstleistungen', 'Gesundheitswesen',
    'Automobil', 'Handel & E-Commerce', 'Sonstiges'
  ];

  const tones = [
    { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell' },
    { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ' },
    { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise' },
    { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Kontext festlegen</h3>
        <p className="text-gray-600">
          Diese Informationen helfen der KI, passende Inhalte zu erstellen.
        </p>
      </div>

      <Field>
        <Label>Branche</Label>
        <Select 
          value={context.industry || ''} 
          onChange={(e) => onChange({ ...context, industry: e.target.value })}
        >
          <option value="">Branche auswählen...</option>
          {industries.map(industry => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>Tonalität</Label>
        <div className="grid grid-cols-2 gap-3">
          {tones.map(tone => (
            <label key={tone.id} className={`border rounded-lg p-3 cursor-pointer transition-colors ${
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
              <div className="font-medium text-sm">{tone.label}</div>
              <div className="text-xs text-gray-600 mt-1">{tone.desc}</div>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

function ContentInputStep({ 
  prompt, 
  onChange, 
  templates, 
  onTemplateSelect,
  context 
}: {
  prompt: string;
  onChange: (prompt: string) => void;
  templates: AITemplate[];
  onTemplateSelect: (template: AITemplate) => void;
  context: GenerationContext;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Inhalt definieren</h3>
        <p className="text-gray-600">
          Wähle eine Vorlage oder beschreibe deine Pressemitteilung frei.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            className="text-left p-4 border rounded-lg hover:border-indigo-300 hover:bg-gray-50"
          >
            <h4 className="font-medium text-gray-900">{template.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          </button>
        ))}
      </div>

      <Field>
        <Label>Beschreibe deine Pressemitteilung</Label>
        <Textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="Beschreibe dein Unternehmen, das Produkt, die Ankündigung..."
        />
      </Field>
    </div>
  );
}

function GenerationStep({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 mb-6">
        {isGenerating ? (
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
        ) : (
          <SparklesIcon className="h-16 w-16 text-indigo-600 mx-auto" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {isGenerating ? 'KI erstellt deine Pressemitteilung...' : 'Bereit zur Generierung'}
      </h3>
      
      <p className="text-gray-600">
        {isGenerating ? 'Dies dauert normalerweise 10-30 Sekunden' : 'Klicke auf "Mit KI generieren" um zu starten.'}
      </p>
    </div>
  );
}

function ReviewStep({ 
  generatedText, 
  onRegenerate 
}: {
  generatedText: string;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">✨ Pressemitteilung erstellt!</h3>
        <p className="text-gray-600">
          Prüfe das Ergebnis und nimm es in deinen Editor über.
        </p>
      </div>

      <div className="border rounded-lg bg-white max-h-96 overflow-y-auto p-6">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: generatedText }}
        />
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
          <div className="text-sm text-green-700">
            <p className="font-medium">🎉 Pressemitteilung erfolgreich erstellt!</p>
            <p className="mt-1">
              Der Text ist bereit für die Übernahme in den Rich-Text-Editor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}