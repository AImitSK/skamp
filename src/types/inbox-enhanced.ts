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

// NEU Phase 1: Folder Type für Kunden/Kampagnen-Organisation
export type FolderType = 'customer' | 'campaign' | 'general';

// NEU Phase 2B: Team Member für Zuweisungen
export interface TeamMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  avatar?: string;
  role?: 'owner' | 'admin' | 'member';
}

// NEU Phase 2B: AI-Entity für intelligente Erkennung
export interface AIEntity {
  type: 'person' | 'company' | 'product' | 'location' | 'date' | 'money';
  name: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

// NEU Phase 2B: Interne Notizen für Team-Kollaboration
export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions?: string[]; // @mentions für Team-Mitglieder
  isPrivate: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// NEU Phase 2B: Assignment History für Nachverfolgung
export interface AssignmentHistory {
  id: string;
  assignedTo?: string;
  assignedBy: string;
  assignedAt: Timestamp;
  previousAssignee?: string;
  reason?: string;
}

// NEU Phase 4: AI Analysis für intelligente E-Mail-Verarbeitung
export interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: number; // 1-10 Skala
  language: string;
  topics: string[];
  entities: AIEntity[];
  intent: 'support' | 'sales' | 'information' | 'complaint' | 'spam' | 'other';
  suggestedActions: string[];
  confidence: number;
  processedAt: Timestamp;
  generatedBy: string; // AI-Model Name
};

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
  campaignName?: string; // NEU Phase 1: Kampagnen-Name für Anzeige
  contactId?: string;
  emailAccountId: string;
  
  // NEU Phase 1: Kunden/Kampagnen-Organisation
  customerId?: string;
  customerName?: string;
  customerDomain?: string; // NEU: Für Domain-Matching
  folderType?: FolderType;
  
  // NEU Phase 2B: Team & Status
  assignedTo?: string; // Team-Mitglied User-ID
  assignedTeamMember?: TeamMember;
  status?: 'new' | 'in-progress' | 'waiting-response' | 'resolved' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // NEU Phase 4: AI & Automation
  aiCategory?: string; // KI-Kategorisierung
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  aiUrgency?: number; // 1-10 Skala
  aiSummary?: string; // KI-Zusammenfassung
  aiProcessed?: boolean;
  aiLanguage?: string;
  aiTopics?: string[];
  aiEntities?: AIEntity[];
  
  // NEU Phase 2B: Team Features
  internalNotes?: InternalNote[];
  assignmentHistory?: AssignmentHistory[];
  
  // NEU Phase 2B: Tracking
  responseTime?: number; // Antwortzeit in Stunden
  resolutionTime?: number; // Auflösungszeit in Stunden
  lastActivity?: Timestamp;
  
  // NEU Phase 2B: Flags
  isVip?: boolean; // VIP-Kunde
  needsTranslation?: boolean; // Übersetzung erforderlich
  hasAttachments?: boolean;
  
  // NEU Phase 2A: Signatur-Verknüpfung
  signatureId?: string;
  
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
  campaignName?: string; // NEU Phase 1: Kampagnen-Name für Anzeige
  contactIds: string[];
  
  // NEU Phase 1: Kunden/Kampagnen-Organisation
  customerId?: string;
  customerName?: string;
  customerDomain?: string; // NEU: Für Domain-Matching
  folderType: FolderType;
  
  // NEU TEAM-FOLDER-SYSTEM: Multi-Location Support  
  folderAssignments?: EmailThreadFolder[]; // Thread kann in mehreren Ordnern sein
  primaryFolderId?: string; // Haupt-Ordner (meist "Allgemeine Anfragen")
  
  // NEU Phase 2B: Thread-Status für bessere Organisation
  status?: 'active' | 'waiting' | 'resolved' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // NEU Phase 2B: Team Assignment
  assignedTo?: string[]; // Multi-Assignment möglich
  assignedTeamMembers?: TeamMember[];
  assignedAt?: Timestamp;
  assignedBy?: string;
  
  // NEU TEAM-FOLDER-SYSTEM: Erweiterte Team-Features
  assignedToUserId?: string; // Primär zugewiesenes Team-Mitglied
  assignedToUserName?: string; // Display-Name für UI
  autoAssignedTo?: string; // Automatisch zugewiesen durch Regeln
  autoAssignReason?: string; // "Domain-Match: kunde.de"
  
  // NEU TEAM-FOLDER-SYSTEM: Workflow
  isInPersonalFolder?: boolean; // Liegt in persönlichem Team-Ordner
  sharedWithTeam?: boolean; // Mit Team geteilt (immer true für "Allgemeine Anfragen")
  needsAttention?: boolean; // Aufmerksamkeit erforderlich
  
  // NEU Phase 4: AI & Automation
  aiAnalysis?: AIAnalysis;
  aiCategory?: string; // KI-Kategorisierung
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  aiUrgency?: number; // 1-10 Skala
  aiSummary?: string; // KI-Zusammenfassung
  
  // NEU Phase 2B: Tracking
  responseTime?: number; // Antwortzeit in Stunden
  resolutionTime?: number; // Auflösungszeit
  lastActivity?: Timestamp;
  
  // NEU Phase 2B: Flags
  isVip?: boolean; // VIP-Kunde
  needsTranslation?: boolean; // Übersetzung erforderlich
  
  // NEU Phase 2B: Threading Strategy
  threadingStrategy?: 'headers' | 'subject' | 'ai-semantic' | 'manual';
  confidence?: number; // Thread-Matching Confidence
  
  // NEU Phase 2B: Normalisierter Subject für besseres Matching
  normalizedSubject?: string;
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

