// src/lib/firebase/pdf-versions-service.ts - Vereinfachte PDF-Versionierung
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from './client-init';
import { nanoid } from 'nanoid';
import { approvalService } from './approval-service';
import { mediaService } from './media-service';
// NEW: Import für Enhanced Edit-Lock System
import { approvalWorkflowService } from './approval-workflow-service';
import type { EditLockReason, UnlockRequest } from '@/types/pr';

// Vereinfachter PDF-Version Type
export interface PDFVersion {
  id?: string;
  campaignId: string;
  organizationId: string;
  version: number;
  createdAt: Timestamp;
  createdBy: string;
  
  // STATUS-MANAGEMENT (VEREINFACHT - NUR KUNDEN-FREIGABEN)
  status: 'draft' | 'pending_customer' | 'approved' | 'rejected';
  approvalId?: string; // Verknüpfung mit bestehender Approval (approval-service.ts)
  
  // KUNDEN-FREIGABE
  customerApproval?: {
    shareId: string; // Für Kunden-Zugang
    customerContact?: string; // Kunden-Kontakt ID
    requestedAt?: Timestamp;
    approvedAt?: Timestamp;
  };
  
  // FILE-INFORMATION
  downloadUrl: string; // Firebase Storage URL
  fileName: string; // z.B. "Pressemitteilung_Titel_v3_2025-01-19.pdf"
  fileSize: number; // in Bytes
  
  // CONTENT-SNAPSHOT
  contentSnapshot: {
    title: string;
    mainContent: string; // HTML
    boilerplateSections: any[];
    keyVisual?: any;
    createdForApproval?: boolean; // True wenn für Freigabe erstellt
  };
  
  // METADATA
  metadata?: {
    wordCount: number;
    pageCount: number;
    generationTimeMs: number; // Performance-Tracking
  };
}


// Campaign Collection Erweiterung
export interface CampaignWithPDF {
  // ... bestehende Felder
  
  // NEUE PDF-VERSIONIERUNG
  pdfVersions?: PDFVersion[];
  currentPdfVersion?: string; // ID der aktiven Version
  
  // 🆕 ENHANCED EDIT-LOCK SYSTEM
  editLocked?: boolean;
  editLockedReason?: EditLockReason;
  lockedAt?: Timestamp;
  unlockedAt?: Timestamp;
  lockedBy?: {
    userId: string;
    displayName: string;
    action: string; // z.B. "Freigabe angefordert"
  };
  unlockRequests?: UnlockRequest[];
}

class PDFVersionsService {
  private collectionName = 'pdf_versions';

