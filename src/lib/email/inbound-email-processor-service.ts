// src/lib/email/inbound-email-processor-service.ts
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import {
  EmailThread,
  EmailMessage,
  EmailAddressInfo
} from '@/types/email-enhanced';

/**
 * Inbound Email Processor Service
 *
 * Verarbeitet eingehende E-Mails von SendGrid und erstellt Threads/Messages.
 * Nutzt Firebase Admin SDK für Server-Side API Routes.
 */

export interface IncomingEmailData {
  // SendGrid Data
  messageId: string;
  from: string; // "Name <email@example.com>"
  to: string;   // Reply-To Adresse
  subject: string;
  textContent?: string;
  htmlContent?: string;
  headers?: Record<string, string>;
  receivedAt: Date;

  // Optional Headers für Threading
  inReplyTo?: string | null;
  references?: string | null; // Komma-separierte Liste

  // Attachments
  attachments?: any[]; // Array von EmailAttachment-Objekten

  // Inbox Context (aus redirect-handler)
  projectId: string | null;
  domainId: string | null;
  mailboxType: 'domain' | 'project';
  labels?: string[];
  redirectMetadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
    archivedAt?: Date;
    redirectedAt?: Date;
    redirectReason?: 'project_archived' | 'manual';
  };
}

export interface ProcessedEmailResult {
  success: boolean;
  threadId?: string;
  messageId?: string;
  error?: string;
}

class InboundEmailProcessorService {
  private readonly threadsCollection = 'email_threads';
  private readonly messagesCollection = 'email_messages';

