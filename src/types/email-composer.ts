// src/types/email-composer.ts
import { Timestamp } from 'firebase/firestore';
import { PRCampaign } from './pr';
import { Contact } from './crm';

/**
 * Haupt-State für den 3-Stufen Email Composer
 */
export interface EmailComposerState {
  // Navigation
  currentStep: ComposerStep;
  completedSteps: Set<ComposerStep>;
  
  // Daten
  draft: EmailDraft;
  validation: StepValidation;
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  lastSaved?: Date;
  
  // Preview State
  previewContact?: Contact;
  isPreviewMode: boolean;
}

/**
 * Die drei Schritte des Composers
 */
export type ComposerStep = 1 | 2 | 3;

/**
 * Email-Entwurf Struktur
 */
export interface EmailDraft {
  // Kampagnen-Referenz
  campaignId: string;
  campaignTitle: string;
  
  // Stufe 1: Anschreiben verfassen
  content: {
    // Kombinierter Rich-Text Content (Begrüßung + Einleitung + Schluss)
    body: string; // HTML aus TipTap Editor
    
    // Extrahierte Teile für Variablen-Replacement
    sections?: {
      greeting?: string;    // z.B. "Sehr geehrte Frau {{firstName}}"
      introduction?: string;
      closing?: string;
    };
  };
  
  // Stufe 2: Versand-Details
  recipients: {
    // Verteilerlisten (Multi-List Support)
    listIds: string[];
    listNames: string[];
    
    // Manuell hinzugefügte Empfänger
    manual: ManualRecipient[];
    
    // Berechnete Werte
    totalCount: number;
    validCount: number;
  };
  
  sender: SenderInfo;
  
  metadata: {
    subject: string;
    preheader: string; // Vorschautext
  };
  
  // Stufe 3: Versand-Optionen
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  
  // Test-Versand Historie
  testSends?: TestSendRecord[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedStep?: ComposerStep;
}

/**
 * Manuell hinzugefügter Empfänger
 */
export interface ManualRecipient {
  id: string; // Temporäre ID für UI
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  isValid?: boolean;
  validationError?: string;
}

/**
 * Absender-Information
 */
export interface SenderInfo {
  type: 'contact' | 'manual';
  
  // Bei type === 'contact'
  contactId?: string;
  contactData?: {
    name: string;
    email: string;
    title?: string;
    company?: string;
    phone?: string;
  };
  
  // Bei type === 'manual'
  manual?: {
    name: string;
    email: string;
    title?: string;
    company?: string;
    phone?: string;
  };
}

/**
 * Test-Email Anfrage
 */
export interface TestEmailRequest {
  campaignId: string;
  recipientEmail: string;
  recipientName?: string;
  draft: EmailDraft;
  // Optional: Spezifischer Kontakt für Variablen-Preview
  previewContactId?: string;
}

/**
 * Test-Versand Protokoll
 */
export interface TestSendRecord {
  id: string;
  sentAt: Date;
  recipientEmail: string;
  status: 'success' | 'failed';
  error?: string;
  messageId?: string;
}

/**
 * Validierung pro Stufe
 */
export interface StepValidation {
  step1: {
    isValid: boolean;
    errors: {
      body?: string;
    };
  };
  step2: {
    isValid: boolean;
    errors: {
      recipients?: string;
      sender?: string;
      subject?: string;
      preheader?: string;
    };
  };
  step3: {
    isValid: boolean;
    errors: {
      scheduling?: string;
      testEmail?: string;
    };
  };
}

/**
 * Verfügbare Email-Variablen
 */
export interface EmailVariables {
  // Empfänger
  recipient: {
    firstName: string;
    lastName: string;
    fullName: string;
    companyName?: string;
    email: string;
  };
  
  // Absender
  sender: {
    name: string;
    title?: string;
    company?: string;
    phone?: string;
    email?: string;
  };
  
  // Kampagne
  campaign: {
    title: string;
    clientName?: string;
  };
  
