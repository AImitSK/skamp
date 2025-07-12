// src/lib/firebase/media-service.ts - UPDATED WITH NOTIFICATION INTEGRATION
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
import { MediaAsset, MediaFolder, FolderBreadcrumb, ShareLink, ShareLinkType } from '@/types/media';
import { notificationsService } from './notifications-service';

// Import der Folder-Utils für Firma-Vererbung
import { getRootFolderClientId } from '@/lib/utils/folder-utils';

// CORS-FIX: Optimierte Asset-Validation mit verbesserter CORS-Behandlung
async function validateAssetUrl(url: string, timeout = 3000): Promise<boolean> {
  try {
    console.log(`🔍 Validating asset URL: ${url}`);
    
    // Für Firebase Storage URLs: Grundvalidierung ohne fetch()
    if (url.includes('firebasestorage.googleapis.com')) {
      const hasValidStructure = url.includes('/o/') && url.includes('alt=media') && url.includes('token=');
      if (hasValidStructure) {
        console.log(`✅ Firebase Storage URL structure valid - skipping fetch validation`);
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
      console.log(`✅ Asset validation result: ${isValid} (Type: ${response.type}, Status: ${response.status})`);
      
      return isValid;
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.warn(`⚠️ Fetch validation failed: ${fetchError.message}`);
      return true;
    }
    
  } catch (error: any) {
    console.warn(`⚠️ Asset validation failed for ${url}:`, error.message);
    if (error.name === 'AbortError') {
      console.warn('⏱️ Validation timeout - assuming asset is valid');
    } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      console.warn('🌐 Network/CORS error - assuming asset is valid');
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
    assetIds?: string[];  // Optional für Campaign-Support
    folderIds?: string[]; // Optional für Campaign-Support
    userId: string;
  }): Promise<ShareLink> {
    try {
      const shareId = self.crypto?.randomUUID?.() 
        ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
        : Math.random().toString(36).substring(2, 14);
        
      // Basis-Objekt mit nur den Pflichtfeldern
      const shareLink: any = {
        shareId,
        userId: data.userId,
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
      
      console.log('Creating share link:', shareLink);
      
      const docRef = await addDoc(collection(db, 'media_shares'), shareLink);
      
      const createdShareLink = {
        id: docRef.id,
        ...shareLink,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt
      } as ShareLink;

      console.log('Share link created successfully:', createdShareLink);
      
      return createdShareLink;

    } catch (error) {
      console.error("Fehler beim Erstellen des Share-Links:", error);
      throw error;
    }
  },

  // Methode zum Laden von Campaign-Medien basierend auf einem ShareLink
  async getCampaignMediaAssets(shareLink: ShareLink): Promise<MediaAsset[]> {
    try {
      console.log('Loading campaign media assets for shareLink:', shareLink);
      const allAssets: MediaAsset[] = [];
      
      // Lade direkte Assets
      if (shareLink.assetIds && shareLink.assetIds.length > 0) {
        console.log('Loading direct assets:', shareLink.assetIds.length);
        const assetPromises = shareLink.assetIds.map(id => this.getMediaAssetById(id));
        const assets = await Promise.all(assetPromises);
        const validAssets = assets.filter(a => a !== null) as MediaAsset[];
        console.log('Loaded direct assets:', validAssets.length);
        allAssets.push(...validAssets);
      }
      
      // Lade Assets aus Folders
      if (shareLink.folderIds && shareLink.folderIds.length > 0) {
        console.log('Loading folder assets from folders:', shareLink.folderIds.length);
        for (const folderId of shareLink.folderIds) {
          try {
            const folderAssets = await this.getMediaAssetsInFolder(folderId);
            console.log(`Loaded ${folderAssets.length} assets from folder ${folderId}`);
            allAssets.push(...folderAssets);
          } catch (error) {
            console.error(`Error loading assets from folder ${folderId}:`, error);
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
      console.log('Total unique campaign assets:', finalAssets.length);
      
      return finalAssets;
    } catch (error) {
      console.error('Error loading campaign media assets:', error);
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
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      const shareLink = { id: doc.id, ...doc.data() } as ShareLink;
      
      // ========== NOTIFICATION INTEGRATION: First Access ==========
      // Prüfe ob dies der erste Zugriff ist
      const currentAccessCount = shareLink.accessCount || 0;
      if (currentAccessCount === 0 && shareLink.userId) {
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
              console.log('Target is not an asset, using title');
            }
          }
          
          await notificationsService.notifyMediaAccessed(
            { ...shareLink, assetName },
            shareLink.userId
          );
          console.log('📬 Benachrichtigung gesendet: Erster Zugriff auf geteilten Link');
        } catch (notificationError) {
          console.error('Fehler beim Senden der Zugriffs-Benachrichtigung:', notificationError);
        }
      }
      
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
      const docSnap = await getDoc(docRef);
      const currentCount = docSnap.data()?.accessCount || 0;

      await updateDoc(docRef, {
        accessCount: currentCount + 1,
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
        active: false,
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

  // ========== NOTIFICATION INTEGRATION: Track Downloads ==========
  async trackMediaDownload(shareLink: ShareLink, assetName: string): Promise<void> {
    try {
      if (shareLink.userId) {
        await notificationsService.notifyMediaDownloaded(
          shareLink,
          assetName,
          shareLink.userId
        );
        console.log('📬 Benachrichtigung gesendet: Datei heruntergeladen');
      }
    } catch (notificationError) {
      console.error('Fehler beim Senden der Download-Benachrichtigung:', notificationError);
    }
  },

  // === FOLDER OPERATIONS ===
  
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

  async updateFolderClientInheritance(folderId: string, userId: string): Promise<void> {
    try {
      console.log(`🔄 Updating client inheritance for folder ${folderId}`);
      
      // 1. Lade alle Ordner für Vererbungs-Berechnung
      const allFolders = await this.getAllFoldersForUser(userId);
      
      // 2. Finde den Ordner und berechne seine neue vererbte clientId
      const folder = await this.getFolder(folderId);
      if (!folder) {
        console.warn('⚠️ Folder not found for inheritance update');
        return;
      }
      
      // 3. Berechne vererbte clientId
      const { getRootFolderClientId } = await import('@/lib/utils/folder-utils');
      const inheritedClientId = await getRootFolderClientId(folder, allFolders);
      
      console.log(`📝 Inherited clientId for folder: ${inheritedClientId}`);
      
      // 4. Update den Ordner selbst
      if (inheritedClientId !== folder.clientId) {
        await this.updateFolder(folderId, { clientId: inheritedClientId });
        console.log(`✅ Updated folder ${folder.name} clientId to: ${inheritedClientId}`);
      }
      
      // 5. Update alle direkten Assets in diesem Ordner
      const assets = await this.getMediaAssetsInFolder(folderId);
      if (assets.length > 0) {
        await Promise.all(
          assets.map(asset => {
            if (asset.clientId !== inheritedClientId) {
              console.log(`📎 Updating asset ${asset.fileName} clientId to: ${inheritedClientId}`);
              return this.updateAsset(asset.id!, { clientId: inheritedClientId });
            }
            return Promise.resolve();
          })
        );
        console.log(`✅ Updated ${assets.length} assets in folder ${folder.name}`);
      }
      
      // 6. Finde alle direkten Unterordner
      const subfolders = allFolders.filter(f => f.parentFolderId === folderId);
      
      // 7. Rekursiv alle Unterordner updaten
      if (subfolders.length > 0) {
        await Promise.all(
          subfolders.map(subfolder => 
            this.updateFolderClientInheritance(subfolder.id!, userId)
          )
        );
        console.log(`✅ Recursively updated ${subfolders.length} subfolders`);
      }
      
      console.log(`🎉 Completed inheritance update for folder ${folder.name}`);
      
    } catch (error) {
      console.error('❌ Error updating folder client inheritance:', error);
      throw error;
    }
  },

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

  // === MEDIA OPERATIONS ===

  async uploadMedia(
    file: File,
    userId: string,
    folderId?: string,
    onProgress?: (progress: number) => void,
    retryCount = 3
  ): Promise<MediaAsset> {
    try {
      console.log('📤 Starting upload for:', file.name, 'Size:', file.size);
      
      // Cleaner Dateiname für Firebase Storage
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `users/${userId}/media/${timestamp}_${cleanFileName}`;
      
      console.log('🗂️ Upload path:', storagePath);
      
      const storageRef = ref(storage, storagePath);

      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
          // Zusätzliche Metadaten für CORS
          customMetadata: {
            'Access-Control-Allow-Origin': '*',
            'uploaded': new Date().toISOString(),
            'uploader': userId
          }
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('📊 Upload progress:', Math.round(progress) + '%');
            onProgress?.(progress);
          },
          (error) => {
            console.error("❌ Upload error:", error);
            
            // Retry bei bestimmten Fehlern
            if (retryCount > 0 && (
              error.code === 'storage/canceled' || 
              error.code === 'storage/unknown' ||
              error.message?.includes('network')
            )) {
              console.log(`🔄 Retrying upload... (${retryCount} attempts left)`);
              setTimeout(() => {
                this.uploadMedia(file, userId, folderId, onProgress, retryCount - 1)
                  .then(resolve)
                  .catch(reject);
              }, 1000);
              return;
            }
            
            reject(error);
          },
          async () => {
            try {
              console.log('✅ Upload completed, getting download URL...');
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('🔗 Download URL obtained');

              // Asset-Metadaten mit erweiterten Informationen
              const assetData: Omit<MediaAsset, 'id'> = {
                userId,
                fileName: file.name,
                fileType: file.type,
                storagePath,
                downloadUrl,
                ...(folderId && { folderId }),
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
              };

              console.log('💾 Saving metadata to Firestore...');
              const docRef = await addDoc(collection(db, 'media_assets'), assetData);
              console.log('✅ Metadata saved with ID:', docRef.id);
              
              const finalAsset = { id: docRef.id, ...assetData };
              
              // Sofortige Validation des neuen Assets
              try {
                const isValid = await validateAssetUrl(downloadUrl);
                if (!isValid) {
                  console.warn('⚠️ Newly uploaded asset failed validation, but continuing...');
                }
              } catch (validationError) {
                console.warn('⚠️ Post-upload validation failed:', validationError);
                // Nicht kritisch - Asset wurde erfolgreich hochgeladen
              }
              
              resolve(finalAsset);

            } catch (metadataError) {
              console.error("❌ Fehler beim Speichern der Metadaten:", metadataError);
              reject(metadataError);
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Fehler beim Initialisieren des Uploads:", error);
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
      
      // 2. AUTOMATISCHE FIRMA-VERERBUNG
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

  // === CLIENT/CUSTOMER MEDIA OPERATIONS ===

  async removeInvalidAsset(assetId: string, reason = 'Invalid asset detected'): Promise<void> {
    try {
      console.log(`🗑️ Removing invalid asset: ${assetId} (${reason})`);
      
      // Lade Asset-Details für Logging
      const assetDoc = await getDoc(doc(db, 'media_assets', assetId));
      if (assetDoc.exists()) {
        const assetData = assetDoc.data();
        console.log(`📄 Removing asset: ${assetData.fileName} from storage path: ${assetData.storagePath}`);
        
        // Versuche Storage-Datei zu löschen (optional, falls sie existiert)
        if (assetData.storagePath) {
          try {
            const storageRef = ref(storage, assetData.storagePath);
            await deleteObject(storageRef);
            console.log(`✅ Deleted storage file: ${assetData.storagePath}`);
          } catch (storageError: any) {
            // Storage-Datei existiert möglicherweise nicht mehr
            console.warn(`⚠️ Could not delete storage file (may not exist): ${storageError.message}`);
          }
        }
      }
      
      // Entferne aus Firestore
      await deleteDoc(doc(db, 'media_assets', assetId));
      console.log(`✅ Successfully removed invalid asset ${assetId} from Firestore`);
      
    } catch (error) {
      console.error(`❌ Failed to remove invalid asset ${assetId}:`, error);
      throw error;
    }
  },

  async cleanupInvalidClientAssets(userId: string, clientId: string): Promise<{removed: number, errors: string[]}> {
    try {
      console.log(`🧹 Starting cleanup of invalid assets for client: ${clientId}`);
      
      // Lade alle Assets für diesen Client
      const result = await this.getMediaByClientId(userId, clientId, false);
      const assets = result.assets;
      
      if (assets.length === 0) {
        console.log('ℹ️ No assets found to clean up');
        return { removed: 0, errors: [] };
      }
      
      console.log(`🔍 Testing ${assets.length} assets for validity...`);
      
      const invalidAssets: string[] = [];
      const errors: string[] = [];
      
      // Teste jedes Asset einzeln
      for (const asset of assets) {
        try {
          const img = new Image();
          const isValid = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`⏱️ Timeout testing asset: ${asset.fileName}`);
              resolve(false);
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              console.warn(`❌ Invalid asset detected: ${asset.fileName}`);
              resolve(false);
            };
            
            img.src = asset.downloadUrl;
          });
          
          if (!isValid && asset.id) {
            invalidAssets.push(asset.id);
            console.log(`🗑️ Marked for removal: ${asset.fileName} (${asset.id})`);
          }
          
        } catch (error: any) {
          errors.push(`Error testing ${asset.fileName}: ${error.message}`);
          console.error(`❌ Error testing asset ${asset.fileName}:`, error);
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
      
      console.log(`🎉 Cleanup completed: ${removedCount} assets removed, ${errors.length} errors`);
      
      return { removed: removedCount, errors };
      
    } catch (error: any) {
      console.error('❌ Error during client asset cleanup:', error);
      return { removed: 0, errors: [error.message] };
    }
  },

  async cleanupInvalidAssets(userId: string, assets: MediaAsset[]): Promise<MediaAsset[]> {
    try {
      console.log(`🧹 Starting cleanup of ${assets.length} assets...`);
      
      const cleanupPromises = assets.map(async (asset) => {
        try {
          // Teste ob das Asset tatsächlich ladbar ist
          const img = new Image();
          const imageLoadPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`⏱️ Image load timeout for ${asset.fileName}`);
              resolve(false);
            }, 3000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              console.warn(`❌ Image load failed for ${asset.fileName}`);
              resolve(false);
            };
            
            img.src = asset.downloadUrl;
          });
          
          const isValid = await imageLoadPromise;
          
          if (!isValid) {
            console.log(`🗑️ Removing invalid asset: ${asset.fileName} (${asset.id})`);
            
            // Entferne Asset aus Firestore
            if (asset.id) {
              try {
                await deleteDoc(doc(db, 'media_assets', asset.id));
                console.log(`✅ Deleted invalid asset from Firestore: ${asset.id}`);
              } catch (deleteError) {
                console.error(`❌ Failed to delete asset ${asset.id}:`, deleteError);
              }
            }
            
            return null; // Markiere als zu entfernen
          }
          
          return asset;
          
        } catch (error) {
          console.error(`❌ Error validating asset ${asset.fileName}:`, error);
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
      
      console.log(`🧹 Cleanup completed: ${validAssets.length} valid, ${removedCount} removed`);
      
      return validAssets;
      
    } catch (error) {
      console.error('❌ Error during asset cleanup:', error);
      return assets; // Bei Fehlern: Alle Assets beibehalten
    }
  },

  async getMediaByClientId(userId: string, clientId: string, cleanupInvalid = false): Promise<{folders: MediaFolder[], assets: MediaAsset[], totalCount: number}> {
    try {
      console.log('🔍 DEBUG: Loading media for client:', clientId, '(User:', userId, ')');
      
      // 1. Lade Ordner und Assets parallel
      const [foldersSnapshot, assetsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'media_folders'),
          where('userId', '==', userId),
          where('clientId', '==', clientId)
        )),
        getDocs(query(
          collection(db, 'media_assets'),
          where('userId', '==', userId),
          where('clientId', '==', clientId)
        ))
      ]);

      console.log('📊 Raw data loaded:', {
        folders: foldersSnapshot.docs.length,
        directAssets: assetsSnapshot.docs.length
      });

      // 2. Konvertiere zu Objekten
      const folders = foldersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaFolder));

      const directAssets = assetsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MediaAsset));

      // 3. Lade Assets aus Ordnern (falls vorhanden)
      let folderAssets: MediaAsset[] = [];
      if (folders.length > 0) {
        console.log('📁 Loading assets from folders...');
        const folderAssetPromises = folders.map(folder => 
          this.getMediaAssetsInFolder(folder.id!)
        );
        const folderAssetArrays = await Promise.all(folderAssetPromises);
        folderAssets = folderAssetArrays.flat();
        console.log('📎 Assets from folders:', folderAssets.length);
      }

      // 4. Kombiniere alle Assets
      const allAssets = [...directAssets, ...folderAssets];
      console.log('📊 Total assets before validation:', allAssets.length);

      // 5. DEDUPLIZIERUNG: Entferne Duplikate basierend auf fileName
      const seenFileNames = new Set<string>();
      const deduplicatedAssets = allAssets.filter(asset => {
        if (seenFileNames.has(asset.fileName)) {
          console.log(`🔁 Removing duplicate: ${asset.fileName}`);
          return false;
        }
        seenFileNames.add(asset.fileName);
        return true;
      });
      
      console.log(`📊 After deduplication: ${deduplicatedAssets.length} unique assets`);

      // 6. EINFACHE Asset-Validation (nur downloadUrl-Check)
      const validAssets = deduplicatedAssets.filter(asset => {
        if (!asset.downloadUrl) {
          console.warn(`❌ Asset ${asset.fileName} (${asset.id}) has no downloadUrl - removing`);
          return false;
        }
        return true;
      });
      
      // 7. OPTIONALE BEREINIGUNG: Entferne tatsächlich defekte Assets
      let finalAssets = validAssets;
      if (cleanupInvalid && validAssets.length <= 20) {
        console.log('🧹 Running deep cleanup for invalid assets...');
        finalAssets = await this.cleanupInvalidAssets(userId, validAssets);
      } else if (cleanupInvalid) {
        console.log(`ℹ️ Skipping deep cleanup for ${validAssets.length} assets (too many for performance)`);
      }
      
      // 8. Sortiere Assets nach Erstellungsdatum
      finalAssets.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      console.log(`✅ Found ${folders.length} folders and ${finalAssets.length} assets for client`);
      
      return {
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        assets: finalAssets,
        totalCount: folders.length + finalAssets.length
      };

    } catch (error) {
      console.error("❌ Fehler beim Laden der Kunden-Medien:", error);
      
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

  async quickCleanupAsset(assetId: string): Promise<boolean> {
    try {
      await this.removeInvalidAsset(assetId, 'Manual cleanup requested');
      return true;
    } catch (error) {
      console.error(`Failed to cleanup asset ${assetId}:`, error);
      return false;
    }
  },
};