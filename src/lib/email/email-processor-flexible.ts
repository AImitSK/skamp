// src/lib/email/email-processor-flexible.ts
import { EmailAddressInfo, EmailAttachment, EmailMessage } from '@/types/email-enhanced';
import { EmailMessageService } from '@/lib/email/email-message-service';
import { FlexibleThreadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { nanoid } from 'nanoid';
import { serverDb } from '@/lib/firebase/server-init';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    console.log('📧 Processing incoming email:', {
      from: emailData.from.email,
      to: emailData.to.map(addr => addr.email),
      subject: emailData.subject
    });

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

    // Services initialisieren
    const emailMessageService = new EmailMessageService();
    const threadMatcher = new FlexibleThreadMatcherService(true); // Server-side processing

    // 1. Organisation über empfangende E-Mail-Adresse ermitteln
    const { organizationId, emailAccountId } = await resolveOrganization(emailData.to);
    
    if (!organizationId || !emailAccountId) {
      console.log('⚠️ No organization found for email addresses:', emailData.to.map(addr => addr.email));
      return {
        success: true,
        routingDecision: {
          action: 'archive',
          reason: 'No matching organization found'
        }
      };
    }

    console.log('📍 Organization resolved:', { organizationId, emailAccountId });

    // 2. Thread-Matching durchführen
    const threadResult = await threadMatcher.findOrCreateThread({
      messageId: emailData.messageId || generateMessageId(),
      inReplyTo: emailData.inReplyTo,
      references: emailData.references || [],
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      organizationId
    });

    if (!threadResult.success || !threadResult.threadId) {
      console.error('❌ Thread matching failed:', threadResult);
      return {
        success: false,
        error: 'Thread matching failed'
      };
    }

    console.log('🧵 Thread matched:', { threadId: threadResult.threadId, isNew: threadResult.isNew });

    // 3. E-Mail-Nachricht erstellen
    const emailMessage: Partial<EmailMessage> = {
      messageId: emailData.messageId || generateMessageId(),
      threadId: threadResult.threadId,
      organizationId,
      emailAccountId,
      userId: 'system', // Wird später durch Assignment geändert
      
      // Adressen
      from: emailData.from,
      to: emailData.to,
      
      // Inhalt
      subject: emailData.subject,
      textContent: emailData.textContent || '',
      htmlContent: emailData.htmlContent,
      snippet: generateSnippet(emailData.textContent || emailData.htmlContent || ''),
      
      // Threading
      inReplyTo: emailData.inReplyTo,
      references: emailData.references || [],
      
      // Metadaten
      receivedAt: new Date() as any, // Server-Timestamp wird vom Service gesetzt
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      folder: 'inbox',
      importance: 'normal',
      labels: [],
      
      // Attachments
      attachments: emailData.attachments || [],
      hasAttachments: (emailData.attachments?.length || 0) > 0,
      
      // Spam-Info
      spamScore: emailData.spamScore,
      spamReport: emailData.spamReport
    };

    // 4. In Firestore speichern
    const savedMessage = await emailMessageService.create(emailMessage);
    
    console.log('✅ Email message saved:', savedMessage.id);

    return {
      success: true,
      emailId: savedMessage.id,
      threadId: threadResult.threadId,
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
): Promise<{ organizationId?: string; emailAccountId?: string }> {
  for (const address of toAddresses) {
    try {
      console.log('🔍 Resolving organization for:', address.email);
      
      // Direkte Firestore-Query für E-Mail-Adressen
      const emailAddressesQuery = query(
        collection(serverDb, 'email_addresses'),
        where('email', '==', address.email),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(emailAddressesQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        console.log('📧 Found email address:', {
          id: doc.id,
          email: data.email,
          organizationId: data.organizationId
        });
        
        return {
          organizationId: data.organizationId,
          emailAccountId: doc.id
        };
      }
    } catch (error) {
      console.error('Error resolving organization for', address.email, error);
    }
  }

  console.log('⚠️ No organization found for any of the addresses');
  return {};
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