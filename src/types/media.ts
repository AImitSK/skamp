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
  folderId?: string; // NEU: Ordner-Zuordnung
  clientId?: string; // NEU: Kunden-Zuordnung
  createdAt?: Timestamp;
}

export interface MediaFolder {
  id?: string;
  userId: string;
  name: string;
  parentFolderId?: string; // Für Unterordner
  clientId?: string; // Optional: Kunde zugeordnet
  color?: string; // Ordner-Farbe für visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Breadcrumb für Navigation
export interface FolderBreadcrumb {
  id: string;
  name: string;
  parentFolderId?: string;
}

// Filter für erweiterte Suche
export interface MediaFilter {
  fileType?: string;
  folderId?: string;
  clientId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}