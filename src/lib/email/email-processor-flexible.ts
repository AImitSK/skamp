// src/lib/email/email-processor-flexible.ts
import { EmailAddressInfo, EmailAttachment, EmailMessage } from '@/types/email-enhanced';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { nanoid } from 'nanoid';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

export interface IncomingEmailData {
  to: EmailAddressInfo[];
  from: EmailAddressInfo;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  rawEmail?: string;
  spamScore?: number;
  spamReport?: string;
  spf?: string;
  dkim?: string;
  envelope?: any;
}

export interface ProcessingResult {
  success: boolean;
  threadId?: string;
  emailId?: string;
  error?: string;
  organizationId?: string;
  routingDecision?: {
    action: 'inbox' | 'forward' | 'archive' | 'reject';
    reason: string;
    targetFolder?: string;
  };
}

/**
 * Flexible Email Processor für eingehende E-Mails
 * Verarbeitet E-Mails von verschiedenen Quellen (SendGrid, etc.)
 */
export async function flexibleEmailProcessor(
  emailData: IncomingEmailData
): Promise<ProcessingResult> {
  try {
    // Grundlegende Validierung
    if (!emailData.from?.email || !emailData.to?.length || !emailData.subject) {
      return {
        success: false,
        error: 'Invalid email data: missing required fields'
      };
    }

    // Spam-Check
    if (emailData.spamScore && emailData.spamScore > 5) {
      return {
        success: true,
        routingDecision: {
          action: 'archive',
          reason: `High spam score: ${emailData.spamScore}`
        }
      };
    }

    // Use the stable thread matcher service

    // 1. Organisation über empfangende E-Mail-Adresse ermitteln
    const { organizationId, emailAccountId, domainId, projectId } = await resolveOrganization(emailData.to);

    if (!organizationId || !emailAccountId) {
      return {
        success: true,
        routingDecision: {
          action: 'archive',
          reason: 'No matching organization found'
        }
      };
    }

    // 2. Thread-Matching durchführen
    const threadResult = await threadMatcherService.findOrCreateThread({
      messageId: emailData.messageId || generateMessageId(),
      ...(emailData.inReplyTo && { inReplyTo: emailData.inReplyTo }),
      references: emailData.references || [],
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      organizationId,
      ...(domainId && { domainId }),
      ...(projectId && { projectId })
    });

    if (!threadResult.success || !threadResult.thread?.id) {
      console.error('❌ Thread matching failed:', threadResult);
      return {
        success: false,
        error: 'Thread matching failed'
      };
    }

    // ========== DUPLIKAT-CHECK ==========
    const messageId = emailData.messageId || generateMessageId();
    // Suche nach existierender E-Mail mit dieser Message-ID
    const existingSnapshot = await adminDb
      .collection('email_messages')
      .where('messageId', '==', messageId)
      .where('organizationId', '==', organizationId)
      .get();

    if (!existingSnapshot.empty) {
      const existingEmail = existingSnapshot.docs[0].data();
      // Wenn im Trash, nicht neu erstellen
      if (existingEmail.folder === 'trash') {
        }
      
      return {
        success: true,
        emailId: existingSnapshot.docs[0].id,
        threadId: existingEmail.threadId,
        organizationId,
        routingDecision: {
          action: 'reject',
          reason: `Duplicate email - already in ${existingEmail.folder}`,
          targetFolder: existingEmail.folder
        }
      };
    }

    // 3. E-Mail-Nachricht erstellen
    const emailMessage: any = {
      messageId: messageId, // Verwende die bereits geprüfte ID
      threadId: threadResult.thread.id,
      organizationId,
      emailAccountId,
      userId: 'system', // Wird später durch Assignment geändert

      // Mailbox-Zuordnung (neue Inbox-Struktur)
      ...(domainId && { domainId }),
      ...(projectId && { projectId }),

      // Adressen - ensure name is never undefined
      from: {
        email: emailData.from.email,
        name: emailData.from.name || ''
      },
      to: emailData.to.map(addr => ({
        email: addr.email,
        name: addr.name || ''
      })),

      // Inhalt
      subject: emailData.subject,
      textContent: emailData.textContent || '',
      htmlContent: emailData.htmlContent || '',
      snippet: generateSnippet(emailData.textContent || emailData.htmlContent || ''),

      // Threading
      ...(emailData.inReplyTo && { inReplyTo: emailData.inReplyTo }),
      references: emailData.references || [],

      // Metadaten
      receivedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      folder: 'inbox',
      importance: 'normal',
      labels: [],

      // Attachments
      attachments: emailData.attachments || [],

      // Spam-Info - only add if defined
      ...(emailData.spamScore !== undefined && { spamScore: emailData.spamScore }),
      ...(emailData.spamReport && { spamReport: emailData.spamReport })
    };

    // 4. In Firestore speichern mit Admin SDK
    const docRef = await adminDb.collection('email_messages').add(emailMessage);

    return {
      success: true,
      emailId: docRef.id,
      threadId: threadResult.thread.id,
      organizationId,
      routingDecision: {
        action: 'inbox',
        reason: 'Successfully processed and stored in inbox'
      }
    };

  } catch (error) {
    console.error('❌ Email processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

/**
 * Ermittelt die Organisation anhand der empfangenden E-Mail-Adressen
 */
async function resolveOrganization(
  toAddresses: EmailAddressInfo[]
): Promise<{ organizationId?: string; emailAccountId?: string; domainId?: string; projectId?: string }> {
  for (const address of toAddresses) {
    try {
      // 1. Suche in Domain-Mailboxen (neue Inbox-Struktur)
      const domainMailboxSnapshot = await adminDb
        .collection('inbox_domain_mailboxes')
        .where('inboxAddress', '==', address.email.toLowerCase())
        .where('status', '==', 'active')
        .get();

      if (!domainMailboxSnapshot.empty) {
        const doc = domainMailboxSnapshot.docs[0];
        const data = doc.data();

        return {
          organizationId: data.organizationId,
          emailAccountId: doc.id,
          domainId: data.domainId
        };
      }

      // 2. Suche in Projekt-Mailboxen (neue Inbox-Struktur)
      const projectMailboxSnapshot = await adminDb
        .collection('inbox_project_mailboxes')
        .where('inboxAddress', '==', address.email.toLowerCase())
        .where('status', 'in', ['active', 'completed'])
        .get();

      if (!projectMailboxSnapshot.empty) {
        const doc = projectMailboxSnapshot.docs[0];
        const data = doc.data();

        return {
          organizationId: data.organizationId,
          emailAccountId: doc.id,
          projectId: data.projectId
        };
      }

      // 3. Fallback: Exakte E-Mail-Adresse in email_addresses (alte Struktur)
      const exactSnapshot = await adminDb
        .collection('email_addresses')
        .where('email', '==', address.email)
        .where('isActive', '==', true)
        .get();

      if (!exactSnapshot.empty) {
        const doc = exactSnapshot.docs[0];
        const data = doc.data();

        return {
          organizationId: data.organizationId,
          emailAccountId: doc.id
        };
      }
      
      // 2. Fallback: Suche nach Domain (für Catch-All/Alias-E-Mails)
      const fullDomain = address.email.split('@')[1];
      if (fullDomain) {
        // Versuche verschiedene Domain-Varianten (inkl. übergeordnete Domains)
        const domainVariants = getDomainVariants(fullDomain);
        const domainSnapshot = await adminDb
          .collection('email_addresses')
          .where('isActive', '==', true)
          .get();

        for (const doc of domainSnapshot.docs) {
          const data = doc.data();
          const emailDomain = data.email.split('@')[1];
          
          // Prüfe exakte Domain oder übergeordnete Domain
          if (domainVariants.includes(emailDomain) || emailDomain === fullDomain) {
            return {
              organizationId: data.organizationId,
              emailAccountId: doc.id
            };
          }
        }
      }
      
    } catch (error) {
      console.error('Error resolving organization for', address.email, error);
    }
  }

  return {};
}

/**
 * Generiert Domain-Varianten für Catch-All Matching
 * Beispiel: inbox.sk-online-marketing.de -> [sk-online-marketing.de, online-marketing.de, marketing.de]
 */
function getDomainVariants(domain: string): string[] {
  const parts = domain.split('.');
  const variants: string[] = [];
  
  // Generiere übergeordnete Domains
  for (let i = 1; i < parts.length - 1; i++) {
    const variant = parts.slice(i).join('.');
    variants.push(variant);
  }
  
  return variants;
}

/**
 * Generiert eine eindeutige Message-ID
 */
function generateMessageId(): string {
  return `inbound-${Date.now()}-${nanoid(10)}@celeropress.de`;
}

/**
 * Erstellt einen Snippet-Text aus dem E-Mail-Inhalt
 */
function generateSnippet(content: string, maxLength: number = 150): string {
  if (!content) return '';
  
  // HTML-Tags entfernen falls vorhanden
  const textContent = content.replace(/<[^>]*>/g, '');
  
  // Whitespace normalisieren
  const normalized = textContent.replace(/\s+/g, ' ').trim();
  
  // Kürzen
  if (normalized.length <= maxLength) {
    return normalized;
  }
  
  return normalized.substring(0, maxLength - 3) + '...';
}