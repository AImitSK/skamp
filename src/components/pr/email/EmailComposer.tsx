// src/components/pr/email/EmailComposer.tsx
"use client";

import { useState, useCallback, useEffect, useReducer } from 'react';
import { PRCampaign } from '@/types/pr';
import { 
  EmailComposerState, 
  EmailDraft, 
  ComposerStep,
  StepValidation,
  DEFAULT_COMPOSER_CONFIG,
  ManualRecipient,
  SenderInfo
} from '@/types/email-composer';
import { useAuth } from '@/context/AuthContext';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';

// Import der Unter-Komponenten
import StepIndicator from '@/components/pr/email/StepIndicator';
import Step1Content from '@/components/pr/email/Step1Content';
import Step2Details from '@/components/pr/email/Step2Details';
import Step3Preview from '@/components/pr/email/Step3Preview';

// Action Types für den Reducer
type ComposerAction =
  | { type: 'SET_STEP'; step: ComposerStep }
  | { type: 'UPDATE_CONTENT'; content: Partial<EmailDraft['content']> }
  | { type: 'UPDATE_RECIPIENTS'; recipients: Partial<EmailDraft['recipients']> }
  | { type: 'ADD_MANUAL_RECIPIENT'; recipient: ManualRecipient }
  | { type: 'REMOVE_MANUAL_RECIPIENT'; id: string }
  | { type: 'UPDATE_SENDER'; sender: SenderInfo }
  | { type: 'UPDATE_METADATA'; metadata: Partial<EmailDraft['metadata']> }
  | { type: 'UPDATE_SCHEDULING'; scheduling: EmailDraft['scheduling'] }
  | { type: 'SET_VALIDATION'; step: ComposerStep; validation: StepValidation[`step${ComposerStep}`] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'LOAD_DRAFT'; draft: EmailDraft }
  | { type: 'RESET_DRAFT' };

// Reducer für State Management
function composerReducer(state: EmailComposerState, action: ComposerAction): EmailComposerState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.step,
        completedSteps: action.step > 1 
          ? new Set([...Array.from(state.completedSteps), ((action.step - 1) as ComposerStep)])
          : state.completedSteps
      };

    case 'UPDATE_CONTENT':
      return {
        ...state,
        draft: {
          ...state.draft,
          content: { ...state.draft.content, ...action.content },
          updatedAt: Timestamp.now(),
          lastModifiedStep: 1
        }
      };

    case 'UPDATE_RECIPIENTS':
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: { ...state.draft.recipients, ...action.recipients },
          updatedAt: Timestamp.now(),
          lastModifiedStep: 2
        }
      };

    case 'ADD_MANUAL_RECIPIENT':
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: {
            ...state.draft.recipients,
            manual: [...state.draft.recipients.manual, action.recipient]
          },
          updatedAt: Timestamp.now()
        }
      };

    case 'REMOVE_MANUAL_RECIPIENT':
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: {
            ...state.draft.recipients,
            manual: state.draft.recipients.manual.filter(r => r.id !== action.id)
          },
          updatedAt: Timestamp.now()
        }
      };

    case 'UPDATE_SENDER':
      return {
        ...state,
        draft: {
          ...state.draft,
          sender: action.sender,
          updatedAt: Timestamp.now(),
          lastModifiedStep: 2
        }
      };

    case 'UPDATE_METADATA':
      return {
        ...state,
        draft: {
          ...state.draft,
          metadata: { ...state.draft.metadata, ...action.metadata },
          updatedAt: Timestamp.now(),
          lastModifiedStep: 2
        }
      };

    case 'UPDATE_SCHEDULING':
      return {
        ...state,
        draft: {
          ...state.draft,
          scheduling: action.scheduling,
          updatedAt: Timestamp.now(),
          lastModifiedStep: 3
        }
      };

    case 'SET_VALIDATION':
      const stepKey = `step${action.step}` as keyof StepValidation;
      return {
        ...state,
        validation: {
          ...state.validation,
          [stepKey]: action.validation
        }
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      };

    case 'CLEAR_ERROR':
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };

    case 'LOAD_DRAFT':
      return {
        ...state,
        draft: action.draft,
        isLoading: false
      };

    case 'RESET_DRAFT':
      return createInitialState(state.draft.campaignId, state.draft.campaignTitle);

    default:
      return state;
  }
}

