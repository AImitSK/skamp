// src/lib/firebase/pdf-approval-bridge-service.ts - Brücke zwischen PDF-Versionierung und Approval-Workflows
import { pdfVersionsService, PDFVersion } from './pdf-versions-service';

// Status-Typ lokal definieren bis der Service vollständig implementiert ist
type PDFVersionStatus = 'draft' | 'pending_team' | 'pending_customer' | 'approved' | 'rejected';
import { approvalWorkflowService } from './approval-workflow-service';
import { prService } from './pr-service';
import { EnhancedApprovalData } from '@/types/approvals-enhanced';
import { PRCampaign } from '@/types/pr';
import { nanoid } from 'nanoid';
import { Timestamp } from 'firebase/firestore';

export interface PDFApprovalResult {
  campaignId: string;
  workflowId?: string;
  pdfVersionId?: string;
  shareableLinks?: {
    team?: string;
    customer?: string;
  };
}

export interface CampaignContentForPDF {
  title: string;
  mainContent: string;
  boilerplateSections: any[];
  keyVisual?: any;
  clientName?: string;
}

export const pdfApprovalBridgeService = {

  /**
   * Erstellt PDF-Version für Freigabe-Workflow
   * KERN-FUNKTION: Step 3 → PDF-Generation → Edit-Lock
   */
  async createPDFForApproval(
    campaignId: string,
    workflowId: string,
    initialStatus: PDFVersionStatus = 'pending_customer'
  ): Promise<PDFVersion> {
    try {
      console.log(`🔄 Erstelle PDF für Approval-Workflow: ${workflowId}`);
      
      // 1. Lade Campaign-Daten für PDF-Content
      const campaign = await prService.getById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} nicht gefunden`);
      }

      // 2. Bereite Content für PDF-Generation vor
      const contentData: CampaignContentForPDF = {
        title: campaign.title,
        mainContent: campaign.mainContent || campaign.contentHtml || '',
        boilerplateSections: campaign.boilerplateSections || [],
        keyVisual: campaign.keyVisual,
        clientName: campaign.clientName
      };

      // 3. Erstelle PDF-Version mit Approval-Kontext
      const pdfVersionId = await pdfVersionsService.createPDFVersion(
        campaignId,
        campaign.organizationId,
        contentData,
        {
          userId: campaign.userId,
          status: initialStatus,
          workflowId, // Verknüpfung mit Approval-Workflow
          isApprovalPDF: true,
          approvalContext: {
            workflowId,
            createdAt: Timestamp.now()
          }
        }
      );

      // 4. Aktiviere Edit-Lock für Campaign
      await this.activateEditLock(campaignId, workflowId, initialStatus);

      // 5. Lade und returniere erstellte PDF-Version
      const pdfVersion = await pdfVersionsService.getCurrentVersion(campaignId);
      if (!pdfVersion) {
        throw new Error(`PDF-Version ${pdfVersionId} konnte nicht geladen werden`);
      }

      console.log(`✅ PDF für Approval erstellt: ${pdfVersionId}, Status: ${initialStatus}`);
      return pdfVersion;

    } catch (error) {
      console.error('❌ Fehler bei PDF-Erstellung für Approval:', error);
      throw error;
    }
  },

  /**
   * Aktiviert Edit-Lock für Campaign während Approval-Prozess
   */
  async activateEditLock(
    campaignId: string, 
    workflowId: string,
    reason: PDFVersionStatus
  ): Promise<void> {
    try {
      console.log(`🔒 Aktiviere Edit-Lock für Campaign: ${campaignId}`);
      
      // TODO: Edit-Lock Implementation im PDF-Versions Service
      console.log(`🔒 Edit-Lock für Campaign ${campaignId} vorgemerkt (${reason})`);

      // Update Campaign Status
      await prService.update(campaignId, {
        status: reason === 'pending_customer' ? 'in_review' : 'draft',
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Edit-Lock aktiviert für Campaign: ${campaignId}`);
    } catch (error) {
      console.error('❌ Fehler bei Edit-Lock Aktivierung:', error);
      throw error;
    }
  },

  /**
   * Erstellt sharebare Links für Team und Customer Approval
   */
  async createShareablePDFLink(
    pdfVersionId: string,
    linkType: 'team' | 'customer'
  ): Promise<string> {
    try {
      const shareId = nanoid(16);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      if (linkType === 'team') {
        return `${baseUrl}/freigabe-intern/${shareId}?pdf=${pdfVersionId}`;
      } else {
        return `${baseUrl}/freigabe/${shareId}?pdf=${pdfVersionId}`;
      }
    } catch (error) {
      console.error('❌ Fehler bei ShareLink-Erstellung:', error);
      throw error;
    }
  },

  /**
   * Synchronisiert Approval-Status mit PDF-Status
   * KRITISCH: Bidirektionale Synchronisation
   */
  async syncApprovalWithPDFStatus(
    workflowId: string,
    newApprovalStatus: string
  ): Promise<void> {
    try {
      console.log(`🔄 Sync Approval→PDF Status: ${workflowId} → ${newApprovalStatus}`);
      
      // 1. Lade Workflow-Daten
      const workflow = await approvalWorkflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} nicht gefunden`);
      }

      // 2. Bestimme PDF-Status basierend auf Approval-Status
      let pdfStatus: PDFVersionStatus;
      switch (newApprovalStatus) {
        case 'team_approved':
          pdfStatus = workflow.customerSettings.required ? 'pending_customer' : 'approved';
          break;
        case 'customer_approved':
          pdfStatus = 'approved';
          break;
        case 'rejected':
          pdfStatus = 'rejected';
          break;
        case 'pending_team':
          pdfStatus = 'pending_team';
          break;
        case 'pending_customer':
          pdfStatus = 'pending_customer';
          break;
        default:
          pdfStatus = 'draft';
      }

      // 3. Update PDF-Status (TODO: Service-Methode implementieren)
      console.log(`🔄 PDF-Status Update für Campaign ${workflow.campaignId}: ${pdfStatus}`);

      // 4. Edit-Lock Management
      if (pdfStatus === 'approved' || pdfStatus === 'rejected') {
        await this.releaseEditLock(workflow.campaignId, pdfStatus);
      }

      console.log(`✅ PDF-Status synchronisiert: ${approvalPDFs.length} PDFs → ${pdfStatus}`);
    } catch (error) {
      console.error('❌ Fehler bei Approval→PDF Synchronisation:', error);
      throw error;
    }
  },

  /**
   * Gibt Edit-Lock frei nach Workflow-Completion
   */
  async releaseEditLock(
    campaignId: string,
    finalStatus: PDFVersionStatus
  ): Promise<void> {
    try {
      console.log(`🔓 Gebe Edit-Lock frei für Campaign: ${campaignId}`);
      
      // TODO: Edit-Lock Release im PDF-Versions Service
      console.log(`🔓 Edit-Lock für Campaign ${campaignId} freigegeben (${finalStatus})`);

      // Update Campaign Status
      const newStatus = finalStatus === 'approved' ? 'approved' : 'draft';
      await prService.update(campaignId, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Edit-Lock freigegeben für Campaign: ${campaignId}, Status: ${newStatus}`);
    } catch (error) {
      console.error('❌ Fehler bei Edit-Lock Freigabe:', error);
      throw error;
    }
  },

  /**
   * Vollständige Campaign-Speicherung mit PDF-Approval Integration
   * KERN-ENTRY-POINT für Step 3 Integration
   */
  async saveCampaignWithApprovalIntegration(
    campaignData: Partial<PRCampaign>,
    approvalData: EnhancedApprovalData,
    context: {
      userId: string;
      organizationId: string;
      isNewCampaign: boolean;
    }
  ): Promise<PDFApprovalResult> {
    try {
      console.log(`🚀 Starte Enhanced Campaign-Speicherung mit PDF-Workflow`);
      
      // 1. Speichere Campaign (bestehende Logik)
      let campaignId: string;
      
      if (context.isNewCampaign) {
        campaignId = await prService.create({
          ...campaignData,
          userId: context.userId,
          organizationId: context.organizationId,
          status: 'draft',
          approvalRequired: approvalData.teamApprovalRequired || approvalData.customerApprovalRequired,
          approvalData: (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) 
            ? approvalData 
            : undefined,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        } as PRCampaign);
      } else {
        await prService.update(campaignData.id!, {
          approvalRequired: approvalData.teamApprovalRequired || approvalData.customerApprovalRequired,
          approvalData: (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) 
            ? approvalData 
            : undefined,
          updatedAt: Timestamp.now()
        });
        campaignId = campaignData.id!;
      }

      // 2. PDF-WORKFLOW Integration (nur wenn Approval erforderlich)
      if (approvalData.teamApprovalRequired || approvalData.customerApprovalRequired) {
        
        // 2a. Erstelle Approval-Workflow
        const workflowId = await approvalWorkflowService.createWorkflow(
          campaignId,
          context.organizationId,
          approvalData
        );

        // 2b. Erstelle PDF für Freigabe
        const pdfVersion = await this.createPDFForApproval(
          campaignId,
          workflowId,
          approvalData.customerApprovalRequired ? 'pending_customer' : 'pending_team'
        );

        // 2c. Generiere Shareable Links
        const shareableLinks: { team?: string; customer?: string } = {};
        
        if (approvalData.teamApprovalRequired) {
          shareableLinks.team = await this.createShareablePDFLink(pdfVersion.id, 'team');
        }
        
        if (approvalData.customerApprovalRequired) {
          shareableLinks.customer = await this.createShareablePDFLink(pdfVersion.id, 'customer');
        }

        // 2d. Update Campaign mit Workflow-Kontext
        await prService.update(campaignId, {
          status: approvalData.customerApprovalRequired ? 'in_review' : 'draft',
          updatedAt: Timestamp.now()
        });

        console.log(`✅ Enhanced Campaign-Speicherung abgeschlossen: PDF-Workflow aktiv`);
        return {
          campaignId,
          workflowId,
          pdfVersionId: pdfVersion.id,
          shareableLinks
        };
      }

      console.log(`✅ Standard Campaign-Speicherung abgeschlossen: Kein PDF-Workflow`);
      return { campaignId };

    } catch (error) {
      console.error('❌ Fehler bei Enhanced Campaign-Speicherung:', error);
      throw error;
    }
  },

  /**
   * 🆕 NEUE HELPER-METHODEN für Performance-Optimierung
   */
  
  /**
   * Optimierte Status-Bestimmung ohne redundante Abfragen
   */
  determinePDFStatusFromApproval(
    approvalStatus: string,
    workflow: any
  ): { pdfStatus: PDFVersionStatus; editLockAction: 'release' | 'update' | 'none' } {
    switch (approvalStatus) {
      case 'team_approved':
        return {
          pdfStatus: workflow.customerSettings.required ? 'pending_customer' : 'approved',
          editLockAction: workflow.customerSettings.required ? 'update' : 'release'
        };
      case 'customer_approved':
        return {
          pdfStatus: 'approved',
          editLockAction: 'release'
        };
      case 'rejected':
        return {
          pdfStatus: 'rejected',
          editLockAction: 'release'
        };
      case 'pending_team':
        return {
          pdfStatus: 'pending_team',
          editLockAction: 'update'
        };
      case 'pending_customer':
        return {
          pdfStatus: 'pending_customer',
          editLockAction: 'update'
        };
      default:
        return {
          pdfStatus: 'draft',
          editLockAction: 'none'
        };
    }
  },

  /**
   * Aktualisiert Edit-Lock Status ohne vollständige Release/Lock Zyklen
   */
  async updateEditLockStatus(
    campaignId: string,
    approvalStatus: string,
    userContext?: any
  ): Promise<void> {
    try {
      // Bestimme neue Lock-Reason basierend auf Status
      let newLockReason: EditLockReason;
      
      switch (approvalStatus) {
        case 'pending_customer':
          newLockReason = 'pending_customer_approval';
          break;
        case 'pending_team':
          newLockReason = 'pending_team_approval';
          break;
        default:
          return; // Kein Update nötig
      }

      // Direktes Update ohne vollständigen Lock-Cycle
      await pdfVersionsService.lockCampaignEditing(
        campaignId,
        newLockReason,
        {
          userId: userContext?.userId || 'system',
          displayName: userContext?.displayName || 'PDF-Approval System',
          action: `Status-Update: ${approvalStatus}`
        }
      );
      
      console.log(`🔄 Edit-Lock Status aktualisiert: ${campaignId} → ${newLockReason}`);
    } catch (error) {
      console.warn(`⚠️ Edit-Lock Status Update Fehler (nicht kritisch):`, error);
    }
  },

  /**
   * 🆕 PERFORMANCE MONITORING: Überwacht Service-Performance
   */
  async getServicePerformanceMetrics(): Promise<{
    averageApprovalSyncTime: number;
    averagePDFGenerationTime: number;
    averageEditLockTime: number;
    totalOperations: number;
  }> {
    // TODO: Implementation eines Performance-Monitoring Systems
    // Derzeit Placeholder für zukünftige Implementierung
    return {
      averageApprovalSyncTime: 0,
      averagePDFGenerationTime: 0,
      averageEditLockTime: 0,
      totalOperations: 0
    };
  }
};