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
   */
  async uploadMedia(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaAsset> {
    try {
      // Sicherstellen, dass der Dateiname sauber ist
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
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
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
   * Ruft alle Medien-Assets für einen bestimmten Benutzer ab.
   */
  async getMediaAssets(userId: string): Promise<MediaAsset[]> {
    try {
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
    } catch (error) {
      console.error("Fehler beim Laden der Media Assets:", error);
      throw error;
    }
  },

  /**
   * Löscht ein Medien-Asset aus Firebase Storage und Firestore.
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