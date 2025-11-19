// src/lib/email/default-email-service.ts
import { db } from '@/lib/firebase/client-init';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { EmailAddress } from '@/types/email-enhanced';
import type { DomainMailbox } from '@/types/inbox';

/**
 * Default Email Service
 *
 * Erstellt automatisch eine Default-Email für neue Organizations
 * auf der shared Domain celeropress.com
 *
 * WICHTIG: Wird automatisch beim Organization-Signup aufgerufen
 */
class DefaultEmailService {
  // Default Domain ID (celeropress.com in Firestore)
  private readonly DEFAULT_DOMAIN_ID = 'icg2wwuTis8tv1WMCnKr';
  private readonly DEFAULT_DOMAIN = 'celeropress.com';
  private readonly INBOX_DOMAIN = 'inbox.sk-online-marketing.de';

  /**
   * Erstellt Default-Email und Domain-Postfach für neue Organization
   *
   * @param organizationId Organization ID
   * @param organizationName Organization Name (z.B. "XYZ GmbH")
   * @param userId User ID des Erstellers
   * @returns Email Address ID
   */
  async createDefaultEmailForOrganization(
    organizationId: string,
    organizationName: string,
    userId: string
  ): Promise<string> {
    try {
      console.log(`[DefaultEmailService] Creating default email for org: ${organizationName}`);

      // 1. Generiere Organization Slug
      const slug = this.generateSlug(organizationName);
      console.log(`[DefaultEmailService] Generated slug: ${slug}`);

      // 2. Prüfe ob Default Domain existiert
      const defaultDomainExists = await this.verifyDefaultDomain();
      if (!defaultDomainExists) {
        throw new Error('Default domain (celeropress.com) not configured in Firestore');
      }

      // 3. Erstelle Email-Adresse
      const emailData: Partial<EmailAddress> = {
        email: `${slug}@${this.DEFAULT_DOMAIN}`,
        localPart: slug,
        domainId: this.DEFAULT_DOMAIN_ID,
        displayName: organizationName,
        organizationId,
        userId,
        isActive: true,
        isDefault: true,
        isSharedDomain: true,
        inboxEnabled: true,
        assignedUserIds: [userId],
        permissions: {
          read: [userId],
          write: [userId],
          manage: [userId]
        },
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy: userId,
        updatedBy: userId
      };

      const emailRef = await addDoc(collection(db, 'email_addresses'), emailData);
      console.log(`[DefaultEmailService] Email created: ${emailRef.id}`);

      // 4. Erstelle Domain-Postfach
      await this.createDomainMailbox({
        domainId: this.DEFAULT_DOMAIN_ID,
        organizationId,
        userId,
        domain: this.DEFAULT_DOMAIN,
        inboxAddress: `${slug}@${this.INBOX_DOMAIN}`,
        isDefault: true,
        isShared: true
      });

      console.log(`[DefaultEmailService] Domain mailbox created for: ${slug}`);

      return emailRef.id;
    } catch (error) {
      console.error('[DefaultEmailService] Error creating default email:', error);
      throw error;
    }
  }

  /**
   * Generiert Organization Slug aus Name
   *
   * Regeln:
   * - Kleinbuchstaben
   * - Keine Sonderzeichen
   * - Bindestriche statt Leerzeichen
   * - Max 50 Zeichen
   *
   * @param name Organization Name
   * @returns Slug (z.B. "xyz-gmbh")
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')                        // Umlaute normalisieren
      .replace(/[\u0300-\u036f]/g, '')        // Akzente entfernen
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')            // Alles außer a-z0-9 → Bindestrich
      .replace(/^-+|-+$/g, '')                // Führende/Trailing Bindestriche
      .substring(0, 50);                       // Max 50 Zeichen
  }

  /**
   * Erstellt Domain-Postfach
   *
   * @param data Postfach-Daten
   * @returns Mailbox ID
   */
  private async createDomainMailbox(data: {
    domainId: string;
    organizationId: string;
    userId: string;
    domain: string;
    inboxAddress: string;
    isDefault: boolean;
    isShared: boolean;
  }): Promise<string> {
    const mailboxData: Partial<DomainMailbox> = {
      domainId: data.domainId,
      domain: data.domain,
      inboxAddress: data.inboxAddress,
      organizationId: data.organizationId,
      status: 'active',
      unreadCount: 0,
      threadCount: 0,
      isDefault: data.isDefault,
      isShared: data.isShared,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      userId: data.userId,
      createdBy: data.userId,
      updatedBy: data.userId
    };

    const mailboxRef = await addDoc(collection(db, 'inbox_domain_mailboxes'), mailboxData);
    return mailboxRef.id;
  }

  /**
   * Verifiziert ob Default Domain in Firestore existiert
   *
   * @returns true wenn existiert, sonst false
   */
  private async verifyDefaultDomain(): Promise<boolean> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'email_domains_enhanced'),
          where('domain', '==', this.DEFAULT_DOMAIN),
          where('isDefault', '==', true),
          where('isShared', '==', true),
          limit(1)
        )
      );

      return !snapshot.empty;
    } catch (error) {
      console.error('[DefaultEmailService] Error verifying default domain:', error);
      return false;
    }
  }

  /**
   * Prüft ob Organization bereits eine Default-Email hat
   *
   * @param organizationId Organization ID
   * @returns true wenn existiert, sonst false
   */
  async hasDefaultEmail(organizationId: string): Promise<boolean> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'email_addresses'),
          where('organizationId', '==', organizationId),
          where('isDefault', '==', true),
          limit(1)
        )
      );

      return !snapshot.empty;
    } catch (error) {
      console.error('[DefaultEmailService] Error checking default email:', error);
      return false;
    }
  }
}

export const defaultEmailService = new DefaultEmailService();
