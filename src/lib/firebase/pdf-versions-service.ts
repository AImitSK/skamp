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
   * Generiert text-basiertes PDF mit jsPDF und uploaded es zu Firebase Storage
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
      // Dynamic import für jsPDF
      const jsPDFModule = await import('jspdf');
      const { jsPDF } = jsPDFModule;
      
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Setup fonts and margins
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add text with word wrap
      const addTextWithWrap = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11): number => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * (fontSize * 0.352778)); // Convert pt to mm
      };

      // Helper function to strip HTML tags
      const stripHtml = (html: string): string => {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      };

      // Helper function to check if new page is needed
      const checkNewPage = (requiredHeight: number): void => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // 1. Add KeyVisual (if available)
      if (content.keyVisual?.url) {
        try {
          const imageData = await this.loadImageAsBase64(content.keyVisual.url);
          if (imageData) {
            checkNewPage(80); // Reserve space for image
            
            // Calculate image dimensions (max width 150mm, maintain aspect ratio)
            const maxImageWidth = 150;
            const maxImageHeight = 80;
            
            // Add image to PDF
            pdf.addImage(
              imageData.base64,
              imageData.format,
              margin + (maxWidth - maxImageWidth) / 2, // Center horizontally
              yPosition,
              maxImageWidth,
              maxImageHeight
            );
            yPosition += maxImageHeight + 5;
            
            // Add caption if available
            if (content.keyVisual.caption) {
              pdf.setFontSize(9);
              pdf.setTextColor(100, 100, 100);
              yPosition = addTextWithWrap(content.keyVisual.caption, margin, yPosition, maxWidth, 9);
            }
            yPosition += 10;
          } else {
            // Fallback: Add placeholder text
            checkNewPage(20);
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text('[KeyVisual: ' + (content.keyVisual.alt || 'Bild') + ']', margin, yPosition);
            yPosition += 10;
            
            if (content.keyVisual.caption) {
              pdf.setFontSize(9);
              yPosition = addTextWithWrap(content.keyVisual.caption, margin, yPosition, maxWidth, 9);
            }
            yPosition += 10;
          }
        } catch (error) {
          console.warn('KeyVisual konnte nicht hinzugefügt werden:', error);
          // Fallback: Add placeholder text
          checkNewPage(20);
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text('[KeyVisual: ' + (content.keyVisual.alt || 'Bild') + ']', margin, yPosition);
          yPosition += 15;
        }
      }

      // 2. Add Title
      checkNewPage(15);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      yPosition = addTextWithWrap(content.title, margin, yPosition, maxWidth, 16);
      yPosition += 10;

      // 3. Add Main Content
      if (content.mainContent && content.mainContent.trim()) {
        checkNewPage(20);
        pdf.setFont('helvetica', 'normal');
        const cleanMainContent = stripHtml(content.mainContent);
        yPosition = addTextWithWrap(cleanMainContent, margin, yPosition, maxWidth, 11);
        yPosition += 10;
      }

      // 4. Add Textbausteine
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
          checkNewPage(25);
          
          // Textbausteine Header
          pdf.setFont('helvetica', 'bold');
          yPosition = addTextWithWrap('Textbausteine', margin, yPosition, maxWidth, 14);
          yPosition += 8;

          // Add each section
          visibleSections.forEach((section, index) => {
            const sectionContent = section.content || 
                                  section.htmlContent || 
                                  section.text || 
                                  section.boilerplate?.content ||
                                  section.boilerplate?.htmlContent ||
                                  section.boilerplate?.text ||
                                  '';
            const sectionTitle = section.customTitle || '';

            const cleanContent = stripHtml(sectionContent);
            const estimatedHeight = Math.max(20, (cleanContent.length / 80) * 5); // Rough estimate
            
            checkNewPage(estimatedHeight);

            // Section Title
            if (sectionTitle) {
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 58, 138); // Blue color
              yPosition = addTextWithWrap(sectionTitle, margin, yPosition, maxWidth, 12);
              yPosition += 3;
            }

            // Section Content
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(30, 64, 175); // Slightly darker blue
            yPosition = addTextWithWrap(cleanContent, margin, yPosition, maxWidth, 10);
            yPosition += 8;

            // Reset colors
            pdf.setTextColor(0, 0, 0);
          });
        }
      }

      // Add footer with generation info
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Seite ${i} von ${totalPages} - Erstellt am ${new Date().toLocaleDateString('de-DE')}`,
          margin,
          pageHeight - 10
        );
      }

      // Generate PDF Blob
      const pdfBlob = pdf.output('blob');
      
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
      console.error('❌ Fehler bei der Text-basierten PDF-Generation:', error);
      // Fallback auf Mock-PDF
      return {
        pdfUrl: `https://storage.googleapis.com/mock-bucket/${fileName}`,
        fileSize: 1024 * 100
      };
    }
  }

  /**
   * Lädt ein Bild von einer URL und konvertiert es zu Base64 für PDF-Einbettung
   */
  private async loadImageAsBase64(imageUrl: string): Promise<{ base64: string; format: string } | null> {
    try {
      // Konvertiere Firebase Storage URL zu öffentlicher URL
      const publicUrl = this.convertToPublicUrl(imageUrl);
      
      // Fetch das Bild
      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Convert to blob
      const blob = await response.blob();
      
      // Determine image format
      const contentType = blob.type;
      let format = 'JPEG'; // Default
      if (contentType.includes('png')) format = 'PNG';
      else if (contentType.includes('jpg') || contentType.includes('jpeg')) format = 'JPEG';
      else if (contentType.includes('gif')) format = 'GIF';
      
      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({
            base64: base64.split(',')[1], // Remove data:image/... prefix
            format
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Fehler beim Laden des Bildes für PDF:', error);
      return null;
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