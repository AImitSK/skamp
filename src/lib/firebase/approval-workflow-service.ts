// src/lib/firebase/approval-workflow-service.ts - Workflow-Management Service
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { 
  EnhancedApprovalData,
  ApprovalWorkflow,
  ApprovalWorkflowStage,
  WorkflowEvent,
  TeamApprover,
  CustomerContact
} from '@/types/approvals-enhanced';
import { teamApprovalService } from './team-approval-service';
import { nanoid } from 'nanoid';

export const approvalWorkflowService = {
  /**
   * Erstellt einen neuen Approval-Workflow
   */
  async createWorkflow(
    campaignId: string, 
    organizationId: string,
    settings: EnhancedApprovalData
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      
      // Erstelle Workflow-Stages basierend auf Einstellungen
      const stages: ApprovalWorkflowStage[] = [];
      
      if (settings.teamApprovalRequired) {
        stages.push({
          stage: 'team',
          status: 'pending',
          requiredApprovals: settings.teamApprovers.length,
          receivedApprovals: 0
        });
      }
      
      if (settings.customerApprovalRequired) {
        stages.push({
          stage: 'customer',
          status: settings.teamApprovalRequired ? 'pending' : 'pending',
          requiredApprovals: 1,
          receivedApprovals: 0
        });
      }

      // Generiere ShareID für Customer Approval (auch wenn nicht sofort gebraucht)
      const shareId = settings.shareId || nanoid(20);

      const workflow: Omit<ApprovalWorkflow, 'id'> = {
        campaignId,
        organizationId,
        stages,
        currentStage: settings.currentStage,
        createdAt: now,
        
        teamSettings: {
          required: settings.teamApprovalRequired,
          approvers: settings.teamApprovers,
          message: settings.teamApprovalMessage,
          allApproved: false
        },
        
        customerSettings: {
          required: settings.customerApprovalRequired,
          contact: settings.customerContact,
          message: settings.customerApprovalMessage,
          shareId,
          status: 'pending'
        }
      };

      const workflowRef = await addDoc(collection(db, 'approval_workflows'), workflow);
      const workflowId = workflowRef.id;

      // Update Campaign mit Workflow-ID und Enhanced Approval Data
      const updatedApprovalData: EnhancedApprovalData = {
        ...settings,
        shareId,
        workflowId,
        workflowStartedAt: now
      };

      // Update Campaign direkt in Firestore
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        approvalData: updatedApprovalData
      });

      console.log('✅ Approval-Workflow erstellt:', workflowId);

      // Starte Team-Approval falls erforderlich
      if (settings.teamApprovalRequired && settings.teamApprovers.length > 0) {
        await this.startTeamApproval(workflowId, campaignId, organizationId);
      }

      // Starte Customer-Approval falls kein Team-Approval erforderlich
      if (!settings.teamApprovalRequired && settings.customerApprovalRequired) {
        await this.startCustomerApproval(workflowId);
      }

      return workflowId;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Workflows:', error);
      throw new Error('Approval-Workflow konnte nicht erstellt werden');
    }
  },

  /**
   * Startet die Team-Approval Stufe
   */
  async startTeamApproval(workflowId: string, campaignId: string, organizationId: string): Promise<void> {
    try {
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (!workflowDoc.exists()) {
        throw new Error('Workflow nicht gefunden');
      }

      const workflow = workflowDoc.data() as ApprovalWorkflow;
      
      if (!workflow.teamSettings.required || workflow.teamSettings.approvers.length === 0) {
        throw new Error('Team-Approval ist nicht konfiguriert');
      }

      // Konvertiere TeamApprover zu TeamMember Format für Service
      const teamMembers = workflow.teamSettings.approvers.map(approver => ({
        userId: approver.userId,
        displayName: approver.displayName,
        email: approver.email,
        photoUrl: approver.photoUrl
      }));

      // Erstelle Team-Approvals
      const approvalIds = await teamApprovalService.createTeamApproval(
        campaignId,
        workflowId,
        teamMembers as any[], // Type assertion for compatibility
        organizationId,
        workflow.teamSettings.message
      );

      // Update Workflow Status
      await updateDoc(doc(db, 'approval_workflows', workflowId), {
        currentStage: 'team',
        'stages.0.status': 'in_progress',
        'stages.0.startedAt': Timestamp.now()
      });

      console.log('✅ Team-Approval gestartet mit', approvalIds.length, 'Approvern');

      // Sende Benachrichtigungen
      await teamApprovalService.notifyTeamMembers(
        approvalIds,
        'Kampagne', // TODO: Load actual campaign title
        'System', // TODO: Load requester name
        workflow.teamSettings.message
      );
    } catch (error) {
      console.error('❌ Fehler beim Starten der Team-Approval:', error);
      throw error;
    }
  },

  /**
   * Startet die Customer-Approval Stufe
   */
  async startCustomerApproval(workflowId: string): Promise<void> {
    try {
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (!workflowDoc.exists()) {
        throw new Error('Workflow nicht gefunden');
      }

      const workflow = workflowDoc.data() as ApprovalWorkflow;
      
      if (!workflow.customerSettings.required || !workflow.customerSettings.contact) {
        throw new Error('Customer-Approval ist nicht konfiguriert');
      }

      // Update Workflow Status
      await updateDoc(doc(db, 'approval_workflows', workflowId), {
        currentStage: 'customer'
      });

      // Update Customer Stage (find the customer stage index)
      const customerStageIndex = workflow.stages.findIndex(s => s.stage === 'customer');
      if (customerStageIndex !== -1) {
        await updateDoc(doc(db, 'approval_workflows', workflowId), {
          [`stages.${customerStageIndex}.status`]: 'in_progress',
          [`stages.${customerStageIndex}.startedAt`]: Timestamp.now()
        });
      }

      console.log('✅ Customer-Approval gestartet für:', workflow.customerSettings.contact.email);

      // TODO: Send customer notification email
      // await this.sendCustomerNotification(workflow);
    } catch (error) {
      console.error('❌ Fehler beim Starten der Customer-Approval:', error);
      throw error;
    }
  },

  /**
   * Verarbeitet den Abschluss einer Workflow-Stufe
   */
  async processStageCompletion(workflowId: string, stage: 'team' | 'customer'): Promise<void> {
    try {
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (!workflowDoc.exists()) {
        throw new Error('Workflow nicht gefunden');
      }

      const workflow = workflowDoc.data() as ApprovalWorkflow;

      if (stage === 'team') {
        // Team-Stufe abgeschlossen - prüfe ob Customer-Approval folgt
        if (workflow.customerSettings.required) {
          await this.startCustomerApproval(workflowId);
        } else {
          // Kein Customer-Approval - Workflow ist abgeschlossen
          await this.completeWorkflow(workflowId, 'approved');
        }
      } else if (stage === 'customer') {
        // Customer-Stufe abgeschlossen - Workflow ist komplett
        await this.completeWorkflow(workflowId, 'approved');
      }
    } catch (error) {
      console.error('❌ Fehler beim Verarbeiten der Stufen-Completion:', error);
      throw error;
    }
  },

  /**
   * Schließt den gesamten Workflow ab
   */
  async completeWorkflow(workflowId: string, finalStatus: 'approved' | 'rejected'): Promise<void> {
    try {
      const now = Timestamp.now();
      
      await updateDoc(doc(db, 'approval_workflows', workflowId), {
        currentStage: 'completed',
        completedAt: now
      });

      // Update Campaign Status
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (workflowDoc.exists()) {
        const workflow = workflowDoc.data() as ApprovalWorkflow;
        
        // Update Campaign Status direkt in Firestore
        const campaignRef = doc(db, 'campaigns', workflow.campaignId);
        await updateDoc(campaignRef, {
          status: finalStatus === 'approved' ? 'approved' : 'changes_requested'
        });
      }

      console.log(`✅ Workflow abgeschlossen: ${finalStatus}`);
    } catch (error) {
      console.error('❌ Fehler beim Abschließen des Workflows:', error);
      throw error;
    }
  },

  /**
   * Lädt den aktuellen Workflow-Status
   */
  async getWorkflowStatus(workflowId: string): Promise<ApprovalWorkflowStage[]> {
    try {
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (!workflowDoc.exists()) {
        throw new Error('Workflow nicht gefunden');
      }

      const workflow = workflowDoc.data() as ApprovalWorkflow;
      return workflow.stages;
    } catch (error) {
      console.error('❌ Fehler beim Laden des Workflow-Status:', error);
      throw new Error('Workflow-Status konnte nicht geladen werden');
    }
  },

  /**
   * Lädt einen vollständigen Workflow
   */
  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (!workflowDoc.exists()) {
        throw new Error('Workflow nicht gefunden');
      }

      return {
        id: workflowDoc.id,
        ...workflowDoc.data()
      } as ApprovalWorkflow;
    } catch (error) {
      console.error('❌ Fehler beim Laden des Workflows:', error);
      throw error;
    }
  },

  /**
   * Lädt alle Workflows für eine Organisation
   */
  async getWorkflowsByOrganization(organizationId: string): Promise<ApprovalWorkflow[]> {
    try {
      const workflowsQuery = query(
        collection(db, 'approval_workflows'),
        where('organizationId', '==', organizationId)
      );

      const workflowDocs = await getDocs(workflowsQuery);
      return workflowDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ApprovalWorkflow));
    } catch (error) {
      console.error('❌ Fehler beim Laden der Workflows:', error);
      throw new Error('Workflows konnten nicht geladen werden');
    }
  },

  /**
   * Sendet Benachrichtigungen für eine Workflow-Stufe
   * TODO: Integration mit Notification Service
   */
  async sendStageNotifications(workflowId: string, stage: 'team' | 'customer'): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      
      if (stage === 'team') {
        await teamApprovalService.notifyTeamMembers(
          [], // TODO: Get approval IDs
          'Kampagne', // TODO: Load campaign title
          'System', // TODO: Load requester
          workflow.teamSettings.message
        );
      } else if (stage === 'customer') {
        // TODO: Send customer notification
        console.log('📧 Customer-Benachrichtigung an:', workflow.customerSettings.contact?.email);
      }
    } catch (error) {
      console.error('❌ Fehler beim Versenden der Workflow-Benachrichtigungen:', error);
      // Don't throw - notifications are not critical
    }
  }
};