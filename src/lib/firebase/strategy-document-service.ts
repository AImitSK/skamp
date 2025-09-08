// src/lib/firebase/strategy-document-service.ts - PLAN 11/11 Strategiedokument-Service
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './client-init';
import { nanoid } from 'nanoid';

// ========================================
// STRATEGY DOCUMENT INTERFACES
// ========================================

export interface StrategyDocument {
  id: string;
  projectId: string;
  title: string;
  type: 'briefing' | 'strategy' | 'analysis' | 'notes';
  
  // Editor-Content (wie bei Kampagnen)
  content: string;           // HTML vom TipTap Editor
  plainText?: string;        // Plain-Text Version
  
  // Status & Metadaten
  status: 'draft' | 'review' | 'approved' | 'archived';
  author: string;
  authorName: string;
  version: number;
  
  // Versionierung
  previousVersionId?: string;
  versionNotes?: string;
  
  // Template-Informationen
  templateId?: string;
  templateName?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  organizationId: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'briefing' | 'strategy' | 'analysis' | 'notes';
  content: string;
  description: string;
  isBuiltIn: boolean;
  organizationId?: string;
  createdBy?: string;
  createdAt?: Timestamp;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  versionNotes?: string;
  createdBy: string;
  createdAt: Timestamp;
}

// ========================================
// STRATEGY DOCUMENT SERVICE
// ========================================

class StrategyDocumentService {
  
  /**
   * Erstellt ein neues Strategiedokument
   */
  async create(
    data: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      const documentData: any = {
        ...data,
        version: 1,
        organizationId: context.organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'strategy_documents'), documentData);
      
