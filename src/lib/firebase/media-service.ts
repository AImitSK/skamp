// src/lib/firebase/media-service.ts - ENHANCED WITH MULTI-TENANCY SUPPORT
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
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './config';
import { MediaAsset, MediaFolder, FolderBreadcrumb, ShareLink, ShareLinkType } from '@/types/media';
import { notificationsService } from './notifications-service';
import { BaseEntity } from '@/types/international';

// Import der Folder-Utils für Firma-Vererbung
import { getRootFolderClientId } from '@/lib/utils/folder-utils';

// Enhanced Media Types mit BaseEntity
interface MediaAssetEnhanced extends BaseEntity, Omit<MediaAsset, 'userId'> {
  // userId wird durch organizationId ersetzt (von BaseEntity)
}

interface MediaFolderEnhanced extends BaseEntity, Omit<MediaFolder, 'userId'> {
  // userId wird durch organizationId ersetzt (von BaseEntity)
}

interface ShareLinkEnhanced extends BaseEntity, Omit<ShareLink, 'userId'> {
  // userId wird durch organizationId ersetzt (von BaseEntity)
}

// CORS-FIX: Optimierte Asset-Validation mit verbesserter CORS-Behandlung
async function validateAssetUrl(url: string, timeout = 3000): Promise<boolean> {
  try {
    
    // Für Firebase Storage URLs: Grundvalidierung ohne fetch()
    if (url.includes('firebasestorage.googleapis.com')) {
      const hasValidStructure = url.includes('/o/') && url.includes('alt=media') && url.includes('token=');
      if (hasValidStructure) {
        return true;
      }
    }
    
    // Für andere URLs: Versuche vorsichtige Validation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      const isValid = response.type === 'opaque' || response.ok;
      
      return isValid;
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      return true;
    }
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
    } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
    }
    return true;
  }
}

