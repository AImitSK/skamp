// src/lib/firebase/document-content-service.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
  onSnapshot,
  DocumentReference,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './client-init';
import { mediaService } from './media-service';
import type { 
  DocumentContent, 
  InternalDocument, 
  DocumentVersion,
  SpreadsheetContent 
} from '@/types/document-content';

/**
 * Service für interne Dokumente (Tiptap Editor Content)
 * Nutzt CLIENT SDK - kein Admin SDK!
 */
class DocumentContentService {
  private readonly COLLECTION = 'documentContent';
  private readonly MAX_VERSIONS = 10; // Maximale Anzahl gespeicherter Versionen
  
  /**
   * Erstellt ein neues Dokument
   */
  async createDocument(
    content: string,
    metadata: {
      fileName: string;
      folderId: string;
      organizationId: string;
      projectId: string;
      userId: string;
      fileType?: 'celero-doc' | 'celero-sheet';
    }
  ): Promise<{ documentId: string; assetId: string }> {
    try {
      // 1. Content in Firestore speichern
      const documentData: Omit<DocumentContent, 'id'> = {
        content,
        plainText: this.extractPlainText(content),
        organizationId: metadata.organizationId,
        projectId: metadata.projectId,
        folderId: metadata.folderId,
        version: 1,
        versionHistory: [],
        lastEditedBy: metadata.userId,
        lastEditedAt: serverTimestamp() as Timestamp,
        createdBy: metadata.userId,
        createdAt: serverTimestamp() as Timestamp,
        currentEditor: null,
        isLocked: false
      };

      const contentRef = await addDoc(
        collection(db, this.COLLECTION), 
        documentData
      );

      // 2. Als "Datei" in Media Assets registrieren
      const fileName = metadata.fileName.endsWith('.celero-doc') 
        ? metadata.fileName 
        : `${metadata.fileName}.celero-doc`;

      const assetMetadata: Partial<InternalDocument> = {
        fileName,
        fileType: metadata.fileType || 'celero-doc',
        contentRef: contentRef.id,
        folderId: metadata.folderId,
        organizationId: metadata.organizationId,
        projectId: metadata.projectId,
        createdBy: metadata.userId,
        version: 1,
        fileSize: new Blob([content]).size,
        icon: metadata.fileType === 'celero-sheet' ? 'spreadsheet' : 'document'
      };

      // MediaService erweitern für interne Dokumente
      const assetId = await this.createMediaAsset(assetMetadata, metadata.userId);

      return { 
        documentId: contentRef.id, 
        assetId 
      };
    } catch (error) {
      console.error('Fehler beim Erstellen des Dokuments:', error);
      throw error;
    }
  }

