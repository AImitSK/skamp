// src/types/email-enhanced.ts
import { Timestamp } from 'firebase/firestore';

// BaseEntity definition (falls nicht aus international.ts verfügbar)
export interface BaseEntity {
  id?: string;
  organizationId: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

// E-Mail-Adresse Entität
export interface EmailAddress extends BaseEntity {
  // Identifikation
  email: string; // vollständige Adresse: presse@domain.de
  localPart: string; // "presse"
  domainId: string; // Referenz zur verifizierten Domain
  domain?: EmailDomain; // Populated
  
  // Konfiguration
  displayName: string; // "Pressestelle ABC GmbH"
  isActive: boolean;
  isDefault: boolean;
  
  // Erweitert: E-Mail-Aliasing
  aliasType?: 'specific' | 'catch-all' | 'pattern';
  aliasPattern?: string; // z.B. "pr-*" für pr-2024@, pr-sommer@
  
  // Signatur
  signatureId?: string;
  signature?: EmailSignature; // Populated
  
  // Inbox Settings
  inboxEnabled: boolean;
  autoReply?: string;
  forwardTo?: string[]; // Weiterleitung an andere Adressen
  
  // Auto-Routing Regeln
  routingRules?: Array<{
    id: string;
    name: string;
    conditions: {
      subject?: string; // Contains
      from?: string; // Email oder Domain
      keywords?: string[];
    };
    actions: {
      assignTo?: string[]; // User IDs
      addTags?: string[];
      setPriority?: 'low' | 'normal' | 'high';
      autoReply?: string; // Template ID
    };
  }>;
  
  // Team-Zuweisungen (für Agenturen)
  assignedUserIds: string[]; // Team-Mitglieder
  clientId?: string; // Wenn kundenspezifisch
  clientName?: string; // "Kunde ABC GmbH"
  
  // Berechtigungen
  permissions: {
    read: string[]; // User IDs die lesen dürfen
    write: string[]; // User IDs die antworten dürfen
    manage: string[]; // User IDs die verwalten dürfen
  };
  
  // Statistiken
  lastUsedAt?: Timestamp;
  emailsSent?: number;
  emailsReceived?: number;
  
  // KI-Einstellungen (nutzt vorhandene Gemini Integration)
  aiSettings?: {
    enabled: boolean;
    autoSuggest: boolean;
    autoCategorize: boolean;
    preferredTone?: 'formal' | 'modern' | 'technical' | 'startup';
    customPromptContext?: string; // Zusätzlicher Kontext für KI
  };
}

// E-Mail Domain
export interface EmailDomain {
  id: string;
  name: string;
  verified: boolean;
  verifiedAt?: Timestamp;
  dnsRecords?: {
    mx?: boolean;
    spf?: boolean;
    dkim?: boolean;
    dmarc?: boolean;
  };
}

// E-Mail Signatur
export interface EmailSignature extends BaseEntity {
  name: string;
  content: string; // HTML
  isDefault: boolean;
  
  // Zuordnungen
  emailAddressIds: string[]; // Welche E-Mail-Adressen nutzen diese Signatur
  
  // Variablen
  variables: {
    includeUserName?: boolean;
    includeUserTitle?: boolean;
    includeCompanyName?: boolean;
    includePhone?: boolean;
    includeWebsite?: boolean;
    includeSocialLinks?: boolean;
  };
  
  // Templates für verschiedene Kontexte
  variants?: Array<{
    id: string;
    name: string;
    condition: 'first-contact' | 'reply' | 'follow-up';
    content: string;
  }>;
}

// Email Templates für häufige Antworten
export interface EmailTemplate extends BaseEntity {
  name: string;
  category: 'response' | 'follow-up' | 'thank-you' | 'decline' | 'custom';
  subject: string;
  content: string; // Mit Merge-Tags: {{contact.firstName}}, {{campaign.title}}
  
  // Kontext-basierte Aktivierung
  triggers?: {
    type: 'manual' | 'auto-suggest';
    conditions?: {
      intentType?: string[]; // Für KI-Integration
      keywords?: string[];
      sentiment?: 'positive' | 'negative' | 'neutral';
    };
  };
  
  // Verwendungs-Statistiken
  usageCount?: number;
  lastUsedAt?: Timestamp;
  successRate?: number; // Basierend auf Antworten
}

// E-Mail Nachricht
export interface EmailMessage extends BaseEntity {
  // Eindeutige Identifikatoren
  messageId: string; // E-Mail Message-ID Header
  threadId?: string; // Für Konversations-Gruppierung
  
  // Empfänger/Absender
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  cc?: EmailAddressInfo[];
  bcc?: EmailAddressInfo[];
  replyTo?: EmailAddressInfo;
  
  // Inhalt
  subject: string;
  textContent: string;
  htmlContent?: string;
  snippet: string; // Vorschau-Text
  
  // Anhänge
  attachments?: EmailAttachment[];
  
  // Metadaten
  receivedAt: Timestamp;
  sentAt?: Timestamp;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDraft: boolean;
  
  // Kategorisierung
  labels: string[];
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  importance: 'low' | 'normal' | 'high';
  
  // Verknüpfungen
  campaignId?: string;
  contactId?: string;
  emailAccountId: string;
  
