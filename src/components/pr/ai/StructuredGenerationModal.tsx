// src/components/pr/ai/StructuredGenerationModal.tsx - VERBESSERT
"use client";

import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
  SparklesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';
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
import {
  type StructuredGenerationModalProps,
  type ContextSetupStepProps,
  type ContentInputStepProps,
  type GenerationStepProps,
  type ReviewStepProps,
  type TemplateDropdownProps,
  INDUSTRIES,
  TONES,
  AUDIENCES
} from './structured-generation/types';
import type { GenerationStep } from './structured-generation/types';
import TemplateDropdown from './structured-generation/components/TemplateDropdown';
import StepProgressBar from './structured-generation/components/StepProgressBar';
import ErrorBanner from './structured-generation/components/ErrorBanner';
import ModalHeader from './structured-generation/components/ModalHeader';
import ModalFooter from './structured-generation/components/ModalFooter';
import { useTemplates } from './structured-generation/hooks/useTemplates';
import { useStructuredGeneration } from './structured-generation/hooks/useStructuredGeneration';
import { useKeyboardShortcuts } from './structured-generation/hooks/useKeyboardShortcuts';
import ContextSetupStep from './structured-generation/steps/ContextSetupStep';
import ContentInputStep from './structured-generation/steps/ContentInputStep';
import GenerationStepComponent from './structured-generation/steps/GenerationStep';
import ReviewStep from './structured-generation/steps/ReviewStep';

export default function StructuredGenerationModal({ onClose, onGenerate, existingContent, organizationId, dokumenteFolderId }: StructuredGenerationModalProps) {
  const { user } = useAuth();

  // Workflow State
  const [currentStep, setCurrentStep] = useState<GenerationStep>('context');

  // Generation Mode State
  const [generationMode, setGenerationMode] = useState<'standard' | 'expert'>('standard');

  // Generation Data
  const [context, setContext] = useState<GenerationContext>({});
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);

  // Planungsdokumente State
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentContext[]>([]);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);

  // Templates laden mit Hook
  const { templates, loading: loadingTemplates } = useTemplates(currentStep === 'content');

  // Structured Generation Hook (übernimmt isGenerating, error, result)
  const { generate, isGenerating, error, result: generatedResult } = useStructuredGeneration();

  // Handler für Modus-Wechsel (mit Context-Reset)
  const handleModeChange = useCallback((mode: 'standard' | 'expert') => {
    setGenerationMode(mode);
    // Context und Dokumente zurücksetzen beim Modus-Wechsel
    setContext({});
    setSelectedDocuments([]);
    setPrompt('');
    setSelectedTemplate(null);
  }, []);

  // Handler für Dokument-Auswahl
  const handleDocumentsSelected = useCallback((documents: DocumentContext[]) => {
    setSelectedDocuments(documents);
    setShowDocumentPicker(false);
  }, []);

  // Handler für Generation
  const handleGenerate = useCallback(async () => {
    // Schritt zu "generating" wechseln
    setCurrentStep('generating');

    // Hook nutzen für API-Call und Validierung
    const result = await generate({
      mode: generationMode,
      prompt,
      context,
      selectedDocuments
    });

    // Wenn erfolgreich, zu Review wechseln
    if (result) {
      setCurrentStep('review');
    } else {
      // Bei Fehler zurück zu Content (error wird vom Hook gesetzt)
      setCurrentStep('content');
    }
  }, [generate, generationMode, prompt, context, selectedDocuments]);

  // Handler für Result-Verwendung
  const handleUseResult = useCallback(() => {
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
      toastService.success('Text erfolgreich übernommen');
      // Modal wird automatisch durch parent component geschlossen
    } catch (error) {
      toastService.error('Fehler beim Übernehmen des Textes');
    }
  }, [generatedResult, context, onGenerate]);

  // Handler für Template-Auswahl
  const handleTemplateSelect = useCallback((template: AITemplate) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template);
    // Error wird automatisch vom Hook beim nächsten generate() zurückgesetzt
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onClose,
    currentStep
  });

  // Steps-Array mit useMemo
  const steps = useMemo(() => [
    { id: 'context', name: 'Kontext', icon: CogIcon },
    { id: 'content', name: 'Inhalt', icon: DocumentTextIcon },
    { id: 'generating', name: 'KI', icon: SparklesIcon },
    { id: 'review', name: 'Review', icon: EyeIcon }
  ], []);

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
          <ModalHeader onClose={onClose} />

          {/* Progress Bar */}
          <StepProgressBar currentStep={currentStep} steps={steps} />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <ErrorBanner error={error} />

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
                setGenerationMode={handleModeChange}
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
              <GenerationStepComponent isGenerating={isGenerating} />
            )}

            {currentStep === 'review' && generatedResult && (
              <ReviewStep
                result={generatedResult}
                onRegenerate={() => {
                  // Reset state und gehe zurück zu content step
                  setCurrentStep('content');
                }}
              />
            )}
          </div>

          {/* Footer */}
          <ModalFooter
            currentStep={currentStep}
            onClose={onClose}
            onBack={() => {
              if (currentStep === 'content') {
                setCurrentStep('context');
              } else if (currentStep === 'review') {
                setCurrentStep('content');
              }
            }}
            onNext={() => setCurrentStep('content')}
            onGenerate={handleGenerate}
            onUseResult={handleUseResult}
            canGenerate={
              (generationMode === 'standard' && prompt.trim() !== '') ||
              (generationMode === 'expert' && selectedDocuments.length > 0)
            }
            isGenerating={isGenerating}
          />
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