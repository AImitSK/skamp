// src/lib/firebase/media-assets-service.ts
// Media Assets Service - CRUD Operations für Media Assets
// Extrahiert aus media-service.ts (Phase 2.1)

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
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './config';
import { MediaAsset } from '@/types/media';

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

// === MEDIA ASSET OPERATIONS ===

/**
 * Upload media with retry logic
 */
export async function uploadMedia(
  file: File,
  organizationId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  retryCount = 3,
  context?: { userId: string; clientId?: string }
): Promise<MediaAsset> {
  try {
    // Cleaner Dateiname für Firebase Storage
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `organizations/${organizationId}/media/${timestamp}_${cleanFileName}`;

    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          'uploaded': new Date().toISOString(),
          'organizationId': organizationId
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
              uploadMedia(file, organizationId, folderId, onProgress, retryCount - 1, context)
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
              organizationId,
              createdBy: context?.userId || organizationId,
              ...(context?.clientId && { clientId: context.clientId }),
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
}

/**
 * Upload media specifically for a client
 */
export async function uploadClientMedia(
  file: File,
  organizationId: string,
  clientId: string,
  folderId?: string,
  onProgress?: (progress: number) => void,
  context?: { userId: string }
): Promise<MediaAsset> {
  return uploadMedia(file, organizationId, folderId, onProgress, 3, {
    userId: context?.userId || organizationId,
    clientId
  });
}

/**
 * Upload Buffer für PDF-Generation
 */
export async function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  folder: string = 'uploads',
  context?: { userId?: string; clientId?: string }
): Promise<{ downloadUrl: string; filePath: string; fileSize: number }> {
  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const filePath = `organizations/${organizationId}/${folder}/${timestamp}_${cleanFileName}`;

    const storageRef = ref(storage, filePath);

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
}

/**
 * Get all media assets for organization/folder
 */
export async function getMediaAssets(organizationId: string, folderId?: string): Promise<MediaAsset[]> {
  try {
    let q;

    if (folderId === undefined) {
      q = query(
        collection(db, 'media_assets'),
        where('organizationId', '==', organizationId)
      );
    } else {
      q = query(
        collection(db, 'media_assets'),
        where('organizationId', '==', organizationId),
        where('folderId', '==', folderId)
      );
    }

    const snapshot = await getDocs(q);
    const assets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
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
}

/**
 * Get single media asset by ID
 */
export async function getMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  try {
    const docRef = doc(db, 'media_assets', assetId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        userId: data.createdBy || data.organizationId
      } as MediaAsset;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all assets in a folder
 */
export async function getMediaAssetsInFolder(folderId: string): Promise<MediaAsset[]> {
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
}

/**
 * Update media asset
 */
export async function updateAsset(assetId: string, updates: Partial<MediaAsset>): Promise<void> {
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
}

/**
 * Move asset to folder (with automatic client inheritance)
 */
export async function moveAssetToFolder(assetId: string, newFolderId?: string, organizationId?: string): Promise<void> {
  try {
    const docRef = doc(db, 'media_assets', assetId);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    // 1. Folder-ID setzen/entfernen
    if (newFolderId) {
      updateData.folderId = newFolderId;
    } else {
      updateData.folderId = null;
    }

    // 2. AUTOMATISCHE FIRMA-VERERBUNG
    if (newFolderId && organizationId) {
      try {
        // Lade Ziel-Ordner
        const { getFolder } = await import('./media-folders-service');
        const { getAllFoldersForOrganization } = await import('./media-folders-service');
        const { getRootFolderClientId } = await import('@/lib/utils/folder-utils');

        const targetFolder = await getFolder(newFolderId);
        if (targetFolder) {
          const allFolders = await getAllFoldersForOrganization(organizationId);
          const inheritedClientId = await getRootFolderClientId(targetFolder, allFolders);

          if (inheritedClientId) {
            updateData.clientId = inheritedClientId;
          }
        }
      } catch (inheritanceError) {
        // Bei Fehler: Normal verschieben ohne Firma-Änderung
      }
    }

    await updateDoc(docRef, updateData);

  } catch (error) {
    throw error;
  }
}

/**
 * Delete media asset
 */
export async function deleteMediaAsset(asset: MediaAsset): Promise<void> {
  try {
    const storageRef = ref(storage, asset.storagePath);
    await deleteObject(storageRef);

    const docRef = doc(db, 'media_assets', asset.id!);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
}

/**
 * Remove invalid asset
 */
export async function removeInvalidAsset(assetId: string, reason = 'Invalid asset detected'): Promise<void> {
  try {
    const assetDoc = await getDoc(doc(db, 'media_assets', assetId));
    if (assetDoc.exists()) {
      const assetData = assetDoc.data();

      if (assetData.storagePath) {
        try {
          const storageRef = ref(storage, assetData.storagePath);
          await deleteObject(storageRef);
        } catch (storageError: any) {
          // Storage-Datei existiert möglicherweise nicht mehr
        }
      }
    }

    await deleteDoc(doc(db, 'media_assets', assetId));

  } catch (error) {
    throw error;
  }
}

/**
 * Quick cleanup asset
 */
export async function quickCleanupAsset(assetId: string): Promise<boolean> {
  try {
    await removeInvalidAsset(assetId, 'Manual cleanup requested');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get media by client ID
 */
export async function getMediaByClientId(
  organizationId: string,
  clientId: string,
  cleanupInvalid = false,
  legacyUserId?: string
): Promise<{folders: any[], assets: MediaAsset[], totalCount: number}> {
  try {
    // Import folders service dynamically to avoid circular dependency
    const { getFolders } = await import('./media-folders-service');

    // Lade Assets mit clientId
    let assetsSnapshot = await getDocs(query(
      collection(db, 'media_assets'),
      where('organizationId', '==', organizationId),
      where('clientId', '==', clientId)
    ));

    // Fallback auf userId wenn keine Ergebnisse
    if (assetsSnapshot.empty) {
      assetsSnapshot = await getDocs(query(
        collection(db, 'media_assets'),
        where('userId', '==', organizationId),
        where('clientId', '==', clientId)
      ));

      // Legacy-Fallback
      if (assetsSnapshot.empty && legacyUserId && legacyUserId !== organizationId) {
        assetsSnapshot = await getDocs(query(
          collection(db, 'media_assets'),
          where('userId', '==', legacyUserId),
          where('clientId', '==', clientId)
        ));
      }
    }

    const directAssets = assetsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        userId: data.createdBy || data.organizationId
      } as MediaAsset;
    });

    // Deduplizierung
    const seenIds = new Set<string>();
    const deduplicatedAssets = directAssets.filter(asset => {
      if (!asset.id || seenIds.has(asset.id)) {
        return false;
      }
      seenIds.add(asset.id);
      return true;
    });

    // Validation
    const validAssets = deduplicatedAssets.filter(asset => {
      if (!asset.downloadUrl) {
        return false;
      }
      return true;
    });

    // Sortierung
    validAssets.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return {
      folders: [],
      assets: validAssets,
      totalCount: validAssets.length
    };

  } catch (error) {
    return {
      folders: [],
      assets: [],
      totalCount: 0
    };
  }
}
