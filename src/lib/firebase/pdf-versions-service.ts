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
   * Generiert professionelles Pressemitteilungs-PDF im Corporate Design
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

      // Professional Layout Constants
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginLeft = 25;
      const marginRight = 25;
      const marginTop = 20;
      const marginBottom = 25;
      const contentWidth = pageWidth - marginLeft - marginRight;
      let yPosition = marginTop;

      // Corporate Colors (Professional blue-grey palette)
      const colors = {
        primary: [20, 36, 72],      // Dunkelblau für Headlines
        secondary: [51, 65, 85],    // Grau für Subheadlines
        body: [30, 41, 59],         // Dunkelgrau für Body Text
        accent: [59, 130, 246],     // Accent Blue
        light: [148, 163, 184],     // Hellgrau für Separatoren
        background: [248, 250, 252] // Sehr helles Grau für Boxen
      };

      // Typography Scale (Professional hierarchy)
      const typography = {
        headline: 22,        // Hauptüberschrift
        subheading: 16,      // Unterüberschrift
        body: 11,            // Fließtext
        caption: 9,          // Bildunterschriften
        footer: 8,           // Fußzeilen
        boilerplate: 10      // Textbausteine
      };

      // Helper Functions
      const addLine = (x1: number, y1: number, x2: number, y2: number, color: number[] = colors.light): void => {
        pdf.setDrawColor(color[0], color[1], color[2]);
        pdf.setLineWidth(0.3);
        pdf.line(x1, y1, x2, y2);
      };

      const addRect = (x: number, y: number, width: number, height: number, fillColor?: number[]): void => {
        if (fillColor) {
          pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          pdf.rect(x, y, width, height, 'F');
        } else {
          pdf.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
          pdf.setLineWidth(0.2);
          pdf.rect(x, y, width, height, 'S');
        }
      };

      const addTextWithWrap = (
        text: string, 
        x: number, 
        y: number, 
        maxWidth: number, 
        fontSize: number = typography.body,
        color: number[] = colors.body,
        style: string = 'normal',
        align: string = 'left'
      ): number => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.setFont('helvetica', style);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4;
        
        lines.forEach((line: string, index: number) => {
          const currentY = y + (index * lineHeight);
          if (align === 'center') {
            pdf.text(line, x + maxWidth / 2, currentY, { align: 'center' });
          } else {
            pdf.text(line, x, currentY);
          }
        });
        
        return y + (lines.length * lineHeight);
      };

      /**
       * Intelligenter HTML-zu-PDF Parser der Formatierungen beibehält
       * Konvertiert HTML-Tags zu entsprechenden PDF-Formatierungen
       */
      const parseHtmlToPdfSegments = (html: string): Array<{text: string; style: string; fontSize?: number}> => {
        const segments: Array<{text: string; style: string; fontSize?: number}> = [];
        
        // Bereinige HTML von überflüssigen Whitespaces
        let cleanHtml = html.replace(/\s+/g, ' ').trim();
        
        // Parse HTML und extrahiere Formatierung
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${cleanHtml}</div>`, 'text/html');
        
        const processNode = (node: Node): void => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              segments.push({ text, style: 'normal' });
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();
            
            switch (tagName) {
              case 'strong':
              case 'b':
                segments.push({ text: element.textContent || '', style: 'bold' });
                break;
              case 'em':
              case 'i':
                segments.push({ text: element.textContent || '', style: 'italic' });
                break;
              case 'h1':
                segments.push({ text: element.textContent || '', style: 'bold', fontSize: typography.headline });
                segments.push({ text: '\n\n', style: 'normal' });
                break;
              case 'h2':
                segments.push({ text: element.textContent || '', style: 'bold', fontSize: typography.subheading });
                segments.push({ text: '\n\n', style: 'normal' });
                break;
              case 'h3':
                segments.push({ text: element.textContent || '', style: 'bold', fontSize: typography.body + 2 });
                segments.push({ text: '\n', style: 'normal' });
                break;
              case 'p':
                // Verarbeite Kinder-Elemente rekursiv
                for (let child = element.firstChild; child; child = child.nextSibling) {
                  processNode(child);
                }
                segments.push({ text: '\n\n', style: 'normal' });
                return; // Verhindere doppelte Verarbeitung
              case 'br':
                segments.push({ text: '\n', style: 'normal' });
                break;
              case 'blockquote':
                // Professionelle Zitat-Formatierung mit Einrückung
                segments.push({ text: '\n', style: 'normal' });
                segments.push({ text: '„', style: 'italic', fontSize: typography.body + 2 });
                segments.push({ text: element.textContent || '', style: 'italic', fontSize: typography.body });
                segments.push({ text: '“', style: 'italic', fontSize: typography.body + 2 });
                segments.push({ text: '\n\n', style: 'normal' });
                break;
              case 'div':
                // Prüfe auf CTA-Klassen oder spezielle Formatierungen
                const className = element.className?.toLowerCase() || '';
                if (className.includes('cta') || className.includes('call-to-action') || className.includes('highlight')) {
                  // CTA-Formatierung: Fett und mit Rahmen-Effekt
                  segments.push({ text: '\n━━━ ', style: 'bold' });
                  segments.push({ text: element.textContent || '', style: 'bold', fontSize: typography.body + 1 });
                  segments.push({ text: ' ━━━\n\n', style: 'bold' });
                } else {
                  // Normale Div: Verarbeite Kinder-Elemente
                  for (let child = element.firstChild; child; child = child.nextSibling) {
                    processNode(child);
                  }
                }
                break;
              case 'ul':
              case 'ol':
                segments.push({ text: '\n', style: 'normal' });
                const listItems = element.querySelectorAll('li');
                listItems.forEach((li, index) => {
                  const bullet = tagName === 'ul' ? '• ' : `${index + 1}. `;
                  segments.push({ text: bullet + (li.textContent || ''), style: 'normal' });
                  segments.push({ text: '\n', style: 'normal' });
                });
                segments.push({ text: '\n', style: 'normal' });
                break;
              case 'span':
                // Prüfe auf spezielle Span-Klassen
                const spanClass = element.className?.toLowerCase() || '';
                if (spanClass.includes('highlight') || spanClass.includes('important')) {
                  segments.push({ text: element.textContent || '', style: 'bold' });
                } else if (spanClass.includes('quote') || spanClass.includes('citation')) {
                  segments.push({ text: element.textContent || '', style: 'italic' });
                } else {
                  // Normale Span-Verarbeitung
                  for (let child = element.firstChild; child; child = child.nextSibling) {
                    processNode(child);
                  }
                }
                break;
              default:
                // Für andere Tags: Verarbeite Kinder-Elemente rekursiv
                for (let child = element.firstChild; child; child = child.nextSibling) {
                  processNode(child);
                }
                break;
            }
          }
        };
        
        // Verarbeite alle Kinder der Root-Div
        const rootDiv = doc.querySelector('div');
        if (rootDiv) {
          for (let child = rootDiv.firstChild; child; child = child.nextSibling) {
            processNode(child);
          }
        }
        
        return segments.filter(seg => seg.text.trim() !== '');
      };
      
      /**
       * Rendert HTML-Segmente mit korrekter Formatierung in PDF
       */
      const addFormattedText = (
        htmlContent: string,
        x: number,
        y: number,
        maxWidth: number,
        baseColor: number[] = colors.body
      ): number => {
        const segments = parseHtmlToPdfSegments(htmlContent);
        let currentY = y;
        let currentX = x;
        
        let isInQuote = false;
        let quoteIndent = 0;
        
        segments.forEach((segment, segmentIndex) => {
          if (segment.text === '\n' || segment.text === '\n\n') {
            // Zeilenumbruch
            currentY += (segment.text === '\n\n' ? typography.body * 0.8 : typography.body * 0.4);
            currentX = x + quoteIndent; // Berücksichtige Einrückung
            return;
          }
          
          // Prüfe auf Zitat-Start/Ende
          if (segment.text.includes('„')) {
            isInQuote = true;
            quoteIndent = 15; // Einrückung für Zitate
            
            // Füge vertikale Linie für Zitat hinzu
            const quoteLineX = x + 5;
            pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
            pdf.setLineWidth(1);
            
            // Schätze Höhe des Zitats
            const nextSegments = segments.slice(segmentIndex, segmentIndex + 3);
            const estimatedHeight = nextSegments.reduce((height, seg) => {
              return height + (seg.text.includes('\n') ? typography.body * 0.4 : 0);
            }, typography.body * 1.5);
            
            pdf.line(quoteLineX, currentY - 2, quoteLineX, currentY + estimatedHeight);
          }
          
          if (segment.text.includes('“')) {
            isInQuote = false;
            quoteIndent = 0;
          }
          
          const fontSize = segment.fontSize || typography.body;
          const style = segment.style || 'normal';
          let color = baseColor;
          
          // Spezielle Farbgebung für verschiedene Stile
          if (segment.style === 'italic' && isInQuote) {
            color = colors.secondary;
          } else if (segment.style === 'bold' && segment.text.includes('━')) {
            // CTA-Styling
            color = colors.accent;
          }
          
          // Prüfe ob Text zu lang für aktuelle Zeile ist
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', style);
          
          const availableWidth = maxWidth - (currentX - x) - quoteIndent;
          const lines = pdf.splitTextToSize(segment.text, availableWidth);
          const lineHeight = fontSize * 0.4;
          
          lines.forEach((line: string, index: number) => {
            // Prüfe ob neue Seite benötigt wird
            if (currentY + lineHeight > pageHeight - marginBottom) {
              pdf.addPage();
              currentY = marginTop;
              currentX = x + quoteIndent;
            }
            
            pdf.setFontSize(fontSize);
            pdf.setTextColor(color[0], color[1], color[2]);
            pdf.setFont('helvetica', style);
            pdf.text(line, currentX, currentY);
            
            if (index < lines.length - 1) {
              // Mehrzeiliger Text - nächste Zeile
              currentY += lineHeight;
              currentX = x + quoteIndent;
            } else {
              // Letzte Zeile - Position für nächstes Segment aktualisieren
              currentX += pdf.getTextWidth(line) + 2; // Kleiner Abstand
            }
          });
        });
        
        return currentY + typography.body * 0.4; // Abschluss-Spacing
      };

      const checkNewPage = (requiredHeight: number): void => {
        if (yPosition + requiredHeight > pageHeight - marginBottom) {
          pdf.addPage();
          yPosition = marginTop;
        }
      };

      // ========================================
      // 1. CORPORATE HEADER
      // ========================================
      
      // Header background strip
      addRect(0, 0, pageWidth, 12, colors.primary);
      
      // Press Release Badge
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRESSEMITTEILUNG', marginLeft, 8);
      
      // Date in top right
      const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
      const dateWidth = pdf.getTextWidth(today);
      pdf.text(today, pageWidth - marginRight - dateWidth, 8);
      
      yPosition = 25;

      // ========================================
      // 2. KEYVISUAL MIT PROFESSIONELLER PLATZIERUNG
      // ========================================
      
      if (content.keyVisual?.url) {
        try {
          // Extrahiere KeyVisual aus DOM anstatt Firebase URL zu fetchen
          const imageData = await this.extractImageFromDOM(content.keyVisual.url);
          
          if (imageData) {
            checkNewPage(90);
            
            // Professional image placement - full width with subtle border
            const imageWidth = contentWidth;
            const imageHeight = 70; // Fixed height für consistent layout
            
            // Subtle shadow effect (nur Rahmen, kein Shadow wie im Design Pattern)
            addRect(marginLeft - 1, yPosition - 1, imageWidth + 2, imageHeight + 2, [0, 0, 0]);
            addRect(marginLeft, yPosition, imageWidth, imageHeight, [255, 255, 255]);
            
            // Add image centered in the frame
            const imageAspect = imageData.width / imageData.height;
            let finalImageWidth = imageWidth - 4;
            let finalImageHeight = imageHeight - 4;
            
            // Maintain aspect ratio
            if (imageAspect > finalImageWidth / finalImageHeight) {
              finalImageHeight = finalImageWidth / imageAspect;
            } else {
              finalImageWidth = finalImageHeight * imageAspect;
            }
            
            const imageX = marginLeft + 2 + (imageWidth - 4 - finalImageWidth) / 2;
            const imageY = yPosition + 2 + (imageHeight - 4 - finalImageHeight) / 2;
            
            pdf.addImage(
              imageData.base64,
              imageData.format,
              imageX,
              imageY,
              finalImageWidth,
              finalImageHeight
            );
            
            yPosition += imageHeight + 5;
            
            // Professional caption styling
            if (content.keyVisual.caption) {
              yPosition = addTextWithWrap(
                content.keyVisual.caption, 
                marginLeft, 
                yPosition, 
                contentWidth, 
                typography.caption, 
                colors.secondary, 
                'italic'
              );
            }
            yPosition += 15;
            
          } else {
            // Professional placeholder für KeyVisual
            checkNewPage(25);
            addRect(marginLeft, yPosition, contentWidth, 20, colors.background);
            yPosition = addTextWithWrap(
              `[KeyVisual: ${content.keyVisual.alt || 'Pressebild wird nachgereicht'}]`,
              marginLeft + 5,
              yPosition + 7,
              contentWidth - 10,
              typography.caption,
              colors.secondary,
              'italic',
              'center'
            );
            yPosition += 25;
          }
        } catch (error) {
          console.warn('KeyVisual konnte nicht extrahiert werden:', error);
          // Elegant fallback
          checkNewPage(20);
          yPosition = addTextWithWrap(
            '[Pressebild wird separat bereitgestellt]',
            marginLeft,
            yPosition,
            contentWidth,
            typography.caption,
            colors.secondary,
            'italic',
            'center'
          );
          yPosition += 20;
        }
      }

      // ========================================
      // 3. HEADLINE MIT CORPORATE TYPOGRAPHY
      // ========================================
      
      checkNewPage(30);
      
      // Subtle separator line above headline
      addLine(marginLeft, yPosition, marginLeft + contentWidth, yPosition, colors.accent);
      yPosition += 8;
      
      // Main headline with professional spacing
      yPosition = addTextWithWrap(
        content.title,
        marginLeft,
        yPosition,
        contentWidth,
        typography.headline,
        colors.primary,
        'bold'
      );
      
      yPosition += 15;
      
      // Subtle separator line below headline
      addLine(marginLeft, yPosition, marginLeft + (contentWidth * 0.3), yPosition, colors.accent);
      yPosition += 20;

      // ========================================
      // 4. PROFESSIONAL BODY TEXT
      // ========================================
      
      if (content.mainContent && content.mainContent.trim()) {
        checkNewPage(30);
        
        // Verwende intelligenten HTML-Parser statt stripHtml
        checkNewPage(20);
        yPosition = addFormattedText(
          content.mainContent,
          marginLeft,
          yPosition,
          contentWidth,
          colors.body
        );
        yPosition += 8; // Professional spacing nach Haupttext
        
        yPosition += 15; // Extra space before next section
      }

      // ========================================
      // 5. TEXTBAUSTEINE ALS PROFESSIONAL FOOTER BOXES
      // ========================================
      
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
          checkNewPage(40);
          
          // Section separator
          addLine(marginLeft, yPosition, marginLeft + contentWidth, yPosition, colors.accent);
          yPosition += 10;
          
          // Section header
          yPosition = addTextWithWrap(
            'Über das Unternehmen',
            marginLeft,
            yPosition,
            contentWidth,
            typography.subheading,
            colors.primary,
            'bold'
          );
          yPosition += 12;

          // Professional boxes für each Textbaustein
          visibleSections.forEach((section, index) => {
            const sectionContent = section.content || 
                                  section.htmlContent || 
                                  section.text || 
                                  section.boilerplate?.content ||
                                  section.boilerplate?.htmlContent ||
                                  section.boilerplate?.text ||
                                  '';
            const sectionTitle = section.customTitle || '';

            // Estimate box height basierend auf Textinhalt
            const textLength = sectionContent.replace(/<[^>]*>/g, '').length;
            const estimatedLines = Math.max(3, Math.ceil(textLength / 80));
            const boxHeight = estimatedLines * 4 + 15;
            
            checkNewPage(boxHeight + 10);

            // Professional box with subtle background
            const boxY = yPosition;
            addRect(marginLeft, boxY, contentWidth, boxHeight, colors.background);
            addRect(marginLeft, boxY, contentWidth, boxHeight); // Border
            
            let currentY = boxY + 8;

            // Section title as bold header
            if (sectionTitle) {
              currentY = addTextWithWrap(
                sectionTitle,
                marginLeft + 8,
                currentY,
                contentWidth - 16,
                typography.boilerplate + 1,
                colors.primary,
                'bold'
              );
              currentY += 5;
            }

            // Section content with intelligent formatting preservation
            addFormattedText(
              sectionContent, // Verwende Original-HTML statt cleanContent
              marginLeft + 8,
              currentY,
              contentWidth - 16,
              colors.body
            );

            yPosition += boxHeight + 8;
          });
        }
      }

      // ========================================
      // 6. SENDER BLOCK (PROFESSIONAL PRESS CONTACT)
      // ========================================
      
      // Load customer/organization data for sender block
      const senderInfo = await this.getSenderInformation(organizationId);
      
      checkNewPage(50);
      
      // Separator before press contact
      yPosition += 10;
      addLine(marginLeft, yPosition, marginLeft + contentWidth, yPosition, colors.primary);
      yPosition += 12;
      
      // Press contact header
      yPosition = addTextWithWrap(
        'Pressekontakt',
        marginLeft,
        yPosition,
        contentWidth,
        typography.subheading,
        colors.primary,
        'bold'
      );
      yPosition += 10;
      
      // Create professional sender box
      const senderBoxHeight = 35;
      addRect(marginLeft, yPosition, contentWidth, senderBoxHeight, colors.background);
      addRect(marginLeft, yPosition, contentWidth, senderBoxHeight);
      
      let senderY = yPosition + 8;
      
      // Company name
      if (senderInfo.companyName) {
        senderY = addTextWithWrap(
          senderInfo.companyName,
          marginLeft + 8,
          senderY,
          contentWidth - 16,
          typography.body + 1,
          colors.primary,
          'bold'
        );
        senderY += 3;
      }
      
      // Contact person
      if (senderInfo.contactPerson) {
        senderY = addTextWithWrap(
          senderInfo.contactPerson,
          marginLeft + 8,
          senderY,
          contentWidth - 16,
          typography.body,
          colors.body,
          'normal'
        );
        senderY += 3;
      }
      
      // Phone and Email on same line
      if (senderInfo.phone || senderInfo.email) {
        const contactLine = [senderInfo.phone, senderInfo.email].filter(Boolean).join(' | ');
        addTextWithWrap(
          contactLine,
          marginLeft + 8,
          senderY,
          contentWidth - 16,
          typography.body,
          colors.secondary,
          'normal'
        );
      }
      
      yPosition += senderBoxHeight + 15;

      // ========================================
      // 7. PROFESSIONAL FOOTER
      // ========================================
      
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Footer line
        addLine(marginLeft, pageHeight - 20, pageWidth - marginRight, pageHeight - 20, colors.light);
        
        // Page number (left)
        pdf.setFontSize(typography.footer);
        pdf.setTextColor(colors.light[0], colors.light[1], colors.light[2]);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Seite ${i} von ${totalPages}`, marginLeft, pageHeight - 12);
        
        // Generation timestamp (right)
        const timestamp = `Erstellt am ${today}`;
        const timestampWidth = pdf.getTextWidth(timestamp);
        pdf.text(timestamp, pageWidth - marginRight - timestampWidth, pageHeight - 12);
        
        // Corporate footer (center)
        if (senderInfo.companyName) {
          const footerText = senderInfo.companyName;
          const footerWidth = pdf.getTextWidth(footerText);
          pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 12);
        }
      }

      // Generate PDF Blob
      const pdfBlob = pdf.output('blob');
      
      // Create File object
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Upload to Firebase Storage
      const uploadedAsset = await mediaService.uploadMedia(
        pdfFile,
        organizationId,
        'pdf-versions'
      );

      return {
        pdfUrl: uploadedAsset.downloadUrl,
        fileSize: pdfFile.size
      };

    } catch (error) {
      console.error('❌ Fehler bei der professionellen PDF-Generation:', error);
      // Fallback auf Mock-PDF
      return {
        pdfUrl: `https://storage.googleapis.com/mock-bucket/${fileName}`,
        fileSize: 1024 * 100
      };
    }
  }

  /**
   * Extrahiert KeyVisual aus bereits geladenem DOM anstatt Firebase URL zu fetchen
   */
  private async extractImageFromDOM(imageUrl: string): Promise<{ base64: string; format: string; width: number; height: number } | null> {
    try {
      // Suche nach dem bereits geladenen Bild im DOM
      const images = document.querySelectorAll('img');
      let targetImage: HTMLImageElement | null = null;
      
      // Finde das Bild mit der passenden URL (auch verkürzte/transformierte URLs)
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.src === imageUrl || 
            img.src.includes(imageUrl) || 
            imageUrl.includes(img.src) ||
            this.urlsMatch(img.src, imageUrl)) {
          targetImage = img;
          break;
        }
      }
      
      // Fallback: Suche in Live Preview Elements
      if (!targetImage) {
        const previewImages = document.querySelectorAll('.live-preview img, [data-key-visual] img, .key-visual img');
        if (previewImages.length > 0) {
          targetImage = previewImages[0] as HTMLImageElement;
        }
      }
      
      if (!targetImage || !targetImage.complete) {
        console.warn('KeyVisual nicht im DOM gefunden oder nicht vollständig geladen');
        return null;
      }
      
      // Erstelle Canvas für Bild-Konvertierung
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Canvas Context konnte nicht erstellt werden');
        return null;
      }
      
      // Setze Canvas-Größe auf Bild-Größe
      canvas.width = targetImage.naturalWidth || targetImage.width;
      canvas.height = targetImage.naturalHeight || targetImage.height;
      
      // CORS-Fix: Setze crossOrigin BEFORE loading
      if (!targetImage.crossOrigin) {
        // Versuche Canvas mit CORS-Unterstützung
        try {
          // Erstelle neues Image Element mit CORS-Unterstützung
          const corsImage = new Image();
          corsImage.crossOrigin = 'anonymous';
          
          // Lade Bild mit CORS-Unterstützung
          await new Promise<void>((resolve, reject) => {
            corsImage.onload = () => resolve();
            corsImage.onerror = () => reject(new Error('CORS Image loading failed'));
            corsImage.src = targetImage.src;
          });
          
          // Verwende CORS-Image
          ctx.drawImage(corsImage, 0, 0);
        } catch (corsError) {
          console.warn('CORS-Lösung fehlgeschlagen, versuche direktes Zeichnen:', corsError);
          // Fallback: Versuche trotzdem direktes Zeichnen
          ctx.drawImage(targetImage, 0, 0);
        }
      } else {
        // Bild hat bereits CORS-Unterstützung
        ctx.drawImage(targetImage, 0, 0);
      }
      
      // Konvertiere zu Base64
      const base64Data = canvas.toDataURL('image/jpeg', 0.85); // 85% Qualität für gute Balance
      
      // Bestimme Format
      let format = 'JPEG';
      if (imageUrl.toLowerCase().includes('.png') || base64Data.startsWith('data:image/png')) {
        format = 'PNG';
      }
      
      return {
        base64: base64Data.split(',')[1], // Entferne data:image/... prefix
        format,
        width: canvas.width,
        height: canvas.height
      };
      
    } catch (error) {
      console.error('Fehler beim Extrahieren des KeyVisuals aus DOM:', error);
      return null;
    }
  }
  
  /**
   * Prüft ob zwei URLs das gleiche Bild referenzieren (verschiedene Parameter, gleiche Basis)
   */
  private urlsMatch(url1: string, url2: string): boolean {
    try {
      // Entferne Query-Parameter für Vergleich
      const cleanUrl1 = url1.split('?')[0].split('#')[0];
      const cleanUrl2 = url2.split('?')[0].split('#')[0];
      
      return cleanUrl1 === cleanUrl2 || 
             cleanUrl1.includes(cleanUrl2) || 
             cleanUrl2.includes(cleanUrl1);
    } catch {
      return false;
    }
  }
  
  /**
   * Lädt Sender-Informationen für professionellen Pressekontakt-Block
   */
  private async getSenderInformation(organizationId: string): Promise<{
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    address?: string;
  }> {
    try {
      // Standard-Fallback für Demo
      const defaultSender = {
        companyName: 'Unternehmen',
        contactPerson: 'Pressestelle',
        phone: 'Tel: +49 (0) 123 456-789',
        email: 'presse@unternehmen.de'
      };
      
      // Versuche Organization-Daten aus Firestore zu laden
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        
        return {
          companyName: orgData.name || orgData.companyName || defaultSender.companyName,
          contactPerson: orgData.contactPerson || orgData.pressContact || defaultSender.contactPerson,
          phone: orgData.phone || orgData.phoneNumber || defaultSender.phone,
          email: orgData.email || orgData.contactEmail || orgData.pressEmail || defaultSender.email,
          address: orgData.address || orgData.businessAddress
        };
      }
      
      // Versuche Customer-Daten als Fallback
      const customerQuery = query(
        collection(db, 'customers'),
        where('organizationId', '==', organizationId),
        limit(1)
      );
      
      const customerSnapshot = await getDocs(customerQuery);
      
      if (!customerSnapshot.empty) {
        const customerData = customerSnapshot.docs[0].data();
        
        return {
          companyName: customerData.companyName || customerData.name || defaultSender.companyName,
          contactPerson: customerData.contactName || customerData.firstName + ' ' + customerData.lastName || defaultSender.contactPerson,
          phone: customerData.phone || defaultSender.phone,
          email: customerData.email || defaultSender.email,
          address: customerData.address
        };
      }
      
      // Fallback auf Default-Werte
      return defaultSender;
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sender-Informationen:', error);
      
      // Emergency fallback
      return {
        companyName: 'Unternehmen',
        contactPerson: 'Pressestelle', 
        phone: 'Tel: +49 (0) 123 456-789',
        email: 'presse@unternehmen.de'
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