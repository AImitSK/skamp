// src/types/inbox-enhanced.ts
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

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  inline?: boolean;
  contentId?: string;
}

// Hauptentitäten erweitern BaseEntity
export interface EmailMessage extends BaseEntity {
  // Eindeutige Identifikatoren
  messageId: string; // E-Mail Message-ID Header
  threadId?: string; // Für Konversations-Gruppierung
  
  // Empfänger/Absender
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  
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
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

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
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

export interface EmailThread extends BaseEntity {
  subject: string;
  participants: EmailAddress[];
  lastMessageAt: Timestamp;
  messageCount: number;
  unreadCount: number;
  
  // Erste und letzte Nachricht für Vorschau
  firstMessageId?: string;
  lastMessageId?: string;
  
  // Verknüpfungen
  campaignId?: string;
  contactIds: string[];
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}