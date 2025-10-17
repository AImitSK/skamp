// src/lib/firebase/media-folders-service.ts
// Media Folders Service - CRUD Operations für Media Folders
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
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { MediaFolder, FolderBreadcrumb } from '@/types/media';

// === FOLDER OPERATIONS ===

/**
 * Create new folder
 */
export async function createFolder(
  folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>,
  context: { organizationId: string; userId: string }
): Promise<string> {
  try {
    const folderData: any = {
      organizationId: context.organizationId,
      createdBy: context.userId,
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
}

/**
 * Get folders for organization/parent
 */
export async function getFolders(organizationId: string, parentFolderId?: string): Promise<MediaFolder[]> {
  try {
    let q;

    if (parentFolderId === undefined) {
      q = query(
        collection(db, 'media_folders'),
        where('organizationId', '==', organizationId)
      );
    } else {
      q = query(
        collection(db, 'media_folders'),
        where('organizationId', '==', organizationId),
        where('parentFolderId', '==', parentFolderId)
      );
    }

    const snapshot = await getDocs(q);
    const folders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
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
}

/**
 * Get single folder by ID
 */
export async function getFolder(folderId: string): Promise<MediaFolder | null> {
  try {
    const docRef = doc(db, 'media_folders', folderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        userId: data.createdBy || data.organizationId
      } as MediaFolder;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all folders for organization (flat list)
 */
export async function getAllFoldersForOrganization(organizationId: string): Promise<MediaFolder[]> {
  try {
    const q = query(
      collection(db, 'media_folders'),
      where('organizationId', '==', organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        userId: data.createdBy || data.organizationId
      } as MediaFolder;
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Legacy wrapper for compatibility
 */
export async function getAllFoldersForUser(userId: string): Promise<MediaFolder[]> {
  return getAllFoldersForOrganization(userId);
}

/**
 * Update folder
 */
export async function updateFolder(folderId: string, updates: Partial<MediaFolder>): Promise<void> {
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
}

/**
 * Delete folder (only if empty)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  try {
    const hasFiles = await hasFilesInFolder(folderId);
    const hasFolders = await hasSubfolders(folderId);

    if (hasFiles || hasFolders) {
      throw new Error('Ordner kann nicht gelöscht werden: Enthält noch Dateien oder Unterordner');
    }

    const docRef = doc(db, 'media_folders', folderId);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
}

/**
 * Check if folder has files
 */
export async function hasFilesInFolder(folderId: string): Promise<boolean> {
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
}

/**
 * Check if folder has subfolders
 */
export async function hasSubfolders(folderId: string): Promise<boolean> {
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
}

/**
 * Get folder breadcrumbs for navigation
 */
export async function getBreadcrumbs(folderId: string): Promise<FolderBreadcrumb[]> {
  try {
    const breadcrumbs: FolderBreadcrumb[] = [];
    let currentFolderId: string | undefined = folderId;

    while (currentFolderId) {
      const folder = await getFolder(currentFolderId);
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
}

/**
 * Get file count in folder
 */
export async function getFolderFileCount(folderId: string): Promise<number> {
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
}

/**
 * Move folder to new parent (with validation)
 */
export async function moveFolderToParent(folderId: string, newParentId: string | null, organizationId: string): Promise<void> {
  try {
    // Validate move (prevent circular references)
    const isValid = await validateFolderMove(folderId, newParentId);
    if (!isValid) {
      throw new Error('Ungültiger Ordner-Verschub: Würde zirkuläre Referenz erzeugen');
    }

    // Update folder
    await updateFolder(folderId, { parentFolderId: newParentId || undefined });
  } catch (error) {
    throw error;
  }
}

/**
 * Validate folder move (prevent circular references)
 */
async function validateFolderMove(folderId: string, newParentId: string | null): Promise<boolean> {
  if (!newParentId) {
    return true; // Moving to root is always valid
  }

  if (folderId === newParentId) {
    return false; // Cannot move folder into itself
  }

  // Check if newParentId is a descendant of folderId
  let currentParentId: string | null | undefined = newParentId;
  while (currentParentId) {
    if (currentParentId === folderId) {
      return false; // Would create circular reference
    }

    const parent = await getFolder(currentParentId);
    if (!parent) break;
    currentParentId = parent.parentFolderId;
  }

  return true;
}
