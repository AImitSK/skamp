// src/lib/firebase/media-service.ts - Mit automatischer Firma-Vererbung beim Verschieben
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

// 🆕 Import der Folder-Utils für Firma-Vererbung
import { getRootFolderClientId } from '@/lib/utils/folder-utils';

export const mediaService = {
  // === SHARE LINK OPERATIONS === (unverändert)
  
  async createShareLink(shareData: Omit<ShareLink, 'id' | 'shareId' | 'accessCount' | 'createdAt' | 'lastAccessedAt'>): Promise<ShareLink> {
    try {
      const shareId = self.crypto?.randomUUID?.() 
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
        : Math.random().toString(36).substring(2, 14);
      
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
      
      await this.incrementShareAccess(doc.id);
      
      return shareLink;
    } catch (error) {
      console.error("Fehler beim Laden des Share-Links:", error);
      return null;
    }
  },

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

  async deleteShareLink(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Fehler beim Löschen des Share-Links:", error);
      throw error;
    }
  },

  // === FOLDER OPERATIONS === (unverändert außer Hilfsmethoden)
  
  async createFolder(folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const folderData: any = {
        userId: folder.userId,
        name: folder.name,
        ...(folder.description && { description: folder.description }),
        ...(folder.color && { color: folder.color }),
        ...(folder.clientId && { clientId: folder.clientId }),
        ...(folder.parentFolderId && { parentFolderId: folder.parentFolderId }),
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

  async getFolders(userId: string, parentFolderId?: string): Promise<MediaFolder[]> {
    try {
      console.log('Loading folders for userId:', userId, 'parentFolderId:', parentFolderId);
      let q;

      if (parentFolderId === undefined) {
        q = query(
          collection(db, 'media_folders'),
          where('userId', '==', userId)
        );
      } else {
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

  // 🆕 Hilfsmethode: Lade alle Ordner für Vererbungs-Berechnung
  async getAllFoldersForUser(userId: string): Promise<MediaFolder[]> {
    try {
      const q = query(
        collection(db, 'media_folders'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaFolder));
    } catch (error) {
      console.error("Fehler beim Laden aller Ordner:", error);
      throw error;
    }
  },

  async updateFolder(folderId: string, updates: Partial<MediaFolder>): Promise<void> {
    try {
      const docRef = doc(db, 'media_folders', folderId);
      
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

  async deleteFolder(folderId: string): Promise<void> {
    try {
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

  // === MEDIA OPERATIONS (erweitert mit automatischer Firma-Vererbung) ===

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
                ...(folderId && { folderId }),
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

  async getMediaAssets(userId: string, folderId?: string): Promise<MediaAsset[]> {
    try {
      console.log('Loading media assets for userId:', userId, 'folderId:', folderId);
      let q;
      
      if (folderId === undefined) {
        q = query(
          collection(db, 'media_assets'),
          where('userId', '==', userId)
        );
      } else {
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
      
      const filteredAssets = assets
        .filter(asset => {
          if (folderId === undefined) {
            return !asset.folderId;
          } else {
            return asset.folderId === folderId;
          }
        })
        .sort((a, b) => {
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

  // 🔧 FIXED: Verschiebt eine Datei UND passt automatisch die Firma-Vererbung an
  async moveAssetToFolder(assetId: string, newFolderId?: string, userId?: string): Promise<void> {
    try {
      console.log(`🔄 Moving asset ${assetId} to folder ${newFolderId || 'ROOT'}`);
      
      const docRef = doc(db, 'media_assets', assetId);
      const updateData: any = {};
      
      // 1. Folder-ID setzen/entfernen
      if (newFolderId) {
        updateData.folderId = newFolderId;
      } else {
        // Für Root-Dateien: folderId komplett entfernen
        updateData.folderId = null;
      }
      
      // 2. 🆕 AUTOMATISCHE FIRMA-VERERBUNG
      if (newFolderId && userId) {
        try {
          console.log('🏢 Calculating client inheritance...');
          
          // Lade Ziel-Ordner
          const targetFolder = await this.getFolder(newFolderId);
          if (targetFolder) {
            // Lade alle Ordner für Vererbungs-Berechnung
            const allFolders = await this.getAllFoldersForUser(userId);
            
            // Berechne vererbte Firma-ID
            const inheritedClientId = await getRootFolderClientId(targetFolder, allFolders);
            
            if (inheritedClientId) {
              console.log(`✅ Inheriting clientId: ${inheritedClientId}`);
              updateData.clientId = inheritedClientId;
            } else {
              console.log('ℹ️ No client inheritance - keeping current clientId');
              // Wenn Ordner keine Firma hat, clientId unverändert lassen
            }
          } else {
            console.warn('⚠️ Target folder not found');
          }
        } catch (inheritanceError) {
          console.error('❌ Error during client inheritance:', inheritanceError);
          // Bei Fehler: Normal verschieben ohne Firma-Änderung
        }
      } else if (!newFolderId) {
        // 3. Bei Root-Move: clientId unverändert lassen (Root-Assets haben editierbare Firma)
        console.log('📁 Moving to root - keeping current clientId for manual editing');
      }
      
      console.log('💾 Updating asset with data:', updateData);
      await updateDoc(docRef, updateData);
      
      console.log('✅ Asset moved successfully with automatic client inheritance!');
      
    } catch (error) {
      console.error("❌ Fehler beim Verschieben der Datei:", error);
      throw error;
    }
  },

  async updateAsset(assetId: string, updates: Partial<MediaAsset>): Promise<void> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      
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

  // === CLIENT/CUSTOMER MEDIA OPERATIONS === (unverändert)

  async getMediaByClientId(userId: string, clientId: string): Promise<{folders: MediaFolder[], assets: MediaAsset[], totalCount: number}> {
    try {
      console.log('Loading media for client:', clientId);
      
      const foldersQuery = query(
        collection(db, 'media_folders'),
        where('userId', '==', userId),
        where('clientId', '==', clientId)
      );
      
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

      let folderAssets: MediaAsset[] = [];
      for (const folder of folders) {
        const assets = await this.getMediaAssetsInFolder(folder.id!);
        folderAssets = [...folderAssets, ...assets];
      }

      const allAssets = [...directAssets, ...folderAssets];
      
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

  async deleteMediaAsset(asset: MediaAsset): Promise<void> {
    try {
      const storageRef = ref(storage, asset.storagePath);
      await deleteObject(storageRef);

      const docRef = doc(db, 'media_assets', asset.id!);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Fehler beim Löschen des Media Assets:", error);
      throw error;
    }
  },
};