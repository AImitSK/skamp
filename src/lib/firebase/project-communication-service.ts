// src/lib/firebase/project-communication-service.ts - PLAN 7/9 KOMMUNIKATIONS-FEED-INTEGRATION
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { nanoid } from 'nanoid';
import type { 
  EmailThread, 
  EmailMessage, 
  EmailAddressInfo 
} from '@/types/email-enhanced';
import type { PipelineStage } from '@/types/project';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';

// ============================================
// INTERFACES FÜR PROJEKT-KOMMUNIKATION
// ============================================

export interface ProjectCommunicationFeed {
  projectId: string;
  entries: CommunicationEntry[];
  summary: CommunicationSummary;
  hasMore: boolean;
}

export interface CommunicationEntry {
  id: string;
  type: 'email-thread' | 'internal-note' | 'status-change' | 'approval-update';
  timestamp: Timestamp;
  title: string;
  preview: string;
  
  // Type-spezifische Daten
  emailData?: {
    threadId: string;
    subject: string;
    participants: EmailAddressInfo[];
    unreadCount: number;
    status: 'active' | 'waiting' | 'resolved';
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  noteData?: {
    content: string;
    author: string;
    mentions: string[];
  };
  
  statusData?: {
    previousStage: PipelineStage;
    newStage: PipelineStage;
    reason?: string;
  };
  
  approvalData?: {
    approvalId: string;
    status: string;
    customerFeedback?: string;
  };
}

export interface CommunicationSummary {
  totalEntries: number;
  unreadEmails: number;
  pendingApprovals: number;
  recentActivity: number; // Aktivität der letzten 24h
  mostActiveContact?: EmailAddressInfo;
  avgResponseTime?: number; // in Stunden
}

export interface ProjectInternalNote {
  id: string;
  projectId: string;
  content: string;
  author: string;
  authorName?: string;
  mentions: string[]; // User IDs
  attachments: string[]; // Asset IDs
  createdAt: Timestamp;
  organizationId: string;
}

// ============================================
// PROJECT COMMUNICATION SERVICE
// ============================================

export class ProjectCommunicationService {
  
  /**
   * Holt den Kommunikations-Feed für ein Projekt
   */
  async getProjectCommunicationFeed(
    projectId: string,
    organizationId: string,
    options: {
      limit?: number;
      types?: ('email-thread' | 'internal-note' | 'status-change' | 'approval-update')[];
      startAfter?: string;
    } = {}
  ): Promise<ProjectCommunicationFeed> {
    
    try {
      const feedLimit = options.limit || 25;
      const includeTypes = options.types || ['email-thread', 'internal-note', 'status-change', 'approval-update'];
      
      const [emailThreads, internalNotes, statusChanges, approvals] = await Promise.all([
        includeTypes.includes('email-thread') ? this.getProjectEmailThreads(projectId, organizationId, { limit: feedLimit }) : [],
        includeTypes.includes('internal-note') ? this.getProjectInternalNotes(projectId, organizationId, { limit: feedLimit }) : [],
        includeTypes.includes('status-change') ? this.getProjectStatusChanges(projectId, organizationId, { limit: feedLimit }) : [],
        includeTypes.includes('approval-update') ? this.getProjectApprovals(projectId, organizationId, { limit: feedLimit }) : []
      ]);
      
      // Alle Einträge chronologisch zusammenführen
      const entries = this.mergeAndSortEntries([
        ...emailThreads,
        ...internalNotes,
        ...statusChanges,
        ...approvals
      ]);
      
      return {
        projectId,
        entries: entries.slice(0, feedLimit),
        summary: await this.calculateCommunicationSummary(projectId, organizationId),
        hasMore: entries.length > feedLimit
      };
      
    } catch (error) {
      console.error('Failed to get project communication feed:', error);
      throw error;
    }
  }
  
  /**
   * Holt E-Mail-Threads für ein Projekt
   */
  private async getProjectEmailThreads(
    projectId: string, 
    organizationId: string,
    options: { limit?: number } = {}
  ): Promise<CommunicationEntry[]> {
    
    try {
      const threadsQuery = query(
        collection(db, 'email_threads'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId),
        orderBy('lastMessageAt', 'desc'),
        limit(options.limit || 10)
      );
      
      const snapshot = await getDocs(threadsQuery);
      const entries: CommunicationEntry[] = [];
      
      snapshot.forEach(doc => {
        const thread = { ...doc.data(), id: doc.id } as EmailThread & { projectId: string };
        
        entries.push({
          id: doc.id,
          type: 'email-thread',
          timestamp: thread.lastMessageAt,
          title: thread.subject,
          preview: `${thread.messageCount} Nachrichten mit ${thread.participants.length} Teilnehmern`,
          emailData: {
            threadId: doc.id,
            subject: thread.subject,
            participants: thread.participants,
            unreadCount: thread.unreadCount,
            status: (thread.status as 'active' | 'waiting' | 'resolved') || 'active',
            priority: thread.priority || 'normal'
          }
        });
      });
      
      return entries;
      
    } catch (error) {
      console.error('Failed to get project email threads:', error);
      return [];
    }
  }
  