  /**
   * Erstellt eine neue PDF-Version
   */
  async createPDFVersion(
    campaignId: string,
    organizationId: string,
    content: {
      title: string;
      mainContent: string;
      boilerplateSections: any[];
      keyVisual?: any;
      clientName?: string;
    },
    context: {
      userId: string;
      status?: 'draft' | 'pending_customer';
      approvalId?: string;
      displayName?: string;
      workflowId?: string;
      isApprovalPDF?: boolean;
      approvalContext?: any;
    }
  ): Promise<string> {
    try {
      // Hole aktuelle Version-Nummer
      const currentVersion = await this.getLatestVersionNumber(campaignId);
      const newVersionNumber = currentVersion + 1;

      // Generiere Dateinamen
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${newVersionNumber}_${dateStr}.pdf`;

      // Echte PDF-Generation über neue Puppeteer-API Route
      const { pdfUrl, fileSize } = await this.generateRealPDF(content, fileName, organizationId);

      // Berechne Metadaten
      const wordCount = this.countWords(content.mainContent);
      const pageCount = Math.ceil(wordCount / 300); // Grobe Schätzung: 300 Wörter pro Seite
      const generationStart = Date.now();

      const pdfVersionData: Omit<PDFVersion, 'id'> = {
        campaignId,
        organizationId,
        version: newVersionNumber,
        createdAt: serverTimestamp() as Timestamp,
        createdBy: context.userId,
        status: context.status || 'draft',
        ...(context.approvalId && { approvalId: context.approvalId }), // Nur setzen wenn nicht undefined
        downloadUrl: pdfUrl,
        fileName,
        fileSize: fileSize,
        contentSnapshot: {
          title: content.title || '',
          mainContent: content.mainContent || '',
          boilerplateSections: content.boilerplateSections || [],
          ...(content.keyVisual && content.keyVisual.url && { keyVisual: content.keyVisual }), // Nur setzen wenn definiert und URL vorhanden
          createdForApproval: context.status === 'pending_customer'
        },
        metadata: {
          wordCount,
          pageCount,
          generationTimeMs: Date.now() - generationStart
        }
      };

      // Füge Kunden-Approval hinzu falls erforderlich
      if (context.status === 'pending_customer' && context.approvalId) {
        try {
          // Hole ShareId vom Approval-Service
          const approval = await approvalService.getById(context.approvalId, organizationId);
          if (approval && approval.shareId) {
            pdfVersionData.customerApproval = {
              shareId: approval.shareId,
              requestedAt: serverTimestamp() as Timestamp
            };
          }
        } catch (error) {
          console.warn('⚠️ Approval-Service Fehler, überspringe customerApproval:', error);
          // Fahre ohne customerApproval fort
        }
      }

      // Debug: Entferne alle undefined-Werte
      const cleanedData = this.removeUndefinedValues(pdfVersionData);

      // Erstelle PDF-Version in Firestore
      const docRef = await addDoc(collection(db, this.collectionName), cleanedData);
      const pdfVersionId = docRef.id;

      // Update Campaign mit aktueller PDF-Version (nur wenn Campaign existiert)
      try {
        await this.updateCampaignCurrentPDF(campaignId, pdfVersionId);
      } catch (error) {
        // Fahre trotzdem fort, PDF wurde erstellt
      }

      // 🆕 ENHANCED: Aktiviere Edit-Lock falls Kunden-Freigabe angefordert
      if (context.status === 'pending_customer') {
        await this.lockCampaignEditing(
          campaignId, 
          'pending_customer_approval',
          {
            userId: context.userId,
            displayName: context.displayName || 'System',
            action: `PDF-Version ${newVersionNumber} für Freigabe erstellt`
          }
        );
      }

      return pdfVersionId;

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der PDF-Version:', error);
      throw new Error('Fehler beim Erstellen der PDF-Version');
    }
  }

  /**
   * Hole Version-Historie einer Kampagne
   */
  async getVersionHistory(campaignId: string): Promise<PDFVersion[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('campaignId', '==', campaignId),
        orderBy('version', 'desc'),
        limit(50) // Maximal 50 Versionen
      );

      const snapshot = await getDocs(q);
      const versions: PDFVersion[] = [];
      
      snapshot.forEach((doc) => {
        versions.push({ id: doc.id, ...doc.data() } as PDFVersion);
      });

      return versions;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Version-Historie:', error);
      return [];
    }
  }

  /**
   * Hole aktuelle PDF-Version
   */
  async getCurrentVersion(campaignId: string): Promise<PDFVersion | null> {
    try {
      const versions = await this.getVersionHistory(campaignId);
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      console.error('❌ Fehler beim Laden der aktuellen Version:', error);
      return null;
    }
  }

  /**
   * Update PDF-Version Status
   */
  async updateVersionStatus(
    versionId: string,
    status: 'draft' | 'pending_customer' | 'approved' | 'rejected',
    approvalId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (approvalId) {
        updateData.approvalId = approvalId;
      }

      if (status === 'approved') {
        updateData['customerApproval.approvedAt'] = serverTimestamp();
      }

      await updateDoc(doc(db, this.collectionName, versionId), updateData);
      
      // 🆕 ENHANCED: Update Campaign Edit-Lock Status mit Context
      const version = await this.getVersionById(versionId);
      if (version) {
        if (status === 'approved') {
          await this.lockCampaignEditing(
            version.campaignId, 
            'approved_final',
            {
              userId: 'system',
              displayName: 'PDF-System',
              action: `PDF-Version ${version.version} freigegeben`
            }
          );
        } else if (status === 'rejected' || status === 'draft') {
          await this.unlockCampaignEditing(
            version.campaignId,
            {
              userId: 'system',
              displayName: 'PDF-System',
              reason: status === 'rejected' ? 'PDF-Freigabe abgelehnt' : 'PDF-Status auf Draft zurückgesetzt'
            }
          );
        }

        // 🆕 Benachrichtige Approval-Workflow über PDF-Status-Update
        await this.notifyApprovalWorkflowOfPDFUpdate(
          version.campaignId,
          versionId,
          status,
          { organizationId: version.organizationId }
        );
      }

    } catch (error) {
      console.error('❌ Fehler beim Update des PDF-Status:', error);
      throw error;
    }
  }

  /**
   * 🆕 ENHANCED: Sperre Campaign-Bearbeitung mit erweiterten Metadaten
   */
  async lockCampaignEditing(
    campaignId: string,
    reason: EditLockReason | string, // Backward compatibility
    context?: {
      userId?: string;
      displayName?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Konvertiere legacy reasons
      let lockReason: EditLockReason;
      if (typeof reason === 'string') {
        switch (reason) {
          case 'pending_approval':
            lockReason = 'pending_customer_approval';
            break;
          case 'approved':
            lockReason = 'approved_final';
            break;
          default:
            lockReason = reason as EditLockReason;
        }
      } else {
        lockReason = reason;
      }

      const lockData: any = {
        editLocked: true,
        editLockedReason: lockReason,
        lockedAt: serverTimestamp()
      };

      // Füge Kontext-Daten hinzu falls verfügbar
      if (context) {
        lockData.lockedBy = {
          userId: context.userId || 'system',
          displayName: context.displayName || 'System',
          action: context.action || 'Automatische Sperrung'
        };
        if (context.metadata) {
          lockData.lockMetadata = context.metadata;
        }
      }

      await updateDoc(doc(db, 'pr_campaigns', campaignId), lockData);

      // 🆕 Audit-Log für Edit-Lock Events
      await this.logEditLockEvent(campaignId, 'locked', lockReason, context || {});
      
      // 🆕 Optional: Benachrichtigungen
      await this.notifyEditLockChange(campaignId, 'locked', lockReason);

      console.log(`🔒 Enhanced Campaign-Bearbeitung gesperrt: ${campaignId} (${lockReason})`);
    } catch (error) {
      console.error('❌ Fehler beim Enhanced Sperren der Campaign:', error);
      throw error;
    }
  }

  /**
   * 🆕 ENHANCED: Entsperre Campaign-Bearbeitung mit Audit-Trail
   */
  async unlockCampaignEditing(
    campaignId: string,
    context?: {
      userId?: string;
      displayName?: string;
      reason?: string;
    }
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'pr_campaigns', campaignId), {
        editLocked: false,
        editLockedReason: null,
        unlockedAt: serverTimestamp(),
        // Behalte lockedBy für Audit-Trail, aber markiere als unlocked
        lastUnlockedBy: context ? {
          userId: context.userId || 'system',
          displayName: context.displayName || 'System',
          reason: context.reason || 'Automatische Entsperrung'
        } : undefined
      });

      // 🆕 Audit-Log für Unlock Events
      await this.logEditLockEvent(campaignId, 'unlocked', null, context || {});
      
      // 🆕 Optional: Benachrichtigungen
      await this.notifyEditLockChange(campaignId, 'unlocked', null);

      console.log(`🔓 Enhanced Campaign-Bearbeitung entsperrt: ${campaignId}`);
    } catch (error) {
      console.error('❌ Fehler beim Enhanced Entsperren der Campaign:', error);
      throw error;
    }
  }

  /**
   * 🆕 ENHANCED: Detaillierte Edit-Lock Status-Abfrage
   */
  async getEditLockStatus(campaignId: string): Promise<{
    isLocked: boolean;
    reason?: EditLockReason;
    lockedBy?: any;
    lockedAt?: Timestamp;
    unlockRequests?: UnlockRequest[];
    canRequestUnlock: boolean;
  }> {
    try {
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      if (!campaignDoc.exists()) {
        return { isLocked: false, canRequestUnlock: false };
      }
      
      const campaign = campaignDoc.data() as CampaignWithPDF;
      const isLocked = campaign.editLocked === true;
      const reason = campaign.editLockedReason;
      
      // Bestimme ob Unlock-Request möglich ist
      const canRequestUnlock = isLocked && reason !== 'system_processing' && 
        !(campaign.unlockRequests?.some(req => req.status === 'pending'));
      
      return {
        isLocked,
        reason,
        lockedBy: campaign.lockedBy,
        lockedAt: campaign.lockedAt,
        unlockRequests: campaign.unlockRequests || [],
        canRequestUnlock
      };
      
    } catch (error) {
      console.error('❌ Fehler beim Edit-Lock Status Check:', error);
      return { isLocked: false, canRequestUnlock: false };
    }
  }

  /**
   * 🆕 BACKWARD COMPATIBILITY: Einfache isLocked-Abfrage
   */
  async isEditingLocked(campaignId: string): Promise<boolean> {
    const status = await this.getEditLockStatus(campaignId);
    return status.isLocked;
  }

  /**
   * Verknüpfe PDF-Version mit Approval
   */
  async linkVersionToApproval(
    versionId: string,
    approvalId: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, versionId), {
        approvalId,
        status: 'pending_customer',
        linkedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Fehler beim Verknüpfen mit Approval:', error);
      throw error;
    }
  }

  /**
   * Lösche alte Draft-Versionen (Cleanup)
   */
  async deleteOldDraftVersions(
    campaignId: string,
    keepCount: number = 3
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('campaignId', '==', campaignId),
        where('status', '==', 'draft'),
        orderBy('version', 'desc')
      );

      const snapshot = await getDocs(q);
      const drafts: PDFVersion[] = [];
      
      snapshot.forEach((doc) => {
        drafts.push({ id: doc.id, ...doc.data() } as PDFVersion);
      });

      // Behalte nur die neuesten N Draft-Versionen
      const toDelete = drafts.slice(keepCount);
      
      for (const draft of toDelete) {
        if (draft.id) {
          await deleteDoc(doc(db, this.collectionName, draft.id));
        }
      }

    } catch (error) {
      console.error('❌ Fehler beim Cleanup alter Versionen:', error);
    }
  }

  /**
   * Generiert PDF über neue Puppeteer-API Route (Migration von jsPDF)
   */
  private async generateRealPDF(
    content: {
      title: string;
      mainContent: string;
      boilerplateSections: any[];
      keyVisual?: any;
      clientName?: string;
    },
    fileName: string,
    organizationId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    try {
      // ========================================
      // NEUE PUPPETEER-BASIERTE PDF-GENERATION
      // ========================================
      console.log('📄 === PUPPETEER PDF-GENERATION GESTARTET ===');
      console.log('🏷️ Title:', content.title);
      console.log('📝 MainContent:', content.mainContent?.substring(0, 100) + '...');
      console.log('🔢 BoilerplateSections:', content.boilerplateSections?.length || 0);
      console.log('🖼️ KeyVisual:', !!content.keyVisual?.url);
      console.log('🏢 ClientName:', content.clientName);

      // Bereite Request für API auf
      const apiRequest = {
        campaignId: 'temp-campaign', // Wird später aus Context geholt
        organizationId,
        title: content.title,
        mainContent: content.mainContent,
        boilerplateSections: content.boilerplateSections || [],
        keyVisual: content.keyVisual,
        clientName: content.clientName || 'Unternehmen',
        userId: 'temp-user', // Wird später aus Context geholt
        fileName: fileName,
        options: {
          format: 'A4' as const,
          orientation: 'portrait' as const,
          printBackground: true,
          waitUntil: 'networkidle0' as const
        }
      };

      // API-Aufruf an neue Puppeteer-Route
      console.log('🚀 Rufe Puppeteer PDF-API auf...');
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF-API Fehler ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`PDF-Generation fehlgeschlagen: ${result.error}`);
      }

      console.log('✅ Puppeteer PDF erfolgreich generiert:', {
        fileSize: result.fileSize,
        needsClientUpload: result.needsClientUpload,
        generationTime: result.metadata?.generationTimeMs,
        wordCount: result.metadata?.wordCount,
        pageCount: result.metadata?.pageCount
      });

      // Wenn Client-Side Upload nötig ist, führe es durch
      let finalPdfUrl = result.pdfUrl;
      
      if (result.needsClientUpload && result.pdfBase64) {
        console.log('📤 Client-Side Upload wird durchgeführt...');
        
        // Konvertiere Base64 zu Blob
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Erstelle File object für Upload
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // Upload via mediaService (Client-Side mit Auth)
        console.log('☁️ Uploade PDF zu Firebase Storage (Client-Side)...');
        const uploadedAsset = await mediaService.uploadMedia(
          pdfFile,
          organizationId,
          undefined, // kein Ordner
          undefined, // kein Progress-Callback
          3, // Retry Count
          { userId: 'pdf-system' } // Context
        );
        
        finalPdfUrl = uploadedAsset.downloadUrl;
        console.log('✅ Client-Side Upload erfolgreich!');
      }
      
      console.log('📄 === PUPPETEER PDF-GENERATION BEENDET ===\n');

      return {
        pdfUrl: finalPdfUrl,
        fileSize: result.fileSize
      };

    } catch (error) {
      console.error('❌ Fehler bei der Puppeteer PDF-Generation:', error);
      
      // Detailliertere Fehlerbehandlung
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          console.error('⏱️ PDF-Generation Timeout');
        } else if (error.message.includes('network')) {
          console.error('🌐 Netzwerk-Fehler bei PDF-Generation');
        } else if (error.message.includes('storage')) {
          console.error('☁️ Storage-Fehler bei PDF-Generation');
        }
      }
      
      // Fallback: Werfe Fehler weiter, damit der aufrufende Code reagieren kann
      throw new Error(`PDF-Generation fehlgeschlagen: ${error}`);
    }
  }

  // ========================================
  // Private Hilfsmethoden
  // ========================================

  private async getLatestVersionNumber(campaignId: string): Promise<number> {
    try {
      const currentVersion = await this.getCurrentVersion(campaignId);
      return currentVersion ? currentVersion.version : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getVersionById(versionId: string): Promise<PDFVersion | null> {
    try {
      const docSnapshot = await getDoc(doc(db, this.collectionName, versionId));
      if (docSnapshot.exists()) {
        return { id: docSnapshot.id, ...docSnapshot.data() } as PDFVersion;
      }
      return null;
    } catch (error) {
      console.error('❌ Fehler beim Laden der PDF-Version:', error);
      return null;
    }
  }

  private async updateCampaignCurrentPDF(
    campaignId: string,
    pdfVersionId: string
  ): Promise<void> {
    try {
      // Prüfe erst ob Campaign existiert
      const campaignRef = doc(db, 'pr_campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      
      if (campaignSnap.exists()) {
        await updateDoc(campaignRef, {
          currentPdfVersion: pdfVersionId,
          lastPdfGeneratedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('❌ Fehler beim Update der Campaign PDF-Referenz:', error);
    }
  }

  private countWords(html: string): number {
    // Entferne HTML-Tags und zähle Wörter
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Entfernt rekursiv alle undefined-Werte aus einem Object
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * 🆕 UNLOCK-REQUEST SYSTEM
   */
  async requestUnlock(
    campaignId: string,
    requestContext: {
      userId: string;
      displayName: string;
      reason: string;
    }
  ): Promise<string> {
    try {
      const unlockRequest: UnlockRequest = {
        id: nanoid(),
        requestedBy: requestContext.userId,
        requestedAt: serverTimestamp() as Timestamp,
        reason: requestContext.reason,
        status: 'pending'
      };
      
      // Füge Request zur Campaign hinzu
      const campaignRef = doc(db, 'pr_campaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);
      
      if (campaignDoc.exists()) {
        const currentRequests = campaignDoc.data().unlockRequests || [];
        await updateDoc(campaignRef, {
          unlockRequests: [...currentRequests, unlockRequest]
        });
      }
      
      // Benachrichtige Administratoren
      await this.notifyUnlockRequest(campaignId, unlockRequest);
      
      console.log(`📝 Unlock-Request erstellt: ${unlockRequest.id} für Campaign ${campaignId}`);
      return unlockRequest.id;
      
    } catch (error) {
      console.error('❌ Fehler beim Unlock-Request:', error);
      throw error;
    }
  }

  /**
   * 🆕 UNLOCK-REQUEST APPROVAL
   */
  async approveUnlockRequest(
    campaignId: string,
    requestId: string,
    approverContext: {
      userId: string;
      displayName: string;
    }
  ): Promise<void> {
    try {
      // 1. Campaign laden
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      if (!campaignDoc.exists()) {
        throw new Error('Campaign nicht gefunden');
      }
      
      const campaign = campaignDoc.data() as CampaignWithPDF;
      const unlockRequests = campaign.unlockRequests || [];
      
      // 2. Request finden und updaten
      const updatedRequests = unlockRequests.map(req => 
        req.id === requestId 
          ? {
              ...req,
              status: 'approved' as const,
              approvedBy: approverContext.userId,
              approvedAt: serverTimestamp() as Timestamp
            }
          : req
      );
      
      // 3. Campaign entsperren und Request-Status updaten
      await updateDoc(doc(db, 'pr_campaigns', campaignId), {
        editLocked: false,
        editLockedReason: null,
        unlockedAt: serverTimestamp(),
        unlockRequests: updatedRequests,
        lastUnlockedBy: approverContext
      });
      
      // 4. Audit-Log und Notifications
      await this.logEditLockEvent(campaignId, 'unlocked', null, approverContext);
      await this.notifyUnlockApproval(campaignId, requestId, approverContext);
      
      console.log(`✅ Unlock-Request approved: ${requestId} für Campaign ${campaignId}`);
      
    } catch (error) {
      console.error('❌ Fehler beim Unlock-Request Approval:', error);
      throw error;
    }
  }

  /**
   * 🆕 PRIVATE HELPER: Audit-Log für Edit-Lock Events
   */
  private async logEditLockEvent(
    campaignId: string,
    action: 'locked' | 'unlocked',
    reason: EditLockReason | null,
    context: any
  ): Promise<void> {
    try {
      const logEntry = {
        campaignId,
        action,
        reason,
        timestamp: serverTimestamp(),
        actor: context,
        metadata: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
        }
      };
      
      await addDoc(collection(db, 'audit_logs'), logEntry);
    } catch (error) {
      console.error('⚠️ Audit-Log Fehler (nicht kritisch):', error);
    }
  }

  /**
   * 🆕 PRIVATE HELPER: Benachrichtigungen für Edit-Lock Änderungen
   */
  private async notifyEditLockChange(
    campaignId: string,
    action: 'locked' | 'unlocked',
    reason: EditLockReason | null
  ): Promise<void> {
    try {
      // Integration mit bestehendem Notification-System
      // TODO: Implementation basierend auf vorhandenem Service
      console.log(`📧 Edit-Lock Notification: ${campaignId} ${action} (${reason})`);
    } catch (error) {
      console.warn('⚠️ Edit-Lock Notification Fehler (nicht kritisch):', error);
    }
  }

  /**
   * 🆕 PRIVATE HELPER: Benachrichtigungen für Unlock-Requests
   */
  private async notifyUnlockRequest(
    campaignId: string,
    request: UnlockRequest
  ): Promise<void> {
    try {
      // Benachrichtige Administratoren über Unlock-Request
      console.log(`📧 Unlock-Request Notification: ${request.id} für Campaign ${campaignId}`);
    } catch (error) {
      console.warn('⚠️ Unlock-Request Notification Fehler (nicht kritisch):', error);
    }
  }

  /**
   * 🆕 PRIVATE HELPER: Benachrichtigungen für Unlock-Approval
   */
  private async notifyUnlockApproval(
    campaignId: string,
    requestId: string,
    approver: any
  ): Promise<void> {
    try {
      // Benachrichtige Requester über Approval
      console.log(`📧 Unlock-Approval Notification: ${requestId} approved by ${approver.displayName}`);
    } catch (error) {
      console.warn('⚠️ Unlock-Approval Notification Fehler (nicht kritisch):', error);
    }
  }

  /**
   * 🆕 CALLBACK-INTEGRATION: Benachrichtige Approval-Workflow über PDF-Status-Updates
   */
  private async notifyApprovalWorkflowOfPDFUpdate(
    campaignId: string,
    pdfVersionId: string,
    newStatus: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Vermeide zirkuläre Aufrufe durch Flag
      if (metadata?.skipApprovalCallback) {
        return;
      }
      
      // Rufe Approval-Workflow Callback auf
      await approvalWorkflowService.handlePDFStatusUpdate(
        campaignId,
        pdfVersionId,
        newStatus,
        metadata
      );
    } catch (error) {
      console.warn('⚠️ Approval-Workflow Callback Fehler (nicht kritisch):', error);
    }
  }
}

// Export Singleton Instance
export const pdfVersionsService = new PDFVersionsService();

// Export für Tests  
export { PDFVersionsService };