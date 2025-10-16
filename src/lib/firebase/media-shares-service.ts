// src/lib/firebase/media-shares-service.ts
// Media Shares Service - Share Link Operations
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
import { db } from './config';
import { ShareLink, ShareLinkType, MediaAsset } from '@/types/media';
import { notificationsService } from './notifications-service';

// === SHARE LINK OPERATIONS ===

/**
 * Create share link
 */
export async function createShareLink(data: {
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
  organizationId: string;
  createdBy: string;
}): Promise<ShareLink> {
  try {
    const shareId = self.crypto?.randomUUID?.()
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
      : Math.random().toString(36).substring(2, 14);

    // Basis-Objekt mit Multi-Tenancy Support
    const shareLink: any = {
      shareId,
      organizationId: data.organizationId,
      createdBy: data.createdBy,
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
      userId: shareLink.createdBy
    } as ShareLink;

    return createdShareLink;
  } catch (error) {
    throw error;
  }
}

/**
 * Get campaign media assets from share link
 */
export async function getCampaignMediaAssets(shareLink: ShareLink): Promise<MediaAsset[]> {
  try {
    const { getMediaAssetById, getMediaAssetsInFolder } = await import('./media-assets-service');
    const allAssets: MediaAsset[] = [];

    // Lade direkte Assets
    if (shareLink.assetIds && shareLink.assetIds.length > 0) {
      const assetPromises = shareLink.assetIds.map(id => getMediaAssetById(id));
      const assets = await Promise.all(assetPromises);
      const validAssets = assets.filter(a => a !== null) as MediaAsset[];
      allAssets.push(...validAssets);
    }

    // Lade Assets aus Folders
    if (shareLink.folderIds && shareLink.folderIds.length > 0) {
      for (const folderId of shareLink.folderIds) {
        try {
          const folderAssets = await getMediaAssetsInFolder(folderId);
          allAssets.push(...folderAssets);
        } catch (error) {
          // Folder nicht verfügbar
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
}

/**
 * Get all share links for organization
 */
export async function getShareLinks(organizationId: string): Promise<ShareLink[]> {
  try {
    const q = query(
      collection(db, 'media_shares'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        userId: data.createdBy || data.organizationId
      } as ShareLink;
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get share link by share ID (public access)
 */
export async function getShareLinkByShareId(shareId: string): Promise<ShareLink | null> {
  try {
    const q = query(
      collection(db, 'media_shares'),
      where('shareId', '==', shareId),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docData = snapshot.docs[0];
    const data = docData.data();
    const shareLink = {
      id: docData.id,
      ...data,
      userId: data.createdBy || data.organizationId
    } as ShareLink;

    // ========== NOTIFICATION INTEGRATION: First Access ==========
    const currentAccessCount = shareLink.accessCount || 0;
    if (currentAccessCount === 0 && data.createdBy) {
      try {
        // Hole mehr Details für die Benachrichtigung
        let assetName = shareLink.title || 'Unbekannte Datei';

        // Versuche einen spezifischeren Namen zu bekommen
        if (shareLink.targetId) {
          try {
            const { getMediaAssetById } = await import('./media-assets-service');
            const asset = await getMediaAssetById(shareLink.targetId);
            if (asset) {
              assetName = asset.fileName;
            }
          } catch (err) {
            // Falls targetId kein Asset ist, verwende den Titel
          }
        }

        await notificationsService.notifyMediaAccessed(
          { ...shareLink, assetName },
          data.createdBy
        );
      } catch (notificationError) {
        // Nicht kritisch
      }
    }

    await incrementShareAccess(docData.id);

    return shareLink;
  } catch (error) {
    return null;
  }
}

/**
 * Increment share access count
 */
export async function incrementShareAccess(shareLinkId: string): Promise<void> {
  try {
    const docRef = doc(db, 'media_shares', shareLinkId);
    const docSnap = await getDoc(docRef);
    const currentCount = docSnap.data()?.accessCount || 0;

    await updateDoc(docRef, {
      accessCount: currentCount + 1,
      lastAccessedAt: serverTimestamp(),
    });
  } catch (error) {
    // Nicht kritisch
  }
}

/**
 * Deactivate share link
 */
export async function deactivateShareLink(shareLinkId: string): Promise<void> {
  try {
    const docRef = doc(db, 'media_shares', shareLinkId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Delete share link
 */
export async function deleteShareLink(shareLinkId: string): Promise<void> {
  try {
    const docRef = doc(db, 'media_shares', shareLinkId);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
}

/**
 * Track media download (for notifications)
 */
export async function trackMediaDownload(shareLink: ShareLink, assetName: string): Promise<void> {
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
    // Nicht kritisch
  }
}

/**
 * Update share link settings
 */
export async function updateShareLink(shareLinkId: string, updates: Partial<ShareLink>): Promise<void> {
  try {
    const docRef = doc(db, 'media_shares', shareLinkId);

    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.active !== undefined) updateData.active = updates.active;

    await updateDoc(docRef, updateData);
  } catch (error) {
    throw error;
  }
}

/**
 * Validate share link password
 */
export async function validateSharePassword(shareId: string, password: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'media_shares'),
      where('shareId', '==', shareId),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;

    const data = snapshot.docs[0].data();
    const requiredPassword = data.settings?.passwordRequired;

    if (!requiredPassword) return true; // No password required
    return requiredPassword === password;
  } catch (error) {
    return false;
  }
}
