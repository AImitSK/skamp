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
  ManualRecipient
} from '@/types/email-composer';
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
  | { type: 'UPDATE_EMAIL_ADDRESS'; emailAddressId: string }
  | { type: 'UPDATE_METADATA'; metadata: Partial<EmailDraft['metadata']> }
  | { type: 'UPDATE_SCHEDULING'; scheduling: EmailDraft['scheduling'] }
  | { type: 'SET_VALIDATION'; step: ComposerStep; validation: StepValidation[`step${ComposerStep}`] }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
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

    case 'UPDATE_EMAIL_ADDRESS':
      return {
        ...state,
        draft: {
          ...state.draft,
          emailAddressId: action.emailAddressId,
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

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      };

    case 'CLEAR_ERROR':
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };

    case 'RESET_DRAFT':
      return createInitialState(state.draft.campaignId, state.draft.campaignTitle);

    default:
      return state;
  }
}

// Initiale State-Factory
function createInitialState(campaignId: string, campaignTitle: string): EmailComposerState {
  // Vorausgefüllter E-Mail-Text mit sinnvollen Variablen
  const defaultEmailContent = `<p>{{salutationFormal}} {{title}} {{firstName}} {{lastName}},</p>
<p>ich freue mich, Ihnen unsere aktuelle Pressemitteilung "${campaignTitle}" zukommen zu lassen.</p>
<p>Die Mitteilung dürfte für Ihre Leserschaft von besonderem Interesse sein, da sie wichtige Entwicklungen aufzeigt.</p>
<p>Gerne stehe ich Ihnen für Rückfragen, weitere Informationen oder ein persönliches Gespräch zur Verfügung. Bildmaterial sowie ergänzende Unterlagen finden Sie anbei.</p>
<p>Über eine Veröffentlichung würde ich mich sehr freuen.</p>`;

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
      emailAddressId: '', // Wird von EmailAddressSelector auto-selected
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
  // ✅ PIPELINE-PROPS HINZUGEFÜGT (Plan 4/9)
  projectMode?: boolean;        // Pipeline-Modus aktiviert?
  onPipelineComplete?: (campaignId: string) => void;  // Pipeline-Callback
}

