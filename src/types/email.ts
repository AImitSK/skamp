// src/types/email.ts
export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[]; // z.B. ['firstName', 'companyName', 'pressReleaseTitle']
  type: 'pr_campaign' | 'follow_up' | 'thank_you';
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface EmailSendRequest {
  to: EmailRecipient[];
  templateId?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
  variables?: Record<string, string>;
  trackingSettings?: {
    clickTracking: boolean;
    openTracking: boolean;
  };
}

export interface EmailRecipient {
  email: string;
  name: string;
  substitutions?: Record<string, string>; // Personalisierung pro Empfänger
}

export interface EmailAttachment {
  content: string; // base64
  filename: string;
  type: string; // MIME type
  disposition: 'attachment' | 'inline';
  contentId?: string; // für inline images
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  status: 'sent' | 'failed' | 'queued';
  error?: string;
}

export interface EmailCampaignSend {
  id?: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  messageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sentAt?: any;
  deliveredAt?: any;
  openedAt?: any;
  clickedAt?: any;
  errorMessage?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

// Für die Kampagnen-Integration
export interface PRCampaignEmail {
  subject: string;
  greeting: string; // "Liebe Frau Müller" / "Hallo Herr Schmidt"
  introduction: string; // Kurze Einleitung
  pressReleaseHtml: string; // Die eigentliche Pressemitteilung
  closing: string; // Schluss-Grußformel
  signature: string; // Signatur
  attachments?: EmailAttachment[];
}

// Template-Variablen für Personalisierung
export interface TemplateVariables {
  // Empfänger-Daten
  firstName: string;
  lastName: string;
  fullName: string;
  title?: string; // Position
  
  // Firma-Daten  
  companyName?: string;
  outlet?: string; // Medienhaus-Name
  
  // Kampagnen-Daten
  pressReleaseTitle: string;
  campaignTitle: string;
  
  // Absender-Daten
  senderName: string;
  senderTitle: string;
  senderCompany: string;
  senderPhone?: string;
  senderEmail?: string;
  
  // Datum
  currentDate: string;
  
  // Custom Fields
  [key: string]: string | undefined;
}

// Für das UI
export interface EmailPreview {
  to: EmailRecipient;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: TemplateVariables;
}