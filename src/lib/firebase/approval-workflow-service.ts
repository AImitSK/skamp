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
import { db } from './client-init';
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
// Import für PDF-Integration
import { pdfVersionsService } from './pdf-versions-service';

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

      // Robuster Retry-Mechanismus für Campaign Update
      try {
        const campaignRef = doc(db, 'pr_campaigns', campaignId);
        const maxRetries = 5;
        let retryCount = 0;
        let lastError: Error | null = null;
        
        while (retryCount < maxRetries) {
          try {
            const campaignDoc = await getDoc(campaignRef);
            
            if (campaignDoc.exists()) {
              await updateDoc(campaignRef, {
                approvalData: updatedApprovalData
              });
              console.log('✅ Campaign erfolgreich mit Approval-Data aktualisiert');
              break; // Erfolgreich - verlasse die Schleife
            } else {
              console.warn(`⏳ Campaign document existiert noch nicht (Versuch ${retryCount + 1}/${maxRetries}):`, campaignId);
              
              // Exponentieller Backoff: 500ms, 1s, 2s, 4s, 8s
              const delay = Math.min(500 * Math.pow(2, retryCount), 8000);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              
              if (retryCount >= maxRetries) {
                throw new Error(`Campaign document not found after ${maxRetries} retries`);
              }
            }
          } catch (error) {
            // Error handling
            console.error(`❌ Fehler bei Campaign Update (Versuch ${retryCount + 1}):`, error);
            
            if (retryCount >= maxRetries - 1) {
              throw error;
            }
            
            // Warte bei Fehlern ebenfalls mit Backoff
            const delay = Math.min(500 * Math.pow(2, retryCount), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
          }
        }
      } catch (updateError) {
        console.error('❌ Finaler Fehler beim Campaign Update:', updateError);
        throw updateError;
      }

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

      // PDF-Integration: Erstelle PDF für Team-Freigabe
      if (workflow.campaignId) {
        try {
          await this.syncWorkflowWithPDFStatus(workflowId, 'pending_team', 'Team-Freigabe gestartet');
        } catch (pdfError) {
          console.warn('⚠️ PDF-Sync Fehler bei Team-Approval Start:', pdfError);
          // Fahre ohne PDF-Integration fort
        }
      }

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

      // PDF-Integration: Update PDF-Status für Customer-Freigabe
      if (workflow.campaignId) {
        try {
          await this.syncWorkflowWithPDFStatus(workflowId, 'pending_customer', 'Kunden-Freigabe gestartet');
        } catch (pdfError) {
          console.warn('⚠️ PDF-Sync Fehler bei Customer-Approval Start:', pdfError);
        }
      }

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
        // PDF-Integration: Team-Stufe approved
        await this.syncWorkflowWithPDFStatus(workflowId, 'team_approved', 'Team-Freigabe abgeschlossen');
        
        // Team-Stufe abgeschlossen - prüfe ob Customer-Approval folgt
        if (workflow.customerSettings.required) {
          await this.startCustomerApproval(workflowId);
        } else {
          // Kein Customer-Approval - Workflow ist abgeschlossen
          await this.completeWorkflow(workflowId, 'approved');
        }
      } else if (stage === 'customer') {
        // PDF-Integration: Customer-Stufe approved
        await this.syncWorkflowWithPDFStatus(workflowId, 'customer_approved', 'Kunden-Freigabe abgeschlossen');
        
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
        const campaignRef = doc(db, 'pr_campaigns', workflow.campaignId);
        await updateDoc(campaignRef, {
          status: finalStatus === 'approved' ? 'approved' : 'changes_requested'
        });
      }

      // PDF-Integration: Workflow final abgeschlossen
      const workflowDoc = await getDoc(doc(db, 'approval_workflows', workflowId));
      if (workflowDoc.exists()) {
        await this.syncWorkflowWithPDFStatus(workflowId, finalStatus === 'approved' ? 'workflow_approved' : 'workflow_rejected', `Workflow ${finalStatus}`);
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
  },

  /**
   * Synchronisiert Workflow-Status mit PDF-Versionierung
   * KERN-INTEGRATION zwischen Approval-System und PDF-Versionen
   */
  async syncWorkflowWithPDFStatus(
    workflowId: string,
    approvalStatus: string,
    context: string = ''
  ): Promise<void> {
    try {
      console.log(`🔄 PDF-Sync: Workflow ${workflowId} → ${approvalStatus}`);
      
      // 1. Lade Workflow-Daten
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow || !workflow.campaignId) {
        console.warn('⚠️ PDF-Sync: Workflow oder Campaign nicht gefunden');
        return;
      }

      // 2. Bestimme PDF-Status basierend auf Approval-Status
      let pdfStatus: 'draft' | 'pending_customer' | 'approved' | 'rejected';
      let editLockReason: string | null = null;

      switch (approvalStatus) {
        case 'pending_team':
          pdfStatus = 'pending_customer'; // Team-Approval wird intern behandelt
          editLockReason = 'pending_team_approval';
          break;
        case 'team_approved':
          // Wenn Customer-Approval folgt, bleibt PDF pending_customer
          pdfStatus = workflow.customerSettings.required ? 'pending_customer' : 'approved';
          editLockReason = workflow.customerSettings.required ? 'pending_customer_approval' : null;
          break;
        case 'pending_customer':
          pdfStatus = 'pending_customer';
          editLockReason = 'pending_customer_approval';
          break;
        case 'customer_approved':
          pdfStatus = 'approved';
          editLockReason = null; // Edit-Lock aufheben
          break;
        case 'workflow_approved':
          pdfStatus = 'approved';
          editLockReason = null;
          break;
        case 'workflow_rejected':
          pdfStatus = 'rejected';
          editLockReason = null; // Edit-Lock aufheben für Überarbeitung
          break;
        default:
          console.warn(`⚠️ Unbekannter Approval-Status: ${approvalStatus}`);
          return;
      }

      // 3. Update PDF-Version Status
      const currentPDFVersion = await pdfVersionsService.getCurrentVersion(workflow.campaignId);
      if (currentPDFVersion?.id) {
        await pdfVersionsService.updateVersionStatus(
          currentPDFVersion.id,
          pdfStatus
        );
        console.log(`✅ PDF-Status aktualisiert: ${currentPDFVersion.id} → ${pdfStatus}`);
      } else {
        console.warn('⚠️ Keine aktuelle PDF-Version für Campaign gefunden');
      }

      // 4. Edit-Lock Management
      if (editLockReason) {
        // Aktiviere/Update Edit-Lock
        await pdfVersionsService.lockCampaignEditing(workflow.campaignId, editLockReason);
        console.log(`🔒 Edit-Lock aktiviert: ${workflow.campaignId} (${editLockReason})`);
      } else {
        // Entferne Edit-Lock
        await pdfVersionsService.unlockCampaignEditing(workflow.campaignId);
        console.log(`🔓 Edit-Lock entfernt: ${workflow.campaignId}`);
      }

      console.log(`✅ PDF-Sync abgeschlossen: ${workflowId} (${context})`);

    } catch (error) {
      console.error('❌ Fehler bei Workflow→PDF Synchronisation:', error);
      // Nicht weiterwerfen - PDF-Sync ist nicht kritisch für Workflow-Funktionalität
    }
  },

  /**
   * CALLBACK-METHODE: Wird von PDF-Service aufgerufen bei Status-Updates
   */
  async handlePDFStatusUpdate(
    campaignId: string,
    pdfVersionId: string,
    newStatus: string,
    metadata?: any
  ): Promise<void> {
    try {
      console.log(`🔄 PDF→Workflow Callback: ${campaignId} → ${newStatus}`);
      
      // Finde aktive Workflows für diese Campaign
      const workflows = await this.getWorkflowsByOrganization(metadata?.organizationId || 'unknown');
      const activeWorkflow = workflows.find(w => 
        w.campaignId === campaignId && 
        w.currentStage !== 'completed'
      );

      if (!activeWorkflow) {
        console.warn('⚠️ Kein aktiver Workflow für PDF-Update gefunden');
        return;
      }

      // Bestimme Workflow-Aktion basierend auf PDF-Status
      switch (newStatus) {
        case 'approved':
          // PDF wurde approved - komplette Workflow wenn möglich
          if (activeWorkflow.currentStage === 'customer') {
            await this.processStageCompletion(activeWorkflow.id!, 'customer');
          }
          break;
        case 'rejected':
          // PDF wurde rejected - markiere Workflow als requiring changes
          await this.completeWorkflow(activeWorkflow.id!, 'rejected');
          break;
        default:
          console.log(`ℹ️ PDF-Status "${newStatus}" erfordert keine Workflow-Aktion`);
      }

      console.log(`✅ PDF→Workflow Callback abgeschlossen`);

    } catch (error) {
      console.error('❌ Fehler bei PDF→Workflow Callback:', error);
      // Nicht weiterwerfen - Callback-Fehler sollen PDF-Operations nicht blockieren
    }
  }
};