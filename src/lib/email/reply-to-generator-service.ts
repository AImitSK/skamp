// src/lib/email/reply-to-generator-service.ts
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Reply-To Generator Service
 *
 * Generiert Reply-To Adressen für Campaign-Versand basierend auf:
 * - useSystemInbox Flag
 * - Projekt-Postfach Pattern
 */
class ReplyToGeneratorService {
  private readonly INBOX_DOMAIN = 'inbox.sk-online-marketing.de';

  /**
   * Generiert Reply-To Adresse für Campaign
   *
   * @param projectId Projekt ID
   * @param emailAddress Email-Adresse Objekt
   * @param useSystemInbox true = Inbox, false = eigene Software
   * @returns Reply-To Email-Adresse
   */
  async generateReplyTo(
    projectId: string | undefined,
    emailAddress: { email: string; localPart?: string; id?: string },
    useSystemInbox: boolean = true
  ): Promise<string> {
    // Inbox deaktiviert? → Reply-To = FROM
    if (!useSystemInbox) {
      console.log(`[ReplyToGenerator] Inbox deaktiviert → Reply-To = FROM (${emailAddress.email})`);
      return emailAddress.email;
    }

    // Kein Projekt? → Fallback zu FROM
    if (!projectId) {
      console.warn(`[ReplyToGenerator] Kein projectId → Fallback zu FROM`);
      return emailAddress.email;
    }

    // Projekt-Postfach erstellen/updaten
    await this.ensureProjectMailbox(projectId, emailAddress);

    // Reply-To Pattern: {localPart}-{projectId}@inbox.sk...
    const localPart = emailAddress.localPart || 'email';
    const replyTo = `${localPart}-${projectId}@${this.INBOX_DOMAIN}`;

    console.log(`[ReplyToGenerator] Generated Reply-To: ${replyTo}`);
    return replyTo;
  }

  /**
   * Erstellt oder aktualisiert Projekt-Postfach
   *
   * @param projectId Projekt ID
   * @param emailAddress Email-Adresse Objekt
   */
  private async ensureProjectMailbox(
    projectId: string,
    emailAddress: { email: string; localPart?: string; id?: string }
  ): Promise<void> {
    try {
      // Prüfe ob Projekt-Postfach bereits existiert
      const mailboxQuery = await adminDb
        .collection('inbox_project_mailboxes')
        .where('projectId', '==', projectId)
        .limit(1)
        .get();

      if (!mailboxQuery.empty) {
        // Postfach existiert bereits
        const mailbox = mailboxQuery.docs[0];
        console.log(`[ReplyToGenerator] Project mailbox exists: ${mailbox.id}`);

        // Update campaignCount
        await mailbox.ref.update({
          campaignCount: (mailbox.data().campaignCount || 0) + 1,
          updatedAt: Timestamp.now()
        });

        return;
      }

      // Lade Projekt-Daten
      const projectDoc = await adminDb.collection('pr_projects').doc(projectId).get();

      if (!projectDoc.exists) {
        console.warn(`[ReplyToGenerator] Project not found: ${projectId}`);
        return;
      }

      const project = projectDoc.data();
      const localPart = emailAddress.localPart || 'email';
      const inboxAddress = `${localPart}-${projectId}@${this.INBOX_DOMAIN}`;

      // Erstelle Projekt-Postfach
      const mailboxData = {
        projectId,
        domainId: project?.domainId || null,
        organizationId: project?.organizationId,
        userId: project?.userId,
        projectName: project?.title || 'Unbekanntes Projekt',
        inboxAddress,
        status: 'active',
        unreadCount: 0,
        threadCount: 0,
        campaignCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: project?.userId,
        updatedBy: project?.userId
      };

      const mailboxRef = await adminDb.collection('inbox_project_mailboxes').add(mailboxData);

      console.log(`[ReplyToGenerator] Created project mailbox: ${mailboxRef.id}`);
      console.log(`[ReplyToGenerator] Inbox address: ${inboxAddress}`);

    } catch (error) {
      console.error('[ReplyToGenerator] Error ensuring project mailbox:', error);
      // Nicht blockierend - Email kann trotzdem versendet werden
    }
  }
}

export const replyToGeneratorService = new ReplyToGeneratorService();