  /**
   * Holt interne Notizen für ein Projekt
   */
  private async getProjectInternalNotes(
    projectId: string,
    organizationId: string,
    options: { limit?: number } = {}
  ): Promise<CommunicationEntry[]> {
    
    try {
      const notesQuery = query(
        collection(db, 'project_internal_notes'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        limit(options.limit || 10)
      );
      
      const snapshot = await getDocs(notesQuery);
      const entries: CommunicationEntry[] = [];
      
      snapshot.forEach(doc => {
        const note = { ...doc.data(), id: doc.id } as ProjectInternalNote;
        
        entries.push({
          id: doc.id,
          type: 'internal-note',
          timestamp: note.createdAt,
          title: `Notiz von ${note.authorName || note.author}`,
          preview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
          noteData: {
            content: note.content,
            author: note.authorName || note.author,
            mentions: note.mentions
          }
        });
      });
      
      return entries;
      
    } catch (error) {
      console.error('Failed to get project internal notes:', error);
      return [];
    }
  }
  
  /**
   * Holt Status-Änderungen für ein Projekt (Placeholder)
   */
  private async getProjectStatusChanges(
    projectId: string,
    organizationId: string,
    options: { limit?: number } = {}
  ): Promise<CommunicationEntry[]> {
    
    try {
      // TODO: Implementiere Status-Change-Tracking
      // Für jetzt: Beispiel-Daten aus project_history Collection
      const historyQuery = query(
        collection(db, 'project_history'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId),
        where('type', '==', 'status-change'),
        orderBy('createdAt', 'desc'),
        limit(options.limit || 5)
      );
      
      const snapshot = await getDocs(historyQuery);
      const entries: CommunicationEntry[] = [];
      
      snapshot.forEach(doc => {
        const change = doc.data();
        
        entries.push({
          id: doc.id,
          type: 'status-change',
          timestamp: change.createdAt,
          title: `Status geändert: ${change.previousStage} → ${change.newStage}`,
          preview: change.reason || 'Keine Begründung angegeben',
          statusData: {
            previousStage: change.previousStage,
            newStage: change.newStage,
            reason: change.reason
          }
        });
      });
      
      return entries;
      
    } catch (error) {
      console.error('Failed to get project status changes:', error);
      return [];
    }
  }
  
  /**
   * Holt Freigabe-Updates für ein Projekt (Placeholder)
   */
  private async getProjectApprovals(
    projectId: string,
    organizationId: string,
    options: { limit?: number } = {}
  ): Promise<CommunicationEntry[]> {
    
    try {
      // TODO: Implementiere Approval-Tracking Integration
      // Für jetzt: Beispiel-Daten aus approval_history Collection
      const approvalQuery = query(
        collection(db, 'approval_history'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        limit(options.limit || 5)
      );
      
      const snapshot = await getDocs(approvalQuery);
      const entries: CommunicationEntry[] = [];
      
      snapshot.forEach(doc => {
        const approval = doc.data();
        
        entries.push({
          id: doc.id,
          type: 'approval-update',
          timestamp: approval.createdAt,
          title: `Freigabe-Update: ${approval.status}`,
          preview: approval.customerFeedback || 'Status-Update erhalten',
          approvalData: {
            approvalId: approval.approvalId,
            status: approval.status,
            customerFeedback: approval.customerFeedback
          }
        });
      });
      
      return entries;
      
    } catch (error) {
      console.error('Failed to get project approvals:', error);
      return [];
    }
  }
  
  /**
   * Fügt alle Einträge zusammen und sortiert sie chronologisch
   */
  private mergeAndSortEntries(entries: CommunicationEntry[]): CommunicationEntry[] {
    return entries.sort((a, b) => {
      const timeA = a.timestamp.toMillis();
      const timeB = b.timestamp.toMillis();
      return timeB - timeA; // Neueste zuerst
    });
  }
  
  /**
   * Berechnet Kommunikations-Summary für ein Projekt
   */
  private async calculateCommunicationSummary(
    projectId: string,
    organizationId: string
  ): Promise<CommunicationSummary> {
    
    try {
      // E-Mail-Threads zählen
      const threadsQuery = query(
        collection(db, 'email_threads'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId)
      );
      const threadsSnapshot = await getDocs(threadsQuery);
      
      let unreadEmails = 0;
      const contactActivity = new Map<string, number>();
      
      threadsSnapshot.forEach(doc => {
        const thread = doc.data() as EmailThread;
        unreadEmails += thread.unreadCount || 0;
        
        // Zähle Aktivität pro Kontakt
        thread.participants.forEach(participant => {
          const current = contactActivity.get(participant.email) || 0;
          contactActivity.set(participant.email, current + (thread.messageCount || 1));
        });
      });
      
      // Aktivste Kontakte finden
      let mostActiveContact: EmailAddressInfo | undefined;
      let maxActivity = 0;
      
      contactActivity.forEach((activity, email) => {
        if (activity > maxActivity) {
          maxActivity = activity;
          mostActiveContact = { email };
        }
      });
      
      // Notizen zählen
      const notesQuery = query(
        collection(db, 'project_internal_notes'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId)
      );
      const notesSnapshot = await getDocs(notesQuery);
      
      // TODO: Pending Approvals zählen
      const pendingApprovals = 0;
      
      // Aktivität der letzten 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentActivityQuery = query(
        collection(db, 'email_threads'),
        where('projectId', '==', projectId),
        where('organizationId', '==', organizationId),
        where('lastMessageAt', '>=', Timestamp.fromDate(yesterday))
      );
      const recentActivitySnapshot = await getDocs(recentActivityQuery);
      
      return {
        totalEntries: threadsSnapshot.size + notesSnapshot.size,
        unreadEmails,
        pendingApprovals,
        recentActivity: recentActivitySnapshot.size,
        mostActiveContact,
        avgResponseTime: 2.5 // TODO: Echte Berechnung implementieren
      };
      
    } catch (error) {
      console.error('Failed to calculate communication summary:', error);
      return {
        totalEntries: 0,
        unreadEmails: 0,
        pendingApprovals: 0,
        recentActivity: 0
      };
    }
  }
  
  /**
   * Verknüpft E-Mail-Thread manuell mit Projekt
   */
  async linkEmailToProject(
    threadId: string,
    projectId: string,
    method: 'manual' | 'automatic',
    confidence: number = 1.0,
    userId?: string
  ): Promise<void> {
    try {
      await threadMatcherService.linkEmailToProject(
        threadId,
        projectId,
        method,
        confidence,
        userId
      );
      
      // Projekt-Kommunikations-Summary aktualisieren
      await this.updateProjectCommunicationSummary(projectId);
      
    } catch (error) {
      console.error('Failed to link email to project:', error);
      throw error;
    }
  }
  
  /**
   * Erstellt eine interne Notiz für ein Projekt
   */
  async createInternalNote(
    projectId: string,
    content: string,
    author: string,
    authorName: string,
    organizationId: string,
    mentions?: string[],
    attachments?: string[]
  ): Promise<string> {
    
    try {
      const noteId = nanoid();
      
      const note: ProjectInternalNote = {
        id: noteId,
        projectId,
        content,
        author,
        authorName,
        mentions: mentions || [],
        attachments: attachments || [],
        createdAt: serverTimestamp() as Timestamp,
        organizationId
      };
      
      await setDoc(doc(db, 'project_internal_notes', noteId), note);
      
      // Projekt-Kommunikations-Summary aktualisieren
      await this.updateProjectCommunicationSummary(projectId);
      
      return noteId;
      
    } catch (error) {
      console.error('Failed to create internal note:', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert die Projekt-Kommunikations-Summary
   */
  private async updateProjectCommunicationSummary(projectId: string): Promise<void> {
    try {
      // Hole aktuelles Projekt
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) return;
      
      const project = projectDoc.data();
      const organizationId = project.organizationId;
      
      // Berechne neue Summary
      const summary = await this.calculateCommunicationSummary(projectId, organizationId);
      
      // Update Projekt mit neuer Summary
      await updateDoc(doc(db, 'projects', projectId), {
        communicationSummary: {
          totalEmails: summary.totalEntries, // Vereinfacht: nur E-Mails zählen
          unreadEmails: summary.unreadEmails,
          pendingApprovals: summary.pendingApprovals,
          lastActivity: serverTimestamp(),
          mostActiveContact: summary.mostActiveContact,
          avgResponseTime: summary.avgResponseTime
        },
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Failed to update project communication summary:', error);
    }
  }
  
  /**
   * Hilfsmethode: Holt Organisation-ID für ein Projekt
   */
  private async getOrganizationIdForProject(projectId: string): Promise<string> {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        return projectDoc.data().organizationId;
      }
      throw new Error('Projekt nicht gefunden');
    } catch (error) {
      console.error('Failed to get organization ID for project:', error);
      throw error;
    }
  }
}

// Singleton Export
export const projectCommunicationService = new ProjectCommunicationService();