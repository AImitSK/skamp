// src/lib/firebase/team-approval-service.ts - Service für Team-Freigaben
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { 
  TeamApproval, 
  TeamApprover, 
  TeamApprovalStatus,
  ApprovalWorkflow 
} from '@/types/approvals-enhanced';
import { TeamMember } from '@/types/international';

export const teamApprovalService = {
  /**
   * Erstellt Team-Freigabe-Anfragen für alle ausgewählten Team-Mitglieder
   */
  async createTeamApproval(
    campaignId: string, 
    workflowId: string,
    approvers: TeamMember[], 
    organizationId: string,
    message?: string
  ): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const approvalIds: string[] = [];
      const now = Timestamp.now();

      // Erstelle für jedes Team-Mitglied eine eigene Approval-Instanz
      for (const approver of approvers) {
        const approvalRef = doc(collection(db, 'team_approvals'));
        approvalIds.push(approvalRef.id);

        const teamApproval: Omit<TeamApproval, 'id'> = {
          userId: approver.userId!,
          workflowId,
          campaignId,
          organizationId,
          status: 'pending',
          notifiedAt: now,
          createdAt: now
        };

        batch.set(approvalRef, teamApproval);
      }

      // Update workflow mit Team-Approval IDs
      const workflowRef = doc(db, 'approval_workflows', workflowId);
      batch.update(workflowRef, {
        'teamSettings.approvalIds': approvalIds,
        'teamSettings.message': message || null,
        'stages.0.status': 'in_progress',
        'stages.0.startedAt': now
      });

      await batch.commit();

      console.log('✅ Team-Approvals erstellt:', approvalIds.length);
      return approvalIds;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Team-Approvals:', error);
      throw new Error('Team-Freigaben konnten nicht erstellt werden');
    }
  },

  /**
   * Team-Mitglied trifft Entscheidung über Freigabe
   */
  async submitTeamDecision(
    approvalId: string, 
    userId: string, 
    decision: 'approved' | 'rejected', 
    comment?: string
  ): Promise<void> {
    try {
      const approvalRef = doc(db, 'team_approvals', approvalId);
      const approvalDoc = await getDoc(approvalRef);
      
      if (!approvalDoc.exists()) {
        throw new Error('Freigabe-Anfrage nicht gefunden');
      }

      const approval = approvalDoc.data() as TeamApproval;
      
      if (approval.userId !== userId) {
        throw new Error('Sie sind nicht berechtigt, diese Freigabe zu bearbeiten');
      }

      if (approval.status !== 'pending') {
        throw new Error('Diese Freigabe wurde bereits bearbeitet');
      }

      const now = Timestamp.now();
      const updateData: Partial<TeamApproval> = {
        status: decision,
        decision: {
          choice: decision,
          comment: comment || undefined,
          submittedAt: now
        }
      };

      await updateDoc(approvalRef, updateData);

      // Prüfe ob alle Team-Approvals abgeschlossen sind
      await this.checkAndUpdateWorkflowStatus(approval.workflowId);

      console.log(`✅ Team-Entscheidung gespeichert: ${decision} von ${userId}`);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Team-Entscheidung:', error);
      throw error;
    }
  },

  /**
   * Lädt den aktuellen Status aller Team-Approvals für einen Workflow
   */
  async getTeamApprovalStatus(workflowId: string): Promise<TeamApprovalStatus> {
    try {
      const approvalsQuery = query(
        collection(db, 'team_approvals'),
        where('workflowId', '==', workflowId),
        orderBy('createdAt', 'asc')
      );

      const approvalDocs = await getDocs(approvalsQuery);
      const approvals: TeamApproval[] = approvalDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamApproval));

      const approvers: TeamApprover[] = approvals.map(approval => ({
        userId: approval.userId,
        displayName: `User ${approval.userId}`, // TODO: Load from team service
        email: `user${approval.userId}@company.com`, // TODO: Load from team service
        status: approval.status,
        approvedAt: approval.decision?.choice === 'approved' ? approval.decision.submittedAt : undefined,
        rejectedAt: approval.decision?.choice === 'rejected' ? approval.decision.submittedAt : undefined,
        message: approval.decision?.comment,
        notifiedAt: approval.notifiedAt
      }));

      const totalApprovers = approvals.length;
      const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
      const approvedCount = approvals.filter(a => a.status === 'approved').length;
      const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
      const allApproved = totalApprovers > 0 && approvedCount === totalApprovers;
      const anyRejected = rejectedCount > 0;

      return {
        totalApprovers,
        pendingApprovals,
        approvedCount,
        rejectedCount,
        allApproved,
        anyRejected,
        approvers
      };
    } catch (error) {
      console.error('❌ Fehler beim Laden des Team-Approval Status:', error);
      throw new Error('Team-Approval Status konnte nicht geladen werden');
    }
  },

  /**
   * Prüft ob alle Team-Approvals abgeschlossen sind und updated den Workflow
   */
  async checkAndUpdateWorkflowStatus(workflowId: string): Promise<boolean> {
    try {
      const status = await this.getTeamApprovalStatus(workflowId);
      const workflowRef = doc(db, 'approval_workflows', workflowId);

      if (status.allApproved) {
        // Alle haben zugestimmt - Team-Stufe ist abgeschlossen
        await updateDoc(workflowRef, {
          'teamSettings.allApproved': true,
          'teamSettings.completedAt': Timestamp.now(),
          'stages.0.status': 'completed',
          'stages.0.completedAt': Timestamp.now(),
          'stages.0.receivedApprovals': status.approvedCount
        });

        console.log('✅ Team-Stufe abgeschlossen - alle haben zugestimmt');
        return true;
      } else if (status.anyRejected) {
        // Mindestens eine Ablehnung - Team-Stufe ist gescheitert
        await updateDoc(workflowRef, {
          'teamSettings.allApproved': false,
          'teamSettings.completedAt': Timestamp.now(),
          'stages.0.status': 'rejected',
          'stages.0.completedAt': Timestamp.now(),
          'stages.0.receivedApprovals': status.approvedCount
        });

        console.log('❌ Team-Stufe gescheitert - Ablehnung erhalten');
        return false;
      } else {
        // Noch ausstehende Entscheidungen
        await updateDoc(workflowRef, {
          'stages.0.receivedApprovals': status.approvedCount
        });

        console.log(`⏳ Team-Stufe läuft noch: ${status.approvedCount}/${status.totalApprovers} Zustimmungen`);
        return false;
      }
    } catch (error) {
      console.error('❌ Fehler beim Prüfen des Workflow-Status:', error);
      throw error;
    }
  },

  /**
   * Lädt alle Team-Approvals für einen bestimmten User
   */
  async getApprovalsByUser(userId: string, organizationId: string): Promise<TeamApproval[]> {
    try {
      const approvalsQuery = query(
        collection(db, 'team_approvals'),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const approvalDocs = await getDocs(approvalsQuery);
      return approvalDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeamApproval));
    } catch (error) {
      console.error('❌ Fehler beim Laden der User-Approvals:', error);
      throw new Error('Ihre Freigabe-Anfragen konnten nicht geladen werden');
    }
  },

  /**
   * Sendet Benachrichtigungen an Team-Mitglieder
   * TODO: Integration mit Notification Service
   */
  async notifyTeamMembers(
    approvalIds: string[], 
    campaignTitle: string,
    requesterName: string,
    message?: string
  ): Promise<void> {
    try {
      // TODO: Implement notification sending
      // This would integrate with the notification service and send emails/in-app notifications
      
      console.log(`📧 Benachrichtigungen versendet für ${approvalIds.length} Team-Mitglieder`);
      console.log(`Kampagne: ${campaignTitle}`);
      console.log(`Von: ${requesterName}`);
      if (message) {
        console.log(`Nachricht: ${message}`);
      }

      // Placeholder for actual notification implementation
      // await notificationService.sendTeamApprovalNotifications({
      //   approvalIds,
      //   campaignTitle,
      //   requesterName,
      //   message
      // });
    } catch (error) {
      console.error('❌ Fehler beim Versenden der Benachrichtigungen:', error);
      // Don't throw - notifications are not critical for the approval workflow
    }
  },

  /**
   * Lädt alle Team-Approvals für eine Organisation (für Approval-Übersicht)
   */
  async getOrganizationApprovals(organizationId: string): Promise<any[]> {
    try {
      const approvalsQuery = query(
        collection(db, 'team_approvals'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );

      const approvalDocs = await getDocs(approvalsQuery);
      
      // Konvertiere Team-Approvals zu Approval-Format für UI-Kompatibilität
      const teamApprovals = await Promise.all(
        approvalDocs.docs.map(async (approvalDoc) => {
          const data = approvalDoc.data();
          
          try {
            // Lade Campaign-Daten für zusätzliche Info
            const campaignDoc = await getDoc(doc(db, 'pr_campaigns', data.campaignId));
            const campaignData = campaignDoc.data();
            
            // Lade Workflow-Daten für ShareID
            const workflowDoc = await getDoc(doc(db, 'approval_workflows', data.workflowId));
            const workflowData = workflowDoc.data();
            
            return {
              id: approvalDoc.id,
              campaignId: data.campaignId,
              organizationId: data.organizationId,
              status: data.status,
              createdAt: data.createdAt,
              notifiedAt: data.notifiedAt,
              
              // UI-Kompatibilität - vollständige ApprovalEnhanced Felder
              title: campaignData?.title || 'Team-Freigabe',
              description: `Interne Team-Freigabe für ${campaignData?.title || 'Kampagne'}`,
              campaignTitle: campaignData?.title || 'Team-Freigabe',
              clientName: 'Internes Team',
              clientEmail: null,
              
              // Minimale Recipients für UI
              recipients: [{
                id: data.userId,
                email: 'team@internal',
                name: 'Team-Mitglied',
                type: 'team_member',
                status: data.status
              }],
              
              // Minimaler Content für UI
              content: {
                html: campaignData?.mainContent || '',
                plainText: '',
                subject: campaignData?.title || 'Team-Freigabe'
              },
              
              // Minimale Workflow-Info
              workflow: {
                currentStage: 'team_approval',
                totalStages: 1,
                autoAdvance: false
              },
              
              // Standard-Optionen
              options: {
                requireAllApprovals: false,
                allowPartialApproval: true,
                autoSendAfterApproval: false,
                reminderFrequency: 'daily',
                expiresAt: null
              },
              
              // Team-Approval spezifisch
              type: 'team_approval',
              shareId: workflowData?.customerSettings?.shareId || 'unknown',
              priority: 'normal',
              estimatedDuration: 15,
              
              // Timestamps richtig formatieren
              sentAt: data.notifiedAt,
              updatedAt: data.createdAt,
              
              // Zusätzliche UI-Felder
              isOverdue: false,
              reminderCount: 0
            };
          } catch (error) {
            console.warn(`Error loading additional data for approval ${approvalDoc.id}:`, error);
            return {
              id: approvalDoc.id,
              campaignId: data.campaignId,
              organizationId: data.organizationId,
              status: data.status,
              createdAt: data.createdAt,
              notifiedAt: data.notifiedAt,
              
              // UI-Kompatibilität - Fallback mit allen erforderlichen Feldern
              title: 'Team-Freigabe',
              description: 'Interne Team-Freigabe',
              campaignTitle: 'Team-Freigabe',
              clientName: 'Internes Team',
              clientEmail: null,
              
              recipients: [{
                id: data.userId,
                email: 'team@internal',
                name: 'Team-Mitglied',
                type: 'team_member',
                status: data.status
              }],
              
              content: {
                html: '',
                plainText: '',
                subject: 'Team-Freigabe'
              },
              
              workflow: {
                currentStage: 'team_approval',
                totalStages: 1,
                autoAdvance: false
              },
              
              options: {
                requireAllApprovals: false,
                allowPartialApproval: true,
                autoSendAfterApproval: false,
                reminderFrequency: 'daily',
                expiresAt: null
              },
              
              type: 'team_approval',
              shareId: 'unknown',
              priority: 'normal',
              estimatedDuration: 15,
              sentAt: data.notifiedAt,
              updatedAt: data.createdAt,
              isOverdue: false,
              reminderCount: 0
            };
          }
        })
      );

      console.log(`✅ Loaded ${teamApprovals.length} team approvals for organization`);
      return teamApprovals;
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Organization Team-Approvals:', error);
      return []; // Return empty array to not break the UI
    }
  }
};