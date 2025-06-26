// src/lib/firebase/media-service.ts
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
import { MediaAsset, MediaFolder, FolderBreadcrumb } from '@/types/media';

export const mediaService = {
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