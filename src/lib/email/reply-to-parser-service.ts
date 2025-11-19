// src/lib/email/reply-to-parser-service.ts
import { db } from '@/lib/firebase/client-init';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  limit
} from 'firebase/firestore';
import type { Project } from '@/types/project';
import type { DomainMailbox } from '@/types/inbox';

/**
 * Geparste Reply-To Adresse
 */
export interface ParsedReplyTo {
  type: 'domain' | 'project';
  domain?: string;
  domainId?: string;
  localPart?: string;
  projectId?: string;
}

/**
 * Reply-To Parser Service
 *
 * Parst eingehende E-Mail-Adressen und unterscheidet zwischen:
 * - Domain-Postfächern: {domain}@inbox.sk-online-marketing.de
 * - Projekt-Postfächern: {localPart}-{projectId}@inbox.sk-online-marketing.de
 *
 * WICHTIG: Wird vom Inbound Webhook verwendet
 */
class ReplyToParserService {
  private readonly INBOX_DOMAIN = 'inbox.sk-online-marketing.de';

  /**
   * Parst eine Reply-To Adresse
   *
   * @param address E-Mail-Adresse (z.B. "presse-proj-123@inbox.sk...")
   * @returns Geparste Informationen
   * @throws Error wenn ungültige Domain oder Format
   *
   * @example
   * // Domain-Postfach
   * parse("xyz@inbox.sk-online-marketing.de")
   * // => { type: 'domain', domain: 'xyz', domainId: 'domain-xyz' }
   *
   * @example
   * // Projekt-Postfach
   * parse("presse-proj-123@inbox.sk-online-marketing.de")
   * // => { type: 'project', localPart: 'presse', projectId: 'proj-123', domainId: 'domain-xyz' }
   */
  async parse(address: string): Promise<ParsedReplyTo> {
    // Email-Adresse in local part und domain aufte

ilen
    const [localPartFull, domain] = address.split('@');

    // Validierung: Muss inbox domain sein
    if (domain !== this.INBOX_DOMAIN) {
      throw new Error(`Invalid inbox domain: ${domain}. Expected: ${this.INBOX_DOMAIN}`);
    }

    // Prüfe ob Projekt-Postfach (enthält Bindestrich)
    if (localPartFull.includes('-')) {
      const parts = localPartFull.split('-');

      // Projekt-Pattern: {localPart}-{projectId}
      if (parts.length === 2) {
        const localPart = parts[0];
        const projectId = parts[1];

        console.log(`[ReplyToParser] Detected project mailbox: ${localPart}-${projectId}`);

        // Hole Projekt um domainId zu bekommen
        const project = await this.getProject(projectId);

        if (!project) {
          throw new Error(`Project not found: ${projectId}`);
        }

        if (!project.domainId) {
          // Fallback: Suche domainId via emailAddressId
          if (project.emailAddressId) {
            const emailAddress = await this.getEmailAddressDomain(project.emailAddressId);
            if (emailAddress) {
              return {
                type: 'project',
                localPart,
                projectId,
                domainId: emailAddress.domainId
              };
            }
          }

          throw new Error(`Project ${projectId} has no domainId`);
        }

        return {
          type: 'project',
          localPart,
          projectId,
          domainId: project.domainId
        };
      }
    }

    // Domain-Postfach
    const domainName = localPartFull;
    console.log(`[ReplyToParser] Detected domain mailbox: ${domainName}`);

    const domainMailbox = await this.getDomainMailbox(domainName);

    if (!domainMailbox) {
      throw new Error(`Domain mailbox not found: ${domainName}@${this.INBOX_DOMAIN}`);
    }

    return {
      type: 'domain',
      domain: domainName,
      domainId: domainMailbox.domainId
    };
  }

  /**
   * Holt Projekt aus Firestore
   *
   * @param projectId Projekt ID
   * @returns Projekt oder null
   */
  private async getProject(projectId: string): Promise<Project | null> {
    try {
      const projectDoc = await getDoc(doc(db, 'pr_projects', projectId));

      if (!projectDoc.exists()) {
        return null;
      }

      return {
        id: projectDoc.id,
        ...projectDoc.data()
      } as Project;
    } catch (error) {
      console.error(`[ReplyToParser] Error fetching project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Holt Email Address und deren Domain
   *
   * @param emailAddressId Email Address ID
   * @returns Email Address mit domainId oder null
   */
  private async getEmailAddressDomain(emailAddressId: string): Promise<{ domainId: string } | null> {
    try {
      const emailDoc = await getDoc(doc(db, 'email_addresses', emailAddressId));

      if (!emailDoc.exists()) {
        return null;
      }

      const data = emailDoc.data();
      return data.domainId ? { domainId: data.domainId } : null;
    } catch (error) {
      console.error(`[ReplyToParser] Error fetching email address ${emailAddressId}:`, error);
      return null;
    }
  }

  /**
   * Holt Domain-Postfach aus Firestore
   *
   * @param domainName Domain Name (z.B. "xyz" für xyz.de)
   * @returns Domain Mailbox oder null
   */
  private async getDomainMailbox(domainName: string): Promise<DomainMailbox | null> {
    try {
      // Suche nach Domain-Postfach mit matching inboxAddress
      const inboxAddress = `${domainName}@${this.INBOX_DOMAIN}`;

      const snapshot = await getDocs(
        query(
          collection(db, 'inbox_domain_mailboxes'),
          where('inboxAddress', '==', inboxAddress),
          limit(1)
        )
      );

      if (snapshot.empty) {
        // Fallback: Suche nach domain field
        const snapshot2 = await getDocs(
          query(
            collection(db, 'inbox_domain_mailboxes'),
            where('domain', '==', domainName),
            limit(1)
          )
        );

        if (snapshot2.empty) {
          return null;
        }

        return {
          id: snapshot2.docs[0].id,
          ...snapshot2.docs[0].data()
        } as DomainMailbox;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as DomainMailbox;
    } catch (error) {
      console.error(`[ReplyToParser] Error fetching domain mailbox ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Validiert ob eine Adresse eine gültige Inbox-Adresse ist
   *
   * @param address E-Mail-Adresse
   * @returns true wenn gültig, sonst false
   */
  isValidInboxAddress(address: string): boolean {
    return address.endsWith(`@${this.INBOX_DOMAIN}`);
  }
}

export const replyToParserService = new ReplyToParserService();
