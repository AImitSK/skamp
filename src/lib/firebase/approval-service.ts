// src/lib/firebase/approval-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
  updateDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from './client-init';
import { BaseService, QueryOptions, FilterOptions } from './service-base';
import {
  ApprovalEnhanced,
  ApprovalStatus,
  ApprovalWorkflow,
  ApprovalRecipient,
  ApprovalHistoryEntry,
  ApprovalAction,
  ApprovalFilters,
  ApprovalStatistics,
  ApprovalListView,
  LegacyApprovalData,
  DEFAULT_REMINDER_INTERVALS
} from '@/types/approvals';
import { PRCampaign } from '@/types/pr';
import { teamMemberService } from './organization-service';
import { nanoid } from 'nanoid';

// ========================================
// Approval Service mit Multi-Tenancy
// ========================================

class ApprovalService extends BaseService<ApprovalEnhanced> {
  constructor() {
    super('approvals');
  }

  /**
   * Erstellt eine neue Freigabe-Anfrage
   */
  async create(
    data: Omit<ApprovalEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'shareId' | 'history' | 'analytics' | 'notifications' | 'version'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Generiere eindeutige Share ID
      const shareId = this.generateShareId();
      
      // Initialisiere Empfänger-Status
      const recipients = data.recipients.map((r, index) => ({
        ...r,
        id: nanoid(10),
        status: 'pending' as const,
        notificationsSent: 0,
        order: r.order || index
      }));

      // Erstelle initiale Historie
      const history: ApprovalHistoryEntry[] = [{
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: 'created',
        userId: context.userId,
        actorName: 'System',
        details: {
          newStatus: 'draft'
        }
      }];

      // Approval-Daten vorbereiten
      const approvalData: Omit<ApprovalEnhanced, 'id'> = {
        ...data,
        organizationId: context.organizationId,
        createdBy: context.userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        shareId,
        recipients,
        status: 'draft',
        requestedAt: serverTimestamp() as Timestamp,
        history,
        analytics: {
          totalViews: 0,
          uniqueViews: 0
        },
        notifications: {
          requested: {
            sent: false,
            method: 'email'
          }
        },
        version: 1
      };

      return super.create(approvalData as any, context);
    } catch (error) {
      console.error('Error creating approval:', error);
      throw new Error('Fehler beim Erstellen der Freigabe');
    }
  }

  /**
   * Sendet Freigabe-Anfrage an Empfänger
   */
  async sendForApproval(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) {
        throw new Error('Freigabe nicht gefunden');
      }

      if (approval.status !== 'draft') {
        throw new Error('Freigabe wurde bereits gesendet');
      }

      // Update Status und Historie
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: 'sent_for_approval',
        userId: context.userId,
        actorName: 'System',
        details: {
          previousStatus: approval.status,
          newStatus: 'pending'
        }
      };

      await this.update(approvalId, {
        status: 'pending',
        requestedAt: serverTimestamp() as Timestamp,
        history: arrayUnion(historyEntry) as any,
        notifications: {
          ...approval.notifications,
          requested: {
            sent: true,
            sentAt: serverTimestamp() as Timestamp,
            method: 'email'
          }
        }
      }, context);

      // TODO: E-Mail-Benachrichtigungen senden
      await this.sendNotifications(approval, 'request');
    } catch (error) {
      console.error('Error sending for approval:', error);
      throw error;
    }
  }

  /**
   * Lädt Freigabe by Share ID (für öffentlichen Zugriff)
   */
  async getByShareId(shareId: string): Promise<ApprovalEnhanced | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('shareId', '==', shareId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ApprovalEnhanced;
    } catch (error) {
      console.error('Error fetching by share ID:', error);
      return null;
    }
  }

  /**
   * Markiert Freigabe als angesehen
   */
  async markAsViewed(
    shareId: string,
    recipientEmail?: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) return;

      // Update Analytics
      const updates: any = {
        'analytics.lastViewedAt': serverTimestamp(),
        'analytics.totalViews': increment(1)
      };

      // Wenn erstmalig angesehen
      if (!approval.analytics.firstViewedAt) {
        updates['analytics.firstViewedAt'] = serverTimestamp();
        updates['analytics.uniqueViews'] = increment(1);
      }

      // Update Empfänger-Status wenn E-Mail bekannt
      if (recipientEmail && approval.recipients) {
        const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
        if (recipientIndex >= 0 && approval.recipients[recipientIndex].status === 'pending') {
          const recipient = approval.recipients[recipientIndex];
          recipient.status = 'viewed';
          recipient.viewedAt = serverTimestamp() as Timestamp;
          
          updates[`recipients.${recipientIndex}`] = recipient;
          
          // Wenn alle angesehen haben, Status updaten
          const allViewed = approval.recipients.every((r, i) => 
            i === recipientIndex ? true : r.status !== 'pending'
          );
          
          if (allViewed && approval.status === 'pending') {
            updates.status = 'in_review';
          }
        }
      }

      // Historie-Eintrag
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: 'viewed',
        actorName: recipientEmail || 'Anonym',
        actorEmail: recipientEmail,
        details: metadata || {}
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }

  /**
   * Genehmigt oder lehnt Freigabe ab
   */
  async submitDecision(
    shareId: string,
    recipientEmail: string,
    decision: 'approved' | 'rejected',
    comment?: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }

      // Finde Empfänger
      const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
      if (recipientIndex < 0) {
        throw new Error('Sie sind nicht berechtigt, diese Freigabe zu bearbeiten');
      }

      const recipient = approval.recipients[recipientIndex];
      
      // Update Empfänger
      recipient.status = decision;
      recipient.decidedAt = serverTimestamp() as Timestamp;
      recipient.decision = decision;
      if (comment) recipient.comment = comment;

      const updates: any = {
        [`recipients.${recipientIndex}`]: recipient,
        updatedAt: serverTimestamp()
      };

      // Bestimme neuen Gesamt-Status basierend auf Workflow
      const newStatus = this.calculateApprovalStatus(approval, recipientIndex, decision);
      if (newStatus !== approval.status) {
        updates.status = newStatus;
        
        if (newStatus === 'approved') {
          updates.approvedAt = serverTimestamp();
        } else if (newStatus === 'rejected') {
          updates.rejectedAt = serverTimestamp();
        }
      }

      // Historie-Eintrag
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: decision,
        recipientId: recipient.id,
        actorName: recipient.name,
        actorEmail: recipient.email,
        details: {
          previousStatus: approval.status,
          newStatus,
          comment,
          changes: inlineComments ? { inlineComments } : undefined
        },
        inlineComments
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);

      // Benachrichtigungen senden
      if (newStatus !== approval.status) {
        await this.sendStatusChangeNotification(approval, newStatus);
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      throw error;
    }
  }

  /**
   * Fordert Änderungen an
   */
  async requestChanges(
    shareId: string,
    recipientEmail: string,
    comment: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }

      const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
      if (recipientIndex < 0) {
        throw new Error('Nicht berechtigt');
      }

      const recipient = approval.recipients[recipientIndex];
      recipient.status = 'commented';
      recipient.comment = comment;

      const updates: any = {
        [`recipients.${recipientIndex}`]: recipient,
        status: 'changes_requested',
        updatedAt: serverTimestamp()
      };

      // Historie
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: 'changes_requested',
        recipientId: recipient.id,
        actorName: recipient.name,
        actorEmail: recipient.email,
        details: {
          comment,
          previousStatus: approval.status,
          newStatus: 'changes_requested',
          changes: inlineComments ? { inlineComments } : undefined
        },
        inlineComments
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
      
      // Benachrichtigung senden
      await this.sendStatusChangeNotification(approval, 'changes_requested');
    } catch (error) {
      console.error('Error requesting changes:', error);
      throw error;
    }
  }

  /**
   * Lädt Freigaben mit erweiterten Filtern
   */
  async searchEnhanced(
    organizationId: string,
    filters: ApprovalFilters,
    options: QueryOptions = {}
  ): Promise<ApprovalListView[]> {
    try {
      let approvals = await this.getAll(organizationId, options);

      // Client-seitige Filterung
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        approvals = approvals.filter(approval =>
          approval.title.toLowerCase().includes(searchLower) ||
          approval.clientName.toLowerCase().includes(searchLower) ||
          approval.campaignTitle.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status?.length) {
        approvals = approvals.filter(a => filters.status!.includes(a.status));
      }

      if (filters.clientIds?.length) {
        approvals = approvals.filter(a => a.clientId && filters.clientIds!.includes(a.clientId));
      }

      if (filters.priority?.length) {
        approvals = approvals.filter(a => a.priority && filters.priority!.includes(a.priority));
      }

      if (filters.workflow?.length) {
        approvals = approvals.filter(a => filters.workflow!.includes(a.workflow));
      }

      if (filters.hasAttachments !== undefined) {
        approvals = approvals.filter(a => 
          filters.hasAttachments ? (a.attachedAssets && a.attachedAssets.length > 0) : (!a.attachedAssets || a.attachedAssets.length === 0)
        );
      }

      // Datum-Filter
      if (filters.dateRange) {
        const fromDate = Timestamp.fromDate(filters.dateRange.from);
        const toDate = Timestamp.fromDate(filters.dateRange.to);
        
        approvals = approvals.filter(a => {
          const requestedAt = a.requestedAt as Timestamp;
          return requestedAt >= fromDate && requestedAt <= toDate;
        });
      }

      // Erweitere mit berechneten Feldern
      const enhancedApprovals = approvals.map(approval => {
        const pendingCount = approval.recipients.filter(r => r.status === 'pending').length;
        const approvedCount = approval.recipients.filter(r => r.status === 'approved').length;
        const totalRequired = approval.recipients.filter(r => r.isRequired).length || approval.recipients.length;
        
        const progressPercentage = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;
        
        const isOverdue = approval.options.expiresAt && 
          approval.status === 'pending' && 
          approval.options.expiresAt.toDate() < new Date();

        return {
          ...approval,
          pendingCount,
          approvedCount,
          progressPercentage,
          isOverdue: !!isOverdue
        } as ApprovalListView;
      });

      // Filter überfällige
      if (filters.isOverdue !== undefined) {
        return enhancedApprovals.filter(a => a.isOverdue === filters.isOverdue);
      }

      return enhancedApprovals;
    } catch (error) {
      console.error('Error in enhanced approval search:', error);
      return [];
    }
  }

  /**
   * Erstellt Freigabe aus PR-Kampagne (Migration/Integration)
   */
  async createFromCampaign(
    campaign: PRCampaign,
    recipients: Omit<ApprovalRecipient, 'id' | 'status' | 'notificationsSent'>[],
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // PRCampaign hat kein content oder subject Feld, nur contentHtml
      const plainTextContent = this.stripHtml(campaign.contentHtml).substring(0, 500);
      
      const approvalData: Omit<ApprovalEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'shareId' | 'history' | 'analytics' | 'notifications' | 'version'> = {
        title: campaign.title,
        description: plainTextContent.substring(0, 200), // Erste 200 Zeichen als Beschreibung
        campaignId: campaign.id!,
        campaignTitle: campaign.title,
        clientId: campaign.clientId,
        clientName: campaign.clientName || 'Unbekannt',
        clientEmail: undefined, // TODO: Client E-Mail muss im PRCampaign Model ergänzt werden
        recipients: recipients.map((r, index) => ({
          ...r,
          id: nanoid(10),
          status: 'pending' as const,
          notificationsSent: 0
        })),
        content: {
          html: campaign.contentHtml,
          plainText: plainTextContent,
          subject: campaign.title // Verwende Titel als Subject
        },
        attachedAssets: campaign.attachedAssets?.map(asset => ({
          assetId: asset.assetId || asset.folderId || '',
          type: asset.type as 'file' | 'folder',
          name: asset.metadata?.fileName || asset.metadata?.folderName || 'Unbekannt',
          metadata: asset.metadata
        })),
        status: 'draft' as ApprovalStatus,
        workflow: 'simple' as ApprovalWorkflow,
        options: {
          requireAllApprovals: false,
          allowPartialApproval: true,
          autoSendAfterApproval: false,
          allowComments: true,
          allowInlineComments: false
        },
        shareSettings: {
          requirePassword: false,
          requireEmailVerification: false,
          accessLog: true
        },
        requestedAt: serverTimestamp() as Timestamp,
        organizationId: context.organizationId
      };

      return await this.create(approvalData, context);
    } catch (error) {
      console.error('Error creating approval from campaign:', error);
      throw error;
    }
  }

  /**
   * Einfacher HTML-Stripper
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Lädt Statistiken
   */
  async getStatistics(organizationId: string): Promise<ApprovalStatistics> {
    try {
      const approvals = await this.getAll(organizationId);
      
      // Status-Verteilung
      const byStatus: Record<ApprovalStatus, number> = {
        draft: 0,
        pending: 0,
        in_review: 0,
        partially_approved: 0,
        approved: 0,
        rejected: 0,
        changes_requested: 0,
        expired: 0,
        cancelled: 0,
        completed: 0
      };

      approvals.forEach(a => {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      });

      // Durchschnittliche Freigabe-Zeit
      const approvedApprovals = approvals.filter(a => a.approvedAt);
      const avgApprovalTime = approvedApprovals.length > 0
        ? approvedApprovals.reduce((sum, a) => {
            const requestedAt = (a.requestedAt as Timestamp).toMillis();
            const approvedAt = (a.approvedAt as Timestamp).toMillis();
            return sum + (approvedAt - requestedAt) / (1000 * 60 * 60); // Stunden
          }, 0) / approvedApprovals.length
        : 0;

      // Weitere Statistiken
      const overdueCount = approvals.filter(a => {
        return a.options.expiresAt && 
               a.status === 'pending' && 
               a.options.expiresAt.toDate() < new Date();
      }).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiringToday = approvals.filter(a => {
        if (!a.options.expiresAt || a.status !== 'pending') return false;
        const expiresAt = a.options.expiresAt.toDate();
        return expiresAt >= today && expiresAt < tomorrow;
      }).length;

      // Freigabe-Rate
      const totalDecided = approvals.filter(a => ['approved', 'rejected', 'completed'].includes(a.status)).length;
      const totalApproved = approvals.filter(a => ['approved', 'completed'].includes(a.status)).length;
      const approvalRate = totalDecided > 0 ? (totalApproved / totalDecided) * 100 : 0;

      return {
        total: approvals.length,
        byStatus,
        avgApprovalTime,
        avgViewsBeforeDecision: 0, // TODO: Implementieren
        approvalRate,
        overdueCount,
        expiringToday,
        byClient: [], // TODO: Implementieren
        byMonth: [] // TODO: Implementieren
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Sendet Erinnerung
   */
  async sendReminder(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) throw new Error('Freigabe nicht gefunden');

      if (approval.status !== 'pending' && approval.status !== 'in_review') {
        throw new Error('Erinnerungen können nur für ausstehende Freigaben gesendet werden');
      }

      // Sende Benachrichtigungen
      await this.sendNotifications(approval, 'reminder');

      // Historie-Eintrag
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: serverTimestamp() as Timestamp,
        action: 'reminder_sent',
        userId: context.userId,
        actorName: 'System',
        details: {}
      };

      await this.update(approvalId, {
        history: arrayUnion(historyEntry) as any
      }, context);
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  }

  /**
   * Migriert alte Freigabe-Daten
   */
  async migrateFromLegacy(
    campaign: PRCampaign,
    legacyData: LegacyApprovalData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Erstelle Empfänger aus Legacy-Daten
      const recipients: Omit<ApprovalRecipient, 'id' | 'status' | 'notificationsSent'>[] = [{
        email: campaign.approvalData?.shareId ? 'unknown@example.com' : 'unknown@example.com', // TODO: Client E-Mail fehlt in PRCampaign
        name: campaign.clientName || 'Unbekannt',
        role: 'approver',
        isRequired: true
      }];

      // Erstelle neue Freigabe
      const approvalId = await this.createFromCampaign(campaign, recipients, context);
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) throw new Error('Migration fehlgeschlagen');

      // Migriere Historie
      const migrationHistory: ApprovalHistoryEntry[] = [];
      
      // Legacy-Status migrieren
      let migratedStatus: ApprovalStatus = 'pending';
      if (legacyData.status === 'approved') {
        migratedStatus = 'approved';
      } else if (legacyData.status === 'commented') {
        migratedStatus = 'changes_requested';
      } else if (legacyData.status === 'viewed') {
        migratedStatus = 'in_review';
      }

      // Feedback-Historie migrieren
      if (legacyData.feedbackHistory) {
        legacyData.feedbackHistory.forEach(feedback => {
          migrationHistory.push({
            id: nanoid(),
            timestamp: feedback.requestedAt,
            action: feedback.comment ? 'commented' : 'viewed',
            actorName: feedback.author || 'Kunde',
            details: {
              comment: feedback.comment
            }
          });
        });
      }

      // Update mit migrierten Daten
      const updates: any = {
        shareId: legacyData.shareId,
        status: migratedStatus,
        requestedAt: legacyData.requestedAt,
        approvedAt: legacyData.approvedAt,
        history: migrationHistory as any
      };

      // Update ersten Empfänger-Status
      if (approval.recipients && approval.recipients.length > 0) {
        const updatedRecipients = [...approval.recipients];
        updatedRecipients[0] = {
          ...updatedRecipients[0],
          status: migratedStatus === 'approved' ? 'approved' : 
                  migratedStatus === 'changes_requested' ? 'commented' : 
                  migratedStatus === 'in_review' ? 'viewed' : 'pending'
        };
        updates.recipients = updatedRecipients;
      }

      await this.update(approvalId, updates, context);

      return approvalId;
    } catch (error) {
      console.error('Error migrating legacy approval:', error);
      throw error;
    }
  }

  // ========================================
  // Private Hilfsmethoden
  // ========================================

  /**
   * Generiert eindeutige Share ID
   */
  private generateShareId(): string {
    return nanoid(20);
  }

  /**
   * Berechnet Gesamt-Status basierend auf Workflow
   */
  private calculateApprovalStatus(
    approval: ApprovalEnhanced,
    changedRecipientIndex: number,
    decision: 'approved' | 'rejected'
  ): ApprovalStatus {
    const recipients = [...approval.recipients];
    recipients[changedRecipientIndex].status = decision;

    // Bei Ablehnung direkt rejected
    if (decision === 'rejected' && approval.workflow !== 'majority') {
      return 'rejected';
    }

    const required = recipients.filter(r => r.isRequired);
    const allRecipients = required.length > 0 ? required : recipients;
    
    const approvedCount = allRecipients.filter(r => r.status === 'approved').length;
    const rejectedCount = allRecipients.filter(r => r.status === 'rejected').length;
    const totalCount = allRecipients.length;

    switch (approval.workflow) {
      case 'simple':
        // Erste Entscheidung zählt
        return decision === 'approved' ? 'approved' : 'rejected';
        
      case 'unanimous':
        // Alle müssen zustimmen
        if (rejectedCount > 0) return 'rejected';
        if (approvedCount === totalCount) return 'approved';
        return approvedCount > 0 ? 'partially_approved' : approval.status;
        
      case 'majority':
        // Mehrheit entscheidet
        const majorityNeeded = Math.floor(totalCount / 2) + 1;
        if (approvedCount >= majorityNeeded) return 'approved';
        if (rejectedCount >= majorityNeeded) return 'rejected';
        return approvedCount > 0 ? 'partially_approved' : approval.status;
        
      case 'sequential':
        // Der Reihe nach - aktuelle Implementation wie unanimous
        if (rejectedCount > 0) return 'rejected';
        if (approvedCount === totalCount) return 'approved';
        return 'in_review';
        
      case 'hierarchical':
        // Hierarchisch - TODO: Implementierung mit Rollen
        return decision === 'approved' ? 'approved' : 'rejected';
        
      default:
        return approval.status;
    }
  }

  /**
   * Sendet Benachrichtigungen (Stub)
   */
  private async sendNotifications(
    approval: ApprovalEnhanced,
    type: 'request' | 'reminder' | 'status_change'
  ): Promise<void> {
    // TODO: Integration mit E-Mail-Service
    console.log(`Sending ${type} notifications for approval ${approval.id}`);
    
    // Simuliere E-Mail-Versand
    for (const recipient of approval.recipients) {
      if (recipient.status === 'pending') {
        console.log(`Would send ${type} email to ${recipient.email}`);
      }
    }
  }

  /**
   * Sendet Status-Änderungs-Benachrichtigung
   */
  private async sendStatusChangeNotification(
    approval: ApprovalEnhanced,
    newStatus: ApprovalStatus
  ): Promise<void> {
    // TODO: Integration mit E-Mail-Service
    console.log(`Status changed to ${newStatus} for approval ${approval.id}`);
    await this.sendNotifications(approval, 'status_change');
  }

  /**
   * Plant automatische Erinnerungen
   */
  async scheduleReminders(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval || !approval.options.reminderSchedule?.enabled) return;

      const schedule = approval.options.reminderSchedule;
      const now = new Date();
      const requestedAt = (approval.requestedAt as Timestamp).toDate();
      
      // Berechne nächste Erinnerung
      for (const intervalHours of schedule.intervals) {
        const reminderTime = new Date(requestedAt.getTime() + intervalHours * 60 * 60 * 1000);
        
        if (reminderTime > now && (!schedule.lastSentAt || reminderTime > schedule.lastSentAt.toDate())) {
          // TODO: Integration mit Cloud Functions für geplante Aufgaben
          console.log(`Schedule reminder for ${reminderTime.toISOString()}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }
}

// Export Singleton Instance
export const approvalService = new ApprovalService();

// Export für Tests
export { ApprovalService };