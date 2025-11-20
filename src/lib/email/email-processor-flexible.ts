// src/lib/email/email-processor-flexible.ts
import { EmailAddressInfo, EmailAttachment, EmailMessage } from '@/types/email-enhanced';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { nanoid } from 'nanoid';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

export interface IncomingEmailData {
  to: EmailAddressInfo[];
  cc?: EmailAddressInfo[]; // CC-Empfänger
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
  // NEU: Multi-Mailbox Support
  mailboxCount?: number;
  mailboxResults?: Array<{
    mailboxId: string;
    mailboxType: 'domain' | 'project';
    threadId: string;
    emailId: string;
  }>;
}

interface MailboxInfo {
  organizationId: string;
  emailAccountId: string;
  domainId?: string;
  projectId?: string;
  mailboxType: 'domain' | 'project' | 'legacy';
  inboxAddress: string;
}

/**
 * Flexible Email Processor für eingehende E-Mails
 * Verarbeitet E-Mails von verschiedenen Quellen (SendGrid, etc.)
 *
 * NEU: Multi-Mailbox Support - Email wird in ALLEN matching Postfächern gespeichert
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

    // 1. ALLE Mailboxen ermitteln (nicht nur die erste!)
    // Kombiniere TO + CC Empfänger für Multi-Mailbox Routing
    const allRecipients = [
      ...emailData.to,
      ...(emailData.cc || [])
    ];

    console.log('📮 All recipients (TO + CC):', allRecipients.map(r => r.email));

    const allMailboxes = await resolveAllMailboxes(allRecipients);

    if (allMailboxes.length === 0) {
      console.log('📭 No matching mailboxes found for:', emailData.to.map(t => t.email));
      return {
        success: true,
        routingDecision: {
          action: 'archive',
          reason: 'No matching organization found'
        }
      };
    }

    console.log(`📬 Found ${allMailboxes.length} matching mailbox(es):`,
      allMailboxes.map(m => ({
        type: m.mailboxType,
        inbox: m.inboxAddress,
        org: m.organizationId
      }))
    );

    // 2. Email in ALLEN gefundenen Mailboxen verarbeiten
    const messageId = emailData.messageId || generateMessageId();
    const mailboxResults: Array<{
      mailboxId: string;
      mailboxType: 'domain' | 'project';
      threadId: string;
      emailId: string;
    }> = [];

    for (const mailbox of allMailboxes) {
      try {
        // Duplikat-Check für diese spezifische Mailbox
        const isDuplicate = await checkDuplicate(messageId, mailbox.organizationId, mailbox.projectId, mailbox.domainId);

        if (isDuplicate) {
          console.log(`⏭️  Skipping duplicate for mailbox ${mailbox.inboxAddress}`);
          continue;
        }

        // Thread-Matching für diese Mailbox
        const threadResult = await threadMatcherService.findOrCreateThread({
          messageId,
          ...(emailData.inReplyTo && { inReplyTo: emailData.inReplyTo }),
          references: emailData.references || [],
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          organizationId: mailbox.organizationId,
          ...(mailbox.domainId && { domainId: mailbox.domainId }),
          ...(mailbox.projectId && { projectId: mailbox.projectId })
        });

        if (!threadResult.success || !threadResult.thread?.id) {
          console.error('❌ Thread matching failed for mailbox:', mailbox.inboxAddress);
          continue;
        }

        // E-Mail-Nachricht erstellen
        const emailMessage: any = {
          messageId,
          threadId: threadResult.thread.id,
          organizationId: mailbox.organizationId,
          emailAccountId: mailbox.emailAccountId,
          userId: 'system',

          // Mailbox-Zuordnung
          ...(mailbox.domainId && { domainId: mailbox.domainId }),
          ...(mailbox.projectId && { projectId: mailbox.projectId }),
          mailboxType: mailbox.mailboxType,

          // Adressen
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

          // Spam-Info
          ...(emailData.spamScore !== undefined && { spamScore: emailData.spamScore }),
          ...(emailData.spamReport && { spamReport: emailData.spamReport })
        };

        // In Firestore speichern
        const docRef = await adminDb.collection('email_messages').add(emailMessage);

        console.log(`✅ Email saved to mailbox ${mailbox.inboxAddress} (${mailbox.mailboxType})`);

        mailboxResults.push({
          mailboxId: mailbox.emailAccountId,
          mailboxType: mailbox.mailboxType as 'domain' | 'project',
          threadId: threadResult.thread.id,
          emailId: docRef.id
        });

      } catch (mailboxError) {
        console.error(`❌ Failed to process email for mailbox ${mailbox.inboxAddress}:`, mailboxError);
        // Continue mit nächster Mailbox
      }
    }

    // Mindestens eine Mailbox erfolgreich?
    if (mailboxResults.length === 0) {
      return {
        success: false,
        error: 'Failed to save email to any mailbox'
      };
    }

    // Erste Mailbox als primäre für Rückgabe verwenden
    const primary = mailboxResults[0];

    return {
      success: true,
      emailId: primary.emailId,
      threadId: primary.threadId,
      organizationId: allMailboxes[0].organizationId,
      mailboxCount: mailboxResults.length,
      mailboxResults,
      routingDecision: {
        action: 'inbox',
        reason: `Successfully processed and stored in ${mailboxResults.length} mailbox(es)`
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
 * NEU: Ermittelt ALLE Mailboxen für die TO-Adressen
 * (statt nur die erste wie bisher)
 */
