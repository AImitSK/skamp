// src/types/media.ts
import { Timestamp } from 'firebase/firestore';

export interface MediaAsset {
  id?: string;
  userId: string;
  fileName: string;
  fileType: string; // z.B. 'image/jpeg', 'video/mp4'
  storagePath: string; // Pfad in Firebase Storage
  downloadUrl: string; // Öffentliche URL der Datei
  description?: string;
  tags?: string[];
  createdAt?: Timestamp;
}