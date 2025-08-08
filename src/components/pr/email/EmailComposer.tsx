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
import { useOrganization } from '@/context/OrganizationContext';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { emailService } from '@/lib/email/email-service';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { emailLogger } from '@/utils/emailLogger';
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER, ICON_SIZES } from '@/constants/ui';

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
  | { type: 'SET_LAST_SAVED'; timestamp: Date }
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
      // Berechne die neue totalCount korrekt
      let newTotalCount = state.draft.recipients.totalCount;
      
      // Wenn listIds aktualisiert werden, müssen wir die totalCount neu berechnen
      if (action.recipients.listIds !== undefined || action.recipients.manual !== undefined) {
        // Anzahl der manuellen Empfänger
        const manualCount = action.recipients.manual !== undefined 
          ? action.recipients.manual.length 
          : state.draft.recipients.manual.length;
        
        // Wenn totalCount explizit übergeben wird, nutze diese für Listen-Empfänger
        // Ansonsten behalte die alte Anzahl
        const listCount = action.recipients.totalCount !== undefined
          ? action.recipients.totalCount - state.draft.recipients.manual.length
          : state.draft.recipients.totalCount - state.draft.recipients.manual.length;
        
        newTotalCount = listCount + manualCount;
      }
      
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: { 
            ...state.draft.recipients, 
            ...action.recipients,
            totalCount: action.recipients.totalCount !== undefined ? action.recipients.totalCount : newTotalCount
          },
          updatedAt: Timestamp.now(),
          lastModifiedStep: 2
        }
      };

    case 'ADD_MANUAL_RECIPIENT':
      const updatedManualRecipients = [...state.draft.recipients.manual, action.recipient];
      // Berechne neue totalCount basierend auf Listen-Count + manuelle Empfänger
      const listCount = state.draft.recipients.listIds.length > 0 ? (state.draft.recipients.totalCount - state.draft.recipients.manual.length) : 0;
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: {
            ...state.draft.recipients,
            manual: updatedManualRecipients,
            totalCount: listCount + updatedManualRecipients.length
          },
          updatedAt: Timestamp.now()
        }
      };

    case 'REMOVE_MANUAL_RECIPIENT':
      const filteredManualRecipients = state.draft.recipients.manual.filter(r => r.id !== action.id);
      // Berechne neue totalCount basierend auf Listen-Count + verbleibende manuelle Empfänger
      const currentListCount = state.draft.recipients.listIds.length > 0 ? (state.draft.recipients.totalCount - state.draft.recipients.manual.length) : 0;
      return {
        ...state,
        draft: {
          ...state.draft,
          recipients: {
            ...state.draft.recipients,
            manual: filteredManualRecipients,
            totalCount: currentListCount + filteredManualRecipients.length
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

    case 'SET_LAST_SAVED':
      return {
        ...state,
        lastSaved: action.timestamp
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
  const { currentOrganization } = useOrganization();
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
  }, [state.currentStep, state.draft]);

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
                         (state.draft.sender.type === 'manual' && !!state.draft.sender.manual?.name && !!state.draft.sender.manual?.email);
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

  // ENTFERNT: Automatische Validierung bei Step 2
  // Der folgende useEffect wurde entfernt, da er die Validierung
  // automatisch beim Laden von Step 2 auslöste

  // ANGEPASST: Auto-Save Logik mit direktem emailComposerService
  const autoSaveDraft = useCallback(async () => {
    if (!DEFAULT_COMPOSER_CONFIG.autoSave.enabled || state.isSaving) return;
    if (!user) return; // Stelle sicher, dass User eingeloggt ist

    dispatch({ type: 'SET_SAVING', isSaving: true });
    
    try {
      emailLogger.debug('Auto-saving draft', { campaignId: campaign.id });
      
      // ANGEPASST: Nutze direkt den emailComposerService (client-side)
      const result = await emailComposerService.saveDraft(
        campaign.id!,
        state.draft,
        user.uid,
        currentOrganization?.id || user.uid // organizationId aus Context
      );
      
      if (result.success) {
        emailLogger.draftSaved(campaign.id);
        dispatch({ type: 'SET_LAST_SAVED', timestamp: new Date() });
      }
    } catch (error) {
      emailLogger.error('Auto-save failed', { campaignId: campaign.id, error: error.message });
      dispatch({ type: 'SET_ERROR', field: 'autoSave', error: 'Automatisches Speichern fehlgeschlagen' });
    } finally {
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  }, [campaign.id, state.draft, state.isSaving, user]);

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

  // ANGEPASST: Lade existierenden Draft beim Mount mit direktem Service
  useEffect(() => {
    const loadDraft = async () => {
      dispatch({ type: 'SET_LOADING', isLoading: true });
      
      try {
        emailLogger.debug('Loading draft for campaign', { campaignId: campaign.id });
        
        // ANGEPASST: Nutze direkt den emailComposerService (client-side)
        const draftDoc = await emailComposerService.loadDraft(campaign.id!);
        
        if (draftDoc) {
          dispatch({ type: 'LOAD_DRAFT', draft: draftDoc.content });
          emailLogger.debug('Draft loaded successfully', { campaignId: campaign.id });
        } else {
          emailLogger.debug('No existing draft found', { campaignId: campaign.id });
        }
      } catch (error) {
        emailLogger.error('Failed to load draft', { campaignId: campaign.id, error: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    };

    if (user && campaign.id) {
      loadDraft();
    }
  }, [campaign.id, user]);

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
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
          <p className="mt-4 text-gray-600">Lade E-Mail-Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Progress - OHNE Close Button */}
      <div className="border-b px-6 py-4">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">E-Mail-Versand: {campaign.title}</h2>
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
                <svg className={`animate-spin ${ICON_SIZES.sm} text-gray-400`} fill="none" viewBox="0 0 24 24">
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
                onClick={() => {
                  const validation = validateStep(state.currentStep);
                  if (validation.isValid) {
                    navigateToStep((state.currentStep + 1) as ComposerStep);
                  } else {
                    dispatch({ 
                      type: 'SET_VALIDATION', 
                      step: state.currentStep, 
                      validation 
                    });
                  }
                }}
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