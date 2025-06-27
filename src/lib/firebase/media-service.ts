// src/lib/firebase/media-service.ts - Mit updateAsset Methode
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './client-init';
import { MediaAsset, MediaFolder, FolderBreadcrumb, ShareLink } from '@/types/media';

export const mediaService = {
  // === SHARE LINK OPERATIONS ===
  
  /**
   * Erstellt einen Share-Link für Ordner oder Datei
   */
  async createShareLink(shareData: Omit<ShareLink, 'id' | 'shareId' | 'accessCount' | 'createdAt' | 'lastAccessedAt'>): Promise<ShareLink> {
    try {
      // Generiere eindeutige Share-ID (fallback für ältere Browser)
      const shareId = self.crypto?.randomUUID?.() 
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
        : Math.random().toString(36).substring(2, 14);
      
      // Baue sauberes Objekt ohne undefined Werte
      const linkData: any = {
        userId: shareData.userId,
        type: shareData.type,
        targetId: shareData.targetId,
        title: shareData.title,
        isActive: shareData.isActive,
        shareId,
        accessCount: 0,
        settings: {
          downloadAllowed: shareData.settings.downloadAllowed,
          showFileList: shareData.settings.showFileList || false,
        },
        createdAt: serverTimestamp(),
      };

      // Nur hinzufügen wenn definiert
      if (shareData.description) {
        linkData.description = shareData.description;
      }

      if (shareData.settings.passwordRequired) {
        linkData.settings.passwordRequired = shareData.settings.passwordRequired;
      }

      if (shareData.settings.expiresAt) {
        linkData.settings.expiresAt = shareData.settings.expiresAt;
      }
      
      console.log('Creating share link with clean data:', linkData);
      
      const docRef = await addDoc(collection(db, 'media_shares'), linkData);
      return { id: docRef.id, ...linkData } as ShareLink;
    } catch (error) {
      console.error("Fehler beim Erstellen des Share-Links:", error);
      throw error;
    }
  },

  /**
   * Lädt alle Share-Links für einen Benutzer
   */
  async getShareLinks(userId: string): Promise<ShareLink[]> {
    try {
      const q = query(
        collection(db, 'media_shares'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShareLink));
    } catch (error) {
      console.error("Fehler beim Laden der Share-Links:", error);
      throw error;
    }
  },

  /**
   * Lädt einen Share-Link anhand der öffentlichen shareId
   */
  async getShareLinkByShareId(shareId: string): Promise<ShareLink | null> {
    try {
      const q = query(
        collection(db, 'media_shares'),
        where('shareId', '==', shareId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      const shareLink = { id: doc.id, ...doc.data() } as ShareLink;
      
      // Zugriffszähler erhöhen
      await this.incrementShareAccess(doc.id);
      
      return shareLink;
    } catch (error) {
      console.error("Fehler beim Laden des Share-Links:", error);
      return null;
    }
  },

  /**
   * Erhöht den Zugriffszähler eines Share-Links
   */
  async incrementShareAccess(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await updateDoc(docRef, {
        accessCount: (await getDoc(docRef)).data()?.accessCount + 1 || 1,
        lastAccessedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Zugriffszählers:", error);
    }
  },

  /**
   * Deaktiviert einen Share-Link
   */
  async deactivateShareLink(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await updateDoc(docRef, {
        isActive: false,
      });
    } catch (error) {
      console.error("Fehler beim Deaktivieren des Share-Links:", error);
      throw error;
    }
  },

  /**
   * Löscht einen Share-Link
   */
  async deleteShareLink(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Fehler beim Löschen des Share-Links:", error);
      throw error;
    }
  },
  // === FOLDER OPERATIONS ===
  
  /**
   * Erstellt einen neuen Ordner
   */
  async createFolder(folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const folderData: any = {
        userId: folder.userId,
        name: folder.name,
        ...(folder.description && { description: folder.description }),
        ...(folder.color && { color: folder.color }),
        ...(folder.clientId && { clientId: folder.clientId }),
        ...(folder.parentFolderId && { parentFolderId: folder.parentFolderId }), // NEU: Nur hinzufügen wenn definiert
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      console.log('Creating folder with data:', folderData);
      
      const docRef = await addDoc(collection(db, 'media_folders'), folderData);
      return docRef.id;
    } catch (error) {
      console.error("Fehler beim Erstellen des Ordners:", error);
      throw error;
    }
  },

  /**
   * Lädt alle Ordner für einen Benutzer
   */
  async getFolders(userId: string, parentFolderId?: string): Promise<MediaFolder[]> {
    try {
      console.log('Loading folders for userId:', userId, 'parentFolderId:', parentFolderId);
      let q;

      if (parentFolderId === undefined) {
        // Root-Ordner: Einfache Query ohne Index
        q = query(
          collection(db, 'media_folders'),
          where('userId', '==', userId)
        );
      } else {
        // Unterordner: Einfache Query ohne Index
        q = query(
          collection(db, 'media_folders'),
          where('userId', '==', userId),
          where('parentFolderId', '==', parentFolderId)
        );
      }

      const snapshot = await getDocs(q);
      console.log('Raw folders from Firestore:', snapshot.docs.length);
      const folders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaFolder));
      
      // Client-side Sortierung (um Index zu vermeiden)
      const filteredFolders = folders
        .filter(folder => parentFolderId === undefined ? !folder.parentFolderId : folder.parentFolderId === parentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('Filtered folders:', filteredFolders.length);
      return filteredFolders;
    } catch (error) {
      console.error("Fehler beim Laden der Ordner:", error);
      throw error;
    }
  },

  /**
   * Lädt einen spezifischen Ordner
   */
  async getFolder(folderId: string): Promise<MediaFolder | null> {
    try {
      const docRef = doc(db, 'media_folders', folderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MediaFolder;
      }
      return null;
    } catch (error) {
      console.error("Fehler beim Laden des Ordners:", error);
      throw error;
    }
  },

  /**
   * Aktualisiert einen Ordner
   */
  async updateFolder(folderId: string, updates: Partial<MediaFolder>): Promise<void> {
    try {
      const docRef = doc(db, 'media_folders', folderId);
      
      // Baue Update-Objekt ohne undefined Werte
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.clientId !== undefined) updateData.clientId = updates.clientId;
      if (updates.parentFolderId !== undefined) updateData.parentFolderId = updates.parentFolderId;
      
      console.log('Updating folder with data:', updateData);
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Ordners:", error);
      throw error;
    }
  },

  /**
   * Löscht einen Ordner (nur wenn leer)
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      // Prüfe ob Ordner Dateien oder Unterordner enthält
      const hasFiles = await this.hasFilesInFolder(folderId);
      const hasSubfolders = await this.hasSubfolders(folderId);
      
      if (hasFiles || hasSubfolders) {
        throw new Error('Ordner kann nicht gelöscht werden: Enthält noch Dateien oder Unterordner');
      }

      const docRef = doc(db, 'media_folders', folderId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Fehler beim Löschen des Ordners:", error);
      throw error;
    }
  },

  /**
   * Prüft ob Ordner Dateien enthält
   */
  async hasFilesInFolder(folderId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'media_assets'),
        where('folderId', '==', folderId)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Fehler beim Prüfen der Ordner-Dateien:", error);
      return false;
    }
  },

  /**
   * Prüft ob Ordner Unterordner enthält
   */
  async hasSubfolders(folderId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'media_folders'),
        where('parentFolderId', '==', folderId)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Fehler beim Prüfen der Unterordner:", error);
      return false;
    }
  },

  /**
   * Erstellt Breadcrumb-Navigation für einen Ordner
   */
  async getBreadcrumbs(folderId: string): Promise<FolderBreadcrumb[]> {
    try {
      const breadcrumbs: FolderBreadcrumb[] = [];
      let currentFolderId: string | undefined = folderId;

      while (currentFolderId) {
        const folder = await this.getFolder(currentFolderId);
        if (folder) {
          breadcrumbs.unshift({
            id: folder.id!,
            name: folder.name,
            parentFolderId: folder.parentFolderId,
          });
          currentFolderId = folder.parentFolderId;
        } else {
          break;
        }
      }

      return breadcrumbs;
    } catch (error) {
      console.error("Fehler beim Erstellen der Breadcrumbs:", error);
      return [];
    }
  },

  // === MEDIA OPERATIONS (erweitert) ===

  /**
   * Lädt eine Datei in den Firebase Storage hoch (mit Ordner-Support)
   */
  async uploadMedia(
    file: File,
    userId: string,
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaAsset> {
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `users/${userId}/media/${timestamp}_${cleanFileName}`;
      
      console.log('Uploading to path:', storagePath);
      
      const storageRef = ref(storage, storagePath);

      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress);
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            console.error("Upload-Fehler:", error);
            reject(error);
          },
          async () => {
            try {
              console.log('Upload completed, getting download URL...');
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Download URL obtained:', downloadUrl);

              const assetData: Omit<MediaAsset, 'id'> = {
                userId,
                fileName: file.name,
                fileType: file.type,
                storagePath,
                downloadUrl,
                ...(folderId && { folderId }), // NEU: Nur hinzufügen wenn folderId definiert ist
                createdAt: serverTimestamp() as any,
              };

              console.log('Saving metadata to Firestore...');
              const docRef = await addDoc(collection(db, 'media_assets'), assetData);
              console.log('Metadata saved with ID:', docRef.id);
              
              resolve({ id: docRef.id, ...assetData });

            } catch (error) {
              console.error("Fehler beim Speichern der Metadaten:", error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error("Fehler beim Initialisieren des Uploads:", error);
      throw error;
    }
  },

  /**
   * Ruft alle Medien-Assets für einen bestimmten Benutzer ab (mit Ordner-Filter)
   */
  async getMediaAssets(userId: string, folderId?: string): Promise<MediaAsset[]> {
    try {
      console.log('Loading media assets for userId:', userId, 'folderId:', folderId);
      let q;
      
      if (folderId === undefined) {
        // Root-Dateien: Einfache Query
        q = query(
          collection(db, 'media_assets'),
          where('userId', '==', userId)
        );
      } else {
        // Dateien in spezifischem Ordner: Einfache Query
        q = query(
          collection(db, 'media_assets'),
          where('userId', '==', userId),
          where('folderId', '==', folderId)
        );
      }

      const snapshot = await getDocs(q);
      console.log('Raw media assets from Firestore:', snapshot.docs.length);
      const assets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaAsset));
      
      // Client-side Filterung und Sortierung (um Index zu vermeiden)
      const filteredAssets = assets
        .filter(asset => {
          if (folderId === undefined) {
            return !asset.folderId; // Root-Dateien (ohne folderId)
          } else {
            return asset.folderId === folderId; // Dateien im spezifischen Ordner
          }
        })
        .sort((a, b) => {
          // Sortierung nach createdAt (neueste zuerst)
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
      
      console.log('Filtered assets:', filteredAssets.length);
      return filteredAssets;
    } catch (error) {
      console.error("Fehler beim Laden der Media Assets:", error);
      throw error;
    }
  },

  /**
   * Verschiebt eine Datei in einen anderen Ordner
   */
  async moveAssetToFolder(assetId: string, newFolderId?: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      const updateData: any = {};
      
      if (newFolderId) {
        updateData.folderId = newFolderId;
      } else {
        // Für Root-Dateien: folderId komplett entfernen
        updateData.folderId = null;
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Fehler beim Verschieben der Datei:", error);
      throw error;
    }
  },

  /**
   * NEU: Aktualisiert ein Medien-Asset (für Details-Modal)
   */
  async updateAsset(assetId: string, updates: Partial<MediaAsset>): Promise<void> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      
      // Baue Update-Objekt ohne undefined Werte
      const updateData: any = {};
      
      if (updates.fileName !== undefined) updateData.fileName = updates.fileName;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.folderId !== undefined) updateData.folderId = updates.folderId;
      if (updates.clientId !== undefined) updateData.clientId = updates.clientId;
      
      console.log('Updating asset with data:', updateData);
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Assets:", error);
      throw error;
    }
  },

  /**
   * Lädt einen spezifischen Asset (für Share-Links ohne userId-Filter)
   */
  async getMediaAssetById(assetId: string): Promise<MediaAsset | null> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MediaAsset;
      }
      return null;
    } catch (error) {
      console.error("Fehler beim Laden des Media Assets:", error);
      throw error;
    }
  },

  /**
   * Lädt alle Assets in einem Ordner (für Share-Links ohne userId-Filter)
   */
  async getMediaAssetsInFolder(folderId: string): Promise<MediaAsset[]> {
    try {
      const q = query(
        collection(db, 'media_assets'),
        where('folderId', '==', folderId)
      );
      
      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaAsset));
      
      // Client-side Sortierung nach Erstellungsdatum
      return assets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error("Fehler beim Laden der Ordner-Assets:", error);
      throw error;
    }
  },

  // === CLIENT/CUSTOMER MEDIA OPERATIONS ===

  /**
   * Lädt alle Medien (Ordner + Assets) für einen spezifischen Kunden
   */
  async getMediaByClientId(userId: string, clientId: string): Promise<{folders: MediaFolder[], assets: MediaAsset[], totalCount: number}> {
    try {
      console.log('Loading media for client:', clientId);
      
      // Lade alle Ordner des Kunden
      const foldersQuery = query(
        collection(db, 'media_folders'),
        where('userId', '==', userId),
        where('clientId', '==', clientId)
      );
      
      // Lade alle direkten Assets des Kunden (nicht in Ordnern)
      const assetsQuery = query(
        collection(db, 'media_assets'),
        where('userId', '==', userId),
        where('clientId', '==', clientId)
      );

      const [foldersSnapshot, assetsSnapshot] = await Promise.all([
        getDocs(foldersQuery),
        getDocs(assetsQuery)
      ]);

      const folders = foldersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaFolder));

      const directAssets = assetsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaAsset));

      // Lade Assets aus allen Kunden-Ordnern
      let folderAssets: MediaAsset[] = [];
      for (const folder of folders) {
        const assets = await this.getMediaAssetsInFolder(folder.id!);
        folderAssets = [...folderAssets, ...assets];
      }

      const allAssets = [...directAssets, ...folderAssets];
      
      // Sortiere Assets nach Datum (neueste zuerst)
      allAssets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      console.log(`Found ${folders.length} folders and ${allAssets.length} assets for client`);

      return {
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        assets: allAssets,
        totalCount: folders.length + allAssets.length
      };
    } catch (error) {
      console.error("Fehler beim Laden der Kunden-Medien:", error);
      throw error;
    }
  },

  /**
   * Zählt die Anzahl der Dateien in einem Ordner
   */
  async getFolderFileCount(folderId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'media_assets'),
        where('folderId', '==', folderId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error("Fehler beim Zählen der Ordner-Dateien:", error);
      return 0;
    }
  },

  /**
   * Löscht ein Medien-Asset aus Firebase Storage und Firestore
   */
  async deleteMediaAsset(asset: MediaAsset): Promise<void> {
    try {
      // 1. Datei aus Storage löschen
      const storageRef = ref(storage, asset.storagePath);
      await deleteObject(storageRef);

      // 2. Dokument aus Firestore löschen
      const docRef = doc(db, 'media_assets', asset.id!);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Fehler beim Löschen des Media Assets:", error);
      throw error;
    }
  },
};