  // System
  system: {
    currentDate: string;
    currentYear: string;
    mediaShareUrl?: string;
  };
}

/**
 * Variable Definition für UI
 */
export interface VariableDefinition {
  key: string;
  label: string;
  category: 'recipient' | 'sender' | 'campaign' | 'system';
  example: string;
  description?: string;
  isRequired?: boolean;
}

/**
 * Vordefinierte Variablen für die Anzeige
 */
export const EMAIL_VARIABLES: VariableDefinition[] = [
  // Empfänger
  {
    key: '{{firstName}}',
    label: 'Vorname',
    category: 'recipient',
    example: 'Max',
    description: 'Vorname des Empfängers'
  },
  {
    key: '{{lastName}}',
    label: 'Nachname',
    category: 'recipient',
    example: 'Mustermann',
    description: 'Nachname des Empfängers'
  },
  {
    key: '{{fullName}}',
    label: 'Vollständiger Name',
    category: 'recipient',
    example: 'Max Mustermann',
    description: 'Vor- und Nachname des Empfängers'
  },
  {
    key: '{{companyName}}',
    label: 'Firma',
    category: 'recipient',
    example: 'Musterfirma GmbH',
    description: 'Firma des Empfängers'
  },
  
  // Absender
  {
    key: '{{senderName}}',
    label: 'Absender Name',
    category: 'sender',
    example: 'Anna Schmidt',
    description: 'Name des Absenders'
  },
  {
    key: '{{senderTitle}}',
    label: 'Absender Position',
    category: 'sender',
    example: 'PR Manager',
    description: 'Position/Titel des Absenders'
  },
  {
    key: '{{senderCompany}}',
    label: 'Absender Firma',
    category: 'sender',
    example: 'PR Agentur Berlin',
    description: 'Firma des Absenders'
  },
  {
    key: '{{senderPhone}}',
    label: 'Absender Telefon',
    category: 'sender',
    example: '+49 30 12345678',
    description: 'Telefonnummer des Absenders'
  },
  {
    key: '{{senderEmail}}',
    label: 'Absender E-Mail',
    category: 'sender',
    example: 'anna.schmidt@pr-agentur.de',
    description: 'E-Mail des Absenders'
  },
  
  // System
  {
    key: '{{currentDate}}',
    label: 'Aktuelles Datum',
    category: 'system',
    example: '15. März 2024',
    description: 'Heutiges Datum (formatiert)',
    isRequired: true
  }
];

/**
 * Composer Konfiguration
 */
export interface ComposerConfig {
  // Feature Flags
  features: {
    allowManualRecipients: boolean;
    allowScheduling: boolean;
    allowTestEmails: boolean;
    maxManualRecipients: number;
    maxTestEmailsPerSession: number;
  };
  
  // Validierung
  validation: {
    minBodyLength: number;
    maxBodyLength: number;
    minSubjectLength: number;
    maxSubjectLength: number;
    maxPreheaderLength: number;
  };
  
  // Auto-Save
  autoSave: {
    enabled: boolean;
    intervalMs: number;
    debounceMs: number;
  };
}

/**
 * Default Konfiguration
 */
export const DEFAULT_COMPOSER_CONFIG: ComposerConfig = {
  features: {
    allowManualRecipients: true,
    allowScheduling: true,
    allowTestEmails: true,
    maxManualRecipients: 50,
    maxTestEmailsPerSession: 10
  },
  validation: {
    minBodyLength: 50,
    maxBodyLength: 50000,
    minSubjectLength: 5,
    maxSubjectLength: 150,
    maxPreheaderLength: 200
  },
  autoSave: {
    enabled: true,
    intervalMs: 30000, // 30 Sekunden
    debounceMs: 1000  // 1 Sekunde
  }
};

/**
 * Formular-Daten für API Calls
 */
export interface EmailComposerFormData {
  step1: {
    body: string;
  };
  step2: {
    listIds: string[];
    manualRecipients: Omit<ManualRecipient, 'id' | 'isValid' | 'validationError'>[];
    sender: SenderInfo;
    subject: string;
    preheader: string;
  };
  step3: {
    sendImmediately: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
    timezone?: string;
  };
}

/**
 * API Response Types
 */
export interface SaveDraftResponse {
  success: boolean;
  draftId?: string;
  error?: string;
  lastSaved?: Date;
}

export interface SendTestEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  preview?: {
    html: string;
    text: string;
    subject: string;
  };
}

export interface ScheduleEmailResponse {
  success: boolean;
  jobId?: string;
  scheduledFor?: Date;
  calendarEventId?: string;
  error?: string;
}

/**
 * Event Types für Analytics
 */
export type ComposerEvent = 
  | { type: 'step_completed'; step: ComposerStep; duration: number }
  | { type: 'draft_saved'; method: 'auto' | 'manual' }
  | { type: 'test_email_sent'; recipientEmail: string }
  | { type: 'campaign_scheduled'; scheduledFor: Date }
  | { type: 'campaign_sent'; recipientCount: number }
  | { type: 'variable_inserted'; variable: string }
  | { type: 'recipient_added'; method: 'list' | 'manual' }
  | { type: 'error'; step: ComposerStep; error: string };

/**
 * Helper Type Guards
 */
export const isContactSender = (sender: SenderInfo): sender is SenderInfo & { contactId: string } => {
  return sender.type === 'contact' && !!sender.contactId;
};

export const isManualSender = (sender: SenderInfo): sender is SenderInfo & { manual: NonNullable<SenderInfo['manual']> } => {
  return sender.type === 'manual' && !!sender.manual;
};

export const hasScheduling = (draft: EmailDraft): draft is EmailDraft & { scheduling: NonNullable<EmailDraft['scheduling']> } => {
  return !!draft.scheduling?.sendAt;
};

/**
 * Utility Types
 */
export type StepData<T extends ComposerStep> = 
  T extends 1 ? EmailComposerFormData['step1'] :
  T extends 2 ? EmailComposerFormData['step2'] :
  T extends 3 ? EmailComposerFormData['step3'] :
  never;

export type StepErrors<T extends ComposerStep> = 
  T extends 1 ? StepValidation['step1']['errors'] :
  T extends 2 ? StepValidation['step2']['errors'] :
  T extends 3 ? StepValidation['step3']['errors'] :
  never;