export default function EmailComposer({ 
  campaign, 
  onClose, 
  onSent,
  projectMode = false,
  onPipelineComplete
}: EmailComposerProps) {
  const [state, dispatch] = useReducer(
    composerReducer,
    { campaignId: campaign.id!, campaignTitle: campaign.title },
    ({ campaignId, campaignTitle }) => createInitialState(campaignId, campaignTitle)
  );

  // ✅ PIPELINE-STATE HINZUGEFÜGT (Plan 4/9)
  const [pipelineDistribution, setPipelineDistribution] = useState<boolean>(false);
  const [autoTransitionAfterSend, setAutoTransitionAfterSend] = useState<boolean>(false);

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
        const hasEmailAddress = !!state.draft.emailAddressId;
        const hasSubject = state.draft.metadata.subject.length >= DEFAULT_COMPOSER_CONFIG.validation.minSubjectLength;

        return {
          isValid: hasRecipients && hasEmailAddress && hasSubject,
          errors: {
            recipients: !hasRecipients ? 'Mindestens ein Empfänger erforderlich' : undefined,
            emailAddress: !hasEmailAddress ? 'Absender-Email muss ausgewählt werden' : undefined,
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


  // ✅ PIPELINE-INITIALISIERUNG HINZUGEFÜGT (Plan 4/9)
  useEffect(() => {
    if (projectMode && campaign.projectId && campaign.pipelineStage === 'distribution') {
      setPipelineDistribution(true);
      setAutoTransitionAfterSend(true);
      
      // Pre-populate mit Projekt-Daten wenn vorhanden
      if (campaign.distributionConfig) {
        dispatch({ 
          type: 'UPDATE_METADATA', 
          metadata: {
            ...state.draft.metadata,
            subject: campaign.distributionConfig.emailSubject || state.draft.metadata.subject,
            preheader: campaign.distributionConfig.emailPreheader || state.draft.metadata.preheader || ''
          }
        });

        if (campaign.distributionConfig.distributionLists.length > 0) {
          dispatch({
            type: 'UPDATE_RECIPIENTS',
            recipients: {
              ...state.draft.recipients,
              listIds: campaign.distributionConfig.distributionLists,
              listNames: campaign.distributionConfig.distributionLists.map(id => `Liste ${id}`), // Fallback
              totalCount: campaign.distributionConfig.manualRecipients.length
            }
          });
        }

        if (campaign.distributionConfig.manualRecipients.length > 0) {
          // Konvertiere Distribution Recipients zu Manual Recipients
          campaign.distributionConfig.manualRecipients.forEach(recipient => {
            dispatch({
              type: 'ADD_MANUAL_RECIPIENT',
              recipient: {
                id: `${recipient.email}-${Date.now()}`,
                firstName: recipient.firstName || '',
                lastName: recipient.lastName || '',
                email: recipient.email,
                companyName: recipient.companyName || '',
                isValid: true
              }
            });
          });
        }
      }
    }
  }, [projectMode, campaign, state.draft.metadata, state.draft.recipients]);

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
    emailAddressId: state.draft.emailAddressId,
    metadata: state.draft.metadata,
    onRecipientsChange: (recipients: Partial<EmailDraft['recipients']>) =>
      dispatch({ type: 'UPDATE_RECIPIENTS', recipients }),
    onAddManualRecipient: (recipient: Omit<ManualRecipient, 'id'>) =>
      dispatch({ type: 'ADD_MANUAL_RECIPIENT', recipient: { ...recipient, id: nanoid() } }),
    onRemoveManualRecipient: (id: string) =>
      dispatch({ type: 'REMOVE_MANUAL_RECIPIENT', id }),
    onEmailAddressChange: (emailAddressId: string) =>
      dispatch({ type: 'UPDATE_EMAIL_ADDRESS', emailAddressId }),
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
    onSent,
    // ✅ PIPELINE-PROPS HINZUGEFÜGT (Plan 4/9)
    pipelineMode: pipelineDistribution,
    autoTransitionAfterSend,
    onPipelineComplete
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Progress - OHNE Close Button */}
      <div className="border-b px-6 py-4">
        <div className="mb-4">
          <h2 className="text-lg overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-bold">E-Mail-Versand:</span>{' '}
            <span className="font-normal">{campaign.title}</span>
          </h2>
        </div>

        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={navigateToStep}
        />
      </div>

      {/* ✅ PIPELINE-STATUS-BANNER HINZUGEFÜGT (Plan 4/9) */}
      {pipelineDistribution && (
        <div className="mx-6 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <p className="font-medium text-blue-900">
              Pipeline-Distribution für Projekt &ldquo;{campaign.projectTitle}&rdquo;
            </p>
          </div>
          <p className="text-sm text-blue-700">
            Nach erfolgreichem Versand wird das Projekt automatisch zur Monitoring-Phase weitergeleitet.
          </p>
          
          {campaign.distributionStatus && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                campaign.distributionStatus.status === 'sent' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                campaign.distributionStatus.status === 'failed' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                campaign.distributionStatus.status === 'sending' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 
                'bg-gray-50 text-gray-700 ring-gray-600/20'
              }`}>
                {campaign.distributionStatus.status === 'sent' ? 'Versendet' :
                 campaign.distributionStatus.status === 'failed' ? 'Fehler' :
                 campaign.distributionStatus.status === 'sending' ? 'Versende...' : 'Ausstehend'}
              </span>
              {campaign.distributionStatus.sentAt && (
                <span className="text-xs text-blue-600">
                  {new Date(campaign.distributionStatus.sentAt.toDate()).toLocaleString('de-DE')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {state.currentStep === 1 && <Step1Content {...step1Props} />}
        {state.currentStep === 2 && <Step2Details {...step2Props} />}
        {state.currentStep === 3 && <Step3Preview {...step3Props} />}
      </div>

      {/* Footer mit Navigation */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-end gap-3">
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
  );
}