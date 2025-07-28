// src/lib/email/email-processor.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { emailAddressService } from '@/lib/email/email-address-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { 
  EmailMessage, 
  EmailAddress, 
  EmailAddressInfo,
  EmailAttachment 
} from '@/types/email-enhanced';

interface ProcessingResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  emailAddressId?: string;
  error?: string;
}

interface IncomingEmailData {
  messageId: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments?: EmailAttachment[];
  inReplyTo?: string | null;
  references?: string[];
  headers: Record<string, string>;
  spamScore?: number;
  spamReport?: string;
  envelope?: {
    to: string[];
    from: string;
  };
}

export class EmailProcessor {
  /**
   * Verarbeitet eine eingehende E-Mail
   */
  async processIncomingEmail(emailData: IncomingEmailData): Promise<ProcessingResult> {
    try {
      console.log('🔄 Processing incoming email:', {
        from: emailData.from.email,
        to: emailData.to.map(t => t.email),
        subject: emailData.subject
      });

      // 1. Finde die passende E-Mail-Adresse
      const matchResult = await this.findMatchingEmailAddress(emailData);
      if (!matchResult.success || !matchResult.emailAddress) {
        console.error('❌ No matching email address found');
        return {
          success: false,
          error: 'No matching email address found for recipients'
        };
      }

      const emailAddress = matchResult.emailAddress;
      console.log('✅ Matched email address:', emailAddress.email);

      // 2. Spam-Check
      if (this.isSpam(emailData)) {
        console.log('🚫 Email marked as spam');
        // Trotzdem speichern, aber in Spam-Ordner
        return await this.saveSpamEmail(emailData, emailAddress);
      }

      // 3. Thread-Zuordnung
      const threadResult = await threadMatcherService.findOrCreateThread({
        messageId: emailData.messageId,
        inReplyTo: emailData.inReplyTo,
        references: emailData.references,
        subject: emailData.subject,
        from: emailData.from,
        to: emailData.to,
        organizationId: emailAddress.organizationId
      });

      if (!threadResult.success || !threadResult.thread) {
        console.error('❌ Failed to create/find thread');
        return {
          success: false,
          error: 'Failed to process email thread'
        };
      }

      console.log('📧 Thread matched:', threadResult.thread.id, 'New:', threadResult.isNew);

      // 4. E-Mail-Nachricht erstellen
      const message = await this.createEmailMessage(
        emailData, 
        emailAddress, 
        threadResult.thread.id!
      );

      if (!message || !message.id) {
        return {
          success: false,
          error: 'Failed to create email message'
        };
      }

      // 5. Routing-Regeln anwenden
      await this.applyRoutingRules(message, emailAddress);

      // 6. Statistiken aktualisieren
      await emailAddressService.updateStats(emailAddress.id!, 'received');

      // 7. Benachrichtigungen senden
      await this.sendNotifications(message, emailAddress);

      // 8. Optional: KI-Analyse starten (async, blockiert nicht)
      if (emailAddress.aiSettings?.enabled && emailAddress.aiSettings?.autoCategorize) {
        this.triggerAIAnalysis(message, threadResult.thread.id!).catch(error => {
          console.error('AI analysis failed:', error);
        });
      }

      return {
        success: true,
        messageId: message.id,
        threadId: threadResult.thread.id,
        emailAddressId: emailAddress.id
      };

    } catch (error) {
      console.error('❌ Email processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Findet die passende E-Mail-Adresse für eingehende E-Mails
   */
  private async findMatchingEmailAddress(emailData: IncomingEmailData): Promise<{
    success: boolean;
    emailAddress?: EmailAddress;
  }> {
    try {
      // Alle TO-Adressen durchgehen (inkl. Envelope für Catch-All)
      const allRecipients = [...emailData.to];
      
      // Envelope-Adressen hinzufügen falls vorhanden
      if (emailData.envelope?.to) {
        emailData.envelope.to.forEach(email => {
          if (!allRecipients.find(r => r.email === email.toLowerCase())) {
            allRecipients.push({ email: email.toLowerCase() });
          }
        });
      }

      console.log('🔍 Checking recipients:', allRecipients.map(r => r.email));

      // Für jede Empfänger-Adresse prüfen
      for (const recipient of allRecipients) {
        // NEU: Prüfe ob es eine Reply-To Adresse ist
        if (recipient.email.endsWith('@inbox.sk-online-marketing.de')) {
          console.log('📧 Reply-To address detected:', recipient.email);
          const emailAddress = await emailAddressService.findByReplyToAddress(recipient.email);
          if (emailAddress) {
            console.log('✅ Found email address via reply-to:', emailAddress.email);
            return { success: true, emailAddress };
          }
        } else {
          // Original: Direkte E-Mail-Adressen-Suche
          const emailAddress = await this.matchEmailAddress(recipient.email);
          if (emailAddress) {
            return { success: true, emailAddress };
          }
        }
      }

      // Spezial-Check für Weiterleitungen
      // Manche E-Mail-Provider fügen die Original-Adresse in den Headers hinzu
      const originalTo = emailData.headers['X-Original-To'] || emailData.headers['X-Forwarded-To'];
      if (originalTo && originalTo.endsWith('@inbox.sk-online-marketing.de')) {
        console.log('📧 Found forwarded reply-to in headers:', originalTo);
        const emailAddress = await emailAddressService.findByReplyToAddress(originalTo);
        if (emailAddress) {
          return { success: true, emailAddress };
        }
      }

      return { success: false };
    } catch (error) {
      console.error('Error finding email address:', error);
      return { success: false };
    }
  }

  /**
   * Matched eine einzelne E-Mail-Adresse
   */
  private async matchEmailAddress(email: string): Promise<EmailAddress | null> {
    const [localPart, domain] = email.split('@');
    
    // 1. Exakte Übereinstimmung
    const exactQuery = query(
      collection(db, 'email_addresses'),
      where('email', '==', email),
      where('isActive', '==', true)
    );
    
    const exactSnapshot = await getDocs(exactQuery);
    if (!exactSnapshot.empty) {
      const doc = exactSnapshot.docs[0];
      return { ...doc.data(), id: doc.id } as EmailAddress;
    }

    // 2. Catch-All Check
    const catchAllQuery = query(
      collection(db, 'email_addresses'),
      where('domainId', '==', domain),
      where('aliasType', '==', 'catch-all'),
      where('isActive', '==', true)
    );
    
    const catchAllSnapshot = await getDocs(catchAllQuery);
    if (!catchAllSnapshot.empty) {
      const doc = catchAllSnapshot.docs[0];
      return { ...doc.data(), id: doc.id } as EmailAddress;
    }

    // 3. Pattern Matching (z.B. pr-* für pr-2024@domain.de)
    const patternQuery = query(
      collection(db, 'email_addresses'),
      where('domainId', '==', domain),
      where('aliasType', '==', 'pattern'),
      where('isActive', '==', true)
    );
    
    const patternSnapshot = await getDocs(patternQuery);
    for (const doc of patternSnapshot.docs) {
      const emailAddr = { ...doc.data(), id: doc.id } as EmailAddress;
      if (emailAddr.aliasPattern && this.matchesPattern(localPart, emailAddr.aliasPattern)) {
        return emailAddr;
      }
    }

    return null;
  }

  /**
   * Prüft ob ein Local Part einem Pattern entspricht
   */
  private matchesPattern(localPart: string, pattern: string): boolean {
    // Konvertiere Pattern zu RegEx (z.B. "pr-*" zu "^pr-.*$")
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\\\*/g, '.*'); // Replace * with .*
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(localPart);
  }

  /**
   * Spam-Prüfung
   */
  private isSpam(emailData: IncomingEmailData): boolean {
    // SpamAssassin Score Check
    if (emailData.spamScore !== undefined && emailData.spamScore > 5.0) {
      return true;
    }

    // Weitere Spam-Checks können hier hinzugefügt werden
    // z.B. Blacklist-Check, Keyword-Check, etc.

    return false;
  }

  /**
   * Speichert Spam-E-Mail
   */
  private async saveSpamEmail(
    emailData: IncomingEmailData, 
    emailAddress: EmailAddress
  ): Promise<ProcessingResult> {
    try {
      const message = await emailMessageService.create({
        ...this.buildEmailMessage(emailData, emailAddress),
        folder: 'spam',
        labels: ['spam']
      });

      return {
        success: true,
        messageId: message.id,
        emailAddressId: emailAddress.id
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save spam email'
      };
    }
  }

  /**
   * Erstellt eine E-Mail-Nachricht
   */
  private async createEmailMessage(
    emailData: IncomingEmailData,
    emailAddress: EmailAddress,
    threadId: string
  ): Promise<EmailMessage | null> {
    try {
      const messageData = {
        ...this.buildEmailMessage(emailData, emailAddress),
        threadId,
        folder: 'inbox' as const,
        isRead: false,
        isStarred: false,
        isArchived: false,
        isDraft: false
      };

      return await emailMessageService.create(messageData);
    } catch (error) {
      console.error('Error creating email message:', error);
      return null;
    }
  }

  /**
   * Baut das E-Mail-Message Objekt
   */
  private buildEmailMessage(
    emailData: IncomingEmailData,
    emailAddress: EmailAddress
  ): Partial<EmailMessage> {
    // Snippet erstellen (erste 150 Zeichen des Texts)
    const snippet = emailData.textContent
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);

    return {
      messageId: emailData.messageId,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      textContent: emailData.textContent,
      htmlContent: emailData.htmlContent,
      snippet,
      attachments: emailData.attachments || [],
      receivedAt: serverTimestamp() as Timestamp,
      labels: [],
      importance: 'normal' as const,
      emailAccountId: emailAddress.id!,
      organizationId: emailAddress.organizationId,
      userId: emailAddress.userId,
      headers: emailData.headers,
      inReplyTo: emailData.inReplyTo || undefined,
      references: emailData.references || [],
      spamScore: emailData.spamScore,
      spamReport: emailData.spamReport
    };
  }

  /**
   * Wendet Routing-Regeln an
   */
  private async applyRoutingRules(message: EmailMessage, emailAddress: EmailAddress): Promise<void> {
    if (!emailAddress.routingRules || emailAddress.routingRules.length === 0) {
      return;
    }

    console.log('📋 Applying routing rules');

    for (const rule of emailAddress.routingRules) {
      if (this.matchesRuleConditions(message, rule.conditions)) {
        console.log(`✅ Rule matched: ${rule.name}`);
        
        // Actions anwenden
        const updates: Partial<EmailMessage> = {};

        // Team-Zuweisung
        if (rule.actions.assignTo && rule.actions.assignTo.length > 0) {
          // EmailMessage hat kein assignedUserIds Feld
          // Stattdessen nutzen wir Labels oder ein separates Assignment-System
          const assignmentLabels = rule.actions.assignTo.map(userId => `assigned:${userId}`);
          updates.labels = [...(message.labels || []), ...assignmentLabels];
        }

        // Tags hinzufügen
        if (rule.actions.addTags && rule.actions.addTags.length > 0) {
          updates.labels = [...(message.labels || []), ...rule.actions.addTags];
        }

        // Priorität setzen
        if (rule.actions.setPriority) {
          updates.importance = rule.actions.setPriority;
        }

        // Updates anwenden
        if (Object.keys(updates).length > 0) {
          await emailMessageService.update(message.id!, updates);
        }

        // Auto-Reply (TODO: Implementieren wenn Template-System fertig ist)
        if (rule.actions.autoReply) {
          console.log('TODO: Send auto-reply with template:', rule.actions.autoReply);
        }
      }
    }
  }

  /**
   * Prüft ob eine Nachricht den Regel-Bedingungen entspricht
   */
  private matchesRuleConditions(
    message: EmailMessage, 
    conditions: any
  ): boolean {
    // Subject Check
    if (conditions.subject) {
      if (!message.subject.toLowerCase().includes(conditions.subject.toLowerCase())) {
        return false;
      }
    }

    // From Check
    if (conditions.from) {
      const fromCheck = conditions.from.toLowerCase();
      if (!message.from.email.includes(fromCheck) && 
          !(message.from.name?.toLowerCase().includes(fromCheck))) {
        return false;
      }
    }

    // Keywords Check
    if (conditions.keywords && conditions.keywords.length > 0) {
      const content = `${message.subject} ${message.textContent}`.toLowerCase();
      const hasKeyword = conditions.keywords.some((keyword: string) => 
        content.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sendet Benachrichtigungen
   */
  private async sendNotifications(message: EmailMessage, emailAddress: EmailAddress): Promise<void> {
    try {
      // Benachrichtige zugewiesene Team-Mitglieder
      // Da EmailMessage kein assignedUserIds hat, nutzen wir die EmailAddress assignedUserIds
      const assignedUsers = emailAddress.assignedUserIds || [];
      
      // Zusätzlich: Prüfe auf assigned: Labels
      const assignedLabels = message.labels?.filter(label => label.startsWith('assigned:')) || [];
      const labelUserIds = assignedLabels.map(label => label.replace('assigned:', ''));
      
      const allAssignedUsers = [...new Set([...assignedUsers, ...labelUserIds])];
      
      for (const userId of allAssignedUsers) {
        await notificationsService.create({
          userId,
          type: 'EMAIL_SENT_SUCCESS', // Verwende einen tatsächlichen NotificationType
          title: 'Neue E-Mail eingegangen',
          message: `Von: ${message.from.name || message.from.email} - ${message.subject}`,
          linkUrl: `/dashboard/communication/inbox?message=${message.id}`,
          linkType: 'campaign', // Verwende einen gültigen LinkType
          linkId: message.id,
          isRead: false,
          metadata: {
            // Verwende nur die Felder die in NotificationMetadata existieren
            campaignId: message.id, // Nutze message.id als pseudo campaignId
            campaignTitle: message.subject,
            recipientCount: 1
            // recipientEmail existiert nicht in NotificationMetadata
          }
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Fehler bei Benachrichtigungen sollten den Hauptprozess nicht stoppen
    }
  }

  /**
   * Triggert KI-Analyse (async)
   */
  private async triggerAIAnalysis(message: EmailMessage, threadId: string): Promise<void> {
    // TODO: Implementieren wenn KI-Integration fertig ist
    console.log('TODO: Trigger AI analysis for message:', message.id);
    
    // Beispiel-Struktur:
    // const analysis = await geminiService.analyzeEmail({
    //   subject: message.subject,
    //   content: message.textContent,
    //   from: message.from
    // });
    // 
    // await threadMatcherService.updateThreadAnalysis(threadId, analysis);
  }
}

// Singleton Export
export const emailProcessor = new EmailProcessor();