// Initiale State-Factory
function createInitialState(campaignId: string, campaignTitle: string): EmailComposerState {
  // Vorausgefüllter E-Mail-Text mit sinnvollen Variablen
  const defaultEmailContent = `<p>Sehr geehrte{{companyName ? 'r Herr/Frau' : ''}} {{firstName}} {{lastName}}{{companyName ? ',' : ''}}</p>
<p>ich freue mich, Ihnen unsere aktuelle Pressemitteilung "${campaignTitle}" zukommen zu lassen.</p>
<p>Die Mitteilung dürfte für Ihre Leserschaft von besonderem Interesse sein, da sie wichtige Entwicklungen in unserer Branche aufzeigt.</p>
<p>Gerne stehe ich Ihnen für Rückfragen, weitere Informationen oder ein persönliches Gespräch zur Verfügung. Bildmaterial sowie ergänzende Unterlagen finden Sie anbei.</p>
<p>Über eine Veröffentlichung würde ich mich sehr freuen.</p>
<p>Mit freundlichen Grüßen</p>
<p>{{senderName}}<br>
{{senderTitle}}<br>
{{senderCompany}}<br>
{{senderPhone}}<br>
{{senderEmail}}</p>`;

  return {
    currentStep: 1,
    completedSteps: new Set(),
    draft: {
      campaignId,
      campaignTitle,
      content: {
        body: defaultEmailContent,
        sections: {
          greeting: '',
          introduction: '',
          closing: ''
        }
      },
      recipients: {
        listIds: [],
        listNames: [],
        manual: [],
        totalCount: 0,
        validCount: 0
      },
      sender: {
        type: 'contact'
      },
      metadata: {
        subject: `Pressemitteilung: ${campaignTitle}`,
        preheader: 'Aktuelle Pressemitteilung für Ihre Berichterstattung'
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    validation: {
      step1: { isValid: true, errors: {} }, // Jetzt valid, da vorausgefüllt
      step2: { isValid: false, errors: {} },
      step3: { isValid: true, errors: {} }
    },
    isLoading: false,
    isSaving: false,
    errors: {},
    isPreviewMode: false
  };
}

interface EmailComposerProps {
  campaign: PRCampaign;
  onClose: () => void;
  onSent?: () => void;
}

export default function EmailComposer({ campaign, onClose, onSent }: EmailComposerProps) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(
    composerReducer, 
    { campaignId: campaign.id!, campaignTitle: campaign.title },
    ({ campaignId, campaignTitle }) => createInitialState(campaignId, campaignTitle)
  );

  // Auto-Save mit Debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Navigation zwischen Steps
  const navigateToStep = useCallback((step: ComposerStep) => {
    // Validiere aktuellen Step bevor Navigation
    if (step > state.currentStep) {
      const currentValidation = validateStep(state.currentStep);
      if (!currentValidation.isValid) {
        dispatch({ 
          type: 'SET_VALIDATION', 
          step: state.currentStep, 
          validation: currentValidation 
        });
        return;
      }
    }
    dispatch({ type: 'SET_STEP', step });
  }, [state.currentStep]);

  // Step-Validierung
  const validateStep = useCallback((step: ComposerStep): StepValidation[`step${ComposerStep}`] => {
    switch (step) {
      case 1:
        const bodyLength = state.draft.content.body.replace(/<[^>]*>/g, '').length;
        return {
          isValid: bodyLength >= DEFAULT_COMPOSER_CONFIG.validation.minBodyLength,
          errors: {
            body: bodyLength < DEFAULT_COMPOSER_CONFIG.validation.minBodyLength
              ? `Mindestens ${DEFAULT_COMPOSER_CONFIG.validation.minBodyLength} Zeichen erforderlich`
              : undefined
          }
        } as StepValidation['step1'];

      case 2:
        const hasRecipients = state.draft.recipients.listIds.length > 0 || 
                             state.draft.recipients.manual.length > 0;
        const hasSender = (state.draft.sender.type === 'contact' && !!state.draft.sender.contactId) ||
                         (state.draft.sender.type === 'manual' && !!state.draft.sender.manual);
        const hasSubject = state.draft.metadata.subject.length >= DEFAULT_COMPOSER_CONFIG.validation.minSubjectLength;

        return {
          isValid: hasRecipients && hasSender && hasSubject,
          errors: {
            recipients: !hasRecipients ? 'Mindestens ein Empfänger erforderlich' : undefined,
            sender: !hasSender ? 'Absender muss ausgewählt werden' : undefined,
            subject: !hasSubject ? 'Betreff erforderlich' : undefined
          }
        } as StepValidation['step2'];

      case 3:
        // Step 3 hat keine Pflichtfelder
        return { isValid: true, errors: {} } as StepValidation['step3'];

      default:
        return { isValid: false, errors: {} } as StepValidation['step1'];
    }
  }, [state.draft]);

  // Auto-Save Logik
  const autoSaveDraft = useCallback(async () => {
    if (!DEFAULT_COMPOSER_CONFIG.autoSave.enabled || state.isSaving) return;

    dispatch({ type: 'SET_SAVING', isSaving: true });
    
    try {
      // TODO: Implement actual save to Firebase
      console.log('Auto-saving draft...', state.draft);
      // await emailComposerService.saveDraft(campaign.id!, state.draft);
      
      // Simuliere Save
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      dispatch({ type: 'SET_ERROR', field: 'autoSave', error: 'Automatisches Speichern fehlgeschlagen' });
    } finally {
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  }, [campaign.id, state.draft, state.isSaving]);

  // Trigger Auto-Save bei Änderungen
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      autoSaveDraft();
    }, DEFAULT_COMPOSER_CONFIG.autoSave.debounceMs);

    setAutoSaveTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.draft]);

  // Lade existierenden Draft beim Mount
  useEffect(() => {
    const loadDraft = async () => {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      try {
        // TODO: Implement actual load from Firebase
        console.log('Loading draft for campaign:', campaign.id);
        // const existingDraft = await emailComposerService.loadDraft(campaign.id!);
        // if (existingDraft) {
        //   dispatch({ type: 'LOAD_DRAFT', draft: existingDraft });
        // }
      } catch (error) {
        console.error('Failed to load draft:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    };

    loadDraft();
  }, [campaign.id]);

  // Step-spezifische Props
  const step1Props = {
    content: state.draft.content,
    onChange: (content: Partial<EmailDraft['content']>) => 
      dispatch({ type: 'UPDATE_CONTENT', content }),
    validation: state.validation.step1,
    campaign
  };

  const step2Props = {
    recipients: state.draft.recipients,
    sender: state.draft.sender,
    metadata: state.draft.metadata,
    onRecipientsChange: (recipients: Partial<EmailDraft['recipients']>) =>
      dispatch({ type: 'UPDATE_RECIPIENTS', recipients }),
    onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) =>
      dispatch({ type: 'ADD_MANUAL_RECIPIENT', recipient: { ...recipient, id: nanoid() } }),
    onRemoveManualRecipient: (id: string) =>
      dispatch({ type: 'REMOVE_MANUAL_RECIPIENT', id }),
    onSenderChange: (sender: SenderInfo) =>
      dispatch({ type: 'UPDATE_SENDER', sender }),
    onMetadataChange: (metadata: Partial<EmailDraft['metadata']>) =>
      dispatch({ type: 'UPDATE_METADATA', metadata }),
    validation: state.validation.step2,
    campaign
  };

  const step3Props = {
    draft: state.draft,
    scheduling: state.draft.scheduling,
    onSchedulingChange: (scheduling: EmailDraft['scheduling']) =>
      dispatch({ type: 'UPDATE_SCHEDULING', scheduling }),
    validation: state.validation.step3,
    campaign,
    onSent
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade E-Mail-Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Progress */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">E-Mail-Versand: {campaign.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Schließen</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={navigateToStep}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {state.currentStep === 1 && <Step1Content {...step1Props} />}
        {state.currentStep === 2 && <Step2Details {...step2Props} />}
        {state.currentStep === 3 && <Step3Preview {...step3Props} />}
      </div>

      {/* Footer mit Navigation */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state.isSaving && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Automatisch gespeichert...
              </span>
            )}
            {state.lastSaved && !state.isSaving && (
              <span className="text-sm text-gray-500">
                Zuletzt gespeichert: {state.lastSaved.toLocaleTimeString('de-DE')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Abbrechen
            </button>
            
            {state.currentStep > 1 && (
              <button
                onClick={() => navigateToStep((state.currentStep - 1) as ComposerStep)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Zurück
              </button>
            )}
            
            {state.currentStep < 3 && (
              <button
                onClick={() => navigateToStep((state.currentStep + 1) as ComposerStep)}
                className="px-4 py-2 bg-[#005fab] text-white rounded-lg hover:bg-[#004a8c]"
              >
                Weiter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}