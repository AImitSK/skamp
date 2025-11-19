// src/types/inbox.ts
import { Timestamp } from 'firebase/firestore';
import { BaseEntity } from './international';

/**
 * Domain-Postfach - Ein Postfach pro Domain
 *
 * Verwendung:
 * - Weiterleitungen vom Kunden (optional)
 * - Archivierte Projekt-E-Mails
 * - Allgemeine Anfragen ohne Projekt-Bezug
 *
 * Beispiel:
 * - domain: "xyz.de" → inboxAddress: "xyz@inbox.sk-online-marketing.de"
 * - domain: "celeropress.com" → inboxAddress: "xyz-gmbh@inbox.sk-online-marketing.de" (Default Domain)
 */
export interface DomainMailbox extends BaseEntity {
  domainId: string;              // Referenz zu email_domains_enhanced
  domain: string;                // z.B. "xyz.de" oder "celeropress.com"
  inboxAddress: string;          // z.B. "xyz@inbox.sk-online-marketing.de"
  status: 'active' | 'inactive';
  unreadCount: number;
  threadCount: number;
  isDefault?: boolean;           // Default-Postfach für Organizations ohne Domain
  isShared?: boolean;            // Shared domain (celeropress.com)
}

/**
 * Projekt-Postfach - Ein Postfach pro Projekt
 *
 * Verwendung:
 * - Campaign-Antworten eines Projekts
 * - Alle Campaigns eines Projekts nutzen dasselbe Postfach
 *
 * Beispiel:
 * - projectId: "proj-123" → inboxAddress: "presse-proj-123@inbox.sk-online-marketing.de"
 */
export interface ProjectMailbox extends BaseEntity {
  projectId: string;             // Referenz zu pr_projects
  domainId: string;              // Referenz zu email_domains_enhanced
  projectName: string;           // Denormalisiert für schnellen Zugriff
  inboxAddress: string;          // z.B. "presse-proj-123@inbox.sk-online-marketing.de"
  status: 'active' | 'completed' | 'archived';
  unreadCount: number;
  threadCount: number;
  campaignCount: number;
  completedAt?: Timestamp;
  archivedAt?: Timestamp;
  redirectTo?: string;           // Domain-Postfach ID (bei archiviert)
}

/**
 * Redirect-Metadata für umgeleitete Threads
 *
 * Verwendung:
 * - Thread wurde von archiviertem Projekt zu Domain-Postfach umgeleitet
 * - Zeigt Original-Projekt-Kontext an
 */
export interface RedirectMetadata {
  originalProjectId?: string;
  originalProjectName?: string;
  archivedAt?: Timestamp;
  redirectedAt?: Timestamp;
  redirectReason?: 'project_archived' | 'manual';
}

/**
 * Email Thread Erweiterungen für Inbox-System
 *
 * WICHTIG: Diese Felder werden zu bestehenden EmailThread Interface HINZUGEFÜGT
 * Keine Breaking Changes an bestehenden Feldern!
 */
export interface EmailThreadInboxExtension {
  // Domain & Projekt-Zuordnung
  domainId: string;              // Immer vorhanden
  projectId?: string;            // Optional (bei Projekt-Postfach)
  mailboxType: 'domain' | 'project';

  // Redirect-Metadata (bei umgeleiteten Threads)
  metadata?: RedirectMetadata;
}

/**
 * Email Message Erweiterungen für Inbox-System
 *
 * WICHTIG: Diese Felder werden zu bestehenden EmailMessage Interface HINZUGEFÜGT
 * Keine Breaking Changes an bestehenden Feldern!
 */
export interface EmailMessageInboxExtension {
  // Domain & Projekt-Zuordnung
  domainId: string;              // Immer vorhanden
  projectId?: string;            // Optional
  mailboxType: 'domain' | 'project';

  // Redirect-Metadata
  metadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
  };
}
