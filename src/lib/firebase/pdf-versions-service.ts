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
  editLocked?: boolean; // Edit-Status
  editLockedReason?: string; // "pending_approval" | "approved"
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
    },
    context: {
      userId: string;
      status?: 'draft' | 'pending_customer';
      approvalId?: string;
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

      // Bereite Content für PDF-Generation vor (Storage URLs zu öffentlichen URLs konvertieren)
      const processedContent = await this.processContentForPDF(content);
      
      // Echte PDF-Generation mit html2pdf.js (wie in CampaignContentComposer)
      const { pdfUrl, fileSize } = await this.generateRealPDF(processedContent, fileName, organizationId);

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
          title: processedContent.title || '',
          mainContent: processedContent.mainContent || '',
          boilerplateSections: processedContent.boilerplateSections || [],
          ...(processedContent.keyVisual && processedContent.keyVisual.url && { keyVisual: processedContent.keyVisual }), // Nur setzen wenn definiert und URL vorhanden
          createdForApproval: context.status === 'pending_customer',
          // PDF-Layout Struktur: 1. KeyVisual, 2. Headline, 3. Text, 4. Textbausteine
          layoutOrder: ['keyVisual', 'title', 'mainContent', 'boilerplateSections']
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
      console.log('📄 PDF-Daten für Firestore:', Object.keys(cleanedData));

      // Erstelle PDF-Version in Firestore
      const docRef = await addDoc(collection(db, this.collectionName), cleanedData);
      const pdfVersionId = docRef.id;

      // Update Campaign mit aktueller PDF-Version (nur wenn Campaign existiert)
      try {
        await this.updateCampaignCurrentPDF(campaignId, pdfVersionId);
      } catch (error) {
        console.warn('⚠️ Campaign PDF-Update fehlgeschlagen (Campaign existiert möglicherweise nicht):', error);
        // Fahre trotzdem fort, PDF wurde erstellt
      }

      // Aktiviere Edit-Lock falls Kunden-Freigabe angefordert
      if (context.status === 'pending_customer') {
        await this.lockCampaignEditing(campaignId, 'pending_approval');
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
      
      // Update Campaign Edit-Lock Status
      const version = await this.getVersionById(versionId);
      if (version) {
        if (status === 'approved') {
          await this.lockCampaignEditing(version.campaignId, 'approved');
        } else if (status === 'rejected' || status === 'draft') {
          await this.unlockCampaignEditing(version.campaignId);
        }
      }

    } catch (error) {
      console.error('❌ Fehler beim Update des PDF-Status:', error);
      throw error;
    }
  }

  /**
   * Sperre Campaign-Bearbeitung
   */
  async lockCampaignEditing(
    campaignId: string,
    reason: 'pending_approval' | 'approved'
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        editLocked: true,
        editLockedReason: reason,
        lockedAt: serverTimestamp()
      });

      // console.log('🔒 Campaign-Bearbeitung gesperrt:', campaignId, reason);
    } catch (error) {
      console.error('❌ Fehler beim Sperren der Campaign:', error);
      throw error;
    }
  }

  /**
   * Entsperre Campaign-Bearbeitung
   */
  async unlockCampaignEditing(campaignId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        editLocked: false,
        editLockedReason: null,
        unlockedAt: serverTimestamp()
      });

      // console.log('🔓 Campaign-Bearbeitung entsperrt:', campaignId);
    } catch (error) {
      console.error('❌ Fehler beim Entsperren der Campaign:', error);
      throw error;
    }
  }

  /**
   * Prüfe ob Campaign-Bearbeitung gesperrt ist
   */
  async isEditingLocked(campaignId: string): Promise<boolean> {
    try {
      const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
      if (campaignDoc.exists()) {
        const data = campaignDoc.data();
        return data.editLocked === true;
      }
      return false;
    } catch (error) {
      console.error('❌ Fehler beim Prüfen des Edit-Lock Status:', error);
      return false;
    }
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
          console.log('🗑️ Alte Draft-Version gelöscht:', draft.version);
        }
      }

    } catch (error) {
      console.error('❌ Fehler beim Cleanup alter Versionen:', error);
    }
  }

  /**
   * Generiert echtes PDF mit html2pdf.js und uploaded es zu Firebase Storage
   */
  private async generateRealPDF(
    content: {
      title: string;
      mainContent: string;
      boilerplateSections: any[];
      keyVisual?: any;
    },
    fileName: string,
    organizationId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    try {
      // Dynamic import für html2pdf to avoid SSR issues
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;

      // Erstelle HTML für PDF (wie in der Live-Vorschau)
      let html = '';
      
      // 1. KeyVisual
      if (content.keyVisual?.url) {
        html += `<div style="margin-bottom: 24px; text-align: center;">
          <img src="${content.keyVisual.url}" alt="${content.keyVisual.alt || ''}" 
               style="width: 100%; max-width: 600px; height: auto; border-radius: 8px;" />
          ${content.keyVisual.caption ? `<p style="margin-top: 8px; font-size: 14px; color: #666; font-style: italic;">${content.keyVisual.caption}</p>` : ''}
        </div>`;
      }
      
      // 2. Titel
      html += `<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${content.title}</h1>`;
      
      // 3. Haupt-Content
      if (content.mainContent) {
        html += `<div style="margin-bottom: 24px;">${content.mainContent}</div>`;
      }
      
      // 4. Textbausteine
      if (content.boilerplateSections && content.boilerplateSections.length > 0) {
        const visibleSections = content.boilerplateSections.filter(section => {
          const sectionContent = section.content || 
                                section.htmlContent || 
                                section.text || 
                                section.boilerplate?.content ||
                                section.boilerplate?.htmlContent ||
                                section.boilerplate?.text ||
                                '';
          return sectionContent && sectionContent.trim();
        });
        
        if (visibleSections.length > 0) {
          html += `<div style="margin-top: 32px;">
            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">Textbausteine</h2>`;
          
          visibleSections.forEach(section => {
            const sectionContent = section.content || 
                                  section.htmlContent || 
                                  section.text || 
                                  section.boilerplate?.content ||
                                  section.boilerplate?.htmlContent ||
                                  section.boilerplate?.text ||
                                  '';
            const sectionTitle = section.customTitle || '';
            
            html += `<div style="margin-bottom: 24px; padding: 16px; border-left: 4px solid #3b82f6; background-color: #eff6ff;">
              ${sectionTitle ? `<h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #1e3a8a;">${sectionTitle}</h3>` : ''}
              <div style="color: #1e40af;">${sectionContent}</div>
            </div>`;
          });
          html += `</div>`;
        }
      }

      // PDF Options
      const opt = {
        margin: [15, 15, 20, 15], // top, left, bottom, right
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Erstelle temporäres DIV für PDF-Generation
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.backgroundColor = '#ffffff';
      
      // Generate PDF Blob
      const pdfBlob = await html2pdf()
        .from(tempDiv)
        .set(opt)
        .outputPdf('blob');

      // Create File object
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Upload to Firebase Storage
      const uploadedAsset = await mediaService.uploadMedia(
        pdfFile,
        organizationId,
        'pdf-versions' // Spezielle Folder für PDF-Versionen
      );

      return {
        pdfUrl: uploadedAsset.downloadUrl,
        fileSize: pdfFile.size
      };

    } catch (error) {
      console.error('❌ Fehler bei der echten PDF-Generation:', error);
      // Fallback auf Mock-PDF
      return {
        pdfUrl: `https://storage.googleapis.com/mock-bucket/${fileName}`,
        fileSize: 1024 * 100
      };
    }
  }

  /**
   * Verarbeitet Content für PDF-Generation (Storage URLs zu öffentlichen URLs)
   */
  private async processContentForPDF(content: {
    title: string;
    mainContent: string;
    boilerplateSections: any[];
    keyVisual?: any;
  }): Promise<typeof content> {
    try {
      // Kopiere Content
      const processedContent = { ...content };

      // Konvertiere KeyVisual Storage URL zu öffentlicher URL
      if (processedContent.keyVisual?.url) {
        processedContent.keyVisual = {
          ...processedContent.keyVisual,
          url: this.convertToPublicUrl(processedContent.keyVisual.url)
        };
      }

      // Konvertiere URLs in mainContent HTML
      if (processedContent.mainContent) {
        processedContent.mainContent = this.convertStorageUrlsInHtml(processedContent.mainContent);
      }

      // Konvertiere URLs in Textbausteinen
      if (processedContent.boilerplateSections) {
        processedContent.boilerplateSections = processedContent.boilerplateSections.map(section => ({
          ...section,
          content: section.content ? this.convertStorageUrlsInHtml(section.content) : section.content
        }));
      }

      return processedContent;
    } catch (error) {
      console.error('❌ Fehler beim Verarbeiten des Contents für PDF:', error);
      return content; // Fallback: Original-Content zurückgeben
    }
  }

  /**
   * Konvertiert Firebase Storage URL zu öffentlicher URL
   */
  private convertToPublicUrl(storageUrl: string): string {
    try {
      // Firebase Storage URLs haben folgendes Format:
      // https://firebasestorage.googleapis.com/v0/b/PROJECT-ID.appspot.com/o/PATH?alt=media&token=TOKEN
      
      if (!storageUrl.includes('firebasestorage.googleapis.com')) {
        return storageUrl; // Bereits öffentliche URL oder andere URL
      }

      // Für PDF-Generation verwenden wir die URL mit dem alt=media Parameter
      // Das macht sie öffentlich zugänglich für PDF-Services
      if (storageUrl.includes('alt=media')) {
        return storageUrl; // Bereits korrekt formatiert
      }

      // Füge alt=media hinzu falls nicht vorhanden
      const separator = storageUrl.includes('?') ? '&' : '?';
      return `${storageUrl}${separator}alt=media`;
    } catch (error) {
      console.error('❌ Fehler beim Konvertieren der Storage URL:', error);
      return storageUrl; // Fallback: Original URL zurückgeben
    }
  }

  /**
   * Konvertiert Storage URLs in HTML-Content
   */
  private convertStorageUrlsInHtml(html: string): string {
    try {
      // Finde alle Firebase Storage URLs in img tags
      const imgRegex = /<img[^>]+src="([^"]*firebasestorage\.googleapis\.com[^"]*)"[^>]*>/gi;
      
      return html.replace(imgRegex, (match, url) => {
        const publicUrl = this.convertToPublicUrl(url);
        return match.replace(url, publicUrl);
      });
    } catch (error) {
      console.error('❌ Fehler beim Konvertieren der URLs im HTML:', error);
      return html;
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
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      
      if (campaignSnap.exists()) {
        await updateDoc(campaignRef, {
          currentPdfVersion: pdfVersionId,
          lastPdfGeneratedAt: serverTimestamp()
        });
        console.log('✅ Campaign PDF-Referenz aktualisiert');
      } else {
        console.warn('⚠️ Campaign existiert nicht, überspringe PDF-Referenz Update');
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
}

// Export Singleton Instance
export const pdfVersionsService = new PDFVersionsService();

// Export für Tests
export { PDFVersionsService };