  // SendGrid Spezifisch
  sendgridEventId?: string;
  spamScore?: number;
  spamReport?: string;
  
  // Erweiterte Eigenschaften
  headers?: Record<string, string>;
  inReplyTo?: string;
  references?: string[];
}

// E-Mail Adress-Info
export interface EmailAddressInfo {
  email: string;
  name?: string;
}

// E-Mail Anhang
export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  inline?: boolean;
  contentId?: string;
}

// E-Mail Thread
export interface EmailThread extends BaseEntity {
  subject: string;
  participants: EmailAddressInfo[];
  lastMessageAt: Timestamp;
  messageCount: number;
  unreadCount: number;
  
  // Erste und letzte Nachricht für Vorschau
  firstMessageId?: string;
  lastMessageId?: string;
  
  // Verknüpfungen
  campaignId?: string;
  contactIds: string[];
  
  // Erweiterte Thread-Zuordnung
  threadingStrategy?: 'headers' | 'subject' | 'ai-semantic' | 'manual';
  confidence?: number; // 0-100, wie sicher die Zuordnung ist
  
  // Thread-Status
  status?: 'active' | 'waiting' | 'resolved' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // SLA Tracking
  sla?: {
    firstResponseDue?: Timestamp;
    resolutionDue?: Timestamp;
    responded?: boolean;
    respondedAt?: Timestamp;
  };
  
  // KI-Analyse (nutzt vorhandene Gemini Integration)
  aiAnalysis?: {
    intent?: 'question' | 'interest' | 'complaint' | 'request-material' | 'other';
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics?: string[];
    suggestedActions?: string[];
    analyzedAt?: Timestamp;
    generatedBy?: 'gemini'; // Tracking welche KI verwendet wurde
  };
}

// E-Mail Account
export interface EmailAccount extends BaseEntity {
  email: string;
  displayName: string;
  domain: string;
  
  // Konfiguration
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  
  // SendGrid Inbound Parse
  inboundWebhookUrl?: string;
  inboundDomain?: string;
  
  // Signatur
  signature?: string;
}

// Analytics Typen
export interface EmailAnalytics {
  // Response-Zeit Tracking
  responseMetrics: {
    averageFirstResponse: number; // in Millisekunden
    averageResolution: number; // in Millisekunden
    byTeamMember: Record<string, {
      assigned: number;
      responded: number;
      avgResponseTime: number; // in Millisekunden
    }>;
  };
  
  // Volume Metrics
  volumeMetrics: {
    received: number;
    sent: number;
    byEmailAddress: Record<string, number>;
    byClient: Record<string, number>;
  };
  
  // KI-Nutzung (Gemini Tracking)
  aiMetrics: {
    suggestionsGenerated: number;
    suggestionsUsed: number;
    averageQuality: number; // User-Feedback
    byIntentType: Record<string, number>;
  };
}

// Audit Log
export interface EmailAuditLog extends BaseEntity {
  emailMessageId: string;
  
  // Alle Aktionen protokollieren
  actions: Array<{
    userId: string;
    userName: string;
    action: 'view' | 'reply' | 'forward' | 'delete' | 'assign' | 'tag' | 'ai-generate';
    timestamp: Timestamp;
    metadata?: {
      assignedTo?: string[];
      tags?: string[];
      forwardedTo?: string[];
      aiModel?: 'gemini'; // Track KI-Nutzung
      aiPrompt?: string; // Für Audit
    };
  }>;
  
  // DSGVO Compliance
  dataRetention: {
    scheduledDeletion?: Timestamp;
    retentionReason?: string;
    legalHold?: boolean;
  };
  
  // Export-Historie
  exports: Array<{
    exportedBy: string;
    exportedAt: Timestamp;
    format: 'pdf' | 'eml' | 'json';
    reason: string;
  }>;
}

// KI-Analyse Ergebnis
export interface EmailAnalysisResult {
  intent: 'question' | 'interest' | 'complaint' | 'request-material' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  topics: string[];
  entities: Array<{
    type: 'person' | 'organization' | 'date' | 'deadline';
    value: string;
    confidence: number;
  }>;
  suggestedActions: string[];
  suggestedTemplates?: string[]; // Template IDs
}

// Form Types für UI
export interface EmailAddressFormData {
  localPart: string;
  domainId: string;
  displayName: string;
  aliasType: 'specific' | 'catch-all' | 'pattern';
  isActive: boolean;
  inboxEnabled: boolean;
  assignedUserIds: string[];
  clientName: string;
  aiEnabled: boolean;
  autoSuggest: boolean;
  autoCategorize: boolean;
  preferredTone: 'formal' | 'modern' | 'technical' | 'startup';
}

export interface EmailTemplateFormData {
  name: string;
  category: 'response' | 'follow-up' | 'thank-you' | 'decline' | 'custom';
  subject: string;
  content: string;
}

export interface EmailSignatureFormData {
  name: string;
  content: string;
  isDefault: boolean;
  includeUserName: boolean;
  includeUserTitle: boolean;
  includeCompanyName: boolean;
  includePhone: boolean;
  includeWebsite: boolean;
  includeSocialLinks: boolean;
}