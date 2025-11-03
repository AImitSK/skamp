// src/components/pr/ai/StructuredGenerationModal.tsx - VERBESSERT
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  LightBulbIcon,
  ClipboardDocumentIcon,
  AcademicCapIcon,
  BeakerIcon,
  RocketLaunchIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  NewspaperIcon,
  HandRaisedIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckBadgeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/api-client';
import clsx from 'clsx';
import {
  StructuredPressRelease,
  GenerationContext,
  GenerationResult,
  AITemplate,
  StructuredGenerateResponse,
  DocumentContext,
  EnrichedGenerationContext
} from '@/types/ai';
import DocumentPickerModal from './DocumentPickerModal';

// Lokale Types
type GenerationStep = 'context' | 'content' | 'generating' | 'review';

interface Props {
  onClose: () => void;
  onGenerate: (result: GenerationResult) => void;
  existingContent?: {
    title?: string;
    content?: string;
  };
  // NEU: Für Dokumenten-Kontext
  organizationId?: string;
  dokumenteFolderId?: string;
}

// Template Dropdown Component
function TemplateDropdown({
  templates,
  onSelect,
  loading,
  selectedTemplate
}: {
  templates: AITemplate[];
  onSelect: (template: AITemplate) => void;
  loading: boolean;
  selectedTemplate?: AITemplate | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template: AITemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  const categoryIcons: Record<string, any> = {
    product: RocketLaunchIcon,
    partnership: HandRaisedIcon,
    finance: CurrencyDollarIcon,
    corporate: BuildingOfficeIcon,
    event: CalendarIcon,
    research: BeakerIcon
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full px-4 py-3 text-left bg-white border rounded-lg shadow-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:border-[#005fab]",
          "hover:border-gray-400 cursor-pointer",
          isOpen ? "border-[#005fab] ring-2 ring-[#005fab]" : "border-gray-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-5 w-5 text-gray-400" />
            <div>
              {selectedTemplate ? (
                <>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {(() => {
                      const Icon = categoryIcons[selectedTemplate.category] || DocumentTextIcon;
                      return <Icon className="h-4 w-4 inline-block" />;
                    })()}
                    {selectedTemplate.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Template ausgewählt</div>
                </>
              ) : (
                <>
                  <div className="font-medium text-gray-700">Template verwenden (optional)</div>
                  <div className="text-xs text-gray-500 mt-1">Wähle aus bewährten Vorlagen</div>
                </>
              )}
            </div>
          </div>
          <ChevronDownIcon className={clsx(
            "h-5 w-5 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-hidden animate-fade-in-down">
            {/* Templates List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Templates werden geladen...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Keine Templates gefunden</p>
                </div>
              ) : (
                <div className="py-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {(() => {
                            const Icon = categoryIcons[template.category] || DocumentTextIcon;
                            return <Icon className="h-6 w-6 text-gray-700" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {template.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.description || template.prompt.substring(0, 100) + '...'}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge color="zinc" className="text-xs">
                              {template.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Klicken zum Verwenden
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                {templates.length} Templates verfügbar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Keyboard Shortcuts Hook
function useKeyboardShortcuts({
  onGenerate,
  onClose,
  currentStep
}: {
  onGenerate: () => void;
  onClose: () => void;
  currentStep: GenerationStep;
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter = Generate
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && currentStep === 'content') {
        e.preventDefault();
        onGenerate();
      }
      
      // Escape = Close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onGenerate, onClose, currentStep]);
}

export default function StructuredGenerationModal({ onClose, onGenerate, existingContent, organizationId, dokumenteFolderId }: Props) {
  const { user } = useAuth();

  // Workflow State
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation Mode State - NEU
  const [generationMode, setGenerationMode] = useState<'standard' | 'expert'>('standard');

  // Generation Data
  const [context, setContext] = useState<GenerationContext>({});
  const [prompt, setPrompt] = useState('');
  const [generatedResult, setGeneratedResult] = useState<StructuredGenerateResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

  // Templates von API laden
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // NEU: Planungsdokumente State
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([]);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose,
    currentStep
  });

  // Templates von API laden
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await apiClient.get<any>('/api/ai/templates');

        if (data.success && data.templates) {
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
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (currentStep === 'content') {
      loadTemplates();
    }
  }, [currentStep]);

  // Hilfsfunktionen
  const categorizeTemplate = (title: string): AITemplate['category'] => {
    if (title.includes('Produkt')) return 'product';
    if (title.includes('Partner')) return 'partnership';
    if (title.includes('Finanz')) return 'finance';
    if (title.includes('Auszeichnung') || title.includes('Award')) return 'corporate';
    if (title.includes('Führung') || title.includes('Personal')) return 'corporate';
    if (title.includes('Event')) return 'event';
    if (title.includes('Forschung') || title.includes('Studie')) return 'research';
    return 'corporate';
  };

  const extractDescription = (prompt: string): string => {
    const lines = prompt.split('\n');
    const firstLine = lines[0];
    if (firstLine.includes(':')) {
      return firstLine.split(':')[1].trim();
    }
    return firstLine.substring(0, 100) + '...';
  };

  // NEU: Handler für Dokument-Auswahl
  const handleDocumentsSelected = (documents: DocumentContext[]) => {
    setSelectedDocuments(documents);
    setShowDocumentPicker(false);
  };

  async function handleGenerate() {
    // VALIDIERUNG basierend auf Modus

    // Standard-Modus: Prompt + Tone + Audience erforderlich
    if (generationMode === 'standard') {
      if (!prompt.trim()) {
        setError('Bitte beschreibe das Thema der Pressemitteilung.');
        return;
      }
      if (!context.tone || !context.audience) {
        setError('Bitte wähle Tonalität und Zielgruppe aus.');
        return;
      }
    }

    // Experten-Modus: Mindestens 1 Dokument erforderlich (Prompt optional)
    if (generationMode === 'expert') {
      if (selectedDocuments.length === 0) {
        setError('Bitte füge mindestens 1 Planungsdokument hinzu.');
        return;
      }
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setError(null);

    try {
      const requestBody: any = {};

      // STANDARD-MODUS: Prompt + Context senden
      if (generationMode === 'standard') {
        requestBody.prompt = prompt.trim();
        requestBody.context = {
          industry: context.industry,
          tone: context.tone,
          audience: context.audience,
          companyName: context.companyName,
        };
      }

      // EXPERTEN-MODUS: Dokumente + optionaler Prompt
      if (generationMode === 'expert') {
        // Prompt nur senden wenn vorhanden
        if (prompt.trim()) {
          requestBody.prompt = prompt.trim();
        } else {
          // Default-Prompt für Experten-Modus ohne spezifische Anweisungen
          requestBody.prompt = 'Erstelle eine professionelle Pressemitteilung basierend auf den bereitgestellten Strategiedokumenten.';
        }

        requestBody.documentContext = {
          documents: selectedDocuments
        };
      }

      const result: StructuredGenerateResponse = await apiClient.post<StructuredGenerateResponse>('/api/ai/generate-structured', requestBody);

      if (!result.success || !result.structured) {
        throw new Error('Unvollständige Antwort vom Server');
      }

      setGeneratedResult(result);
      setCurrentStep('review');

    } catch (error: any) {
      setError(error.message || 'Generierung fehlgeschlagen');
      setCurrentStep('content');
    } finally {
      setIsGenerating(false);
    }
  }

  const handleUseResult = () => {
    
    if (!generatedResult) {
      return;
    }

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

    
    try {
      onGenerate(result);
      // Modal wird automatisch durch parent component geschlossen
    } catch (error) {
    }
  };

  const handleTemplateSelect = (template: AITemplate) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template);
    setError(null);
  };

  const steps = [
    { id: 'context', name: 'Kontext', icon: CogIcon },
    { id: 'content', name: 'Inhalt', icon: DocumentTextIcon },
    { id: 'generating', name: 'KI', icon: SparklesIcon },
    { id: 'review', name: 'Review', icon: EyeIcon }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

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
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <SparklesIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  KI-Pressemitteilung erstellen
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-0.5">
                  Strukturierte Generierung mit Google Gemini
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Minimalist Progress */}
          <div className="px-6 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-center gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={clsx(
                      "flex items-center gap-2 transition-all",
                      isActive && "scale-110"
                    )}>
                      <div className={clsx(
                        "rounded-full p-2 transition-all",
                        isActive && "bg-indigo-600 text-white shadow-lg",
                        isCompleted && "bg-green-500 text-white",
                        !isActive && !isCompleted && "bg-gray-200 text-gray-400"
                      )}>
                        {isCompleted ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <span className={clsx(
                        "text-sm font-medium hidden sm:block",
                        isActive && "text-indigo-600",
                        isCompleted && "text-green-600",
                        !isActive && !isCompleted && "text-gray-400"
                      )}>
                        {step.name}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={clsx(
                        "w-12 h-0.5 mx-2 transition-colors",
                        isCompleted ? "bg-green-500" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
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
                // NEU: Dokumenten-Props
                selectedDocuments={selectedDocuments}
                onOpenDocumentPicker={() => setShowDocumentPicker(true)}
                onClearDocuments={() => setSelectedDocuments([])}
                onRemoveDocument={(docId) => setSelectedDocuments(prev => prev.filter(d => d.id !== docId))}
                // NEU: Modus-Props
                generationMode={generationMode}
                setGenerationMode={setGenerationMode}
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
                selectedTemplate={selectedTemplate}
                generationMode={generationMode}
                hasDocuments={selectedDocuments.length > 0}
                documentCount={selectedDocuments.length}
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
          <div className="border-t p-6 flex justify-between items-center bg-gray-50">
            <div>
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
            </div>

            <div className="flex gap-2">
              {currentStep === 'context' && (
                <Button 
                  onClick={() => setCurrentStep('content')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  Weiter <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              )}
              
              {currentStep === 'content' && (
                <Button
                  onClick={handleGenerate}
                  disabled={(
                    (generationMode === 'standard' && !prompt.trim()) ||
                    (generationMode === 'expert' && selectedDocuments.length === 0) ||
                    isGenerating
                  )}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
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
                  <Button 
                    onClick={() => {
                      handleUseResult();
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Text übernehmen
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>

      {/* NEU: DocumentPickerModal */}
      {showDocumentPicker && organizationId && dokumenteFolderId && (
        <DocumentPickerModal
          isOpen={showDocumentPicker}
          onClose={() => setShowDocumentPicker(false)}
          onSelect={handleDocumentsSelected}
          organizationId={organizationId}
          dokumenteFolderId={dokumenteFolderId}
        />
      )}

      {/* CSS für Animationen */}
      <style jsx global>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </Dialog>
  );
}

// Step Components
function ContextSetupStep({
  context,
  onChange,
  selectedDocuments,
  onOpenDocumentPicker,
  generationMode,
  setGenerationMode,
  onClearDocuments,
  onRemoveDocument
}: {
  context: GenerationContext;
  onChange: (context: GenerationContext) => void;
  selectedDocuments?: DocumentContext[];
  onOpenDocumentPicker?: () => void;
  generationMode: 'standard' | 'expert';
  setGenerationMode: (mode: 'standard' | 'expert') => void;
  onClearDocuments?: () => void;
  onRemoveDocument?: (docId: string) => void;
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
    { id: 'formal', label: 'Formal', desc: 'Seriös, traditionell, konservativ', icon: AcademicCapIcon },
    { id: 'modern', label: 'Modern', desc: 'Zeitgemäß, innovativ, zugänglich', icon: SparklesIcon },
    { id: 'technical', label: 'Technisch', desc: 'Fachspezifisch, präzise, detailliert', icon: BeakerIcon },
    { id: 'startup', label: 'Startup', desc: 'Dynamisch, visionär, disruptiv', icon: RocketLaunchIcon }
  ];

  const audiences = [
    { id: 'b2b', label: 'B2B', desc: 'Unternehmen und Experten', icon: BriefcaseIcon },
    { id: 'consumer', label: 'Verbraucher', desc: 'Endkunden und Publikum', icon: ShoppingBagIcon },
    { id: 'media', label: 'Medien', desc: 'Journalisten und Redaktionen', icon: NewspaperIcon }
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* MODUS-AUSWAHL */}
      <div className="mb-8">
        <Field>
          <Label className="text-base font-semibold">KI-Modus *</Label>
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
                Standard
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
                Experte
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
              <Label className="text-base font-semibold">Branche *</Label>
              <Select
                value={context.industry || ''}
                onChange={(e) => onChange({ ...context, industry: e.target.value })}
                className="mt-2"
              >
                <option value="">Branche auswählen...</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label className="text-base font-semibold">Unternehmensname *</Label>
              <Input
                value={context.companyName || ''}
                onChange={(e) => onChange({ ...context, companyName: e.target.value })}
                placeholder="Ihre Firma GmbH"
                className="mt-2"
              />
            </Field>
          </div>

      <div className="mb-8">
        <Field>
          <Label className="text-base font-semibold">Tonalität *</Label>
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
                      Aktiv
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
          <Label className="text-base font-semibold">Zielgruppe *</Label>
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
                      Aktiv
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

      {/* EXPERTEN-MODUS FELDER */}
      {generationMode === 'expert' && onOpenDocumentPicker && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Planungsdokumente</h4>
            </div>

            <p className="text-sm text-blue-700 mb-4">
              Fügen Sie Ihre Strategiedokumente hinzu (Kernbotschaft, Zielgruppenanalyse, Unternehmensprofil, etc.)
            </p>

          <Field>

          {selectedDocuments && selectedDocuments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedDocuments.length} Dokument{selectedDocuments.length !== 1 ? 'e' : ''} ausgewählt
                  </span>
                </div>
                <Button
                  plain
                  onClick={onOpenDocumentPicker}
                  className="text-sm text-blue-700 hover:text-blue-800"
                >
                  Ändern
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {selectedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg hover:border-blue-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-900 truncate">{doc.fileName.replace('.celero-doc', '')}</p>
                      <p className="text-xs text-blue-600">{doc.wordCount} Wörter</p>
                    </div>
                    {onRemoveDocument && (
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(doc.id)}
                        className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Dokument entfernen"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Button
              outline
              onClick={onOpenDocumentPicker}
              className="w-full"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Planungsdokumente auswählen
            </Button>
          )}
          </Field>
          </div>
        </>
      )}
    </div>
  );
}

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
}: {
  prompt: string;
  onChange: (prompt: string) => void;
  templates: AITemplate[];
  onTemplateSelect: (template: AITemplate) => void;
  context: GenerationContext;
  loadingTemplates: boolean;
  selectedTemplate?: AITemplate | null;
  generationMode: 'standard' | 'expert';
  hasDocuments?: boolean;
  documentCount?: number;
}) {
  const tipExamples = [
    "Nenne konkrete Zahlen und Fakten (z.B. 50% Wachstum, 10.000 Nutzer)",
    "Beschreibe das Alleinstellungsmerkmal klar und deutlich",
    "Erwähne die Zielgruppe und welchen Nutzen sie hat",
    "Gib Kontext zur aktuellen Marktsituation",
    "Füge relevante Personen mit Namen und Position hinzu"
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
              {context.audience === 'b2b' ? 'B2B' :
               context.audience === 'consumer' ? 'Verbraucher' : 'Medien'}
            </span>
          )}
          {hasDocuments && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1.5">
              <DocumentTextIcon className="h-4 w-4" />
              {documentCount} Planungsdokument{documentCount !== 1 ? 'e' : ''} angehängt
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
                  Kontext-basierte Generierung aktiviert
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  Die KI nutzt die {documentCount} ausgewählten Planungsdokumente als Kontext.
                  Gib optional weitere Anweisungen oder lasse das Feld leer für eine automatische Generierung.
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
                ? 'Weitere Anweisungen oder spezifische Schwerpunkte (optional)'
                : 'Beschreibe deine Pressemitteilung *'
              }
            </Label>
            {prompt.length > 0 && (
              <span className={clsx(
                "text-sm",
                prompt.length > 500 ? "text-orange-600" : "text-gray-500"
              )}>
                {prompt.length} Zeichen
              </span>
            )}
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            rows={generationMode === 'expert' ? 8 : 12}
            placeholder={generationMode === 'expert'
              ? `Optionale Anweisungen für die KI...

Beispiele:
- "Fokussiere auf die technischen Innovationen"
- "Zielgruppe sind Investoren und Finanzmedien"
- "Betone die Nachhaltigkeitsaspekte besonders"
- Leer lassen für automatische Generierung basierend auf den Planungsdokumenten`
              : `Beschreibe dein Unternehmen, das Produkt, die Ankündigung oder das Ereignis. Je detaillierter deine Beschreibung, desto besser wird das Ergebnis.

Beispiel: Unser Startup DataCorp hat eine neue KI-Plattform entwickelt, die Unternehmensdaten 10x schneller analysiert als herkömmliche Tools. Die Plattform nutzt maschinelles Lernen und kann...`
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
                Tipps für bessere Ergebnisse:
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

function GenerationStep({ isGenerating }: { isGenerating: boolean }) {
  const steps = [
    { text: "Kontext und Anforderungen analysieren", delay: "0ms" },
    { text: "Journalistische Struktur erstellen", delay: "100ms" },
    { text: "Inhalte für Zielgruppe optimieren", delay: "200ms" },
    { text: "Qualitätskontrolle durchführen", delay: "300ms" }
  ];

  return (
    <div className="text-center py-16 max-w-lg mx-auto">
      <div className="relative mx-auto w-24 h-24 mb-8">
        {isGenerating ? (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-spin" 
                 style={{ animationDuration: '3s' }}>
              <div className="absolute inset-1 rounded-full bg-white"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="h-10 w-10 text-indigo-600 animate-pulse" />
            </div>
          </>
        ) : (
          <div className="rounded-full h-24 w-24 bg-green-100 flex items-center justify-center animate-scale-in">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
        )}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        {isGenerating ? 'KI arbeitet für dich...' : 'Fertig!'}
      </h3>
      
      <p className="text-gray-600 mb-8">
        {isGenerating 
          ? 'Google Gemini erstellt eine professionelle Pressemitteilung nach journalistischen Standards.' 
          : 'Die Pressemitteilung wurde erfolgreich erstellt.'
        }
      </p>

      {isGenerating && (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 text-left opacity-0 animate-fade-in"
              style={{ animationDelay: step.delay, animationFillMode: 'forwards' }}
            >
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              <span className="text-sm text-gray-600">{step.text}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
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

  const metrics = [
    { label: 'Headline', value: `${result.structured.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim().length} Zeichen`, ideal: '< 80' },
    { label: 'Lead', value: `${result.structured.leadParagraph.split(' ').length} Wörter`, ideal: '40-50' },
    { label: 'Absätze', value: result.structured.bodyParagraphs.length, ideal: '3-4' },
    { label: 'CTA', value: (result.structured.cta || result.structured.boilerplate) ? '✓' : '✗', ideal: '✓' },
    { label: 'Social', value: result.structured.socialOptimized ? '✓' : '○', ideal: '✓' }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Banner */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Pressemitteilung erfolgreich erstellt!</h3>
            <p className="text-sm text-green-700 mt-1">
              Die Inhalte werden automatisch in die entsprechenden Felder übernommen.
            </p>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-indigo-600">{metric.value}</div>
            <div className="text-xs text-gray-600">{metric.label}</div>
            <div className="text-xs text-gray-400">Ideal: {metric.ideal}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('preview')}
          className={clsx(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
            activeTab === 'preview' 
              ? "bg-white text-gray-900 shadow-sm" 
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <EyeIcon className="h-4 w-4 inline mr-2" />
          Vorschau
        </button>
        <button
          onClick={() => setActiveTab('structured')}
          className={clsx(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
            activeTab === 'structured' 
              ? "bg-white text-gray-900 shadow-sm" 
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <DocumentTextIcon className="h-4 w-4 inline mr-2" />
          Strukturiert
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {activeTab === 'preview' && (
          <div>
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">
                {result.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()}
              </h1>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: result.htmlContent }}
              />
            </div>
          </div>
        )}

        {activeTab === 'structured' && result.structured && (
          <div className="p-6 max-h-[500px] overflow-y-auto space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Headline</h4>
              <p className="text-lg font-bold text-gray-900">
                {result.structured.headline.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lead-Absatz</h4>
              <p className="text-gray-700 bg-yellow-50 p-3 rounded">{result.structured.leadParagraph}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Haupttext</h4>
              <div className="space-y-3">
                {result.structured.bodyParagraphs.map((para, index) => (
                  <p key={index} className="text-gray-700">{para}</p>
                ))}
              </div>
            </div>

            {result.structured.quote && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Zitat</h4>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <blockquote className="italic text-gray-800">
                    &ldquo;{result.structured.quote.text}&rdquo;
                  </blockquote>
                  <p className="text-sm text-gray-600 mt-2">
                    — {result.structured.quote.person}, {result.structured.quote.role}
                    {result.structured.quote.company && ` bei ${result.structured.quote.company}`}
                  </p>
                </div>
              </div>
            )}

            {(result.structured.cta || result.structured.boilerplate) && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Call-to-Action</h4>
                <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
                  <p className="font-bold text-indigo-900">
                    {result.structured.cta || result.structured.boilerplate}
                  </p>
                  <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1.5">
                    <LightBulbIcon className="h-4 w-4" />
                    Wird als CTA-Element für bessere SEO-Scores formatiert
                  </p>
                </div>
              </div>
            )}

            {result.structured.hashtags && result.structured.hashtags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Social Media Hashtags
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.structured.hashtags.map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 flex items-center gap-1.5">
                    <CheckBadgeIcon className="h-4 w-4" />
                    {result.structured.socialOptimized ? 'Optimiert für Twitter/LinkedIn Sharing' : 'Geeignet für Social Media'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}