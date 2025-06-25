// src/lib/firebase/media-service.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './client-init';
import { MediaAsset } from '@/types/media';

export const mediaService = {
  /**
   * Lädt eine Datei in den Firebase Storage hoch und erstellt einen entsprechenden
   * Eintrag in der 'media_assets' Firestore-Kollektion.
   * @param file Die hochzuladende Datei.
   * @param userId Die ID des Benutzers.
   * @param onProgress Ein optionaler Callback zur Verfolgung des Upload-Fortschritts.
   * @returns Eine Promise, die mit dem neuen MediaAsset-Objekt aufgelöst wird.
   */
  async uploadMedia(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaAsset> {
    const storagePath = `users/${userId}/media/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
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
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            const assetData: Omit<MediaAsset, 'id'> = {
              userId,
              fileName: file.name,
              fileType: file.type,
              storagePath,
              downloadUrl,
              createdAt: serverTimestamp() as any,
            };

            const docRef = await addDoc(collection(db, 'media_assets'), assetData);
            
            resolve({ id: docRef.id, ...assetData });

          } catch (error) {
            console.error("Fehler beim Speichern der Metadaten:", error);
            reject(error);
          }
        }
      );
    });
  },

  /**
   * Ruft alle Medien-Assets für einen bestimmten Benutzer ab.
   * @param userId Die ID des Benutzers.
   * @returns Eine Promise, die mit einem Array von MediaAsset-Objekten aufgelöst wird.
   */
  async getMediaAssets(userId: string): Promise<MediaAsset[]> {
    const q = query(
      collection(db, 'media_assets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MediaAsset));
  },

  /**
   * Löscht ein Medien-Asset aus Firebase Storage und Firestore.
   * @param asset Das zu löschende MediaAsset-Objekt.
   */
  async deleteMediaAsset(asset: MediaAsset): Promise<void> {
    // 1. Datei aus Storage löschen
    const storageRef = ref(storage, asset.storagePath);
    await deleteObject(storageRef);

    // 2. Dokument aus Firestore löschen
    const docRef = doc(db, 'media_assets', asset.id!);
    await deleteDoc(docRef);
  },
};