export const mediaService = {
  // === SHARE LINK OPERATIONS ===
  
  async createShareLink(data: {
    targetId: string;
    type: ShareLinkType;
    title: string;
    description?: string;
    settings: {
      expiresAt: Date | null;
      downloadAllowed: boolean;
      passwordRequired: string | null;
      watermarkEnabled: boolean;
    };
    assetIds?: string[];
    folderIds?: string[];
    organizationId: string; // CHANGED: von userId zu organizationId
    createdBy: string; // NEW: wer hat es erstellt (userId)
  }): Promise<ShareLink> {
    try {
      const shareId = self.crypto?.randomUUID?.() 
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
        : Math.random().toString(36).substring(2, 14);
        
      // Basis-Objekt mit Multi-Tenancy Support
      const shareLink: any = {
        shareId,
        organizationId: data.organizationId, // CHANGED
        createdBy: data.createdBy, // NEW
        targetId: data.targetId,
        type: data.type,
        title: data.title,
        settings: data.settings,
        active: true,
        accessCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Nur definierte Werte hinzufügen
      if (data.description !== undefined && data.description !== null) {
        shareLink.description = data.description;
      }

      // Nur hinzufügen wenn vorhanden (für Campaign-Support)
      if (data.assetIds && data.assetIds.length > 0) {
        shareLink.assetIds = data.assetIds;
      }
      if (data.folderIds && data.folderIds.length > 0) {
        shareLink.folderIds = data.folderIds;
      }
      
      
      const docRef = await addDoc(collection(db, 'media_shares'), shareLink);
      
      const createdShareLink = {
        id: docRef.id,
        ...shareLink,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
        // Map back to old interface for compatibility
        userId: shareLink.createdBy
      } as ShareLink;

      
      return createdShareLink;

    } catch (error) {
      throw error;
    }
  },

  // Methode zum Laden von Campaign-Medien basierend auf einem ShareLink
  async getCampaignMediaAssets(shareLink: ShareLink): Promise<MediaAsset[]> {
    try {
      const allAssets: MediaAsset[] = [];
      
      // Lade direkte Assets
      if (shareLink.assetIds && shareLink.assetIds.length > 0) {
        const assetPromises = shareLink.assetIds.map(id => this.getMediaAssetById(id));
        const assets = await Promise.all(assetPromises);
        const validAssets = assets.filter(a => a !== null) as MediaAsset[];
        allAssets.push(...validAssets);
      }
      
      // Lade Assets aus Folders
      if (shareLink.folderIds && shareLink.folderIds.length > 0) {
        for (const folderId of shareLink.folderIds) {
          try {
            const folderAssets = await this.getMediaAssetsInFolder(folderId);
            allAssets.push(...folderAssets);
          } catch (error) {
          }
        }
      }
      
      // Deduplizierung (falls ein Asset direkt und in einem Ordner verlinkt ist)
      const uniqueAssets = new Map<string, MediaAsset>();
      allAssets.forEach(asset => {
        if (asset.id) {
          uniqueAssets.set(asset.id, asset);
        }
      });
      
      const finalAssets = Array.from(uniqueAssets.values());
      
      return finalAssets;
    } catch (error) {
      throw error;
    }
  },

  async getShareLinks(organizationId: string): Promise<ShareLink[]> {
    try {
      const q = query(
        collection(db, 'media_shares'),
        where('organizationId', '==', organizationId), // CHANGED
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as ShareLink;
      });
    } catch (error) {
      throw error;
    }
  },

  async getShareLinkByShareId(shareId: string): Promise<ShareLink | null> {
    try {
      const q = query(
        collection(db, 'media_shares'),
        where('shareId', '==', shareId),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      const shareLink = { 
        id: doc.id, 
        ...data,
        // Map back for compatibility
        userId: data.createdBy || data.organizationId
      } as ShareLink;
      
      // ========== NOTIFICATION INTEGRATION: First Access ==========
      // Prüfe ob dies der erste Zugriff ist
      const currentAccessCount = shareLink.accessCount || 0;
      if (currentAccessCount === 0 && data.createdBy) { // Use createdBy for notifications
        try {
          // Hole mehr Details für die Benachrichtigung
          let assetName = shareLink.title || 'Unbekannte Datei';
          
          // Versuche einen spezifischeren Namen zu bekommen basierend auf dem type
          // Nutze targetId für alle Share-Link-Typen
          if (shareLink.targetId) {
            try {
              const asset = await this.getMediaAssetById(shareLink.targetId);
              if (asset) {
                assetName = asset.fileName;
              }
            } catch (err) {
              // Falls targetId kein Asset ist, verwende den Titel
            }
          }
          
          await notificationsService.notifyMediaAccessed(
            { ...shareLink, assetName },
            data.createdBy // Use createdBy for notifications
          );
        } catch (notificationError) {
        }
      }
      
      await this.incrementShareAccess(doc.id);
      
      return shareLink;
    } catch (error) {
      return null;
    }
  },

  async incrementShareAccess(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      const docSnap = await getDoc(docRef);
      const currentCount = docSnap.data()?.accessCount || 0;

      await updateDoc(docRef, {
        accessCount: currentCount + 1,
        lastAccessedAt: serverTimestamp(),
      });
    } catch (error) {
    }
  },

  async deactivateShareLink(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await updateDoc(docRef, {
        active: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  },

  async deleteShareLink(shareLinkId: string): Promise<void> {
    try {
      const docRef = doc(db, 'media_shares', shareLinkId);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  },

  // ========== NOTIFICATION INTEGRATION: Track Downloads ==========
  async trackMediaDownload(shareLink: ShareLink, assetName: string): Promise<void> {
    try {
      // Extract createdBy and organizationId from the share link
      const docRef = doc(db, 'media_shares', shareLink.id!);
      const docSnap = await getDoc(docRef);
      const shareData = docSnap.data();
      const createdBy = shareData?.createdBy;
      const organizationId = shareData?.organizationId;
      
      if (createdBy) {
        await notificationsService.notifyMediaDownloaded(
          shareLink,
          assetName,
          createdBy,
          organizationId
        );
      }
    } catch (notificationError) {
    }
  },

  // === FOLDER OPERATIONS ===
  
  async createFolder(folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>, context: { organizationId: string; userId: string }): Promise<string> {
    try {
      const folderData: any = {
        organizationId: context.organizationId, // CHANGED
        createdBy: context.userId, // NEW
        name: folder.name,
        ...(folder.description && { description: folder.description }),
        ...(folder.color && { color: folder.color }),
        ...(folder.clientId && { clientId: folder.clientId }),
        ...(folder.parentFolderId && { parentFolderId: folder.parentFolderId }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      
      const docRef = await addDoc(collection(db, 'media_folders'), folderData);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  async getFolders(organizationId: string, parentFolderId?: string): Promise<MediaFolder[]> {
    try {
      let q;

      if (parentFolderId === undefined) {
        q = query(
          collection(db, 'media_folders'),
          where('organizationId', '==', organizationId) // CHANGED
        );
      } else {
        q = query(
          collection(db, 'media_folders'),
          where('organizationId', '==', organizationId), // CHANGED
          where('parentFolderId', '==', parentFolderId)
        );
      }

      const snapshot = await getDocs(q);
      const folders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaFolder;
      });
      
      const filteredFolders = folders
        .filter(folder => parentFolderId === undefined ? !folder.parentFolderId : folder.parentFolderId === parentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      return filteredFolders;
    } catch (error) {
      throw error;
    }
  },

  async getFolder(folderId: string): Promise<MediaFolder | null> {
    try {
      const docRef = doc(db, 'media_folders', folderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaFolder;
      }
      return null;
    } catch (error) {
      throw error;
    }
  },

  async updateFolderClientInheritance(folderId: string, organizationId: string): Promise<void> {
    try {
      
      // 1. Lade alle Ordner für Vererbungs-Berechnung
      const allFolders = await this.getAllFoldersForOrganization(organizationId);
      
      // 2. Finde den Ordner und berechne seine neue vererbte clientId
      const folder = await this.getFolder(folderId);
      if (!folder) {
        return;
      }
      
      // 3. Berechne vererbte clientId
      const { getRootFolderClientId } = await import('@/lib/utils/folder-utils');
      const inheritedClientId = await getRootFolderClientId(folder, allFolders);
      
      
      // 4. Update den Ordner selbst
      if (inheritedClientId !== folder.clientId) {
        await this.updateFolder(folderId, { clientId: inheritedClientId });
      }
      
      // 5. Update alle direkten Assets in diesem Ordner
      const assets = await this.getMediaAssetsInFolder(folderId);
      if (assets.length > 0) {
        await Promise.all(
          assets.map(asset => {
            if (asset.clientId !== inheritedClientId) {
              return this.updateAsset(asset.id!, { clientId: inheritedClientId });
            }
            return Promise.resolve();
          })
        );
      }
      
      // 6. Finde alle direkten Unterordner
      const subfolders = allFolders.filter(f => f.parentFolderId === folderId);
      
      // 7. Rekursiv alle Unterordner updaten
      if (subfolders.length > 0) {
        await Promise.all(
          subfolders.map(subfolder => 
            this.updateFolderClientInheritance(subfolder.id!, organizationId)
          )
        );
      }
      
      
    } catch (error) {
      throw error;
    }
  },

  async getAllFoldersForOrganization(organizationId: string): Promise<MediaFolder[]> {
    try {
      const q = query(
        collection(db, 'media_folders'),
        where('organizationId', '==', organizationId) // CHANGED
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaFolder;
      });
    } catch (error) {
      throw error;
    }
  },

  // Legacy wrapper for compatibility
  async getAllFoldersForUser(userId: string): Promise<MediaFolder[]> {
    // This should ideally get the organizationId from the user
    // For now, using userId as fallback
    return this.getAllFoldersForOrganization(userId);
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
      
      
      await updateDoc(docRef, updateData);
    } catch (error) {
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
      return [];
    }
  },

  // === MEDIA OPERATIONS ===

  // Upload media specifically for a client
  async uploadClientMedia(
    file: File,
    organizationId: string,
    clientId: string,
    folderId?: string,
    onProgress?: (progress: number) => void,
    context?: { userId: string }
  ): Promise<MediaAsset> {
    return this.uploadMedia(file, organizationId, folderId, onProgress, 3, {
      userId: context?.userId || organizationId,
      clientId
    });
  },

  async uploadMedia(
    file: File,
    organizationId: string, // CHANGED
    folderId?: string,
    onProgress?: (progress: number) => void,
    retryCount = 3,
    context?: { userId: string; clientId?: string } // NEW: optional context for createdBy and clientId
  ): Promise<MediaAsset> {
    try {
      
      // Cleaner Dateiname für Firebase Storage
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `organizations/${organizationId}/media/${timestamp}_${cleanFileName}`; // CHANGED path
      
      
      const storageRef = ref(storage, storagePath);

      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
          // Zusätzliche Metadaten für CORS
          customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'uploaded': new Date().toISOString(),
            'organizationId': organizationId // CHANGED
          }
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(progress);
          },
          (error) => {
            
            // Retry bei bestimmten Fehlern
            if (retryCount > 0 && (
              error.code === 'storage/canceled' || 
              error.code === 'storage/unknown' ||
              error.message?.includes('network')
            )) {
              setTimeout(() => {
                this.uploadMedia(file, organizationId, folderId, onProgress, retryCount - 1, context)
                  .then(resolve)
                  .catch(reject);
              }, 1000);
              return;
            }
            
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

              // Asset-Metadaten mit erweiterten Informationen
              const assetData: any = {
                organizationId, // CHANGED
                createdBy: context?.userId || organizationId, // NEW
                ...(context?.clientId && { clientId: context.clientId }), // NEW: Add clientId if provided
                fileName: file.name,
                fileType: file.type,
                storagePath,
                downloadUrl,
                ...(folderId && { folderId }),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };

              const docRef = await addDoc(collection(db, 'media_assets'), assetData);
              
              const finalAsset = { 
                id: docRef.id, 
                ...assetData,
                // Map back for compatibility
                userId: assetData.createdBy || assetData.organizationId
              } as MediaAsset;
              
              // Sofortige Validation des neuen Assets
              try {
                const isValid = await validateAssetUrl(downloadUrl);
                if (!isValid) {
                }
              } catch (validationError) {
                // Nicht kritisch - Asset wurde erfolgreich hochgeladen
              }
              
              resolve(finalAsset);

            } catch (metadataError) {
              reject(metadataError);
            }
          }
        );
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Neue Methode: Upload Buffer für PDF-Generation
   * Lädt einen Buffer (z.B. PDF-Daten) direkt zu Firebase Storage hoch
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    organizationId: string,
    folder: string = 'uploads',
    context?: { userId?: string; clientId?: string }
  ): Promise<{ downloadUrl: string; filePath: string; fileSize: number }> {
    try {
      
      // Cleaner Dateiname für Firebase Storage
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const filePath = `organizations/${organizationId}/${folder}/${timestamp}_${cleanFileName}`;
      
      
      const storageRef = ref(storage, filePath);

      // Upload Buffer mit Metadaten
      const metadata = {
        contentType,
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          uploadedAt: new Date().toISOString(),
          organizationId,
          ...(context?.userId && { createdBy: context.userId }),
          ...(context?.clientId && { clientId: context.clientId })
        }
      };

      // Upload bytes direkt (nicht resumable für Buffer)
      const snapshot = await uploadBytes(storageRef, buffer, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);


      return {
        downloadUrl,
        filePath,
        fileSize: buffer.length
      };

    } catch (error) {
      throw new Error(`Buffer-Upload fehlgeschlagen: ${error}`);
    }
  },

  async getMediaAssets(organizationId: string, folderId?: string): Promise<MediaAsset[]> {
    try {
      let q;
      
      if (folderId === undefined) {
        q = query(
          collection(db, 'media_assets'),
          where('organizationId', '==', organizationId) // CHANGED
        );
      } else {
        q = query(
          collection(db, 'media_assets'),
          where('organizationId', '==', organizationId), // CHANGED
          where('folderId', '==', folderId)
        );
      }

      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaAsset;
      });
      
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
      
      return filteredAssets;
    } catch (error) {
      throw error;
    }
  },

  async moveAssetToFolder(assetId: string, newFolderId?: string, organizationId?: string): Promise<void> {
    try {
      
      const docRef = doc(db, 'media_assets', assetId);
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // 1. Folder-ID setzen/entfernen
      if (newFolderId) {
        updateData.folderId = newFolderId;
      } else {
        // Für Root-Dateien: folderId komplett entfernen
        updateData.folderId = null;
      }
      
      // 2. AUTOMATISCHE FIRMA-VERERBUNG
      if (newFolderId && organizationId) {
        try {
          
          // Lade Ziel-Ordner
          const targetFolder = await this.getFolder(newFolderId);
          if (targetFolder) {
            // Lade alle Ordner für Vererbungs-Berechnung
            const allFolders = await this.getAllFoldersForOrganization(organizationId);
            
            // Berechne vererbte Firma-ID
            const inheritedClientId = await getRootFolderClientId(targetFolder, allFolders);
            
            if (inheritedClientId) {
              updateData.clientId = inheritedClientId;
            } else {
              // Wenn Ordner keine Firma hat, clientId unverändert lassen
            }
          } else {
          }
        } catch (inheritanceError) {
          // Bei Fehler: Normal verschieben ohne Firma-Änderung
        }
      } else if (!newFolderId) {
        // 3. Bei Root-Move: clientId unverändert lassen (Root-Assets haben editierbare Firma)
      }
      
      await updateDoc(docRef, updateData);
      
      
    } catch (error) {
      throw error;
    }
  },

  async updateAsset(assetId: string, updates: Partial<MediaAsset>): Promise<void> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      if (updates.fileName !== undefined) updateData.fileName = updates.fileName;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.folderId !== undefined) updateData.folderId = updates.folderId;
      if (updates.clientId !== undefined) updateData.clientId = updates.clientId;
      
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      throw error;
    }
  },

  async getMediaAssetById(assetId: string): Promise<MediaAsset | null> {
    try {
      const docRef = doc(db, 'media_assets', assetId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaAsset;
      }
      return null;
    } catch (error) {
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
      const assets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaAsset;
      });
      
      return assets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (error) {
      throw error;
    }
  },

  // === CLIENT/CUSTOMER MEDIA OPERATIONS ===

  async removeInvalidAsset(assetId: string, reason = 'Invalid asset detected'): Promise<void> {
    try {
      
      // Lade Asset-Details für Logging
      const assetDoc = await getDoc(doc(db, 'media_assets', assetId));
      if (assetDoc.exists()) {
        const assetData = assetDoc.data();
        
        // Versuche Storage-Datei zu löschen (optional, falls sie existiert)
        if (assetData.storagePath) {
          try {
            const storageRef = ref(storage, assetData.storagePath);
            await deleteObject(storageRef);
          } catch (storageError: any) {
            // Storage-Datei existiert möglicherweise nicht mehr
          }
        }
      }
      
      // Entferne aus Firestore
      await deleteDoc(doc(db, 'media_assets', assetId));
      
    } catch (error) {
      throw error;
    }
  },

  async cleanupInvalidClientAssets(organizationId: string, clientId: string): Promise<{removed: number, errors: string[]}> {
    try {
      
      // Lade alle Assets für diesen Client
      const result = await this.getMediaByClientId(organizationId, clientId, false);
      const assets = result.assets;
      
      if (assets.length === 0) {
        return { removed: 0, errors: [] };
      }
      
      
      const invalidAssets: string[] = [];
      const errors: string[] = [];
      
      // Teste jedes Asset einzeln
      for (const asset of assets) {
        try {
          const img = new Image();
          const isValid = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              resolve(false);
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
            
            img.src = asset.downloadUrl;
          });
          
          if (!isValid && asset.id) {
            invalidAssets.push(asset.id);
          }
          
        } catch (error: any) {
          errors.push(`Error testing ${asset.fileName}: ${error.message}`);
        }
      }
      
      // Entferne alle invaliden Assets
      let removedCount = 0;
      for (const assetId of invalidAssets) {
        try {
          await this.removeInvalidAsset(assetId, 'Failed image load test');
          removedCount++;
        } catch (error: any) {
          errors.push(`Failed to remove asset ${assetId}: ${error.message}`);
        }
      }
      
      
      return { removed: removedCount, errors };
      
    } catch (error: any) {
      return { removed: 0, errors: [error.message] };
    }
  },

  async cleanupInvalidAssets(organizationId: string, assets: MediaAsset[]): Promise<MediaAsset[]> {
    try {
      
      const cleanupPromises = assets.map(async (asset) => {
        try {
          // Teste ob das Asset tatsächlich ladbar ist
          const img = new Image();
          const imageLoadPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              resolve(false);
            }, 3000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
            
            img.src = asset.downloadUrl;
          });
          
          const isValid = await imageLoadPromise;
          
          if (!isValid) {
            
            // Entferne Asset aus Firestore
            if (asset.id) {
              try {
                await deleteDoc(doc(db, 'media_assets', asset.id));
              } catch (deleteError) {
              }
            }
            
            return null; // Markiere als zu entfernen
          }
          
          return asset;
          
        } catch (error) {
          return asset; // Bei Fehlern: Asset beibehalten (konservativ)
        }
      });
      
      const results = await Promise.allSettled(cleanupPromises);
      
      const validAssets: MediaAsset[] = [];
      let removedCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          validAssets.push(result.value);
        } else if (result.status === 'fulfilled' && result.value === null) {
          removedCount++;
        } else {
          // Bei rejected: Asset beibehalten
          validAssets.push(assets[index]);
        }
      });
      
      
      return validAssets;
      
    } catch (error) {
      return assets; // Bei Fehlern: Alle Assets beibehalten
    }
  },

  async getMediaByClientId(organizationId: string, clientId: string, cleanupInvalid = false, legacyUserId?: string): Promise<{folders: MediaFolder[], assets: MediaAsset[], totalCount: number}> {
    try {
      // 1. Lade Ordner und Assets parallel - mit Fallback auf userId
      // WICHTIG: Wir suchen zuerst nach Assets MIT clientId
      let [foldersSnapshot, assetsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'media_folders'),
          where('organizationId', '==', organizationId),
          where('clientId', '==', clientId)
        )),
        getDocs(query(
          collection(db, 'media_assets'),
          where('organizationId', '==', organizationId),
          where('clientId', '==', clientId)
        ))
      ]);

      // Fallback auf userId wenn keine Ergebnisse mit organizationId
      if (foldersSnapshot.empty && assetsSnapshot.empty) {
        [foldersSnapshot, assetsSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'media_folders'),
            where('userId', '==', organizationId),
            where('clientId', '==', clientId)
          )),
          getDocs(query(
            collection(db, 'media_assets'),
            where('userId', '==', organizationId),
            where('clientId', '==', clientId)
          ))
        ]);
        
        // Wenn immer noch keine Ergebnisse und legacyUserId verfügbar, versuche mit legacyUserId
        if (foldersSnapshot.empty && assetsSnapshot.empty && legacyUserId && legacyUserId !== organizationId) {
          [foldersSnapshot, assetsSnapshot] = await Promise.all([
            getDocs(query(
              collection(db, 'media_folders'),
              where('userId', '==', legacyUserId),
              where('clientId', '==', clientId)
            )),
            getDocs(query(
              collection(db, 'media_assets'),
              where('userId', '==', legacyUserId),
              where('clientId', '==', clientId)
            ))
          ]);
        }
        
        // NEUE LOGIK: Wenn keine client-spezifischen Medien gefunden werden, return leer
        if (foldersSnapshot.empty && assetsSnapshot.empty) {
          // Return empty result (correct behavior)
        }
      }


      // 2. Konvertiere zu Objekten
      const folders = foldersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaFolder;
      });

      const directAssets = assetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        } as MediaAsset;
      });

      // 3. Lade Assets aus Ordnern (falls vorhanden)
      let folderAssets: MediaAsset[] = [];
      if (folders.length > 0) {
        const folderAssetPromises = folders.map(folder => 
          this.getMediaAssetsInFolder(folder.id!)
        );
        const folderAssetArrays = await Promise.all(folderAssetPromises);
        folderAssets = folderAssetArrays.flat();
      }

      // 4. Kombiniere alle Assets
      const allAssets = [...directAssets, ...folderAssets];

      // 5. DEDUPLIZIERUNG: Entferne Duplikate basierend auf id (nicht fileName)
      const seenIds = new Set<string>();
      const deduplicatedAssets = allAssets.filter(asset => {
        if (!asset.id || seenIds.has(asset.id)) {
          return false;
        }
        seenIds.add(asset.id);
        return true;
      });

      // 6. EINFACHE Asset-Validation (nur downloadUrl-Check)
      const validAssets = deduplicatedAssets.filter(asset => {
        if (!asset.downloadUrl) {
          return false;
        }
        return true;
      });
      
      // 7. OPTIONALE BEREINIGUNG: Entferne tatsächlich defekte Assets
      let finalAssets = validAssets;
      if (cleanupInvalid && validAssets.length <= 20) {
        finalAssets = await this.cleanupInvalidAssets(organizationId, validAssets);
      }
      
      // 8. Sortiere Assets nach Erstellungsdatum
      finalAssets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      return {
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        assets: finalAssets,
        totalCount: folders.length + finalAssets.length
      };

    } catch (error) {
      // Fallback: Return leeres Ergebnis statt Fehler
      return {
        folders: [],
        assets: [],
        totalCount: 0
      };
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
      throw error;
    }
  },

  async quickCleanupAsset(assetId: string): Promise<boolean> {
    try {
      await this.removeInvalidAsset(assetId, 'Manual cleanup requested');
      return true;
    } catch (error) {
      return false;
    }
  },

  // ========================================
  // PLAN 5/9: MONITORING-IMPLEMENTIERUNG
  // ========================================
  
  /**
   * Speichert ein Clipping als MediaAsset
   */
  async saveClippingAsset(
    clipping: any, // ClippingAsset from types/media
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      const clippingData: any = {
        organizationId: context.organizationId,
        createdBy: context.userId,
        fileName: `${clipping.outlet}_${Date.now()}.txt`,
        fileType: 'text/clipping',
        storagePath: `clippings/${context.organizationId}/${clipping.id}`,
        downloadUrl: clipping.url || '',
        description: clipping.content || clipping.title,
        tags: clipping.tags || [],
        
        // Clipping-spezifische Felder
        type: 'clipping',
        outlet: clipping.outlet,
        publishDate: clipping.publishDate,
        reachValue: clipping.reachValue || 0,
        sentimentScore: clipping.sentimentScore || 0,
        
        // Pipeline-Kontext
        projectId: clipping.projectId,
        campaignId: clipping.campaignId,
        distributionId: clipping.distributionId,
        monitoringPhaseId: clipping.monitoringPhaseId,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'media_assets'), clippingData);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt alle Clippings für ein Projekt
   */
  async getProjectClippings(
    projectId: string,
    organizationId: string
  ): Promise<any[]> { // ClippingAsset[]
    try {
      const q = query(
        collection(db, 'media_assets'),
        where('organizationId', '==', organizationId),
        where('type', '==', 'clipping'),
        where('projectId', '==', projectId),
        orderBy('publishDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const clippings = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Map back for compatibility
          userId: data.createdBy || data.organizationId
        };
      });

      return clippings;
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Clippings:', error);
      return [];
    }
  },

  /**
   * Aktualisiert Clipping-Metriken
   */
  async updateClippingMetrics(
    clippingId: string,
    metrics: any, // ClippingMetrics from types/media
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const docRef = doc(db, 'media_assets', clippingId);
      
      // Sicherheitsprüfung: Clipping gehört zur Organisation
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Clipping nicht gefunden');
      }
      
      const clippingData = docSnap.data();
      if (clippingData.organizationId !== context.organizationId) {
        throw new Error('Keine Berechtigung');
      }

      await updateDoc(docRef, {
        reachValue: metrics.reachValue,
        sentimentScore: metrics.sentimentScore,
        mediaValue: metrics.mediaValue,
        engagementScore: metrics.engagementScore,
        costPerReach: metrics.costPerReach,
        earnedMediaValue: metrics.earnedMediaValue,
        updatedAt: serverTimestamp(),
        updatedBy: context.userId
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generiert Screenshot für ein Clipping
   */
  async generateClippingScreenshot(
    url: string,
    clippingId: string,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Placeholder - echte Screenshot-Generation würde hier stattfinden
      // z.B. über Puppeteer, Playwright oder externen Service
      
      // Für jetzt: Return Placeholder URL
      const placeholderUrl = `https://via.placeholder.com/800x600/f0f0f0/333333?text=${encodeURIComponent('Screenshot wird generiert...')}`;
      
      // Aktualisiere Clipping mit Screenshot URL
      const docRef = doc(db, 'media_assets', clippingId);
      await updateDoc(docRef, {
        screenshot: placeholderUrl,
        screenshotGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return placeholderUrl;
    } catch (error) {
      console.error('Fehler bei Screenshot-Generierung:', error);
      throw error;
    }
  },

  /**
   * Sucht Clippings mit erweiterten Filtern
   */
  async searchClippings(
    organizationId: string,
    filters: {
      projectIds?: string[];
      outlets?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      sentimentRange?: { min: number; max: number };
      reachMin?: number;
      searchTerm?: string;
    }
  ): Promise<any[]> { // ClippingAsset[]
    try {
      let q = query(
        collection(db, 'media_assets'),
        where('organizationId', '==', organizationId),
        where('type', '==', 'clipping')
      );

      // Grundlegende Firestore-Filter
      if (filters.dateFrom) {
        q = query(q, where('publishDate', '>=', Timestamp.fromDate(filters.dateFrom)));
      }
      if (filters.dateTo) {
        q = query(q, where('publishDate', '<=', Timestamp.fromDate(filters.dateTo)));
      }

      const snapshot = await getDocs(q);
      let clippings = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.createdBy || data.organizationId
        };
      });

      // Client-seitige Filterung für komplexe Filter
      if (filters.projectIds?.length) {
        clippings = clippings.filter(c => filters.projectIds!.includes((c as any).projectId));
      }

      if (filters.outlets?.length) {
        clippings = clippings.filter(c => filters.outlets!.includes((c as any).outlet));
      }

      if (filters.sentimentRange) {
        clippings = clippings.filter(c => 
          (c as any).sentimentScore >= filters.sentimentRange!.min && 
          (c as any).sentimentScore <= filters.sentimentRange!.max
        );
      }

      if (filters.reachMin) {
        clippings = clippings.filter(c => (c as any).reachValue >= filters.reachMin!);
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        clippings = clippings.filter(c => 
          (c as any).title?.toLowerCase().includes(searchLower) ||
          (c as any).content?.toLowerCase().includes(searchLower) ||
          (c as any).outlet?.toLowerCase().includes(searchLower)
        );
      }

      return clippings.sort((a, b) => {
        const aTime = (a as any).publishDate?.seconds || 0;
        const bTime = (b as any).publishDate?.seconds || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Fehler bei Clipping-Suche:', error);
      return [];
    }
  },

  /**
   * Erstellt Clipping-Package für Export
   */
  async createClippingPackage(
    clippingIds: string[],
    packageName: string,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Validiere alle Clippings gehören zur Organisation
      const clippingPromises = clippingIds.map(id => getDoc(doc(db, 'media_assets', id)));
      const clippingDocs = await Promise.all(clippingPromises);
      
      const validClippings = clippingDocs
        .filter(docSnap => docSnap.exists() && docSnap.data()?.organizationId === context.organizationId)
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      if (validClippings.length === 0) {
        throw new Error('Keine gültigen Clippings gefunden');
      }

      // Erstelle Share Link für Clipping Package
      const shareData = {
        targetId: 'clipping_package',
        type: 'clipping_package' as any,
        title: packageName,
        description: `Package mit ${validClippings.length} Clippings`,
        settings: {
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
          downloadAllowed: true,
          passwordRequired: null,
          watermarkEnabled: false
        },
        assetIds: clippingIds,
        organizationId: context.organizationId,
        createdBy: context.userId
      };

      const shareLink = await this.createShareLink(shareData);
      return shareLink.shareId!;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Bulk-Export von Clippings
   */
  async exportClippings(
    clippingIds: string[],
    format: 'pdf' | 'excel' | 'csv',
    context: { organizationId: string; userId: string }
  ): Promise<Blob> {
    try {
      // Lade alle Clippings
      const clippingPromises = clippingIds.map(id => getDoc(doc(db, 'media_assets', id)));
      const clippingDocs = await Promise.all(clippingPromises);
      
      const clippings = clippingDocs
        .filter(docSnap => docSnap.exists() && docSnap.data()?.organizationId === context.organizationId)
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      if (format === 'csv') {
        // CSV-Export
        const csvHeaders = 'Titel,Outlet,Datum,Reichweite,Sentiment,Media Value,URL\n';
        const csvRows = clippings.map(c => {
          const date = (c as any).publishDate ? new Date((c as any).publishDate.seconds * 1000).toLocaleDateString() : '';
          return `"${(c as any).title || ''}","${(c as any).outlet || ''}","${date}","${(c as any).reachValue || 0}","${(c as any).sentimentScore || 0}","${(c as any).mediaValue || 0}","${(c as any).url || ''}"`;
        }).join('\n');
        
        return new Blob([csvHeaders + csvRows], { type: 'text/csv; charset=utf-8' });
      } else if (format === 'pdf') {
        // PDF-Export (placeholder)
        const reportContent = JSON.stringify(clippings, null, 2);
        return new Blob([reportContent], { type: 'application/pdf' });
      } else {
        // Excel-Export (placeholder)
        const reportContent = JSON.stringify(clippings, null, 2);
        return new Blob([reportContent], { type: 'application/vnd.ms-excel' });
      }
    } catch (error) {
      throw error;
    }
  },

  // ========================================
  // PLAN 6/9: PIPELINE-ASSET-INTEGRATION
  // ========================================
  
  /**
   * Erstellt ein Pipeline-Asset-Attachment
   */
  async createProjectAssetAttachment(
    assetId: string, 
    projectId: string, 
    phase: string,
    context: { organizationId: string; userId: string }
  ): Promise<any> { // CampaignAssetAttachment
    try {
      const { nanoid } = await import('nanoid');
      
      // Lade Asset-Details für Snapshot
      const asset = await this.getMediaAssetById(assetId);
      if (!asset) {
        throw new Error('Asset nicht gefunden');
      }

      const attachment: any = {
        id: nanoid(), // Neue Attachment-ID!
        type: 'asset' as const,
        assetId: asset.id,
        projectId,
        metadata: {
          // Snapshot der aktuellen Asset-Daten
          fileName: asset.fileName,
          fileType: asset.fileType,
          thumbnailUrl: asset.downloadUrl, // thumbnailUrl fallback
          description: asset.description,
          
          // Pipeline-Tracking
          attachedAt: Timestamp.now(),
          attachedInPhase: phase as any,
          lastVerified: Timestamp.now(),
          needsRefresh: false,
          
          // Erweiterte Metadaten
          copyright: (asset.metadata as any)?.copyright?.owner,
          author: (asset.metadata as any)?.author?.name,
          license: (asset.metadata as any)?.copyright?.license,
        },
        
        // Legacy-Felder für Kompatibilität
        attachedAt: Timestamp.now(),
        attachedBy: context.userId
      };

      return attachment;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Löst Asset-Attachments mit Pipeline-Kontext auf
   */
  async resolveAttachedAssets(
    attachments: any[], // CampaignAssetAttachment[]
    validateAccess: boolean = true,
    context?: { organizationId: string }
  ): Promise<any[]> { // ResolvedAsset[]
    try {
      const resolvedAssets: any[] = [];
      
      for (const attachment of attachments) {
        const resolved: any = {
          attachment,
          isAvailable: false,
          hasChanged: false,
          needsRefresh: false,
        };
        
        try {
          if (attachment.type === 'asset' && attachment.assetId) {
            const currentAsset = await this.getMediaAssetById(attachment.assetId);
            
            if (currentAsset) {
              // Multi-Tenancy Validierung
              if (validateAccess && context?.organizationId && currentAsset.userId !== context.organizationId) {
                resolved.error = 'Keine Berechtigung für dieses Asset';
              } else {
                resolved.asset = currentAsset;
                resolved.isAvailable = true;
                resolved.downloadUrl = currentAsset.downloadUrl;
                
                // Change Detection
                resolved.hasChanged = 
                  attachment.metadata.fileName !== currentAsset.fileName ||
                  attachment.metadata.fileType !== currentAsset.fileType;
                
                // Refresh Check
                const daysSinceLastVerified = attachment.metadata.lastVerified 
                  ? (Date.now() - attachment.metadata.lastVerified.toMillis()) / (1000 * 60 * 60 * 24)
                  : 30;
                  
                resolved.needsRefresh = daysSinceLastVerified > 7 || resolved.hasChanged;
              }
            } else {
              resolved.error = 'Asset nicht gefunden';
            }
          } else if (attachment.type === 'folder' && attachment.folderId) {
            const folderAssets = await this.getMediaAssetsInFolder(attachment.folderId);
            resolved.isAvailable = folderAssets.length > 0;
          }
        } catch (error) {
          resolved.error = (error as Error).message;
        }
        
        resolvedAssets.push(resolved);
      }
      
      return resolvedAssets;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validiert Asset-Attachments
   */
  async validateAssetAttachments(
    attachments: any[], // CampaignAssetAttachment[]
    context: { organizationId: string }
  ): Promise<any> { // AssetValidationResult
    try {
      const resolvedAssets = await this.resolveAttachedAssets(attachments, true, context);
      
      const missingAssets: string[] = [];
      const outdatedSnapshots: string[] = [];
      const validationErrors: string[] = [];
      
      resolvedAssets.forEach(resolved => {
        if (!resolved.isAvailable) {
          missingAssets.push(resolved.attachment.assetId || resolved.attachment.id);
        }
        
        if (resolved.needsRefresh || resolved.hasChanged) {
          outdatedSnapshots.push(resolved.attachment.id);
        }
        
        if (resolved.error) {
          validationErrors.push(`${resolved.attachment.metadata.fileName}: ${resolved.error}`);
        }
      });
      
      return {
        isValid: missingAssets.length === 0 && validationErrors.length === 0,
        missingAssets,
        outdatedSnapshots,
        validationErrors,
        lastValidated: Timestamp.now()
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aktualisiert Asset-Snapshots
   */
  async refreshAssetSnapshots(
    attachments: any[], // CampaignAssetAttachment[]
    context: { organizationId: string; userId: string }
  ): Promise<any[]> { // CampaignAssetAttachment[]
    try {
      const refreshedAttachments: any[] = [];
      
      for (const attachment of attachments) {
        const refreshed = { ...attachment };
        
        if (attachment.type === 'asset' && attachment.assetId) {
          try {
            const currentAsset = await this.getMediaAssetById(attachment.assetId);
            
            if (currentAsset) {
              // Aktualisiere Snapshot-Daten
              refreshed.metadata = {
                ...refreshed.metadata,
                fileName: currentAsset.fileName,
                fileType: currentAsset.fileType,
                thumbnailUrl: currentAsset.downloadUrl,
                description: currentAsset.description,
                lastVerified: Timestamp.now(),
                needsRefresh: false
              };
            }
          } catch (error) {
            // Asset nicht verfügbar - Snapshot unverändert lassen
          }
        }
        
        refreshedAttachments.push(refreshed);
      }
      
      return refreshedAttachments;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Erstellt Asset-Summary für Projekt
   */
  async getProjectAssetSummary(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any> { // AssetSummary
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { prService } = await import('./pr-service');
      
      // Lade alle Kampagnen des Projekts
      const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });
      
      // Sammle alle Assets aus den Kampagnen
      const allAttachments: any[] = [];
      campaigns.forEach((campaign: any) => {
        if (campaign.attachedAssets) {
          allAttachments.push(...campaign.attachedAssets);
        }
      });
      
      // Berechne Statistiken
      const assetsByType: Record<string, number> = {};
      const assetsByPhase: Record<string, number> = {};
      let storageUsed = 0;
      
      const resolvedAssets = await this.resolveAttachedAssets(allAttachments, true, context);
      
      resolvedAssets.forEach(resolved => {
        if (resolved.isAvailable && resolved.asset) {
          // Typ-Statistik
          const fileType = resolved.attachment.metadata.fileType || 'unknown';
          assetsByType[fileType] = (assetsByType[fileType] || 0) + 1;
          
          // Phase-Statistik
          const phase = resolved.attachment.metadata.attachedInPhase || 'unknown';
          assetsByPhase[phase] = (assetsByPhase[phase] || 0) + 1;
          
          // Storage-Verbrauch (grobe Schätzung)
          if (resolved.asset.metadata?.fileSize) {
            storageUsed += resolved.asset.metadata.fileSize;
          }
        }
      });
      
      // Top Assets (nach Häufigkeit)
      const assetUsage = new Map<string, { fileName: string; count: number }>();
      allAttachments.forEach(attachment => {
        if (attachment.assetId) {
          const existing = assetUsage.get(attachment.assetId) || { 
            fileName: attachment.metadata.fileName, 
            count: 0 
          };
          existing.count += 1;
          assetUsage.set(attachment.assetId, existing);
        }
      });
      
      const topAssets = Array.from(assetUsage.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([assetId, data]) => ({
          assetId,
          fileName: data.fileName,
          usage: data.count
        }));
      
      return {
        totalAssets: resolvedAssets.filter(r => r.isAvailable).length,
        assetsByType,
        assetsByPhase,
        storageUsed,
        recentAssets: allAttachments
          .sort((a, b) => (b.attachedAt?.seconds || 0) - (a.attachedAt?.seconds || 0))
          .slice(0, 10),
        topAssets
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Teilt Asset mit Projekt
   */
  async shareAssetToProject(
    assetId: string, 
    projectId: string, 
    permissions: any, // AssetPermissions
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Lade Asset für Validierung
      const asset = await this.getMediaAssetById(assetId);
      if (!asset) {
        throw new Error('Asset nicht gefunden');
      }
      
      // Erstelle Project Asset Attachment
      const attachment = await this.createProjectAssetAttachment(
        assetId, 
        projectId, 
        'project_shared',
        context
      );
      
      // Markiere als projekt-weit verfügbar
      attachment.isProjectWide = true;
      attachment.metadata.attachedInPhase = 'project_shared';

      // Asset-History Tracking würde hier erfolgen
      // (Implementierung in projectService)
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt Asset-Usage für Projekt
   */
  async getAssetUsageInProject(
    assetId: string, 
    projectId: string,
    context: { organizationId: string }
  ): Promise<any> { // AssetUsageData
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { prService } = await import('./pr-service');
      
      // Lade alle Kampagnen des Projekts
      const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });
      
      const campaignIds: string[] = [];
      const usagesByPhase: Record<string, number> = {};
      let totalUsage = 0;
      let lastUsed: Timestamp = Timestamp.fromMillis(0);
      
      campaigns.forEach((campaign: any) => {
        if (campaign.attachedAssets) {
          const hasAsset = campaign.attachedAssets.some((attachment: any) => 
            attachment.assetId === assetId
          );
          
          if (hasAsset) {
            campaignIds.push(campaign.id!);
            totalUsage += 1;
            
            // Phase-Usage
            const phase = campaign.pipelineStage || 'unknown';
            usagesByPhase[phase] = (usagesByPhase[phase] || 0) + 1;
            
            // Last Used
            if (campaign.updatedAt && campaign.updatedAt.toMillis() > lastUsed.toMillis()) {
              lastUsed = campaign.updatedAt;
            }
          }
        }
      });
      
      return {
        assetId,
        projectId,
        campaignIds,
        totalUsage,
        lastUsed,
        usagesByPhase,
        sharedWithProjects: [projectId] // Simplified
      };
    } catch (error) {
      throw error;
    }
  }
};