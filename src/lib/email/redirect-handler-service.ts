// src/lib/email/redirect-handler-service.ts
import { db } from '@/lib/firebase/client-init';
import { doc, getDoc } from 'firebase/firestore';
import type { ParsedReplyTo } from './reply-to-parser-service';
import type { Project } from '@/types/project';

/**
 * Thread-Erstellungs-Parameter für Inbox
 */
export interface ThreadCreationParams {
  projectId: string | null;
  domainId: string;
  mailboxType: 'domain' | 'project';
  labels?: string[];
  redirectMetadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
    archivedAt?: any;
    redirectedAt?: Date;
    redirectReason?: 'project_archived' | 'manual';
  };
}

/**
 * Redirect Handler Service
 *
 * Behandelt eingehende E-Mails für archivierte Projekte
 * und leitet sie zu Domain-Postfächern um.
 *
 * WICHTIG: Wird vom Inbound Webhook verwendet
 */
class RedirectHandlerService {
  /**
   * Verarbeitet eingehende E-Mail und prüft auf Redirects
   *
   * @param parsedReplyTo Geparste Reply-To Adresse
   * @returns Thread-Erstellungs-Parameter
   *
   * @example
   * // Aktives Projekt → Projekt-Postfach
   * handleIncomingEmail({ type: 'project', projectId: 'proj-123', domainId: 'domain-xyz' })
   * // => { projectId: 'proj-123', domainId: 'domain-xyz', mailboxType: 'project' }
   *
   * @example
   * // Archiviertes Projekt → Domain-Postfach mit Redirect
   * handleIncomingEmail({ type: 'project', projectId: 'archived-proj', domainId: 'domain-xyz' })
   * // => { projectId: null, domainId: 'domain-xyz', mailboxType: 'domain', labels: ['redirected-from-archived'], metadata: {...} }
   */
  async handleIncomingEmail(
    parsedReplyTo: ParsedReplyTo
  ): Promise<ThreadCreationParams> {
    // Domain-Postfach: Kein Redirect nötig
    if (parsedReplyTo.type === 'domain') {
      console.log(`[RedirectHandler] Domain mailbox: ${parsedReplyTo.domain}`);

      return {
        projectId: null,
        domainId: parsedReplyTo.domainId!,
        mailboxType: 'domain'
      };
    }

    // Projekt-Postfach: Prüfe Status
    if (parsedReplyTo.type === 'project') {
      const project = await this.getProject(parsedReplyTo.projectId!);

      if (!project) {
        throw new Error(`Project not found: ${parsedReplyTo.projectId}`);
      }

      // Archiviertes Projekt? → Redirect zu Domain-Postfach
      if (project.status === 'archived') {
        console.log(`[RedirectHandler] Project archived, redirecting to domain mailbox: ${project.title}`);

        return {
          projectId: null,
          domainId: project.domainId || parsedReplyTo.domainId!,
          mailboxType: 'domain',
          labels: ['redirected-from-archived', `original-project:${project.id}`],
          redirectMetadata: {
            originalProjectId: project.id,
            originalProjectName: project.title,
            archivedAt: project.completedAt,
            redirectedAt: new Date(),
            redirectReason: 'project_archived'
          }
        };
      }

      // Abgeschlossenes Projekt? → Auch redirect (optional)
      if (project.status === 'completed') {
        console.log(`[RedirectHandler] Project completed, redirecting to domain mailbox: ${project.title}`);

        return {
          projectId: null,
          domainId: project.domainId || parsedReplyTo.domainId!,
          mailboxType: 'domain',
          labels: ['redirected-from-completed', `original-project:${project.id}`],
          redirectMetadata: {
            originalProjectId: project.id,
            originalProjectName: project.title,
            archivedAt: project.completedAt,
            redirectedAt: new Date(),
            redirectReason: 'project_archived'
          }
        };
      }

      // Aktives/On-Hold Projekt → Projekt-Postfach
      console.log(`[RedirectHandler] Active project, using project mailbox: ${project.title}`);

      return {
        projectId: parsedReplyTo.projectId!,
        domainId: project.domainId || parsedReplyTo.domainId!,
        mailboxType: 'project'
      };
    }

    throw new Error('Invalid parsed reply-to type');
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
        console.warn(`[RedirectHandler] Project not found: ${projectId}`);
        return null;
      }

      return {
        id: projectDoc.id,
        ...projectDoc.data()
      } as Project;
    } catch (error) {
      console.error(`[RedirectHandler] Error fetching project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Prüft ob ein Projekt archiviert ist
   *
   * @param projectId Projekt ID
   * @returns true wenn archiviert/completed, sonst false
   */
  async isProjectArchived(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);

    if (!project) {
      return false;
    }

    return project.status === 'archived' || project.status === 'completed';
  }
}

export const redirectHandlerService = new RedirectHandlerService();