  /**
   * Lädt ein Dokument
   */
  async loadDocument(documentId: string): Promise<DocumentContent | null> {
    try {
      console.log('documentContentService.loadDocument called with ID:', documentId);
      console.log('Using collection:', this.COLLECTION);
      
      const docRef = doc(db, this.COLLECTION, documentId);
      const docSnap = await getDoc(docRef);
      
      console.log('Document exists:', docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Document data:', data);
        return { id: docSnap.id, ...data } as DocumentContent;
      } else {
        console.warn('Document not found in collection', this.COLLECTION, 'with ID:', documentId);
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden des Dokuments:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert ein Dokument mit Auto-Versionierung
   */
  async updateDocument(
    documentId: string,
    content: string,
    userId: string,
    createVersion: boolean = false
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, documentId);
      const currentDoc = await this.loadDocument(documentId);
      
      if (!currentDoc) {
        throw new Error('Dokument nicht gefunden');
      }

      const updateData: any = {
        content,
        plainText: this.extractPlainText(content),
        lastEditedBy: userId,
        lastEditedAt: serverTimestamp(),
        version: increment(1)
      };

      // Versionierung bei bedeutenden Änderungen
      if (createVersion && currentDoc.content !== content) {
        const newVersion: DocumentVersion = {
          version: currentDoc.version,
          content: currentDoc.content,
          updatedBy: currentDoc.lastEditedBy,
          updatedAt: currentDoc.lastEditedAt
        };

        // Begrenzte Versions-Historie
        const versionHistory = [
          newVersion,
          ...(currentDoc.versionHistory || [])
        ].slice(0, this.MAX_VERSIONS);

        updateData.versionHistory = versionHistory;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Dokuments:', error);
      throw error;
    }
  }

  /**
   * Sperrt ein Dokument für Bearbeitung
   */
  async lockDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.COLLECTION, documentId);
      const currentDoc = await this.loadDocument(documentId);
      
      if (!currentDoc) {
        console.warn('Dokument zum Sperren nicht gefunden:', documentId);
        return false; // Dokument existiert nicht
      }
      
      // Prüfe ob bereits gesperrt
      if (currentDoc.isLocked && currentDoc.lockedBy !== userId) {
        // Prüfe ob Lock abgelaufen (älter als 5 Minuten)
        if (currentDoc.lockedAt) {
          const lockAge = Date.now() - currentDoc.lockedAt.toMillis();
          if (lockAge < 5 * 60 * 1000) {
            return false; // Noch gesperrt von anderem User
          }
        }
      }

      await updateDoc(docRef, {
        isLocked: true,
        lockedBy: userId,
        lockedAt: serverTimestamp(),
        currentEditor: userId
      });

      return true;
    } catch (error) {
      console.error('Fehler beim Sperren des Dokuments:', error);
      return false;
    }
  }

  /**
   * Entsperrt ein Dokument
   */
  async unlockDocument(documentId: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, documentId);
      
      // Prüfe zuerst, ob das Dokument existiert
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn('Dokument zum Entsperren nicht gefunden:', documentId);
        return; // Stillfehler - kein throw, da das Entsperren nicht kritisch ist
      }
      
      await updateDoc(docRef, {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        currentEditor: null
      });
    } catch (error) {
      console.error('Fehler beim Entsperren des Dokuments:', error);
      // Swallow error - unlocking should not break the UI
    }
  }

  /**
   * Listener für Echtzeit-Updates
   */
  subscribeToDocument(
    documentId: string,
    callback: (doc: DocumentContent | null) => void
  ): Unsubscribe {
    const docRef = doc(db, this.COLLECTION, documentId);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as DocumentContent);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Fehler beim Document-Subscription:', error);
      callback(null);
    });
  }

  /**
   * Löscht ein Dokument
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, documentId));
      // Media Asset sollte separat gelöscht werden
    } catch (error) {
      console.error('Fehler beim Löschen des Dokuments:', error);
      throw error;
    }
  }

  /**
   * Wiederherstellt eine frühere Version
   */
  async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string
  ): Promise<void> {
    try {
      const currentDoc = await this.loadDocument(documentId);
      if (!currentDoc || !currentDoc.versionHistory) {
        throw new Error('Keine Versionshistorie vorhanden');
      }

      const version = currentDoc.versionHistory.find(
        v => v.version === versionNumber
      );
      
      if (!version) {
        throw new Error('Version nicht gefunden');
      }

      await this.updateDocument(
        documentId,
        version.content,
        userId,
        true // Neue Version erstellen
      );
    } catch (error) {
      console.error('Fehler beim Wiederherstellen der Version:', error);
      throw error;
    }
  }

  /**
   * Hilfsfunktion: Extrahiert Plain Text aus HTML
   */
  private extractPlainText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Erstellt Media Asset für internes Dokument
   */
  private async createMediaAsset(
    metadata: Partial<InternalDocument>,
    userId: string
  ): Promise<string> {
    try {
      // Erstelle Asset-Daten entsprechend der Media Service Struktur
      const assetData = {
        fileName: metadata.fileName,
        fileType: metadata.fileType || 'celero-doc',
        fileSize: metadata.fileSize || 0,
        organizationId: metadata.organizationId,
        projectId: metadata.projectId,
        folderId: metadata.folderId,
        createdBy: userId,
        updatedBy: userId,
        
        // Content-spezifische Felder
        contentRef: metadata.contentRef,
        isInternalDocument: true,
        
        // Kein echter Storage-Upload
        downloadUrl: '', // Wird später durch Editor-URL ersetzt
        storagePath: '', // Kein Storage-Path für interne Dokumente
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const assetRef = await addDoc(
        collection(db, 'media_assets'), // Richtige Collection verwenden
        assetData
      );

      return assetRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Media Assets:', error);
      throw error;
    }
  }
}

// Singleton Export
export const documentContentService = new DocumentContentService();