// src/types/email.ts (ERWEITERT für Analytics)
import { Timestamp } from 'firebase/firestore';

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

// ERWEITERT: Zusätzliche Tracking-Felder für Analytics & Monitoring
export interface EmailCampaignSend {
  id?: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  messageId?: string;

  // Status-Tracking
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

  // Zeitstempel für jeden Status
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  bouncedAt?: Timestamp;
  failedAt?: Timestamp;

  // Engagement-Metriken
  openCount?: number;          // Wie oft geöffnet
  clickCount?: number;         // Wie oft geklickt
  lastOpenedAt?: Timestamp;    // Letztes Öffnen
  lastClickedAt?: Timestamp;   // Letzter Klick
  lastClickedUrl?: string;     // Letzter geklickter Link

  // Technical Information für Insights
  lastUserAgent?: string;      // Browser/Gerät
  lastIpAddress?: string;      // IP-Adresse

  // Error/Bounce Details
  errorMessage?: string;
  bounceReason?: string;
  deferredAt?: Timestamp;      // Temporäre Verzögerung
  deferredReason?: string;

  // Event-Tracking
  lastEventAt?: Timestamp;     // Letztes Event von SendGrid

  // MONITORING-ERWEITERUNG (Phase 1)
  publishedStatus?: 'not_published' | 'published' | 'pending' | 'declined';
  publishedAt?: Timestamp;

  // Clipping-Verknüpfung
  clippingId?: string;

  // Quick-Daten (denormalisiert für Performance)
  articleUrl?: string;
  articleTitle?: string;
  reach?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  publicationNotes?: string;

  // Manuelles Tracking
  manuallyMarkedPublished?: boolean;
  markedPublishedBy?: string;
  markedPublishedAt?: Timestamp;

  userId: string;
  organizationId?: string;     // NEU: Für Multi-Tenancy Support
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

// NEU: Analytics-spezifische Types
export interface EmailEngagementSummary {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface EmailEngagementTrend {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface TopPerformingEmail {
  campaignId: string;
  campaignTitle: string;
  recipientEmail: string;
  openCount: number;
  clickCount: number;
  lastEngagement: Date;
}

// Datentypen für die API
interface SendPRCampaignRequest {
  recipients: Array<{
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  }>;
  campaignEmail: {
    subject: string;
    greeting: string;
    introduction: string;
    pressReleaseHtml: string;
    closing: string;
    signature: string;
  };
  senderInfo: {
    name: string;
    title: string;
    company: string;
    phone?: string;
    email?: string;
  };
  mediaShareUrl?: string; // NEU: Optional media share URL
}