      // Erste Version speichern
      await this.createVersion(docRef.id, {
        version: 1,
        content: data.content,
        versionNotes: 'Initiale Version',
        createdBy: data.author
      });

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Strategiedokuments:', error);
      throw error;
    }
  }

  /**
   * Holt ein Strategiedokument nach ID
   */
  async getById(
    documentId: string,
    context: { organizationId: string }
  ): Promise<StrategyDocument | null> {
    try {
      const docRef = doc(db, 'strategy_documents', documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Multi-Tenancy Sicherheit
        if (data.organizationId !== context.organizationId) {
          return null;
        }
        
        return { id: docSnap.id, ...data } as StrategyDocument;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden des Strategiedokuments:', error);
      return null;
    }
  }

  /**
   * Holt alle Strategiedokumente für ein Projekt
   */
  async getByProjectId(
    projectId: string,
    context: { organizationId: string }
  ): Promise<StrategyDocument[]> {
    try {
      const q = query(
        collection(db, 'strategy_documents'),
        where('projectId', '==', projectId),
        where('organizationId', '==', context.organizationId),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StrategyDocument));
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Strategiedokumente:', error);
      return [];
    }
  }

  /**
   * Aktualisiert ein Strategiedokument und erstellt eine neue Version
   */
  async update(
    documentId: string,
    updates: Partial<Pick<StrategyDocument, 'title' | 'content' | 'status' | 'plainText' | 'version'>>,
    versionNotes: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Aktuelles Dokument laden
      const currentDoc = await this.getById(documentId, context);
      if (!currentDoc) {
        throw new Error('Strategiedokument nicht gefunden');
      }

      // Content-Änderung? Dann neue Version erstellen
      if (updates.content && updates.content !== currentDoc.content) {
        const newVersion = currentDoc.version + 1;
        
        await this.createVersion(documentId, {
          version: newVersion,
          content: updates.content,
          versionNotes,
          createdBy: context.userId
        });

        updates = { ...updates, version: newVersion };
      }

      // Dokument aktualisieren
      const docRef = doc(db, 'strategy_documents', documentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Strategiedokuments:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Version eines Dokuments
   */
  private async createVersion(
    documentId: string,
    versionData: Omit<DocumentVersion, 'id' | 'documentId' | 'createdAt'>
  ): Promise<string> {
    try {
      const version: any = {
        documentId,
        ...versionData,
        createdAt: serverTimestamp()
      };

      const versionRef = await addDoc(collection(db, 'document_versions'), version);
      return versionRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Dokumentversion:', error);
      throw error;
    }
  }

  /**
   * Holt alle Versionen eines Dokuments
   */
  async getVersions(
    documentId: string,
    context: { organizationId: string }
  ): Promise<DocumentVersion[]> {
    try {
      // Sicherheit: Erst prüfen ob Dokument zur Organisation gehört
      const document = await this.getById(documentId, context);
      if (!document) {
        return [];
      }

      const q = query(
        collection(db, 'document_versions'),
        where('documentId', '==', documentId),
        orderBy('version', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentVersion));
    } catch (error) {
      console.error('Fehler beim Laden der Dokumentversionen:', error);
      return [];
    }
  }

  /**
   * Erstellt ein Dokument aus einem Template
   */
  async createFromTemplate(
    templateId: string,
    projectId: string,
    title: string,
    authorId: string,
    authorName: string,
    context: { organizationId: string }
  ): Promise<string> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template nicht gefunden');
      }

      const documentData: Omit<StrategyDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
        projectId,
        title,
        type: template.type,
        content: template.content,
        plainText: this.htmlToPlainText(template.content),
        status: 'draft',
        author: authorId,
        authorName,
        templateId: template.id,
        templateName: template.name,
        organizationId: context.organizationId
      };

      return await this.create(documentData, { organizationId: context.organizationId, userId: authorId });
    } catch (error) {
      console.error('Fehler beim Erstellen des Dokuments aus Template:', error);
      throw error;
    }
  }

  /**
   * Holt alle verfügbaren Templates
   */
  async getTemplates(
    organizationId?: string
  ): Promise<DocumentTemplate[]> {
    try {
      // Built-in Templates + Organisations-spezifische Templates
      const builtInTemplates = this.getBuiltInTemplates();
      
      if (!organizationId) {
        return builtInTemplates;
      }

      // Zusätzlich Custom-Templates der Organisation laden
      const q = query(
        collection(db, 'document_templates'),
        where('organizationId', '==', organizationId)
      );

      const snapshot = await getDocs(q);
      const customTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DocumentTemplate));

      return [...builtInTemplates, ...customTemplates];
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
      return this.getBuiltInTemplates();
    }
  }

  /**
   * Holt ein einzelnes Template
   */
  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    try {
      // Prüfe erst Built-in Templates
      const builtInTemplates = this.getBuiltInTemplates();
      const builtInTemplate = builtInTemplates.find(t => t.id === templateId);
      
      if (builtInTemplate) {
        return builtInTemplate;
      }

      // Dann Custom-Templates
      const docRef = doc(db, 'document_templates', templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DocumentTemplate;
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      return null;
    }
  }

  /**
   * Löscht ein Strategiedokument (Soft Delete - Archive)
   */
  async archive(
    documentId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      await this.update(documentId, { status: 'archived' }, 'Dokument archiviert', context);
    } catch (error) {
      console.error('Fehler beim Archivieren des Strategiedokuments:', error);
      throw error;
    }
  }

  /**
   * Generiert PDF-Export für ein Dokument
   */
  async exportToPDF(
    documentId: string,
    context: { organizationId: string }
  ): Promise<Blob> {
    try {
      const document = await this.getById(documentId, context);
      if (!document) {
        throw new Error('Dokument nicht gefunden');
      }

      // Einfacher PDF-Export (in Produktion würde hier puppeteer oder ähnliches verwendet)
      const pdfContent = `
        ${document.title}
        
        Typ: ${document.type}
        Status: ${document.status}
        Version: ${document.version}
        Autor: ${document.authorName}
        
        ${document.plainText || this.htmlToPlainText(document.content)}
      `;

      return new Blob([pdfContent], { type: 'application/pdf' });
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      throw error;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Konvertiert HTML zu Plain Text
   */
  private htmlToPlainText(html: string): string {
    // Einfache HTML-zu-Text Konvertierung
    return html
      .replace(/<[^>]*>/g, '') // HTML-Tags entfernen
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Built-in Document Templates
   */
  private getBuiltInTemplates(): DocumentTemplate[] {
    return [
      {
        id: 'briefing-template',
        name: 'Projekt-Briefing',
        type: 'briefing',
        description: 'Standard-Template für Projektbriefings mit Zielen, Zielgruppen und Kernbotschaften',
        isBuiltIn: true,
        content: `
          <h1>Projekt-Briefing</h1>
          
          <h2>Ausgangssituation</h2>
          <p>[Beschreibung der aktuellen Situation]</p>
          
          <h2>Ziele</h2>
          <h3>Hauptziel</h3>
          <p>[Primäres Projektziel definieren]</p>
          
          <h3>Nebenziele</h3>
          <ul>
            <li>[Sekundäres Ziel 1]</li>
            <li>[Sekundäres Ziel 2]</li>
          </ul>
          
          <h2>Zielgruppen</h2>
          <h3>Primäre Zielgruppe</h3>
          <p>[Hauptzielgruppe beschreiben: Demografie, Verhalten, Bedürfnisse]</p>
          
          <h3>Sekundäre Zielgruppen</h3>
          <p>[Weitere relevante Zielgruppen]</p>
          
          <h2>Kernbotschaften</h2>
          <ol>
            <li><strong>Hauptbotschaft:</strong> [Zentrale Botschaft]</li>
            <li><strong>Unterstützende Botschaften:</strong> [Ergänzende Botschaften]</li>
          </ol>
          
          <h2>Tonalität & Stil</h2>
          <p>[Gewünschte Kommunikationstonalität definieren]</p>
          
          <h2>Budget & Timeline</h2>
          <p><strong>Budget:</strong> [Verfügbares Budget]</p>
          <p><strong>Deadline:</strong> [Wichtige Termine und Meilensteine]</p>
          
          <h2>Erfolgsmessung</h2>
          <p>[KPIs und Messkriterien definieren]</p>
        `
      },
      {
        id: 'strategy-template',
        name: 'Kommunikationsstrategie',
        type: 'strategy',
        description: 'Umfassendes Template für strategische Kommunikationsplanung',
        isBuiltIn: true,
        content: `
          <h1>Kommunikationsstrategie</h1>
          
          <h2>Executive Summary</h2>
          <p>[Zusammenfassung der Strategie in 2-3 Sätzen]</p>
          
          <h2>Situationsanalyse</h2>
          <h3>Marktumfeld</h3>
          <p>[Analyse des Markt- und Wettbewerbsumfelds]</p>
          
          <h3>SWOT-Analyse</h3>
          <table>
            <tr>
              <th>Stärken</th>
              <th>Schwächen</th>
            </tr>
            <tr>
              <td>[Interne Stärken auflisten]</td>
              <td>[Interne Schwächen identifizieren]</td>
            </tr>
          </table>
          <table>
            <tr>
              <th>Chancen</th>
              <th>Risiken</th>
            </tr>
            <tr>
              <td>[Externe Chancen identifizieren]</td>
              <td>[Externe Risiken bewerten]</td>
            </tr>
          </table>
          
          <h2>Strategische Ziele</h2>
          <h3>Langfristige Ziele (12+ Monate)</h3>
          <ul>
            <li>[Langfristiges Ziel 1]</li>
            <li>[Langfristiges Ziel 2]</li>
          </ul>
          
          <h3>Kurzfristige Ziele (1-6 Monate)</h3>
          <ul>
            <li>[Kurzfristiges Ziel 1]</li>
            <li>[Kurzfristiges Ziel 2]</li>
          </ul>
          
          <h2>Zielgruppenanalyse</h2>
          <h3>Persona 1: [Name]</h3>
          <p><strong>Demografie:</strong> [Alter, Geschlecht, Einkommen, etc.]</p>
          <p><strong>Verhalten:</strong> [Mediennutzung, Kaufverhalten, etc.]</p>
          <p><strong>Bedürfnisse:</strong> [Was motiviert diese Zielgruppe?]</p>
          
          <h2>Kommunikationsstrategie</h2>
          <h3>Positionierung</h3>
          <p>[Gewünschte Marktpositionierung]</p>
          
          <h3>Kernbotschaften</h3>
          <ol>
            <li>[Hauptbotschaft]</li>
            <li>[Unterstützende Botschaft 1]</li>
            <li>[Unterstützende Botschaft 2]</li>
          </ol>
          
          <h2>Kanal-Strategie</h2>
          <h3>Primäre Kanäle</h3>
          <p>[Hauptkommunikationskanäle und deren Nutzung]</p>
          
          <h3>Sekundäre Kanäle</h3>
          <p>[Ergänzende Kanäle für spezifische Zielgruppen]</p>
          
          <h2>Content-Strategie</h2>
          <p>[Art und Frequenz der Inhalte]</p>
          
          <h2>Erfolgsmessung</h2>
          <h3>KPIs</h3>
          <ul>
            <li>[KPI 1 mit Zielwert]</li>
            <li>[KPI 2 mit Zielwert]</li>
            <li>[KPI 3 mit Zielwert]</li>
          </ul>
          
          <h3>Monitoring</h3>
          <p>[Monitoring-Verfahren und -frequenz]</p>
          
          <h2>Budget & Ressourcen</h2>
          <p>[Budget-Aufteilung und Ressourcenplanung]</p>
          
          <h2>Timeline & Meilensteine</h2>
          <p>[Wichtige Termine und Projektphasen]</p>
        `
      },
      {
        id: 'analysis-template',
        name: 'Analyse-Dokument',
        type: 'analysis',
        description: 'Template für Markt-, Wettbewerbs- und Zielgruppenanalysen',
        isBuiltIn: true,
        content: `
          <h1>Analyse-Dokument</h1>
          
          <h2>Zielsetzung der Analyse</h2>
          <p>[Was soll mit dieser Analyse erreicht werden?]</p>
          
          <h2>Methodik</h2>
          <p>[Welche Analysemethoden wurden angewandt?]</p>
          
          <h2>Marktanalyse</h2>
          <h3>Marktgröße & -entwicklung</h3>
          <p>[Quantitative Marktdaten]</p>
          
          <h3>Marktsegmentierung</h3>
          <p>[Relevante Marktsegmente identifizieren]</p>
          
          <h3>Trends & Entwicklungen</h3>
          <ul>
            <li>[Trend 1]</li>
            <li>[Trend 2]</li>
            <li>[Trend 3]</li>
          </ul>
          
          <h2>Wettbewerbsanalyse</h2>
          <h3>Direkte Konkurrenten</h3>
          <table>
            <tr>
              <th>Konkurrent</th>
              <th>Stärken</th>
              <th>Schwächen</th>
              <th>Marktanteil</th>
            </tr>
            <tr>
              <td>[Konkurrent 1]</td>
              <td>[Stärken]</td>
              <td>[Schwächen]</td>
              <td>[Marktanteil]</td>
            </tr>
          </table>
          
          <h3>Indirekte Konkurrenten</h3>
          <p>[Alternative Lösungsanbieter]</p>
          
          <h2>Zielgruppenanalyse</h2>
          <h3>Demografische Analyse</h3>
          <p>[Altersgruppen, Geschlecht, Einkommen, Bildung, etc.]</p>
          
          <h3>Psychografische Analyse</h3>
          <p>[Werte, Einstellungen, Lifestyle, Interessen]</p>
          
          <h3>Behavioristische Analyse</h3>
          <p>[Kaufverhalten, Mediennutzung, Markentreue]</p>
          
          <h2>Kommunikationsanalyse</h2>
          <h3>Medienlandschaft</h3>
          <p>[Relevante Medien und Kanäle]</p>
          
          <h3>Botschafts-Analyse</h3>
          <p>[Analyse der Kommunikation von Wettbewerbern]</p>
          
          <h2>Key Findings</h2>
          <ol>
            <li><strong>[Key Finding 1]:</strong> [Detaillierte Erklärung]</li>
            <li><strong>[Key Finding 2]:</strong> [Detaillierte Erklärung]</li>
            <li><strong>[Key Finding 3]:</strong> [Detaillierte Erklärung]</li>
          </ol>
          
          <h2>Handlungsempfehlungen</h2>
          <h3>Kurzfristige Maßnahmen</h3>
          <ul>
            <li>[Empfehlung 1]</li>
            <li>[Empfehlung 2]</li>
          </ul>
          
          <h3>Langfristige Strategien</h3>
          <ul>
            <li>[Langfristige Empfehlung 1]</li>
            <li>[Langfristige Empfehlung 2]</li>
          </ul>
          
          <h2>Limitationen</h2>
          <p>[Einschränkungen der Analyse und Datenqualität]</p>
          
          <h2>Nächste Schritte</h2>
          <p>[Empfohlene Follow-up Aktionen]</p>
        `
      }
    ];
  }
}

// Singleton Export
export const strategyDocumentService = new StrategyDocumentService();