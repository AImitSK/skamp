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
    // Email-Adresse in local part und domain aufteilen
    const [localPartFull, domain] = address.split('@');

    // Validierung: Muss inbox domain sein
    if (domain !== this.INBOX_DOMAIN) {
      throw new Error(`Invalid inbox domain: ${domain}. Expected: ${this.INBOX_DOMAIN}`);
    }

    // Prüfe ob Projekt-Postfach (enthält Bindestrich)
    if (localPartFull.includes('-')) {
      const parts = localPartFull.split('-');

      // Projekt-Pattern: {localPart}-{projectId}
      // Beispiel: "presse-proj-abc123" -> localPart="presse", projectId="proj-abc123"
      if (parts.length >= 2) {
        const localPart = parts.slice(0, -1).join('-'); // Alles vor dem letzten Teil
        const projectId = parts[parts.length - 1]; // Letzter Teil

        console.log('✅ Projekt-Postfach erkannt:', { localPart, projectId });

        return {
          type: 'project',
          localPart,
          projectId,
          // domainId wird via Project nachgeladen
        };
      }
    }

    // Domain-Postfach (kein Bindestrich oder ungültiges Format)
    console.log('✅ Domain-Postfach erkannt:', { domain: localPartFull });

    return {
      type: 'domain',
      domain: localPartFull,
      domainId: `domain-${localPartFull}`,
    };
  }

  /**
   * Lädt vollständige DomainMailbox-Daten
   *
   * @param parsed Geparste Reply-To Daten
   * @param organizationId Organisation ID für Multi-Tenancy
   * @returns DomainMailbox mit allen Daten
   */
  async loadDomainMailbox(
    parsed: ParsedReplyTo,
    organizationId: string
  ): Promise<DomainMailbox | null> {
    try {
      // Für Projekt-Postfächer: Lade Projekt zuerst
      if (parsed.type === 'project' && parsed.projectId) {
        console.log('📋 Lade Projekt:', parsed.projectId);

        const projectDoc = await getDoc(doc(db, 'projects', parsed.projectId));

        if (!projectDoc.exists()) {
          console.warn(`⚠️ Projekt nicht gefunden: ${parsed.projectId}`);
          return null;
        }

        const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

        // Validierung: Prüfe organizationId
        if (project.organizationId !== organizationId) {
          console.warn(`⚠️ Projekt gehört zu anderer Organisation`);
          return null;
        }

        // Nutze domainId aus Projekt
        const domainId = project.domainId;

        if (!domainId) {
          console.warn(`⚠️ Projekt hat keine domainId`);
          return null;
        }

        console.log('📬 Lade Domain-Postfach:', domainId);

        const mailboxDoc = await getDoc(doc(db, 'domain_mailboxes', domainId));

        if (!mailboxDoc.exists()) {
          console.warn(`⚠️ Domain-Postfach nicht gefunden: ${domainId}`);
          return null;
        }

        return { id: mailboxDoc.id, ...mailboxDoc.data() } as DomainMailbox;
      }

      // Für Domain-Postfächer: Direkter Lookup
      if (parsed.type === 'domain' && parsed.domainId) {
        console.log('📬 Lade Domain-Postfach:', parsed.domainId);

        const mailboxDoc = await getDoc(doc(db, 'domain_mailboxes', parsed.domainId));

        if (!mailboxDoc.exists()) {
          console.warn(`⚠️ Domain-Postfach nicht gefunden: ${parsed.domainId}`);
          return null;
        }

        const mailbox = { id: mailboxDoc.id, ...mailboxDoc.data() } as DomainMailbox;

        // Validierung: Prüfe organizationId
        if (mailbox.organizationId !== organizationId) {
          console.warn(`⚠️ Domain-Postfach gehört zu anderer Organisation`);
          return null;
        }

        return mailbox;
      }

      return null;
    } catch (error) {
      console.error('❌ Fehler beim Laden des Domain-Postfachs:', error);
      return null;
    }
  }
}

// Singleton-Instanz
export const replyToParserService = new ReplyToParserService();
