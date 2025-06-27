// src/lib/utils/folder-utils.ts - Firma-Vererbung Hilfsfunktionen
import { MediaFolder } from '@/types/media';

/**
 * Ermittelt die vererbte Firma-ID für einen Ordner
 * Geht die Ordner-Hierarchie nach oben bis zum Root-Ordner
 */
export async function getInheritedClientId(
  folder: MediaFolder, 
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  
  // Wenn Ordner selbst eine Firma hat, verwende diese
  if (folder.clientId) {
    return folder.clientId;
  }
  
  // Wenn es ein Root-Ordner ist (kein Parent), keine Vererbung möglich
  if (!folder.parentFolderId) {
    return undefined;
  }
  
  // Finde Parent-Ordner
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    return undefined;
  }
  
  // Rekursiv nach oben gehen
  return await getInheritedClientId(parentFolder, allFolders);
}

/**
 * Ermittelt die Root-Firma-ID für einen Ordner
 * Geht zum obersten Ordner der Hierarchie und gibt dessen Firma zurück
 */
export async function getRootFolderClientId(
  folder: MediaFolder,
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  
  // Wenn es ein Root-Ordner ist, verwende dessen Firma
  if (!folder.parentFolderId) {
    return folder.clientId;
  }
  
  // Finde Parent-Ordner
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    return folder.clientId; // Fallback
  }
  
  // Rekursiv nach oben gehen bis zum Root
  return await getRootFolderClientId(parentFolder, allFolders);
}

/**
 * Prüft ob ein Ordner ein Root-Ordner ist (editierbare Firma)
 */
export function isRootFolder(folder: MediaFolder): boolean {
  return !folder.parentFolderId;
}

/**
 * Prüft ob ein Ordner Firma-Vererbung hat
 */
export function hasInheritedClient(folder: MediaFolder): boolean {
  return !folder.clientId && !!folder.parentFolderId;
}

/**
 * Erstellt Breadcrumb-ähnliche Ordner-Kette für Debug/Display
 */
export function getFolderPath(
  folder: MediaFolder,
  allFolders: MediaFolder[]
): string {
  if (!folder.parentFolderId) {
    return folder.name;
  }
  
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    return folder.name;
  }
  
  return `${getFolderPath(parentFolder, allFolders)} > ${folder.name}`;
}

// === USAGE EXAMPLES ===

/*
// 1. In FolderModal - Client-Feld ausgrauen
const isRoot = isRootFolder(folder);
const inheritedClientId = await getInheritedClientId(folder, allFolders);

if (isRoot) {
  // Client-Feld editierbar
  setClientFieldDisabled(false);
  setSelectedClientId(folder.clientId || '');
} else {
  // Client-Feld ausgegraut, zeigt vererbte Firma
  setClientFieldDisabled(true);
  setSelectedClientId(inheritedClientId || '');
}

// 2. Bei Asset-Drop - Auto-Assignment
const targetRootClientId = await getRootFolderClientId(targetFolder, allFolders);
if (targetRootClientId) {
  await mediaService.updateAsset(assetId, {
    clientId: targetRootClientId
  });
}

// 3. Debug/Display
console.log('Folder path:', getFolderPath(folder, allFolders));
console.log('Is root:', isRootFolder(folder));
console.log('Inherited client:', await getInheritedClientId(folder, allFolders));
*/