async function resolveAllMailboxes(
  toAddresses: EmailAddressInfo[]
): Promise<MailboxInfo[]> {
  const mailboxes: MailboxInfo[] = [];
  const seen = new Set<string>(); // Deduplizierung

  for (const address of toAddresses) {
    try {
      const emailLower = address.email.toLowerCase();

      // 1. Suche in Domain-Mailboxen
      const domainMailboxSnapshot = await adminDb
        .collection('inbox_domain_mailboxes')
        .where('inboxAddress', '==', emailLower)
        .where('status', '==', 'active')
        .get();

      for (const doc of domainMailboxSnapshot.docs) {
        const data = doc.data();
        const key = `domain-${data.organizationId}-${data.domainId}`;

        if (!seen.has(key)) {
          mailboxes.push({
            organizationId: data.organizationId,
            emailAccountId: doc.id,
            domainId: data.domainId,
            mailboxType: 'domain',
            inboxAddress: emailLower
          });
          seen.add(key);
        }
      }

      // 2. Suche in Projekt-Mailboxen
      const projectMailboxSnapshot = await adminDb
        .collection('inbox_project_mailboxes')
        .where('inboxAddress', '==', emailLower)
        .where('status', 'in', ['active', 'completed'])
        .get();

      for (const doc of projectMailboxSnapshot.docs) {
        const data = doc.data();
        const key = `project-${data.organizationId}-${data.projectId}`;

        if (!seen.has(key)) {
          mailboxes.push({
            organizationId: data.organizationId,
            emailAccountId: doc.id,
            projectId: data.projectId,
            domainId: data.domainId, // Projekte haben auch domainId
            mailboxType: 'project',
            inboxAddress: emailLower
          });
          seen.add(key);
        }
      }

      // 3. Fallback: Exakte E-Mail-Adresse in email_addresses (alte Struktur)
      const exactSnapshot = await adminDb
        .collection('email_addresses')
        .where('email', '==', address.email)
        .where('isActive', '==', true)
        .get();

      for (const doc of exactSnapshot.docs) {
        const data = doc.data();
        const key = `legacy-${data.organizationId}-${doc.id}`;

        if (!seen.has(key)) {
          mailboxes.push({
            organizationId: data.organizationId,
            emailAccountId: doc.id,
            mailboxType: 'legacy',
            inboxAddress: address.email
          });
          seen.add(key);
        }
      }

      // 4. Fallback: Domain-basierte Suche (Catch-All)
      // NUR wenn noch KEIN Postfach gefunden wurde!
      const fullDomain = address.email.split('@')[1];
      if (fullDomain && mailboxes.length === 0) {
        const domainVariants = getDomainVariants(fullDomain);
        const domainSnapshot = await adminDb
          .collection('email_addresses')
          .where('isActive', '==', true)
          .get();

        for (const doc of domainSnapshot.docs) {
          const data = doc.data();
          const emailDomain = data.email.split('@')[1];

          if (domainVariants.includes(emailDomain) || emailDomain === fullDomain) {
            const key = `legacy-catchall-${data.organizationId}-${doc.id}`;

            if (!seen.has(key)) {
              mailboxes.push({
                organizationId: data.organizationId,
                emailAccountId: doc.id,
                mailboxType: 'legacy',
                inboxAddress: address.email
              });
              seen.add(key);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error resolving mailboxes for', address.email, error);
    }
  }

  return mailboxes;
}

/**
 * Prüft ob Email bereits in dieser Mailbox existiert
 */
async function checkDuplicate(
  messageId: string,
  organizationId: string,
  projectId?: string,
  domainId?: string
): Promise<boolean> {
  console.log('🔍 Duplikat-Check START:', {
    messageId,
    organizationId,
    projectId: projectId || 'none',
    domainId: domainId || 'none'
  });

  let query = adminDb
    .collection('email_messages')
    .where('messageId', '==', messageId)
    .where('organizationId', '==', organizationId);

  // Spezifische Mailbox-Prüfung
  if (projectId) {
    console.log('🔍 Query mit projectId:', projectId);
    query = query.where('projectId', '==', projectId);
  } else if (domainId) {
    console.log('🔍 Query mit domainId:', domainId);
    query = query.where('domainId', '==', domainId);
  } else {
    console.log('🔍 Query OHNE projectId/domainId (Legacy)');
  }

  const snapshot = await query.get();

  // WICHTIG: Zusätzliche Filterung für Domain-Mailboxen
  // Eine Domain-Mailbox-Email darf KEIN projectId haben!
  let relevantDocs = snapshot.docs;
  if (!projectId && domainId) {
    console.log('🔍 Domain-Mailbox: Filtere Emails MIT projectId raus');
    relevantDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      const hasProjectId = !!data.projectId;
      console.log(`   Doc ${doc.id}: projectId=${data.projectId || 'none'} → ${hasProjectId ? 'SKIP' : 'KEEP'}`);
      return !hasProjectId;
    });
  }

  const isDuplicate = relevantDocs.length > 0;

  console.log('🔍 Duplikat-Check ERGEBNIS:', {
    isDuplicate,
    totalFound: snapshot.size,
    relevantFound: relevantDocs.length,
    relevantDocs: relevantDocs.map(d => ({
      id: d.id,
      messageId: d.data().messageId,
      projectId: d.data().projectId,
      domainId: d.data().domainId,
      subject: d.data().subject,
      createdAt: d.data().createdAt?.toDate?.()
    }))
  });

  return isDuplicate;
}

/**
 * Generiert Domain-Varianten für Catch-All Matching
 */
function getDomainVariants(domain: string): string[] {
  const parts = domain.split('.');
  const variants: string[] = [];

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

  const textContent = content.replace(/<[^>]*>/g, '');
  const normalized = textContent.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.substring(0, maxLength - 3) + '...';
}