// NEU Phase 2B: Customer Match Result für intelligente Zuordnung
export interface CustomerMatchResult {
  customerId?: string;
  customerName?: string;
  confidence: number;
  matchType: 'domain' | 'email' | 'name' | 'campaign' | 'manual';
  isVip: boolean;
  suggestedAssignments?: string[];
  campaignId?: string;
  campaignName?: string;
}

// NEU Phase 2B: Smart Folder für dynamische Organisation
export interface SmartFolder {
  id: string;
  name: string;
  type: 'customer' | 'campaign' | 'team' | 'status' | 'custom';
  filters: {
    customerId?: string;
    campaignId?: string;
    assignedTo?: string;
    status?: string;
    priority?: string;
    isVip?: boolean;
    dateRange?: {
      start: Timestamp;
      end: Timestamp;
    };
  };
  color?: string;
  icon?: string;
  count?: number;
  organizationId: string;
  isSystem?: boolean; // System-Ordner vs. Benutzer-definiert
}

// NEU Phase 3: Notification für Team-Benachrichtigungen
export interface EmailNotification {
  id: string;
  recipientUserId: string;
  type: 'assignment' | 'mention' | 'status_change' | 'new_message' | 'overdue';
  title: string;
  message: string;
  relatedEmailId?: string;
  relatedThreadId?: string;
  isRead: boolean;
  createdAt: Timestamp;
  organizationId: string;
}

// NEU Phase 4: Email Template für Antwort-Vorschläge
export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  htmlContent?: string;
  textContent: string;
  category: 'support' | 'sales' | 'marketing' | 'follow-up' | 'general';
  language: string;
  variables?: string[]; // {{customerName}}, {{campaignName}}, etc.
  usageCount?: number;
  isDefault?: boolean;
  organizationId: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// NEU Phase 4: Response Suggestion von AI
export interface ResponseSuggestion {
  id: string;
  originalEmailId: string;
  suggestedSubject?: string;
  suggestedContent: string;
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  templateId?: string;
  confidence: number;
  language: string;
  generatedAt: Timestamp;
  generatedBy: string; // AI Model
}

// NEU Phase 5: Email Automation Rule
export interface EmailAutomationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  
  // Trigger-Bedingungen
  triggers: {
    fromDomain?: string[];
    fromEmail?: string[];
    subjectContains?: string[];
    bodyContains?: string[];
    hasAttachments?: boolean;
    sentimentIs?: 'positive' | 'neutral' | 'negative';
    urgencyLevel?: number; // >= level
  };
  
  // Aktionen
  actions: {
    assignTo?: string;
    addLabels?: string[];
    setPriority?: 'low' | 'normal' | 'high' | 'urgent';
    setStatus?: 'new' | 'in-progress' | 'waiting-response' | 'resolved';
    sendAutoReply?: {
      templateId: string;
      delay?: number; // Minuten
    };
    forwardTo?: string[];
    markAsVip?: boolean;
  };
  
  organizationId: string;
  createdBy: string;
  createdAt: Timestamp;
  lastExecuted?: Timestamp;
  executionCount?: number;
}