  /**
   * Hauptmethode: Verarbeitet eingehende E-Mail
   */
  async processIncomingEmail(
    emailData: IncomingEmailData,
    organizationId: string,
    emailAccountId: string,
    userId: string
  ): Promise<ProcessedEmailResult> {
    try {
      console.log('[InboundProcessor] Processing email:', emailData.subject);

      // 1. Parse E-Mail-Adressen
      const fromInfo = this.parseEmailAddress(emailData.from);
      const toInfo = this.parseEmailAddress(emailData.to);

      // 2. Finde oder erstelle Thread
      const threadResult = await this.findOrCreateThread({
        messageId: emailData.messageId,
        subject: emailData.subject,
        from: fromInfo,
        to: [toInfo],
        organizationId,
        userId,
        inReplyTo: emailData.inReplyTo,
        references: this.parseReferences(emailData.references),
        projectId: emailData.projectId,
        domainId: emailData.domainId,
        mailboxType: emailData.mailboxType,
        redirectMetadata: emailData.redirectMetadata
      });

      if (!threadResult.success || !threadResult.threadId) {
        throw new Error('Failed to create thread');
      }

      // 3. Erstelle Message
      // Truncate Text/HTML wenn zu groß (Firestore Limit: 1MB pro Feld)
      const MAX_CONTENT_SIZE = 900000; // 900KB (Puffer für Metadaten)

      const truncateContent = (content: string | undefined, maxSize: number): string => {
        if (!content) return '';
        if (content.length <= maxSize) return content;

        const truncated = content.substring(0, maxSize);
        return truncated + '\n\n[... Inhalt gekürzt - zu groß für Speicherung ...]';
      };

      const message = await this.createMessage({
        threadId: threadResult.threadId,
        messageId: emailData.messageId,
        from: fromInfo,
        to: [toInfo],
        subject: emailData.subject,
        textContent: truncateContent(emailData.textContent, MAX_CONTENT_SIZE),
        htmlContent: truncateContent(emailData.htmlContent, MAX_CONTENT_SIZE),
        headers: emailData.headers,
        receivedAt: Timestamp.fromDate(emailData.receivedAt),
        organizationId,
        emailAccountId,
        userId,
        projectId: emailData.projectId,
        domainId: emailData.domainId,
        mailboxType: emailData.mailboxType,
        redirectMetadata: emailData.redirectMetadata,
        labels: emailData.labels,
        hasAttachments: Array.isArray(emailData.attachments) && emailData.attachments.length > 0,
        inReplyTo: emailData.inReplyTo,
        references: this.parseReferences(emailData.references)
      });

      console.log(`[InboundProcessor] Created message ${message.id} in thread ${threadResult.threadId}`);

      // 4. Update Mailbox-Statistiken
      await this.updateMailboxStats(
        emailData.domainId,
        emailData.projectId,
        emailData.mailboxType,
        threadResult.isNew || false
      );

      return {
        success: true,
        threadId: threadResult.threadId,
        messageId: message.id
      };

    } catch (error: any) {
      console.error('[InboundProcessor] Error processing email:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Findet oder erstellt einen Thread
   */
  private async findOrCreateThread(criteria: {
    messageId: string;
    subject: string;
    from: EmailAddressInfo;
    to: EmailAddressInfo[];
    organizationId: string;
    userId: string;
    inReplyTo?: string | null;
    references?: string[];
    projectId: string | null;
    domainId: string | null;
    mailboxType: 'domain' | 'project';
    redirectMetadata?: IncomingEmailData['redirectMetadata'];
  }): Promise<{ success: boolean; threadId?: string; isNew?: boolean }> {
    try {
      // 1. Header-basiertes Matching (In-Reply-To, References)
      if (criteria.inReplyTo || (criteria.references && criteria.references.length > 0)) {
        const existingThread = await this.findThreadByHeaders(
          criteria.organizationId,
          criteria.inReplyTo,
          criteria.references
        );

        if (existingThread) {
          console.log(`[InboundProcessor] Found thread by headers: ${existingThread}`);
          await this.updateThreadActivity(existingThread, criteria);
          return { success: true, threadId: existingThread, isNew: false };
        }
      }

      // 2. Subject-basiertes Matching
      const subjectThread = await this.findThreadBySubject(
        criteria.organizationId,
        criteria.subject,
        criteria.from,
        criteria.to
      );

      if (subjectThread) {
        console.log(`[InboundProcessor] Found thread by subject: ${subjectThread}`);
        await this.updateThreadActivity(subjectThread, criteria);
        return { success: true, threadId: subjectThread, isNew: false };
      }

      // 3. Neuen Thread erstellen
      const newThreadId = await this.createThread(criteria);
      console.log(`[InboundProcessor] Created new thread: ${newThreadId}`);
      return { success: true, threadId: newThreadId, isNew: true };

    } catch (error) {
      console.error('[InboundProcessor] Thread matching failed:', error);
      return { success: false };
    }
  }

  /**
   * Findet Thread anhand von Message-IDs (In-Reply-To, References)
   */
  private async findThreadByHeaders(
    organizationId: string,
    inReplyTo?: string | null,
    references?: string[]
  ): Promise<string | null> {
    const messageIdsToFind: string[] = [];

    if (inReplyTo) {
      messageIdsToFind.push(inReplyTo.replace(/^<|>$/g, ''));
    }

    if (references) {
      references.forEach(ref => {
        messageIdsToFind.push(ref.replace(/^<|>$/g, ''));
      });
    }

    if (messageIdsToFind.length === 0) {
      return null;
    }

    // Suche nach Messages mit diesen Message-IDs
    const messagesSnapshot = await adminDb
      .collection(this.messagesCollection)
      .where('organizationId', '==', organizationId)
      .where('messageId', 'in', messageIdsToFind.slice(0, 10)) // Firestore limit
      .limit(1)
      .get();

    if (!messagesSnapshot.empty) {
      const message = messagesSnapshot.docs[0].data() as EmailMessage;
      return message.threadId || null;
    }

    return null;
  }

  /**
   * Findet Thread anhand von Subject + Teilnehmern
   */
  private async findThreadBySubject(
    organizationId: string,
    subject: string,
    from: EmailAddressInfo,
    to: EmailAddressInfo[]
  ): Promise<string | null> {
    const normalizedSubject = this.normalizeSubject(subject);

    if (!normalizedSubject || normalizedSubject.length < 3) {
      return null;
    }

    // Suche nach Threads mit ähnlichem Subject
    const threadsSnapshot = await adminDb
      .collection(this.threadsCollection)
      .where('organizationId', '==', organizationId)
      .where('subject', '==', normalizedSubject)
      .orderBy('lastMessageAt', 'desc')
      .limit(5)
      .get();

    if (threadsSnapshot.empty) {
      return null;
    }

    // Prüfe Teilnehmer für besseres Matching
    for (const doc of threadsSnapshot.docs) {
      const thread = doc.data() as EmailThread;

      if (this.participantsMatch(thread.participants, from, to)) {
        return doc.id;
      }
    }

    return null;
  }

  /**
   * Erstellt einen neuen Thread
   */
  private async createThread(criteria: {
    subject: string;
    from: EmailAddressInfo;
    to: EmailAddressInfo[];
    organizationId: string;
    userId: string;
    projectId: string | null;
    domainId: string | null;
    mailboxType: 'domain' | 'project';
    redirectMetadata?: IncomingEmailData['redirectMetadata'];
  }): Promise<string> {
    const participants = this.extractParticipants(criteria.from, criteria.to);
    const now = Timestamp.now();

    const threadData: any = {
      subject: criteria.subject,
      participants,
      lastMessageAt: now,
      organizationId: criteria.organizationId,
      userId: criteria.userId,
      createdAt: now,
      updatedAt: now,
      contactIds: [],
      messageCount: 1,
      unreadCount: 1,
      threadingStrategy: 'headers',
      confidence: 100,
      status: 'active',
      priority: 'normal',

      // Inbox-spezifische Felder
      ...(criteria.domainId && { domainId: criteria.domainId }),
      ...(criteria.mailboxType && { mailboxType: criteria.mailboxType }),
      ...(criteria.redirectMetadata && {
        redirectMetadata: {
          originalProjectId: criteria.redirectMetadata.originalProjectId,
          originalProjectName: criteria.redirectMetadata.originalProjectName,
          archivedAt: criteria.redirectMetadata.archivedAt
            ? Timestamp.fromDate(criteria.redirectMetadata.archivedAt)
            : undefined,
          redirectedAt: criteria.redirectMetadata.redirectedAt
            ? Timestamp.fromDate(criteria.redirectMetadata.redirectedAt)
            : undefined,
          redirectReason: criteria.redirectMetadata.redirectReason
        }
      })
    };

    // Entferne undefined-Werte
    const cleanedData = this.removeUndefined(threadData);

    const docRef = await adminDb.collection(this.threadsCollection).add(cleanedData);
    return docRef.id;
  }

  /**
   * Aktualisiert Thread-Aktivität bei neuer Message
   */
  private async updateThreadActivity(
    threadId: string,
    criteria: {
      from: EmailAddressInfo;
      to: EmailAddressInfo[];
    }
  ): Promise<void> {
    const threadRef = adminDb.collection(this.threadsCollection).doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      return;
    }

    const thread = threadDoc.data() as EmailThread;
    const updatedParticipants = this.mergeParticipants(
      thread.participants,
      this.extractParticipants(criteria.from, criteria.to)
    );

    await threadRef.update({
      lastMessageAt: Timestamp.now(),
      messageCount: (thread.messageCount || 0) + 1,
      unreadCount: (thread.unreadCount || 0) + 1,
      participants: updatedParticipants,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Erstellt eine neue Message
   */
  private async createMessage(data: {
    threadId: string;
    messageId: string;
    from: EmailAddressInfo;
    to: EmailAddressInfo[];
    subject: string;
    textContent: string;
    htmlContent?: string;
    headers?: Record<string, string>;
    receivedAt: Timestamp;
    organizationId: string;
    emailAccountId: string;
    userId: string;
    projectId: string | null;
    domainId: string | null;
    mailboxType: 'domain' | 'project';
    redirectMetadata?: IncomingEmailData['redirectMetadata'];
    labels?: string[];
    hasAttachments: boolean;
    inReplyTo?: string | null;
    references?: string[];
  }): Promise<{ id: string }> {
    const now = Timestamp.now();

    const messageData: any = {
      threadId: data.threadId,
      messageId: data.messageId,
      from: data.from,
      to: data.to,
      subject: data.subject,
      snippet: data.textContent.substring(0, 150), // Vorschau-Text aus textContent
      textContent: data.textContent,
      htmlContent: data.htmlContent,
      headers: data.headers || {},
      receivedAt: data.receivedAt,
      sentAt: data.receivedAt, // Eingehende Mails: sentAt = receivedAt
      organizationId: data.organizationId,
      emailAccountId: data.emailAccountId,
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
      folder: 'inbox',
      importance: 'normal', // Standard-Priorität
      isRead: false,
      isStarred: false,
      isDraft: false,
      isArchived: false,
      labels: data.labels || [],
      hasAttachments: data.hasAttachments,
      ...(data.inReplyTo && { inReplyTo: data.inReplyTo }), // Nur setzen wenn nicht null
      references: data.references,

      // Inbox-spezifische Felder
      ...(data.domainId && { domainId: data.domainId }),
      ...(data.mailboxType && { mailboxType: data.mailboxType }),
      ...(data.redirectMetadata && {
        redirectMetadata: {
          originalProjectId: data.redirectMetadata.originalProjectId,
          originalProjectName: data.redirectMetadata.originalProjectName
        }
      })
    };

    // Entferne undefined-Werte
    const cleanedData = this.removeUndefined(messageData);

    const docRef = await adminDb.collection(this.messagesCollection).add(cleanedData);
    return { id: docRef.id };
  }

  /**
   * Helper: Parse E-Mail-Adresse
   */
  private parseEmailAddress(emailString: string): EmailAddressInfo {
    // Format: "Name <email@example.com>" oder "email@example.com"
    const match = emailString.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);

    if (match) {
      return {
        email: match[2].trim(),
        name: match[1]?.trim() || undefined
      };
    }

    return { email: emailString.trim() };
  }

  /**
   * Helper: Parse References Header
   */
  private parseReferences(referencesString?: string | null): string[] {
    if (!referencesString) return [];

    return referencesString
      .split(/[,\s]+/)
      .map(ref => ref.trim().replace(/^<|>$/g, ''))
      .filter(ref => ref.length > 0);
  }

  /**
   * Helper: Normalisiere Subject
   */
  private normalizeSubject(subject: string): string {
    let normalized = subject
      .replace(/^(Re:|Fwd:|AW:|WG:|RE:|FW:|Aw:|Wg:)\s*/gi, '')
      .trim();

    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, '');

    return normalized;
  }

  /**
   * Helper: Extrahiere Teilnehmer
   */
  private extractParticipants(
    from: EmailAddressInfo,
    to: EmailAddressInfo[]
  ): EmailAddressInfo[] {
    const participantMap = new Map<string, EmailAddressInfo>();

    participantMap.set(from.email, from);
    to.forEach(addr => {
      if (!participantMap.has(addr.email)) {
        participantMap.set(addr.email, addr);
      }
    });

    return Array.from(participantMap.values());
  }

  /**
   * Helper: Merge Teilnehmer
   */
  private mergeParticipants(
    existing: EmailAddressInfo[],
    newParticipants: EmailAddressInfo[]
  ): EmailAddressInfo[] {
    const participantMap = new Map<string, EmailAddressInfo>();

    existing.forEach(p => participantMap.set(p.email, p));

    newParticipants.forEach(p => {
      const existingP = participantMap.get(p.email);
      if (!existingP || (!existingP.name && p.name)) {
        participantMap.set(p.email, p);
      }
    });

    return Array.from(participantMap.values());
  }

  /**
   * Helper: Prüfe ob Teilnehmer matchen
   */
  private participantsMatch(
    threadParticipants: EmailAddressInfo[],
    from: EmailAddressInfo,
    to: EmailAddressInfo[]
  ): boolean {
    const criteriaEmails = new Set<string>();
    criteriaEmails.add(from.email);
    to.forEach(addr => criteriaEmails.add(addr.email));

    const threadEmails = new Set(threadParticipants.map(p => p.email));

    // Mindestens 2 gemeinsame Teilnehmer für Match
    let matches = 0;
    for (const email of Array.from(criteriaEmails)) {
      if (threadEmails.has(email)) {
        matches++;
        if (matches >= 2) return true;
      }
    }

    return false;
  }

  /**
   * Aktualisiert Mailbox-Statistiken
   */
  private async updateMailboxStats(
    domainId: string | null,
    projectId: string | null,
    mailboxType: 'domain' | 'project',
    isNewThread: boolean
  ): Promise<void> {
    try {
      if (mailboxType === 'domain' && domainId) {
        // Update Domain Mailbox
        const mailboxRef = adminDb.collection('inbox_domain_mailboxes').doc(domainId);
        const mailboxDoc = await mailboxRef.get();
        const mailboxData = mailboxDoc.data();

        const updates: any = {
          unreadCount: (mailboxData?.unreadCount || 0) + 1,
          updatedAt: Timestamp.now()
        };

        if (isNewThread) {
          updates.threadCount = (mailboxData?.threadCount || 0) + 1;
        }

        await mailboxRef.update(updates);
        console.log(`[InboundProcessor] Updated domain mailbox stats: ${domainId}`);

      } else if (mailboxType === 'project' && projectId) {
        // Update Project Mailbox
        const mailboxQuery = await adminDb
          .collection('inbox_project_mailboxes')
          .where('projectId', '==', projectId)
          .limit(1)
          .get();

        if (!mailboxQuery.empty) {
          const mailboxRef = mailboxQuery.docs[0].ref;
          const mailboxData = mailboxQuery.docs[0].data();

          const updates: any = {
            unreadCount: (mailboxData?.unreadCount || 0) + 1,
            updatedAt: Timestamp.now()
          };

          if (isNewThread) {
            updates.threadCount = (mailboxData?.threadCount || 0) + 1;
          }

          await mailboxRef.update(updates);
          console.log(`[InboundProcessor] Updated project mailbox stats: ${projectId}`);
        }
      }

    } catch (error) {
      console.error('[InboundProcessor] Error updating mailbox stats:', error);
      // Nicht blockierend - Email wurde bereits verarbeitet
    }
  }

  /**
   * Helper: Entferne undefined-Werte aus Objekt
   */
  private removeUndefined(obj: any): any {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value === undefined) {
        return acc;
      }

      if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
        if (Array.isArray(value)) {
          acc[key] = value.filter(item => item !== undefined);
        } else {
          // Rekursiv für nested objects
          acc[key] = this.removeUndefined(value);
        }
      } else {
        acc[key] = value;
      }

      return acc;
    }, {} as any);
  }
}

export const inboundEmailProcessorService = new InboundEmailProcessorService();