// ============================================================================
// TEAM-FOLDER-SYSTEM - NEUE ENTITÄTEN
// ============================================================================

// Auto-Assignment Regel für intelligente Ordner-Zuweisung
export interface AutoAssignRule {
  id: string;
  type: 'domain' | 'keyword' | 'sender' | 'subject' | 'content';
  pattern: string; // Email-Domain, Keyword, etc.
  isActive: boolean;
  priority: number; // 1 = höchste Priorität
  confidence?: number; // Erforderliche Mindest-Confidence
}

// Team-Ordner Hauptentität
export interface TeamFolder extends BaseEntity {
  // Grundlegende Info
  name: string;
  description?: string;
  icon?: string; // Emoji oder Icon-Name
  color?: string; // Hex-Color für UI
  
  // Besitzer & Hierarchie
  ownerId: string; // Team-Member ID (oder "system" für System-Ordner)
  ownerName: string; // Display-Name für UI
  parentFolderId?: string; // Für Unterordner-Struktur
  level: number; // 0 = Root, 1 = Sub, etc. (max 3)
  path: string[]; // ["Stefan", "Kundenprojekte"] für Breadcrumbs
  
  // Berechtigungen
  isShared: boolean; // Mit anderen Team-Mitgliedern teilen?
  sharedWithUserIds?: string[]; // Spezifische User-IDs mit Zugriff
  isSystem: boolean; // System-Ordner (nicht löschbar/editierbar)
  
  // Auto-Assignment Regeln
  autoAssignRules?: AutoAssignRule[];
  
  // Statistiken (für UI)
  emailCount: number; // Gesamt-E-Mails in diesem Ordner
  unreadCount: number; // Ungelesene E-Mails
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

// Verknüpfung zwischen E-Mail-Thread und Ordnern (Multi-Location Support)
export interface EmailThreadFolder extends BaseEntity {
  threadId: string; // Verweis auf EmailThread
  folderId: string; // Verweis auf TeamFolder
  folderPath: string[]; // Cached path für Performance ["Allgemein", "Stefan", "Kundenprojekte"]
  
  // Meta-Info
  assignedBy?: string; // User-ID wer verschoben hat
  assignedAt: Timestamp; // Wann verschoben
  isOriginalLocation: boolean; // True für "Allgemeine Anfragen"
  isPrimaryLocation: boolean; // Haupt-Standort des Threads
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt, createdBy, updatedBy
}

// Hierarchische Ordner-Struktur für UI
export interface FolderTreeNode {
  folder: TeamFolder;
  children: FolderTreeNode[];
  depth: number;
  isExpanded?: boolean;
  hasUnread?: boolean;
}

// Ergebnis der Auto-Assignment Engine
export interface AssignmentResult {
  folderId: string;
  folderPath: string[];
  reason: string; // "Domain-Match: kunde.de"
  confidence: number; // 0.0 - 1.0
  priority: number; // 1 = höchste
  ruleType: 'domain' | 'keyword' | 'sender' | 'subject' | 'content' | 'ai' | 'manual';
}

// Smart Folder Suggestion für UI
export interface FolderSuggestion {
  folderId: string;
  folderName: string;
  folderPath: string[];
  reason: string;
  confidence: number;
  canApply: boolean; // User hat Berechtigung?
}

// Ordner-Performance Statistiken
export interface FolderStats {
  folderId: string;
  folderName: string;
  totalEmails: number;
  newEmails: number;
  inProgressEmails: number;
  resolvedEmails: number;
  avgResponseTime: number; // Stunden
  assignedToUser?: string;
  lastActivity: Timestamp;
}

// Team-Member Ordner-Übersicht
export interface TeamMemberFolderSummary {
  userId: string;
  userName: string;
  totalFolders: number;
  totalEmails: number;
  unreadEmails: number;
  avgResponseTime: number;
  folders: FolderStats[];
}